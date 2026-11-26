import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, BigInteger, 
    Float, DateTime, Date, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.database.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class Wedding(Base):
    __tablename__ = "weddings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    bride_name = Column(String(150), nullable=False)
    groom_name = Column(String(150), nullable=False)
    wedding_date = Column(Date, nullable=False, default=date.today)
    venue = Column(String(255), default="Grand Ballroom & Pavilion")
    welcome_message = Column(
        Text, 
        default="Welcome to our wedding! Every candid moment captured by our photographers is streamed directly here in real-time."
    )
    cover_image = Column(Text, nullable=True)
    gallery_status = Column(String(20), nullable=False, default="active") # active, paused, archived
    face_search_enabled = Column(Boolean, nullable=False, default=True)
    allow_original_downloads = Column(Boolean, nullable=False, default=True)
    passcode = Column(String(100), nullable=True)
    admin_password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    devices = relationship("Device", back_populates="wedding", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="wedding", cascade="all, delete-orphan")
    face_indexes = relationship("FaceIndex", back_populates="wedding", cascade="all, delete-orphan")
    face_search_sessions = relationship("FaceSearchSession", back_populates="wedding", cascade="all, delete-orphan")
    download_logs = relationship("DownloadLog", back_populates="wedding", cascade="all, delete-orphan")


class Device(Base):
    __tablename__ = "devices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    wedding_id = Column(String(36), ForeignKey("weddings.id", ondelete="CASCADE"), nullable=False, index=True)
    device_name = Column(String(150), nullable=False)
    device_type = Column(String(50), nullable=False) # 'android_direct', 'usb_adb', 'dslr_folder', 'dslr_ftp', 'manual_web'
    api_token_hash = Column(String(255), unique=True, nullable=False, index=True)
    authentication_status = Column(String(20), nullable=False, default="active") # active, revoked
    last_ip = Column(String(64), nullable=True)
    last_seen = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    wedding = relationship("Wedding", back_populates="devices")
    photos = relationship("Photo", back_populates="source_device")


class Photo(Base):
    __tablename__ = "photos"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    wedding_id = Column(String(36), ForeignKey("weddings.id", ondelete="CASCADE"), nullable=False, index=True)
    source_device_id = Column(String(36), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True)
    original_storage_path = Column(Text, nullable=False)
    thumbnail_storage_path = Column(Text, nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    mime_type = Column(String(50), nullable=False)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    checksum = Column(String(64), nullable=False, index=True) # SHA-256 for duplicate prevention
    capture_timestamp = Column(DateTime, nullable=True)
    upload_timestamp = Column(DateTime, default=datetime.utcnow)
    processing_status = Column(String(20), nullable=False, default="completed") # pending, processing, completed, failed
    exif_metadata = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    wedding = relationship("Wedding", back_populates="photos")
    source_device = relationship("Device", back_populates="photos")
    face_indexes = relationship("FaceIndex", back_populates="photo", cascade="all, delete-orphan")
    download_logs = relationship("DownloadLog", back_populates="photo")


class FaceIndex(Base):
    __tablename__ = "face_index"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    wedding_id = Column(String(36), ForeignKey("weddings.id", ondelete="CASCADE"), nullable=False, index=True)
    photo_id = Column(String(36), ForeignKey("photos.id", ondelete="CASCADE"), nullable=False, index=True)
    embedding_json = Column(JSON, nullable=True) # Stored vector as array of floats
    bounding_box = Column(JSON, default={"x": 0, "y": 0, "w": 0, "h": 0})
    confidence = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    wedding = relationship("Wedding", back_populates="face_indexes")
    photo = relationship("Photo", back_populates="face_indexes")


class FaceSearchSession(Base):
    __tablename__ = "face_search_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    wedding_id = Column(String(36), ForeignKey("weddings.id", ondelete="CASCADE"), nullable=False, index=True)
    consent_status = Column(Boolean, nullable=False, default=True)
    consent_timestamp = Column(DateTime, default=datetime.utcnow)
    client_ip_hash = Column(String(64), nullable=True)
    expires_at = Column(DateTime, nullable=False)

    wedding = relationship("Wedding", back_populates="face_search_sessions")


class DownloadLog(Base):
    __tablename__ = "download_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    wedding_id = Column(String(36), ForeignKey("weddings.id", ondelete="CASCADE"), nullable=False, index=True)
    photo_id = Column(String(36), ForeignKey("photos.id", ondelete="SET NULL"), nullable=True)
    download_type = Column(String(20), nullable=False, default="single_hd") # single_hd, batch_zip
    client_ip_hash = Column(String(64), nullable=True)
    user_agent = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    wedding = relationship("Wedding", back_populates="download_logs")
    photo = relationship("Photo", back_populates="download_logs")
