export interface WeddingPublic {
  id: string;
  slug: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  venue?: string;
  welcome_message?: string;
  cover_image?: string;
  gallery_status: 'active' | 'paused' | 'archived';
  face_search_enabled: boolean;
  allow_original_downloads: boolean;
  created_at: string;
}

export interface WeddingAdmin extends WeddingPublic {
  photo_count: number;
  device_count: number;
  total_downloads: number;
  storage_mb: number;
}

export interface Photo {
  id: string;
  wedding_id: string;
  source_device_id?: string;
  original_url: string;
  thumbnail_url: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  width: number;
  height: number;
  checksum: string;
  capture_timestamp?: string;
  upload_timestamp: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  exif_metadata: Record<string, any>;
  created_at: string;
}

export interface Device {
  id: string;
  wedding_id: string;
  device_name: string;
  device_type: 'android_direct' | 'usb_adb' | 'dslr_folder' | 'dslr_ftp' | 'manual_web' | 'hdmi_capture';
  authentication_status: 'active' | 'revoked';
  last_seen?: string;
  created_at: string;
  photo_count: number;
}

export interface FaceMatch {
  photo: Photo;
  confidence: number;
  match_score: number;
}

export interface AnalyticsSummary {
  total_photos: number;
  total_downloads: number;
  total_devices: number;
  active_devices: number;
  storage_mb: number;
  faces_indexed: number;
  latest_upload_time?: string;
}
