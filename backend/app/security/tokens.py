import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
import bcrypt
from app.config import settings

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def generate_device_token() -> str:
    """Generate a high-entropy secret token for paired photographer devices."""
    return f"wds_{secrets.token_urlsafe(32)}"

def hash_device_token(token: str) -> str:
    """Hash the device token for constant-time lookup in the database."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def create_admin_jwt(wedding_id: str, slug: str, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = {
        "sub": wedding_id,
        "slug": slug,
        "role": "admin",
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_admin_jwt(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("role") != "admin":
            return None
        return payload
    except Exception:
        return None

def create_signed_download_token(photo_id: str, expires_seconds: int = 3600) -> str:
    """Create short-lived signed token for secure full-resolution photo downloads."""
    expire = datetime.utcnow() + timedelta(seconds=expires_seconds)
    payload = {
        "photo_id": photo_id,
        "action": "download_hd",
        "exp": expire
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_download_token(token: str, photo_id: str) -> bool:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("photo_id") == photo_id and payload.get("action") == "download_hd"
    except Exception:
        return False
