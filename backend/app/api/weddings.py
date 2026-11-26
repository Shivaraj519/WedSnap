import re
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.models import Wedding, Photo, Device, DownloadLog
from app.schemas.schemas import (
    WeddingCreate, 
    WeddingUpdate, 
    WeddingPublic, 
    WeddingResponse
)
from app.security.tokens import hash_password
from app.security.auth_bearer import get_current_admin

router = APIRouter(prefix="/weddings", tags=["Weddings"])

def generate_slug(bride: str, groom: str, db: Session) -> str:
    base = f"{bride.lower().strip()}-{groom.lower().strip()}"
    base = re.sub(r'[^a-z0-9\-]', '', base)
    if not base:
        base = "wedding"
    slug = base
    counter = 1
    while db.query(Wedding).filter(Wedding.slug == slug).first():
        slug = f"{base}-{counter}"
        counter += 1
    return slug

@router.post("", response_model=WeddingResponse)
def create_wedding(payload: WeddingCreate, db: Session = Depends(get_db)):
    """Create a new wedding event and gallery."""
    slug = payload.slug.strip().lower() if payload.slug else generate_slug(payload.bride_name, payload.groom_name, db)
    
    # Check if slug exists
    if db.query(Wedding).filter(Wedding.slug == slug).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Wedding identifier '{slug}' is already taken. Please choose another slug."
        )

    wedding = Wedding(
        id=str(uuid.uuid4()),
        slug=slug,
        bride_name=payload.bride_name,
        groom_name=payload.groom_name,
        wedding_date=payload.wedding_date,
        venue=payload.venue,
        welcome_message=payload.welcome_message,
        cover_image=payload.cover_image,
        face_search_enabled=payload.face_search_enabled,
        allow_original_downloads=payload.allow_original_downloads,
        passcode=payload.passcode,
        admin_password_hash=hash_password(payload.admin_password)
    )
    db.add(wedding)
    db.commit()
    db.refresh(wedding)

    return WeddingResponse(
        id=wedding.id,
        slug=wedding.slug,
        bride_name=wedding.bride_name,
        groom_name=wedding.groom_name,
        wedding_date=wedding.wedding_date,
        venue=wedding.venue,
        welcome_message=wedding.welcome_message,
        cover_image=wedding.cover_image,
        gallery_status=wedding.gallery_status,
        face_search_enabled=wedding.face_search_enabled,
        allow_original_downloads=wedding.allow_original_downloads,
        created_at=wedding.created_at,
        photo_count=0,
        device_count=0,
        total_downloads=0,
        storage_mb=0.0
    )

@router.get("/{slug_or_id}", response_model=WeddingPublic)
def get_wedding_public(slug_or_id: str, db: Session = Depends(get_db)):
    """Public endpoint for guests scanning the QR code or visiting gallery."""
    wedding = db.query(Wedding).filter(
        (Wedding.slug == slug_or_id) | (Wedding.id == slug_or_id)
    ).first()

    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found.")
    
    return wedding

@router.get("/{wedding_id}/admin-details", response_model=WeddingResponse)
def get_wedding_admin(
    wedding_id: str,
    admin: Wedding = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to retrieve wedding metrics and config."""
    if admin.id != wedding_id:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot administer this wedding.")

    photo_count = db.query(func.count(Photo.id)).filter(Photo.wedding_id == admin.id).scalar() or 0
    device_count = db.query(func.count(Device.id)).filter(Device.wedding_id == admin.id).scalar() or 0
    total_downloads = db.query(func.count(DownloadLog.id)).filter(DownloadLog.wedding_id == admin.id).scalar() or 0
    total_bytes = db.query(func.sum(Photo.file_size)).filter(Photo.wedding_id == admin.id).scalar() or 0

    return WeddingResponse(
        id=admin.id,
        slug=admin.slug,
        bride_name=admin.bride_name,
        groom_name=admin.groom_name,
        wedding_date=admin.wedding_date,
        venue=admin.venue,
        welcome_message=admin.welcome_message,
        cover_image=admin.cover_image,
        gallery_status=admin.gallery_status,
        face_search_enabled=admin.face_search_enabled,
        allow_original_downloads=admin.allow_original_downloads,
        created_at=admin.created_at,
        photo_count=photo_count,
        device_count=device_count,
        total_downloads=total_downloads,
        storage_mb=round(total_bytes / (1024 * 1024), 2)
    )

@router.patch("/{wedding_id}", response_model=WeddingPublic)
def update_wedding(
    wedding_id: str,
    payload: WeddingUpdate,
    admin: Wedding = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin updates wedding settings (e.g. toggle facial recognition, pause gallery)."""
    if admin.id != wedding_id:
        raise HTTPException(status_code=403, detail="Forbidden.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(admin, field, val)
    
    db.commit()
    db.refresh(admin)
    return admin
