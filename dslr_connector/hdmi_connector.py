"""
WedSnap HDMI Direct Cable & Video Capture Card Connector
========================================================
Connects directly to an HDMI video capture card (Cam Link, Elgato, USB3.0 HDMI capture dongle)
streaming clean HDMI out from Sony, Canon, Nikon, Fuji, or Lumix cameras.

Grabs pristine 1080p/4K uncompressed camera frames and pushes them instantly
to the WedSnap real-time cloud wedding gallery.

Usage:
  python hdmi_connector.py [--device 0] [--server https://wedsnap-1.onrender.com] [--token wds_...]
"""

import sys
import os
import time
import argparse
import logging
from datetime import datetime
import io

try:
    import cv2
except ImportError:
    print("OpenCV is required: pip install opencv-python")
    sys.exit(1)

try:
    import httpx
except ImportError:
    print("HTTPX is required: pip install httpx")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("WedSnap-HDMI")


class WedSnapHdmiConnector:
    def __init__(self, device_index: int, server_url: str, wedding_slug: str, device_token: str):
        self.device_index = device_index
        self.server_url = server_url.rstrip("/")
        self.wedding_slug = wedding_slug
        self.device_token = device_token
        self.upload_endpoint = f"{self.server_url}/api/v1/photos/upload"
        self.cap = None

    def start_camera(self) -> bool:
        logger.info(f"Connecting to HDMI Video Capture Card (Index {self.device_index})...")
        
        # Windows DirectShow backend for faster capture card initialization
        if sys.platform == "win32":
            self.cap = cv2.VideoCapture(self.device_index, cv2.CAP_DSHOW)
        else:
            self.cap = cv2.VideoCapture(self.device_index)

        if not self.cap.isOpened():
            logger.error(f"Failed to open video capture device {self.device_index}. Verify HDMI cable & capture card.")
            return False

        # Request 1080p 60fps
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
        self.cap.set(cv2.CAP_PROP_FPS, 60)

        actual_w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        actual_fps = self.cap.get(cv2.CAP_PROP_FPS)

        logger.info(f"HDMI Clean Feed Connected! Resolution: {actual_w}x{actual_h} @ {actual_fps:.1f} FPS")
        return True

    def snap_and_upload(self, frame) -> bool:
        """Encodes frame and uploads directly to WedSnap Cloud."""
        now = datetime.now()
        filename = f"HDMI_{now.strftime('%Y%m%d_%H%M%S')}.jpg"

        # Encode to high quality JPEG
        encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), 95]
        success, buffer = cv2.imencode(".jpg", frame, encode_params)
        if not success:
            logger.error("Failed to encode frame to JPEG")
            return False

        image_bytes = buffer.tobytes()
        file_size_kb = len(image_bytes) / 1024.0

        logger.info(f"Streaming photo to cloud: {filename} ({file_size_kb:.1f} KB)...")

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(
                    self.upload_endpoint,
                    headers={"X-Device-Token": self.device_token},
                    files={"file": (filename, image_bytes, "image/jpeg")},
                    data={"wedding_id_or_slug": self.wedding_slug}
                )

                if resp.status_code == 200:
                    data = resp.json()
                    logger.info(f" SUCCESS! Photo live on gallery! Photo ID: {data.get('id')}")
                    return True
                else:
                    logger.error(f" Upload failed (Status {resp.status_code}): {resp.text}")
                    return False
        except Exception as e:
            logger.error(f" Cloud communication error: {e}")
            return False

    def run_interactive(self, interval_sec: int = 0):
        if not self.start_camera():
            return

        window_name = f"WedSnap HDMI Viewfinder — [{self.wedding_slug}]"
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(window_name, 1280, 720)

        logger.info("\n" + "="*60)
        logger.info(" WedSnap HDMI Interactive Viewfinder Controls:")
        logger.info("   [SPACE] or [ENTER] : Snap & Stream Frame to Gallery")
        logger.info("   [A]                : Toggle Auto-Snap Intervalometer")
        logger.info("   [Q] or [ESC]        : Exit")
        logger.info("="*60 + "\n")

        auto_snap = interval_sec > 0
        last_auto_snap = time.time()
        snap_flash_timer = 0

        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    logger.warning("Dropped frame from HDMI capture card. Retrying...")
                    time.sleep(0.05)
                    continue

                display_frame = frame.copy()
                h, w, _ = display_frame.shape

                # Flash feedback overlay if just snapped
                if time.time() - snap_flash_timer < 0.15:
                    display_frame[:] = (255, 255, 255)

                # Rule of thirds grid
                cv2.line(display_frame, (w // 3, 0), (w // 3, h), (180, 180, 180), 1)
                cv2.line(display_frame, (2 * w // 3, 0), (2 * w // 3, h), (180, 180, 180), 1)
                cv2.line(display_frame, (0, h // 3), (w, h // 3), (180, 180, 180), 1)
                cv2.line(display_frame, (0, 2 * h // 3), (w, 2 * h // 3), (180, 180, 180), 1)

                # HUD Overlay text
                hud_text = f"WedSnap HDMI LIVE | {w}x{h} | Press SPACE to Snap"
                cv2.putText(display_frame, hud_text, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 200), 2)

                if auto_snap:
                    remaining = max(0, int(interval_sec - (time.time() - last_auto_snap)))
                    auto_text = f"AUTO-SNAP IN: {remaining}s"
                    cv2.putText(display_frame, auto_text, (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 180, 255), 2)

                    if time.time() - last_auto_snap >= interval_sec:
                        snap_flash_timer = time.time()
                        self.snap_and_upload(frame)
                        last_auto_snap = time.time()

                cv2.imshow(window_name, display_frame)

                key = cv2.waitKey(1) & 0xFF
                if key in (27, ord('q'), ord('Q')):
                    break
                elif key in (32, 13): # Space or Enter
                    snap_flash_timer = time.time()
                    self.snap_and_upload(frame)
                elif key in (ord('a'), ord('A')):
                    auto_snap = not auto_snap
                    last_auto_snap = time.time()
                    if interval_sec == 0:
                        interval_sec = 10
                    logger.info(f"Auto-snap mode: {'ENABLED (' + str(interval_sec) + 's)' if auto_snap else 'DISABLED'}")

        finally:
            if self.cap:
                self.cap.release()
            cv2.destroyAllWindows()
            logger.info("HDMI session ended.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WedSnap HDMI Video Capture Card Tethering")
    parser.add_argument("--device", type=int, default=0, help="Video capture card device index (default: 0)")
    parser.add_argument("--server", type=str, default="https://wedsnap-1.onrender.com", help="WedSnap server URL")
    parser.add_argument("--slug", type=str, default="sophia-alexander", help="Wedding slug")
    parser.add_argument("--token", type=str, default="wds_zhV7WIuUlJhSEM8yTwLgzJprpYFNsBe61g8cMUTXuD8", help="Photographer device token")
    parser.add_argument("--interval", type=int, default=0, help="Auto-snap interval in seconds (0 = manual)")

    args = parser.parse_args()
    connector = WedSnapHdmiConnector(
        device_index=args.device,
        server_url=args.server,
        wedding_slug=args.slug,
        device_token=args.token
    )
    connector.run_interactive(interval_sec=args.interval)
