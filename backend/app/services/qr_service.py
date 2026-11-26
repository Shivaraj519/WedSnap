import io
import os
import qrcode
from PIL import Image, ImageDraw, ImageFont
from app.config import settings

class QRService:
    @staticmethod
    def generate_wedding_qr_png(slug: str, box_size: int = 12, border: int = 2) -> bytes:
        """
        Generates a crisp high-resolution QR code pointing to the public guest gallery URL.
        Uses champagne/charcoal luxury palette styling.
        """
        target_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/wedding/{slug}"
        
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=box_size,
            border=border,
        )
        qr.add_data(target_url)
        qr.make(fit=True)
        
        # Elegant dark charcoal QR on warm ivory background
        # Fill: #232120 (Charcoal), Back: #FAF8F5 (Ivory)
        img = qr.make_image(fill_color="#232120", back_color="#FAF8F5").convert("RGB")
        
        out = io.BytesIO()
        img.save(out, format="PNG")
        return out.getvalue()

    @staticmethod
    def generate_printable_table_card(
        slug: str, 
        bride_name: str, 
        groom_name: str, 
        wedding_date_str: str,
        venue_str: str = ""
    ) -> bytes:
        """
        Creates a print-ready 5x7 inch (1500 x 2100 px @ 300 DPI) elegant wedding table card.
        Features luxury editorial borders, champagne gold accents, typography, and QR code.
        """
        width, height = 1500, 2100
        # Warm Ivory background
        card = Image.new("RGB", (width, height), color="#FAF8F5")
        draw = ImageDraw.Draw(card)

        # Double champagne border (#C5A880)
        gold_color = "#C5A880"
        charcoal_color = "#232120"
        muted_gold = "#8C7B65"

        # Outer border
        draw.rectangle([50, 50, width - 50, height - 50], outline=gold_color, width=4)
        # Inner fine border
        draw.rectangle([70, 70, width - 70, height - 70], outline=gold_color, width=1)

        # Header monogram or top flourish
        draw.text((width // 2, 220), "WEDSNAP", fill=gold_color, anchor="mm", font_size=32)
        draw.text((width // 2, 275), "— CELEBRATION MOMENTS —", fill=muted_gold, anchor="mm", font_size=20)

        # Couple Names
        couple_text = f"{bride_name.upper()}  &  {groom_name.upper()}"
        draw.text((width // 2, 420), couple_text, fill=charcoal_color, anchor="mm", font_size=64)

        # Wedding Date & Venue
        date_venue_text = f"{wedding_date_str}"
        if venue_str:
            date_venue_text += f" • {venue_str}"
        draw.text((width // 2, 510), date_venue_text, fill=muted_gold, anchor="mm", font_size=26)

        # Thin ornamental divider
        draw.line([width // 2 - 180, 570, width // 2 + 180, 570], fill=gold_color, width=2)

        # Instruction Heading
        draw.text((width // 2, 670), "Capture & Cherish Every Memory", fill=charcoal_color, anchor="mm", font_size=38)
        draw.text(
            (width // 2, 730), 
            "Point your smartphone camera at the QR code below to access", 
            fill=muted_gold, anchor="mm", font_size=26
        )
        draw.text(
            (width // 2, 770), 
            "our live stream of photographs captured during the celebration.", 
            fill=muted_gold, anchor="mm", font_size=26
        )

        # Generate and paste QR code
        qr_bytes = QRService.generate_wedding_qr_png(slug, box_size=16, border=2)
        qr_img = Image.open(io.BytesIO(qr_bytes))
        qr_size = 560
        qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)

        # Paste QR code in card center
        qr_x = (width - qr_size) // 2
        qr_y = 860
        card.paste(qr_img, (qr_x, qr_y))

        # Fine frame around QR
        draw.rectangle([qr_x - 10, qr_y - 10, qr_x + qr_size + 10, qr_y + qr_size + 10], outline=gold_color, width=2)

        # Highlights / Features footer
        draw.text((width // 2, 1540), "✨ REAL-TIME LIVE GALLERY", fill=charcoal_color, anchor="mm", font_size=30)
        draw.text((width // 2, 1610), "🔍 'FIND MY PHOTOS' AI FACIAL RECOGNITION", fill=charcoal_color, anchor="mm", font_size=30)
        draw.text((width // 2, 1680), "📥 COMPLIMENTARY ORIGINAL HD DOWNLOADS", fill=charcoal_color, anchor="mm", font_size=30)

        # Bottom greeting
        draw.line([width // 2 - 120, 1780, width // 2 + 120, 1780], fill=gold_color, width=1)
        draw.text((width // 2, 1850), "No App Download Required", fill=muted_gold, anchor="mm", font_size=24)
        draw.text((width // 2, 1900), f"wedsnap.com/wedding/{slug}", fill=gold_color, anchor="mm", font_size=28)

        out = io.BytesIO()
        card.save(out, format="JPEG", quality=95)
        return out.getvalue()

qr_service = QRService()
