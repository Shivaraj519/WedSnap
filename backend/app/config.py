import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "WedSnap"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development" # "development" | "production"
    SECRET_KEY: str = "wedsnap-super-secure-production-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Database
    # Supports Supabase PostgreSQL URL e.g. postgresql://postgres.xxxx:password@aws-0-region.pooler.supabase.com:6543/postgres
    # Defaults to local sqlite for seamless zero-setup testing if DB url not provided
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./wedsnap_local.db"
    )
    
    # Supabase credentials (optional for managed cloud storage)
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL", None)
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_ROLE_KEY", None)
    SUPABASE_STORAGE_BUCKET_ORIGINAL: str = "wedding-photos-original"
    SUPABASE_STORAGE_BUCKET_THUMBNAILS: str = "wedding-photos-thumbnails"
    
    # Local Storage fallback directory when testing or when Supabase keys are not provided
    STORAGE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage_data")
    
    # Facial Recognition configuration
    FACE_SIMILARITY_THRESHOLD: float = 0.58 # Cosine distance threshold (lower = stricter match)
    FACE_DETECTION_CONFIDENCE: float = 0.80
    
    # Frontend Base URL (for generating live QR codes)
    FRONTEND_BASE_URL: str = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    
    # CORS Origins
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://wedsnap.vercel.app",
        "*"
    ]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure local storage directories exist
os.makedirs(os.path.join(settings.STORAGE_DIR, "originals"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "thumbnails"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "temp_selfies"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "qr_codes"), exist_ok=True)
