import os
import shutil
import logging
from typing import Optional, Tuple
import httpx
from app.config import settings

logger = logging.getLogger("wedsnap.storage")

class StorageService:
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.is_cloud = bool(self.supabase_url and self.supabase_key)
        self.local_root = settings.STORAGE_DIR

        if self.is_cloud:
            logger.info("StorageService initialized with Supabase Cloud Storage")
        else:
            logger.info(f"StorageService initialized with Local Storage at {self.local_root}")

    def get_local_path(self, relative_path: str) -> str:
        full_path = os.path.join(self.local_root, relative_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        return full_path

    async def save_original_file(self, wedding_id: str, photo_id: str, file_bytes: bytes, filename: str) -> str:
        """
        Saves original high-resolution photo file.
        Returns the canonical storage path.
        """
        ext = os.path.splitext(filename)[1].lower() or ".jpg"
        rel_path = f"originals/{wedding_id}/{photo_id}{ext}"

        if self.is_cloud:
            try:
                # Upload to Supabase Storage via REST API
                bucket = settings.SUPABASE_STORAGE_BUCKET_ORIGINAL
                url = f"{self.supabase_url}/storage/v1/object/{bucket}/{rel_path}"
                headers = {
                    "Authorization": f"Bearer {self.supabase_key}",
                    "Content-Type": "application/octet-stream"
                }
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, content=file_bytes, headers=headers)
                    if resp.status_code in [200, 201]:
                        return rel_path
                    else:
                        logger.error(f"Supabase upload failed: {resp.text}, falling back to local")
            except Exception as e:
                logger.error(f"Supabase storage exception: {e}, using local fallback")

        # Local storage execution
        local_path = self.get_local_path(rel_path)
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        return rel_path

    async def save_thumbnail_file(self, wedding_id: str, photo_id: str, thumb_bytes: bytes) -> str:
        """
        Saves optimized WebP thumbnail for responsive live gallery grid.
        Returns the canonical storage path.
        """
        rel_path = f"thumbnails/{wedding_id}/{photo_id}.webp"

        if self.is_cloud:
            try:
                bucket = settings.SUPABASE_STORAGE_BUCKET_THUMBNAILS
                url = f"{self.supabase_url}/storage/v1/object/{bucket}/{rel_path}"
                headers = {
                    "Authorization": f"Bearer {self.supabase_key}",
                    "Content-Type": "image/webp"
                }
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, content=thumb_bytes, headers=headers)
                    if resp.status_code in [200, 201]:
                        return rel_path
            except Exception as e:
                logger.error(f"Supabase thumbnail upload error: {e}")

        # Local storage execution
        local_path = self.get_local_path(rel_path)
        with open(local_path, "wb") as f:
            f.write(thumb_bytes)
        return rel_path

    async def save_temp_selfie(self, session_id: str, file_bytes: bytes) -> str:
        """Saves a temporary selfie for face matching. Must be cleaned immediately after."""
        rel_path = f"temp_selfies/{session_id}.jpg"
        local_path = self.get_local_path(rel_path)
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        return local_path

    def delete_temp_selfie(self, local_path: str):
        """Immediately destroys guest selfie file for biometric privacy."""
        try:
            if os.path.exists(local_path):
                os.remove(local_path)
                logger.info(f"Biometric privacy: selfie destroyed at {local_path}")
        except Exception as e:
            logger.warning(f"Error purging selfie: {e}")

    def get_photo_bytes(self, storage_path: str) -> Optional[bytes]:
        """Retrieve binary content of a photo from storage."""
        local_path = self.get_local_path(storage_path)
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                return f.read()
        return None

    def delete_photo_files(self, original_path: str, thumb_path: str):
        """Deletes original and thumbnail files when photo is deleted."""
        for path in [original_path, thumb_path]:
            if path:
                loc = self.get_local_path(path)
                if os.path.exists(loc):
                    try:
                        os.remove(loc)
                    except Exception as e:
                        logger.warning(f"Failed deleting file {loc}: {e}")

storage_service = StorageService()
