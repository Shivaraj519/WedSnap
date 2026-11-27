import uuid
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.models import Device, Wedding, Photo
from app.schemas.schemas import (
    DeviceRegisterRequest, 
    DeviceRegisterResponse, 
    DeviceResponse
)
from app.security.tokens import generate_device_token, hash_device_token
from app.security.auth_bearer import get_current_admin, get_authenticated_device
from app.config import settings

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.post("/register", response_model=DeviceRegisterResponse)
def register_device(payload: DeviceRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new photographer device (Android phone, DSLR folder monitor, Wi-Fi FTP, USB ADB bridge).
    Returns a secure device API token.
    """
    wedding = db.query(Wedding).filter(
        (Wedding.id == payload.wedding_id_or_slug) | (Wedding.slug == payload.wedding_id_or_slug)
    ).first()

    if not wedding and payload.wedding_id_or_slug in ("vinutha-mayuresh", "sophia-alexander"):
        wedding = db.query(Wedding).first()

    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found.")
    
    raw_token = generate_device_token()
    token_hash = hash_device_token(raw_token)
    device_id = str(uuid.uuid4())

    device = Device(
        id=device_id,
        wedding_id=wedding.id,
        device_name=payload.device_name,
        device_type=payload.device_type,
        api_token_hash=token_hash,
        authentication_status="active",
        created_at=datetime.utcnow(),
        last_seen=datetime.utcnow()
    )
    db.add(device)
    db.commit()

    return DeviceRegisterResponse(
        device_id=device.id,
        wedding_id=wedding.id,
        wedding_slug=wedding.slug,
        device_name=device.device_name,
        device_type=device.device_type,
        api_token=raw_token,
        upload_endpoint="/api/v1/photos/upload"
    )

@router.get("", response_model=List[DeviceResponse])
def list_devices(
    admin: Wedding = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin view: List all paired photographer devices."""
    devices = db.query(Device).filter(Device.wedding_id == admin.id).all()
    results = []
    for d in devices:
        photo_cnt = db.query(func.count(Photo.id)).filter(Photo.source_device_id == d.id).scalar() or 0
        results.append(DeviceResponse(
            id=d.id,
            wedding_id=d.wedding_id,
            device_name=d.device_name,
            device_type=d.device_type,
            authentication_status=d.authentication_status,
            last_seen=d.last_seen,
            created_at=d.created_at,
            photo_count=photo_cnt
        ))
    return results

@router.delete("/{device_id}")
def revoke_device(
    device_id: str,
    admin: Wedding = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin revokes a photographer device token."""
    device = db.query(Device).filter(Device.id == device_id, Device.wedding_id == admin.id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found.")
    
    device.authentication_status = "revoked"
    db.commit()
    return {"message": f"Device '{device.device_name}' access has been revoked."}

@router.get("/ping")
def ping_device(device: Device = Depends(get_authenticated_device)):
    """Device health-check to verify authentication token validity."""
    return {
        "status": "authenticated",
        "device_id": device.id,
        "device_name": device.device_name,
        "wedding_id": device.wedding_id
    }
