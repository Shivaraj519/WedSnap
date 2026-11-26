from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.models import Wedding, Photo, Device, DownloadLog, FaceIndex
from app.schemas.schemas import AnalyticsSummary
from app.security.auth_bearer import get_current_admin

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/{wedding_id}", response_model=AnalyticsSummary)
def get_analytics(
    wedding_id: str,
    admin: Wedding = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Retrieve wedding metrics, bandwidth, device status and downloads."""
    if admin.id != wedding_id:
        raise HTTPException(status_code=403, detail="Forbidden.")

    total_photos = db.query(func.count(Photo.id)).filter(Photo.wedding_id == admin.id).scalar() or 0
    total_downloads = db.query(func.count(DownloadLog.id)).filter(DownloadLog.wedding_id == admin.id).scalar() or 0
    total_devices = db.query(func.count(Device.id)).filter(Device.wedding_id == admin.id).scalar() or 0
    active_devices = db.query(func.count(Device.id)).filter(
        Device.wedding_id == admin.id,
        Device.authentication_status == "active"
    ).scalar() or 0
    
    total_bytes = db.query(func.sum(Photo.file_size)).filter(Photo.wedding_id == admin.id).scalar() or 0
    faces_indexed = db.query(func.count(FaceIndex.id)).filter(FaceIndex.wedding_id == admin.id).scalar() or 0

    latest_photo = db.query(Photo).filter(Photo.wedding_id == admin.id).order_by(Photo.created_at.desc()).first()
    latest_time = latest_photo.created_at if latest_photo else None

    return AnalyticsSummary(
        total_photos=total_photos,
        total_downloads=total_downloads,
        total_devices=total_devices,
        active_devices=active_devices,
        storage_mb=round(total_bytes / (1024 * 1024), 2),
        faces_indexed=faces_indexed,
        latest_upload_time=latest_time
    )
