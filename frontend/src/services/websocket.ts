import { API_BASE_URL } from './api';
import { Photo } from '../types';

export class LiveSyncManager {
  private ws: WebSocket | null = null;
  private weddingSlugOrId: string;
  private onPhotoNewCallback: (photo: Photo) => void;
  private onPhotoDeletedCallback: (photoId: string) => void;
  private reconnectAttempts = 0;
  private isDestroyed = false;
  private heartbeatInterval: any = null;

  constructor(
    weddingSlugOrId: string,
    onPhotoNew: (photo: Photo) => void,
    onPhotoDeleted: (photoId: string) => void
  ) {
    this.weddingSlugOrId = weddingSlugOrId;
    this.onPhotoNewCallback = onPhotoNew;
    this.onPhotoDeletedCallback = onPhotoDeleted;
    this.connect();
  }

  private connect() {
    if (this.isDestroyed) return;

    // Convert http/https to ws/wss
    const wsBase = API_BASE_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/live/${this.weddingSlugOrId}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'photo:new' && data.photo) {
            this.onPhotoNewCallback(data.photo);
          } else if (data.type === 'photo:deleted' && data.photo_id) {
            this.onPhotoDeletedCallback(data.photo_id);
          }
        } catch {
          // ignore malformed frame
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.isDestroyed) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  public destroy() {
    this.isDestroyed = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
