from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Wedding
from app.schemas.schemas import AdminLoginRequest, TokenResponse
from app.security.tokens import verify_password, create_admin_jwt

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/admin-login", response_model=TokenResponse)
def admin_login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    """Authenticate wedding admin or photographer lead."""
    wedding = db.query(Wedding).filter(
        (Wedding.id == payload.wedding_id_or_slug) | (Wedding.slug == payload.wedding_id_or_slug)
    ).first()

    if not wedding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wedding not found."
        )

    if not verify_password(payload.password, wedding.admin_password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin passcode."
        )

    token = create_admin_jwt(wedding_id=wedding.id, slug=wedding.slug)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        wedding_id=wedding.id,
        slug=wedding.slug
    )
