import uuid
import hashlib
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Wedding, FaceSearchSession
from app.schemas.schemas import FaceSearchResponse, FaceMatchResult
from app.services.face_recognition_service import face_recognition_service
from app.api.photos import photo_to_response
from app.security.auth_bearer import get_current_admin

router = APIRouter(prefix="/face-search", tags=["Facial Recognition"])

@router.post("/{slug_or_id}", response_model=FaceSearchResponse)
async def search_my_photos(
    slug_or_id: str,
    request: Request,
    file: UploadFile = File(...),
    consent: bool = Form(...),
    db: Session = Depends(get_db)
):
    """
    Find My Photos - Guest Facial Search
    Requires explicit guest consent.
    Selfie is processed in memory and immediately discarded.
    """
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explicit privacy consent is mandatory for facial recognition photo discovery."
        )

    wedding = db.query(Wedding).filter(
        (Wedding.slug == slug_or_id) | (Wedding.id == slug_or_id)
    ).first()

    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found.")
    
    if not wedding.face_search_enabled:
        raise HTTPException(
            status_code=400,
            detail="Facial recognition is disabled for this wedding."
        )

    selfie_bytes = await file.read()
    if not selfie_bytes:
        raise HTTPException(status_code=400, detail="Empty selfie photo.")

    session_id = str(uuid.uuid4())
    client_ip = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(client_ip.encode("utf-8")).hexdigest()[:16]

    # Perform matching
    matches_raw, faces_detected = face_recognition_service.search_matching_photos(
        db=db,
        wedding_id=wedding.id,
        selfie_bytes=selfie_bytes
    )

    # Privacy guarantee: Log consent session audit, selfie data is never persisted
    session_record = FaceSearchSession(
        id=session_id,
        wedding_id=wedding.id,
        consent_status=True,
        consent_timestamp=datetime.utcnow(),
        client_ip_hash=ip_hash,
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )
    db.add(session_record)
    db.commit()

    # Format response matches
    results = []
    for item in matches_raw:
        results.append(FaceMatchResult(
            photo=photo_to_response(item["photo"]),
            confidence=item["confidence"],
            match_score=item["match_score"]
        ))

    message = f"Found {len(results)} photograph(s) matching your face." if results else "No matching photographs found yet. More photos are continuously being uploaded by the photographers!"

    return FaceSearchResponse(
        matches=results,
        total_matches=len(results),
        faces_detected_in_selfie=faces_detected,
        session_id=session_id,
        message=message
    )

@router.delete("/{wedding_id}/purge")
def purge_biometrics(
    wedding_id: str,
    admin: Wedding = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin privacy control: Permanently delete all biometric face indexes for this wedding."""
    if admin.id != wedding_id:
        raise HTTPException(status_code=403, detail="Forbidden.")

    count = face_recognition_service.purge_wedding_biometrics(db, wedding_id)
    return {"message": f"Successfully deleted {count} biometric facial embeddings from storage."}
