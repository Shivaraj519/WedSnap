import io
from typing import Tuple, Dict, Any, Optional
from datetime import datetime
from PIL import Image, ExifTags

class ThumbnailService:
    @staticmethod
    def process_image(image_bytes: bytes) -> Tuple[bytes, int, int, Dict[str, Any], Optional[datetime]]:
        """
        Parses original photo, extracts EXIF metadata & capture timestamp,
        and generates an optimized WebP thumbnail.
        
        Returns:
            (thumbnail_bytes, original_width, original_height, exif_dict, capture_timestamp)
        """
        with Image.open(io.BytesIO(image_bytes)) as img:
            # Handle EXIF orientation if present
            try:
                exif_raw = img.getexif()
                orientation = exif_raw.get(0x0112) # 274 = Orientation
                if orientation == 3:
                    img = img.rotate(180, expand=True)
                elif orientation == 6:
                    img = img.rotate(270, expand=True)
                elif orientation == 8:
                    img = img.rotate(90, expand=True)
            except Exception:
                exif_raw = None

            orig_w, orig_h = img.size
            exif_data: Dict[str, Any] = {}
            capture_dt: Optional[datetime] = None

            # Extract EXIF tags
            if exif_raw:
                try:
                    for tag_id, value in exif_raw.items():
                        tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                        # Only capture relevant human-readable EXIF info
                        if tag_name in ["Make", "Model", "LensModel", "FocalLength", "ISOSpeedRatings", "ExposureTime", "FNumber", "Software", "DateTimeOriginal", "DateTime"]:
                            # Convert complex values to strings/floats
                            if isinstance(value, bytes):
                                try:
                                    value = value.decode("utf-8", "ignore")
                                except Exception:
                                    value = str(value)
                            elif hasattr(value, "numerator") and hasattr(value, "denominator"):
                                if value.denominator != 0:
                                    value = float(value.numerator) / float(value.denominator)
                            exif_data[tag_name] = value

                    # Parse Capture timestamp
                    dt_str = exif_data.get("DateTimeOriginal") or exif_data.get("DateTime")
                    if dt_str and isinstance(dt_str, str):
                        try:
                            capture_dt = datetime.strptime(dt_str.strip(), "%Y:%m:%d %H:%M:%S")
                        except Exception:
                            pass
                except Exception:
                    pass

            # Generate Thumbnail
            max_size = (900, 900)
            thumb = img.copy()
            thumb.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Convert to RGB if needed (e.g. RGBA or CMYK)
            if thumb.mode in ("RGBA", "P"):
                thumb = thumb.convert("RGB")
            elif thumb.mode == "CMYK":
                thumb = thumb.convert("RGB")

            output_io = io.BytesIO()
            thumb.save(output_io, format="WEBP", quality=85, method=6)
            thumbnail_bytes = output_io.getvalue()

            return thumbnail_bytes, orig_w, orig_h, exif_data, capture_dt

thumbnail_service = ThumbnailService()
