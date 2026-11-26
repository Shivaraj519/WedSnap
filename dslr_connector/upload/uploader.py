import os
import time
import queue
import threading
import hashlib
import logging
from typing import Optional
import requests

logger = logging.getLogger("wedsnap.dslr.uploader")

class DSLRUploader:
    def __init__(self, backend_url: str, device_token: str, wedding_slug: str):
        self.backend_url = backend_url.rstrip("/")
        self.device_token = device_token
        self.wedding_slug = wedding_slug
        self.headers = {"X-Device-Token": self.device_token}
        self.upload_queue = queue.Queue()
        self.is_running = True
        self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.worker_thread.start()
        self.total_uploaded = 0

    @staticmethod
    def compute_sha256(filepath: str) -> str:
        hasher = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def check_duplicate(self, checksum: str) -> bool:
        url = f"{self.backend_url}/api/v1/photos/check-duplicate"
        try:
            resp = requests.post(
                url,
                json={"wedding_id": self.wedding_slug, "checksum": checksum},
                headers=self.headers,
                timeout=5
            )
            if resp.status_code == 200:
                return resp.json().get("exists", False)
        except Exception as e:
            logger.debug(f"Duplicate check failed: {e}")
        return False

    def enqueue(self, filepath: str):
        self.upload_queue.put(filepath)
        logger.info(f"Queued for cloud upload: {os.path.basename(filepath)} (Pending: {self.upload_queue.qsize()})")

    def _worker_loop(self):
        while self.is_running:
            try:
                filepath = self.upload_queue.get(timeout=1.0)
            except queue.Empty:
                continue

            self._upload_file_with_retry(filepath)
            self.upload_queue.task_done()

    def _upload_file_with_retry(self, filepath: str, max_retries: int = 4):
        if not os.path.exists(filepath):
            return

        filename = os.path.basename(filepath)
        checksum = self.compute_sha256(filepath)
        
        if self.check_duplicate(checksum):
            logger.info(f"Deduplication: {filename} already landed in WedSnap cloud.")
            return

        url = f"{self.backend_url}/api/v1/photos/upload"

        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"Uploading {filename} to cloud (Attempt {attempt}/{max_retries})...")
                with open(filepath, "rb") as f:
                    files = {"file": (filename, f, "image/jpeg")}
                    data = {"wedding_id_or_slug": self.wedding_slug}
                    resp = requests.post(url, headers=self.headers, files=files, data=data, timeout=60)
                    
                    if resp.status_code in (200, 201):
                        self.total_uploaded += 1
                        logger.info(f"SUCCESS: {filename} synced to Live Gallery! (Total synced: {self.total_uploaded})")
                        return
                    else:
                        logger.error(f"Upload rejected ({resp.status_code}): {resp.text}")
            except Exception as e:
                logger.warning(f"Upload attempt {attempt} failed: {e}")
                time.sleep(2 ** attempt)

        logger.error(f"FAILED: Max retries exceeded for {filename}. Will retain in local folder.")

    def stop(self):
        self.is_running = False
        self.worker_thread.join(timeout=2.0)
