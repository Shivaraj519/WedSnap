import io
import zipfile
import hashlib
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header, Request, status, Response
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.models import Photo, Wedding, Device, DownloadLog
from app.schemas.schemas import (
    PhotoResponse, 
    PhotoListResponse, 
    ChecksumCheckRequest, 
    ChecksumCheckResponse
)
from app.services.upload_service import upload_service
from app.services.storage_service import storage_service
from app.security.tokens import hash_device_token, decode_admin_jwt
from app.security.auth_bearer import get_current_admin
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/photos", tags=["Photos"])

def photo_to_response(p: Photo) -> PhotoResponse:
    return PhotoResponse(
        id=p.id,
        wedding_id=p.wedding_id,
        source_device_id=p.source_device_id,
        original_url=f"/api/v1/photos/{p.id}/download",
        thumbnail_url=f"/api/v1/photos/{p.id}/thumbnail",
        original_filename=p.original_filename,
        file_size=p.file_size,
        mime_type=p.mime_type,
        width=p.width,
        height=p.height,
        checksum=p.checksum,
        capture_timestamp=p.capture_timestamp,
        upload_timestamp=p.upload_timestamp,
        processing_status=p.processing_status,
        exif_metadata=p.exif_metadata or {},
        created_at=p.created_at
    )

@router.post("/check-duplicate", response_model=ChecksumCheckResponse)
def check_duplicate(payload: ChecksumCheckRequest, db: Session = Depends(get_db)):
    """Pre-flight check: determines whether photo has already been uploaded by checksum."""
    photo = db.query(Photo).filter(
        Photo.wedding_id == payload.wedding_id,
        Photo.checksum == payload.checksum
    ).first()
    
    if photo:
        return ChecksumCheckResponse(exists=True, photo_id=photo.id)
    return ChecksumCheckResponse(exists=False, photo_id=None)

@router.post("/upload", response_model=PhotoResponse)
async def upload_photo(
    request: Request,
    file: UploadFile = File(...),
    wedding_id_or_slug: Optional[str] = Form(None),
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    Unified photo upload endpoint.
    Used by:
    - Android Photographer Application (Direct Cloud Upload)
    - WedSnap USB / ADB Connector
    - WedSnap DSLR Folder / FTP Connector
    - Admin manual web upload
    """
    target_wedding_id: Optional[str] = None
    device_id: Optional[str] = None

    # 1. Device Token Authentication
    if x_device_token:
        token_hash = hash_device_token(x_device_token.strip())
        device = db.query(Device).filter(
            Device.api_token_hash == token_hash,
            Device.authentication_status == "active"
        ).first()
        if not device:
            raise HTTPException(status_code=401, detail="Invalid or revoked device token.")
        target_wedding_id = device.wedding_id
        device_id = device.id
    # 2. Admin Bearer Token Authentication
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_admin_jwt(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid admin token.")
        target_wedding_id = payload.get("sub")
    else:
        raise HTTPException(
            status_code=401, 
            detail="Upload requires device token (X-Device-Token) or admin authorization."
        )

    # Read uploaded bytes
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    # Execute complete upload pipeline
    photo = await upload_service.process_and_store_photo(
        db=db,
        wedding_id=target_wedding_id,
        file_bytes=content,
        filename=file.filename or "photograph.jpg",
        mime_type=file.content_type or "image/jpeg",
        source_device_id=device_id
    )

    return photo_to_response(photo)

@router.get("", response_model=PhotoListResponse)
def list_photos(
    wedding_slug_or_id: str,
    page: int = 1,
    limit: int = 30,
    db: Session = Depends(get_db)
):
    """Retrieve wedding photographs in reverse chronological order (newest first)."""
    wedding = db.query(Wedding).filter(
        (Wedding.slug == wedding_slug_or_id) | (Wedding.id == wedding_slug_or_id)
    ).first()

    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found.")

    offset = (page - 1) * limit
    query = db.query(Photo).filter(
        Photo.wedding_id == wedding.id,
        Photo.processing_status == "completed"
    ).order_by(Photo.created_at.desc())

    total = query.count()
    photos = query.offset(offset).limit(limit).all()

    items = [photo_to_response(p) for p in photos]
    return PhotoListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        has_more=(offset + len(items)) < total
    )

@router.get("/{photo_id}/thumbnail")
def get_thumbnail(photo_id: str, db: Session = Depends(get_db)):
    """Serves high-performance WebP thumbnail with browser cache headers."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found.")

    data = storage_service.get_photo_bytes(photo.thumbnail_storage_path)
    if not data:
        # Fallback to original if thumbnail missing
        data = storage_service.get_photo_bytes(photo.original_storage_path)
    
    if not data:
        raise HTTPException(status_code=404, detail="Thumbnail data not available on storage.")

    return Response(
        content=data,
        media_type="image/webp",
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "ETag": photo.checksum
        }
    )

