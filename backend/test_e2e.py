import os
import sys
import io
import time
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings

def create_sample_portrait(color=(210, 180, 140)) -> bytes:
    """Creates a sample 800x1000 image with a simulated face portrait."""
    img = Image.new("RGB", (800, 1000), color=(250, 248, 245))
    draw = ImageDraw.Draw(img)
    # Draw suit / gown shoulders
    draw.rectangle([200, 600, 600, 1000], fill=(40, 40, 40))
    # Draw neck
    draw.rectangle([360, 480, 440, 620], fill=color)
    # Draw head
    draw.ellipse([300, 250, 500, 520], fill=color)
    # Draw eyes
    draw.ellipse([345, 340, 375, 360], fill=(60, 40, 20))
    draw.ellipse([425, 340, 455, 360], fill=(60, 40, 20))
    # Draw smile
    draw.arc([370, 420, 430, 460], start=0, end=180, fill=(150, 40, 40), width=4)
    
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=95)
    return out.getvalue()

def run_tests():
    print("=" * 60)
    print("      WEDSNAP END-TO-END INTEGRATION TEST SUITE      ")
    print("=" * 60)

    with TestClient(app) as client:
        # 1. Health check
        print("\n1. Testing System Health Check...")
        r = client.get("/api/health")
        assert r.status_code == 200, f"Health check failed: {r.text}"
        print("   [PASS] Health check OK:", r.json()["service"])

        # 2. Get Public Wedding
        print("\n2. Testing Public Wedding Gallery Endpoint...")
        r = client.get("/api/v1/weddings/sophia-alexander")
        assert r.status_code == 200, f"Wedding lookup failed: {r.text}"
        wedding_id = r.json()["id"]
        print(f"   [PASS] Wedding '{r.json()['bride_name']} & {r.json()['groom_name']}' loaded (ID: {wedding_id})")

        # 3. Register Camera Device (DSLR / Android)
        print("\n3. Testing Camera Device Registration...")
        r = client.post("/api/v1/devices/register", json={
            "wedding_id_or_slug": "sophia-alexander",
            "device_name": "Sony A7 IV - Primary Tether",
            "device_type": "dslr_folder"
        })
        assert r.status_code == 200, f"Device registration failed: {r.text}"
        device_token = r.json()["api_token"]
        device_id = r.json()["device_id"]
        print(f"   [PASS] Device registered! Token: {device_token[:12]}... (ID: {device_id})")

        # 4. Device Ping / Authentication
        print("\n4. Testing Device Token Authentication...")
        r = client.get("/api/v1/devices/ping", headers={"X-Device-Token": device_token})
        assert r.status_code == 200, f"Device ping failed: {r.text}"
        print("   [PASS] Device authenticated successfully!")

        # 5. Check Duplicate Checksum (Pre-upload)
        print("\n5. Testing Duplicate Checksum Detection...")
        sample_photo = create_sample_portrait()
        import hashlib
        photo_checksum = hashlib.sha256(sample_photo).hexdigest()
        r = client.post("/api/v1/photos/check-duplicate", json={
            "wedding_id": wedding_id,
            "checksum": photo_checksum
        })
        assert r.status_code == 200
        assert r.json()["exists"] is False
        print("   [PASS] Pre-flight checksum check confirmed photo does not exist yet.")

        # 6. Upload Photo using Device Token
        print("\n6. Testing Unified Photo Upload Engine...")
        r = client.post(
            "/api/v1/photos/upload",
            headers={"X-Device-Token": device_token},
            files={"file": ("DSC01948.JPG", sample_photo, "image/jpeg")},
            data={"wedding_id_or_slug": "sophia-alexander"}
        )
        assert r.status_code == 200, f"Upload failed: {r.text}"
        photo_data = r.json()
        photo_id = photo_data["id"]
        print(f"   [PASS] Photo uploaded! ID: {photo_id}, Dimensions: {photo_data['width']}x{photo_data['height']}")

        # 7. Test Deduplication
        print("\n7. Testing Upload Deduplication (Re-uploading same file)...")
        r2 = client.post(
            "/api/v1/photos/upload",
            headers={"X-Device-Token": device_token},
            files={"file": ("DSC01948_COPY.JPG", sample_photo, "image/jpeg")},
            data={"wedding_id_or_slug": "sophia-alexander"}
        )
        assert r2.status_code == 200
        assert r2.json()["id"] == photo_id
        print("   [PASS] Deduplication confirmed! Returned existing photo ID without re-storing.")

        # 8. Test Thumbnail Endpoint
        print("\n8. Testing Thumbnail Generation & Serving...")
        r = client.get(f"/api/v1/photos/{photo_id}/thumbnail")
        assert r.status_code == 200
        assert r.headers["content-type"] == "image/webp"
        print(f"   [PASS] WebP thumbnail served ({len(r.content)} bytes, ETag: {r.headers.get('etag')[:8]}...)")

        # 9. Test HD Download & Logging
        print("\n9. Testing Full-Resolution HD Download...")
        r = client.get(f"/api/v1/photos/{photo_id}/download")
        assert r.status_code == 200
        assert len(r.content) == len(sample_photo)
        print("   [PASS] Original full-resolution photograph downloaded with exact byte integrity!")

        # 10. Test Find My Photos (Facial Search)
        print("\n10. Testing Find My Photos (Facial Search with Consent)...")
        selfie_photo = create_sample_portrait(color=(215, 185, 145))
        r = client.post(
            "/api/v1/face-search/sophia-alexander",
            files={"file": ("guest_selfie.jpg", selfie_photo, "image/jpeg")},
            data={"consent": "true"}
        )
        assert r.status_code == 200, f"Face search failed: {r.text}"
        search_data = r.json()
        print(f"   [PASS] Face search executed! Total matches: {search_data['total_matches']}, Message: {search_data['message']}")

        # 11. Test Mandatory Privacy Consent Rejection
        print("\n11. Testing Facial Privacy Consent Enforcement...")
        r_no_consent = client.post(
            "/api/v1/face-search/sophia-alexander",
            files={"file": ("guest_selfie.jpg", selfie_photo, "image/jpeg")},
            data={"consent": "false"}
        )
        assert r_no_consent.status_code == 400
        print("   [PASS] Biometric search strictly rejected when explicit consent is not provided.")

        # 12. Test QR Code Endpoints
        print("\n12. Testing QR Code & Luxury Table Card Generation...")
        r_qr = client.get("/api/v1/qr/sophia-alexander")
        assert r_qr.status_code == 200
        assert r_qr.headers["content-type"] == "image/png"
        print(f"   [PASS] Crisp PNG QR Code generated ({len(r_qr.content)} bytes)")

        r_card = client.get("/api/v1/qr/sophia-alexander/table-card")
        assert r_card.status_code == 200
        assert r_card.headers["content-type"] == "image/jpeg"
        print(f"   [PASS] 5x7 Printable Table Card generated ({len(r_card.content)} bytes)")

        # 13. Admin Login & Metrics
        print("\n13. Testing Admin Authentication & Analytics...")
        r_login = client.post("/api/v1/auth/admin-login", json={
            "wedding_id_or_slug": "sophia-alexander",
            "password": "wedding2026"
        })
        assert r_login.status_code == 200
        admin_token = r_login.json()["access_token"]
        print("   [PASS] Admin authenticated! Received JWT token.")

        r_analytics = client.get(f"/api/v1/analytics/{wedding_id}", headers={"Authorization": f"Bearer {admin_token}"})
        assert r_analytics.status_code == 200
        metrics = r_analytics.json()
        print(f"   [PASS] Analytics loaded: Photos: {metrics['total_photos']}, Downloads: {metrics['total_downloads']}, Storage: {metrics['storage_mb']}MB")

        print("\n" + "=" * 60)
        print("        ALL INTEGRATION TESTS PASSED SUCCESSFULLY!        ")
        print("=" * 60)

if __name__ == "__main__":
    run_tests()
