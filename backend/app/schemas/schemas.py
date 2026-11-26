from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ------------------------------------------------------------------------------
# WEDDING SCHEMAS
# ------------------------------------------------------------------------------
class WeddingBase(BaseModel):
    bride_name: str = Field(..., example="Sophia")
    groom_name: str = Field(..., example="Alexander")
    wedding_date: date = Field(..., example="2026-11-28")
    venue: Optional[str] = Field("Grand Ballroom & Lawn", example="Grand Ballroom & Lawn")
    welcome_message: Optional[str] = Field(
        "Welcome to our wedding! Every candid moment captured by our photographers is streamed directly here in real-time."
    )
    cover_image: Optional[str] = None
    face_search_enabled: bool = True
    allow_original_downloads: bool = True
    passcode: Optional[str] = None

class WeddingCreate(WeddingBase):
    slug: Optional[str] = None # Generated automatically if empty
    admin_password: str = Field(..., min_length=4, example="wedding2026")

class WeddingUpdate(BaseModel):
    bride_name: Optional[str] = None
    groom_name: Optional[str] = None
    wedding_date: Optional[date] = None
    venue: Optional[str] = None
    welcome_message: Optional[str] = None
    cover_image: Optional[str] = None
    gallery_status: Optional[str] = None # active, paused, archived
    face_search_enabled: Optional[bool] = None
    allow_original_downloads: Optional[bool] = None
    passcode: Optional[str] = None

class WeddingPublic(BaseModel):
    id: str
    slug: str
    bride_name: str
    groom_name: str
    wedding_date: date
    venue: Optional[str]
    welcome_message: Optional[str]
    cover_image: Optional[str]
    gallery_status: str
    face_search_enabled: bool
    allow_original_downloads: bool
    created_at: datetime

    class Config:
        from_attributes = True

class WeddingResponse(WeddingPublic):
    device_count: int = 0
    photo_count: int = 0
    total_downloads: int = 0
    storage_mb: float = 0.0

# ------------------------------------------------------------------------------
# DEVICE SCHEMAS
# ------------------------------------------------------------------------------
class DeviceRegisterRequest(BaseModel):
    wedding_id_or_slug: str
    device_name: str = Field(..., example="Sony A7 IV - Primary")
    device_type: str = Field("dslr_folder", example="dslr_folder") # 'android_direct', 'usb_adb', 'dslr_folder', 'dslr_ftp'

class DeviceRegisterResponse(BaseModel):
    device_id: str
    wedding_id: str
    wedding_slug: str
    device_name: str
    device_type: str
    api_token: str # Raw token returned only once upon pairing
    upload_endpoint: str

class DeviceResponse(BaseModel):
    id: str
    wedding_id: str
    device_name: str
    device_type: str
    authentication_status: str
    last_seen: Optional[datetime]
    created_at: datetime
    photo_count: int = 0

    class Config:
        from_attributes = True

# ------------------------------------------------------------------------------
# PHOTO SCHEMAS
# ------------------------------------------------------------------------------
class PhotoResponse(BaseModel):
    id: str
    wedding_id: str
    source_device_id: Optional[str]
    original_url: str
    thumbnail_url: str
    original_filename: str
    file_size: int
    mime_type: str
    width: int
    height: int
    checksum: str
    capture_timestamp: Optional[datetime]
    upload_timestamp: datetime
    processing_status: str
    exif_metadata: Dict[str, Any] = {}
    created_at: datetime

    class Config:
        from_attributes = True

class PhotoListResponse(BaseModel):
    items: List[PhotoResponse]
    total: int
    page: int
    limit: int
    has_more: bool

class ChecksumCheckRequest(BaseModel):
    checksum: str
    wedding_id: str

class ChecksumCheckResponse(BaseModel):
    exists: bool
    photo_id: Optional[str] = None

# ------------------------------------------------------------------------------
# FACE SEARCH SCHEMAS
# ------------------------------------------------------------------------------
class FaceMatchResult(BaseModel):
    photo: PhotoResponse
    confidence: float
    match_score: float # 0 to 100 percentage similarity

class FaceSearchResponse(BaseModel):
    matches: List[FaceMatchResult]
    total_matches: int
    faces_detected_in_selfie: int
    session_id: str
    message: str

# ------------------------------------------------------------------------------
# ANALYTICS & STATS SCHEMAS
# ------------------------------------------------------------------------------
class AnalyticsSummary(BaseModel):
    total_photos: int
    total_downloads: int
    total_devices: int
    active_devices: int
    storage_mb: float
    faces_indexed: int
    latest_upload_time: Optional[datetime]

# ------------------------------------------------------------------------------
# AUTH SCHEMAS
# ------------------------------------------------------------------------------
class AdminLoginRequest(BaseModel):
    wedding_id_or_slug: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    wedding_id: str
    slug: str