@router.get("/{photo_id}/download")
def download_original(
    photo_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Downloads full-resolution original photograph.
    Logs guest download activity for wedding analytics.
    """
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found.")

    data = storage_service.get_photo_bytes(photo.original_storage_path)
    if not data:
        raise HTTPException(status_code=404, detail="Original photo not found on storage.")

    # Record download audit log
    client_ip = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(client_ip.encode("utf-8")).hexdigest()[:16]
    log_entry = DownloadLog(
        wedding_id=photo.wedding_id,
        photo_id=photo.id,
        download_type="single_hd",
        client_ip_hash=ip_hash,
        user_agent=request.headers.get("user-agent", "")[:255]
    )
    db.add(log_entry)
    db.commit()

    filename = photo.original_filename or f"wedphoto_{photo.id}.jpg"
    return Response(
        content=data,
        media_type=photo.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(data))
        }
    )

@router.post("/batch-download")
def batch_download_photos(
    photo_ids: List[str],
    request: Request,
    db: Session = Depends(get_db)
):
    """Packages multiple selected high-resolution photographs into a single ZIP archive."""
    if not photo_ids:
        raise HTTPException(status_code=400, detail="No photos selected for download.")
    if len(photo_ids) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 photos per batch download.")

    photos = db.query(Photo).filter(Photo.id.in_(photo_ids)).all()
    if not photos:
        raise HTTPException(status_code=404, detail="No matching photos found.")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for idx, photo in enumerate(photos, 1):
            data = storage_service.get_photo_bytes(photo.original_storage_path)
            if data:
                ext = photo.original_filename.split(".")[-1] if "." in photo.original_filename else "jpg"
                clean_name = f"wedding_photo_{idx:03d}_{photo.id[:8]}.{ext}"
                zip_file.writestr(clean_name, data)

    zip_buffer.seek(0)
    zip_bytes = zip_buffer.getvalue()

    # Log batch download
    client_ip = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(client_ip.encode("utf-8")).hexdigest()[:16]
    db.add(DownloadLog(
        wedding_id=photos[0].wedding_id,
        download_type="batch_zip",
        client_ip_hash=ip_hash,
        user_agent=request.headers.get("user-agent", "")[:255]
    ))
    db.commit()

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="WedSnap_Memories_HD.zip"',
            "Content-Length": str(len(zip_bytes))
        }
    )

@router.delete("/{photo_id}")
async def delete_photo(
    photo_id: str,
    admin: Wedding = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin deletes a photo from gallery and storage."""
    photo = db.query(Photo).filter(Photo.id == photo_id, Photo.wedding_id == admin.id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found.")

    storage_service.delete_photo_files(photo.original_storage_path, photo.thumbnail_storage_path)
    db.delete(photo)
    db.commit()

    # Broadcast deletion event
    await ws_manager.broadcast_to_wedding(admin.id, {
        "type": "photo:deleted",
        "photo_id": photo_id
    })

    return {"message": "Photo deleted successfully."}
