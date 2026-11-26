import hashlib
import uuid
import logging
from typing import Optional, Dict, Any, Tuple
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import Photo, Wedding, Device
from app.services.storage_service import storage_service
from app.services.thumbnail_service import thumbnail_service
from app.services.face_recognition_service import face_recognition_service
from app.websocket.manager import ws_manager
from app.config import settings

logger = logging.getLogger("wedsnap.upload")

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", 
    "image/heic", "image/heif", "image/x-canon-cr2", "image/x-canon-cr3",
    "image/x-sony-arw", "image/x-nikon-nef", "application/octet-stream"
}

MAX_FILE_SIZE_BYTES = 60 * 1024 * 1024 # 60MB max per photo

class UploadService:
    @staticmethod
    def calculate_checksum(file_bytes: bytes) -> str:
        """Calculate SHA-256 checksum of raw photo bytes."""
        return hashlib.sha256(file_bytes).hexdigest()

    @staticmethod
    def is_duplicate(db: Session, wedding_id: str, checksum: str) -> Optional[Photo]:
        """Check if an identical photo has already been uploaded for this wedding."""
        return db.query(Photo).filter(
            Photo.wedding_id == wedding_id,
            Photo.checksum == checksum
        ).first()

    @staticmethod
    async def process_and_store_photo(
        db: Session,
        wedding_id: str,
        file_bytes: bytes,
        filename: str,
        mime_type: str,
        source_device_id: Optional[str] = None
    ) -> Photo:
        """
        Unified upload processing pipeline:
        1. Validate size and type
        2. Calculate SHA-256
        3. Deduplicate
        4. Save original to storage
        5. Extract EXIF & generate WebP thumbnail
        6. Save thumbnail to storage
        7. Record metadata in Database
        8. Index faces (if enabled)
        9. Broadcast real-time update to Live Gallery
        """
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024*1024)}MB."
            )

        # Verify wedding exists and is active
        wedding = db.query(Wedding).filter(Wedding.id == wedding_id).first()
        if not wedding:
            raise HTTPException(status_code=404, detail="Wedding not found.")
        if wedding.gallery_status != "active":
            raise HTTPException(status_code=400, detail="Wedding gallery is not actively accepting uploads.")

        checksum = UploadService.calculate_checksum(file_bytes)
        existing = UploadService.is_duplicate(db, wedding_id, checksum)
        if existing:
            logger.info(f"Deduplication: photo {filename} with checksum {checksum} already exists ({existing.id})")
            return existing

        photo_id = str(uuid.uuid4())

        # 1. Save original file
        original_storage_path = await storage_service.save_original_file(
            wedding_id=wedding_id,
            photo_id=photo_id,
            file_bytes=file_bytes,
            filename=filename
        )

        # 2. Extract EXIF & Generate Thumbnail
        try:
            thumb_bytes, width, height, exif_meta, capture_dt = thumbnail_service.process_image(file_bytes)
        except Exception as e:
            logger.warning(f"Could not parse image/exif for {filename}: {e}. Creating fallback.")
            thumb_bytes = file_bytes # Fallback
            width, height = 0, 0
            exif_meta = {}
            capture_dt = datetime.utcnow()

        # 3. Save thumbnail
        thumbnail_storage_path = await storage_service.save_thumbnail_file(
            wedding_id=wedding_id,
            photo_id=photo_id,
            thumb_bytes=thumb_bytes
        )

        # 4. Insert photo record into DB
        photo = Photo(
            id=photo_id,
            wedding_id=wedding_id,
            source_device_id=source_device_id,
            original_storage_path=original_storage_path,
            thumbnail_storage_path=thumbnail_storage_path,
            original_filename=filename,
            file_size=len(file_bytes),
            mime_type=mime_type or "image/jpeg",
            width=width,
            height=height,
            checksum=checksum,
            capture_timestamp=capture_dt or datetime.utcnow(),
            upload_timestamp=datetime.utcnow(),
            processing_status="completed",
            exif_metadata=exif_meta
        )
        db.add(photo)
        db.commit()
        db.refresh(photo)

        # 5. Face Indexing (if enabled on wedding)
        if wedding.face_search_enabled:
            try:
                face_recognition_service.index_faces_for_photo(
                    db=db,
                    photo_id=photo.id,
                    wedding_id=wedding_id,
                    image_bytes=file_bytes
                )
            except Exception as e:
                logger.error(f"Error during facial recognition indexing for photo {photo.id}: {e}")

        # 6. Real-time broadcast to all connected wedding gallery viewers
        photo_payload = {
            "type": "photo:new",
            "photo": {
                "id": photo.id,
                "wedding_id": photo.wedding_id,
                "original_filename": photo.original_filename,
                "width": photo.width,
                "height": photo.height,
                "capture_timestamp": photo.capture_timestamp.isoformat() if photo.capture_timestamp else None,
                "upload_timestamp": photo.upload_timestamp.isoformat(),
                "thumbnail_url": f"/api/v1/photos/{photo.id}/thumbnail",
                "original_url": f"/api/v1/photos/{photo.id}/download",
                "exif_metadata": photo.exif_metadata
            }
        }
        await ws_manager.broadcast_to_wedding(wedding_id, photo_payload)
        logger.info(f"Photo {photo.id} processed and broadcasted to wedding {wedding_id}")

        return photo

upload_service = UploadService()
