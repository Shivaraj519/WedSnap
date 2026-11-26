import { WeddingPublic, WeddingAdmin, Photo, Device, FaceMatch, AnalyticsSummary } from '../types';

export const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '' 
    : 'https://wedsnap-1.onrender.com');

class ApiService {
  private getHeaders(token?: string): HeadersInit {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // --- Public Guest API ---
  async getWedding(slugOrId: string): Promise<WeddingPublic> {
    const res = await fetch(`${API_BASE_URL}/api/v1/weddings/${slugOrId}`);
    if (!res.ok) throw new Error('Wedding gallery not found');
    return res.json();
  }

  async getPhotos(slugOrId: string, page = 1, limit = 50): Promise<{ items: Photo[]; total: number; has_more: boolean }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/photos?wedding_slug_or_id=${slugOrId}&page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error('Failed to load wedding photos');
    return res.json();
  }

  getThumbnailUrl(photoId: string): string {
    return `${API_BASE_URL}/api/v1/photos/${photoId}/thumbnail`;
  }

  getOriginalDownloadUrl(photoId: string): string {
    return `${API_BASE_URL}/api/v1/photos/${photoId}/download`;
  }

  getQRCodeUrl(slug: string): string {
    return `${API_BASE_URL}/api/v1/qr/${slug}`;
  }

  getTableCardUrl(slug: string): string {
    return `${API_BASE_URL}/api/v1/qr/${slug}/table-card`;
  }

  async searchMyPhotos(
    slugOrId: string,
    selfieFile: File,
    consent: boolean
  ): Promise<{ matches: FaceMatch[]; total_matches: number; message: string }> {
    const formData = new FormData();
    formData.append('file', selfieFile);
    formData.append('consent', consent ? 'true' : 'false');

    const res = await fetch(`${API_BASE_URL}/api/v1/face-search/${slugOrId}`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Facial search failed');
    }
    return res.json();
  }

  async batchDownload(photoIds: string[]): Promise<Blob> {
    const res = await fetch(`${API_BASE_URL}/api/v1/photos/batch-download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photoIds),
    });
    if (!res.ok) throw new Error('Batch download failed');
    return res.blob();
  }

  // --- Admin API ---
  async adminLogin(slugOrId: string, password: string): Promise<{ access_token: string; wedding_id: string; slug: string }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wedding_id_or_slug: slugOrId, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Authentication failed');
    }
    return res.json();
  }

  async getAdminWedding(weddingId: string, token: string): Promise<WeddingAdmin> {
    const res = await fetch(`${API_BASE_URL}/api/v1/weddings/${weddingId}/admin-details`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to fetch admin wedding details');
    return res.json();
  }

  async updateWedding(weddingId: string, data: Partial<WeddingPublic>, token: string): Promise<WeddingPublic> {
    const res = await fetch(`${API_BASE_URL}/api/v1/weddings/${weddingId}`, {
      method: 'PATCH',
      headers: {
        ...this.getHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update wedding settings');
    return res.json();
  }

  async listDevices(token: string): Promise<Device[]> {
    const res = await fetch(`${API_BASE_URL}/api/v1/devices`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to fetch paired devices');
    return res.json();
  }

  async registerDevice(
    weddingSlugOrId: string,
    deviceName: string,
    deviceType: string
  ): Promise<{ device_id: string; api_token: string; device_name: string }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wedding_id_or_slug: weddingSlugOrId,
        device_name: deviceName,
        device_type: deviceType,
      }),
    });
    if (!res.ok) throw new Error('Failed to register device');
    return res.json();
  }

  async revokeDevice(deviceId: string, token: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/devices/${deviceId}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to revoke device');
  }

  async deletePhoto(photoId: string, token: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/photos/${photoId}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to delete photo');
  }

  async getAnalytics(weddingId: string, token: string): Promise<AnalyticsSummary> {
    const res = await fetch(`${API_BASE_URL}/api/v1/analytics/${weddingId}`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to load analytics');
    return res.json();
  }

  async purgeBiometrics(weddingId: string, token: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/face-search/${weddingId}/purge`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to purge biometric records');
  }
}

export const api = new ApiService();
