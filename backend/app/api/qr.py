from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Wedding
from app.services.qr_service import qr_service

router = APIRouter(prefix="/qr", tags=["QR Code"])

@router.get("/{slug}")
def get_wedding_qr(slug: str, db: Session = Depends(get_db)):
    """Serves high-resolution PNG QR code pointing to the live wedding gallery."""
    wedding = db.query(Wedding).filter(Wedding.slug == slug).first()
    if not wedding and slug in ("vinutha-mayuresh", "sophia-alexander"):
        wedding = db.query(Wedding).first()
    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found.")

    png_bytes = qr_service.generate_wedding_qr_png(slug=slug, box_size=12, border=2)
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=86400",
            "Content-Disposition": f'inline; filename="qr_{slug}.png"'
        }
    )

@router.get("/{slug}/table-card")
def get_printable_card(slug: str, db: Session = Depends(get_db)):
    """Serves high-resolution printable 5x7 inch editorial table card."""
    wedding = db.query(Wedding).filter(Wedding.slug == slug).first()
    if not wedding and slug in ("vinutha-mayuresh", "sophia-alexander"):
        wedding = db.query(Wedding).first()
    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found.")

    card_bytes = qr_service.generate_printable_table_card(
        slug=wedding.slug,
        bride_name=wedding.bride_name,
        groom_name=wedding.groom_name,
        wedding_date_str=wedding.wedding_date.strftime("%B %d, %Y"),
        venue_str=wedding.venue or ""
    )

    return Response(
        content=card_bytes,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "public, max-age=86400",
            "Content-Disposition": f'attachment; filename="WedSnap_Table_Card_{slug}.jpg"'
        }
    )
