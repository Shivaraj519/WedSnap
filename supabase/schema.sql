-- ==============================================================================
-- WedSnap - Production Supabase PostgreSQL Schema
-- Includes pgvector extension for AI face recognition embeddings
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- pgvector extension for facial recognition embeddings (cosine similarity)
-- Supported natively by Supabase PostgreSQL
CREATE EXTENSION IF NOT EXISTS "vector";

-- ------------------------------------------------------------------------------
-- 1. WEDDINGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    bride_name VARCHAR(150) NOT NULL,
    groom_name VARCHAR(150) NOT NULL,
    wedding_date DATE NOT NULL,
    venue VARCHAR(255) DEFAULT 'Grand Ballroom & Lawn',
    welcome_message TEXT DEFAULT 'Thank you for celebrating this sacred milestone with us. Every moment and candid laughter is instantly captured and preserved for you below.',
    cover_image TEXT,
    gallery_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (gallery_status IN ('active', 'paused', 'archived')),
    face_search_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    allow_original_downloads BOOLEAN NOT NULL DEFAULT TRUE,
    passcode VARCHAR(100), -- Optional wedding gallery lock
    admin_password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weddings_slug ON weddings(slug);

-- ------------------------------------------------------------------------------
-- 2. DEVICES TABLE (Mobile apps, DSLR connectors, USB ADB bridges)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    device_name VARCHAR(150) NOT NULL,
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('android_direct', 'usb_adb', 'dslr_folder', 'dslr_ftp', 'manual_web')),
    api_token_hash VARCHAR(255) NOT NULL UNIQUE,
    authentication_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (authentication_status IN ('active', 'revoked')),
    last_ip VARCHAR(64),
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_wedding_id ON devices(wedding_id);
CREATE INDEX IF NOT EXISTS idx_devices_token ON devices(api_token_hash);

-- ------------------------------------------------------------------------------
-- 3. PHOTOS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    source_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    original_storage_path TEXT NOT NULL,
    thumbnail_storage_path TEXT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    width INTEGER DEFAULT 0,
    height INTEGER DEFAULT 0,
    checksum VARCHAR(64) NOT NULL, -- SHA-256 for duplicate prevention
    capture_timestamp TIMESTAMP WITH TIME ZONE,
    upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    exif_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compound index for fast gallery retrieval (newest first per wedding)
CREATE INDEX IF NOT EXISTS idx_photos_wedding_created ON photos(wedding_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_wedding_checksum ON photos(wedding_id, checksum);

-- ------------------------------------------------------------------------------
-- 4. FACE INDEX TABLE (Biometric Embeddings & Detection Coordinates)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS face_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    -- 512-dimension vector embedding (InsightFace / ArcFace standard representation)
    embedding vector(512),
    -- Fallback float array if pgvector is not available in local SQLite / test run
    embedding_json JSONB,
    bounding_box JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "w": 0, "h": 0}'::jsonb,
    confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_face_index_wedding ON face_index(wedding_id);
CREATE INDEX IF NOT EXISTS idx_face_index_photo ON face_index(photo_id);

-- Optional IVFFlat index on pgvector for rapid cosine similarity searches in large weddings
-- CREATE INDEX idx_face_vector_cosine ON face_index USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ------------------------------------------------------------------------------
-- 5. FACE SEARCH SESSIONS (Privacy & Consent Audit Log)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS face_search_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    consent_status BOOLEAN NOT NULL DEFAULT TRUE,
    consent_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_ip_hash VARCHAR(64),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_face_sessions_expiry ON face_search_sessions(expires_at);

-- ------------------------------------------------------------------------------
-- 6. DOWNLOAD LOGS TABLE (Analytics & Audit)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,
    download_type VARCHAR(20) NOT NULL DEFAULT 'single_hd' CHECK (download_type IN ('single_hd', 'batch_zip')),
    client_ip_hash VARCHAR(64),
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_download_logs_wedding ON download_logs(wedding_id, timestamp DESC);

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_search_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

-- Public can view active wedding details
CREATE POLICY "Public can view active weddings" ON weddings
    FOR SELECT USING (gallery_status = 'active');

-- Public can view photos of active weddings
CREATE POLICY "Public can view photos" ON photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM weddings 
            WHERE weddings.id = photos.wedding_id 
            AND weddings.gallery_status = 'active'
        )
    );

-- Service role / backend API key has full access
CREATE POLICY "Service role full access weddings" ON weddings FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access devices" ON devices FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access photos" ON photos FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access face_index" ON face_index FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access face_sessions" ON face_search_sessions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access download_logs" ON download_logs FOR ALL TO service_role USING (true);

-- ------------------------------------------------------------------------------
-- 8. STORAGE BUCKET CONFIGURATION (Supabase Storage)
-- ------------------------------------------------------------------------------
-- Execute in Supabase SQL editor to create storage buckets:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('wedding-photos-original', 'wedding-photos-original', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('wedding-photos-thumbnails', 'wedding-photos-thumbnails', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('wedding-temp-selfies', 'wedding-temp-selfies', false);
