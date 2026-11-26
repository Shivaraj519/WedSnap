import os
import time
import hashlib
import logging
from typing import Optional, Dict, Any
import requests

logger = logging.getLogger("wedsnap.usb.uploader")

class PhotoUploader:
    def __init__(self, backend_url: str, device_token: str, wedding_slug: str):
        self.backend_url = backend_url.rstrip("/")
        self.device_token = device_token
        self.wedding_slug = wedding_slug
        self.headers = {"X-Device-Token": self.device_token}

    @staticmethod
    def compute_sha256(filepath: str) -> str:
        hasher = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def check_duplicate(self, wedding_id: str, checksum: str) -> bool:
        """Query backend to check if this photo has already been uploaded."""
        url = f"{self.backend_url}/api/v1/photos/check-duplicate"
        try:
            resp = requests.post(
                url,
                json={"wedding_id": wedding_id, "checksum": checksum},
                headers=self.headers,
                timeout=5
            )
            if resp.status_code == 200:
                return resp.json().get("exists", False)
        except Exception as e:
            logger.debug(f"Duplicate check call failed (proceeding to upload): {e}")
        return False

    def upload_photo(self, local_path: str, wedding_id: str, max_retries: int = 3) -> bool:
        """
        Uploads original resolution photo to WedSnap Cloud.
        Retries with exponential backoff if network drops.
        """
        if not os.path.exists(local_path):
            return False

        checksum = self.compute_sha256(local_path)
        if self.check_duplicate(wedding_id, checksum):
            logger.info(f"Skipping upload: file already exists on WedSnap ({os.path.basename(local_path)})")
            return True

        filename = os.path.basename(local_path)
        url = f"{self.backend_url}/api/v1/photos/upload"

        for attempt in range(1, max_retries + 1):
            try:
                with open(local_path, "rb") as f:
                    files = {"file": (filename, f, "image/jpeg")}
                    data = {"wedding_id_or_slug": self.wedding_slug}
                    resp = requests.post(url, headers=self.headers, files=files, data=data, timeout=60)
                    
                    if resp.status_code in (200, 201):
                        logger.info(f"Successfully uploaded {filename} to WedSnap gallery.")
                        return True
                    else:
                        logger.error(f"Upload failed ({resp.status_code}): {resp.text}")
            except Exception as e:
                logger.warning(f"Upload attempt {attempt}/{max_retries} failed for {filename}: {e}")
                time.sleep(2 ** attempt) # Exponential backoff: 2s, 4s, 8s

        return False
