from typing import Optional
from fastapi import Depends, HTTPException, status, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Wedding, Device
from app.security.tokens import decode_admin_jwt, hash_device_token
from datetime import datetime

security = HTTPBearer(auto_error=False)

def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Wedding:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_admin_jwt(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired admin authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    wedding_id = payload.get("sub")
    wedding = db.query(Wedding).filter(Wedding.id == wedding_id).first()
    if not wedding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wedding associated with token not found"
        )
    
    return wedding

def get_authenticated_device(
    request: Request,
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    db: Session = Depends(get_db)
) -> Device:
    """
    Authenticate camera connectors (Android app, USB connector, DSLR adapter).
    Token is provided via X-Device-Token header.
    """
    if not x_device_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Device-Token header. Camera device must be paired with WedSnap."
        )
    
    token_hash = hash_device_token(x_device_token.strip())
    device = db.query(Device).filter(
        Device.api_token_hash == token_hash,
        Device.authentication_status == "active"
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked device token."
        )
    
    # Update last seen timestamp & IP for observability
    device.last_seen = datetime.utcnow()
    client_ip = request.client.host if request.client else None
    if client_ip:
        device.last_ip = client_ip
    db.commit()
    
    return device
