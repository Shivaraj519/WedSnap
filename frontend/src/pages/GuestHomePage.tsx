import React, { useEffect, useState, useMemo } from 'react';
import { Sparkles, Download, CheckSquare, Square, RefreshCw, AlertCircle, Heart } from 'lucide-react';
import { WeddingPublic, Photo } from '../types';
import { api } from '../services/api';
import { LiveSyncManager } from '../services/websocket';
import { PhotoCard } from '../components/PhotoCard';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { FindMyPhotosModal } from '../components/FindMyPhotosModal';
import { QRCodeModal } from '../components/QRCodeModal';

interface GuestHomePageProps {
  weddingSlug: string;
  onOpenAdmin: () => void;
}

export const GuestHomePage: React.FC<GuestHomePageProps> = ({
  weddingSlug,
  onOpenAdmin,
}) => {
  const [wedding, setWedding] = useState<WeddingPublic | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection & Lightbox
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<Photo | null>(null);
  const [isFindMyPhotosOpen, setIsFindMyPhotosOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(true);

  // Fetch initial wedding details and photos
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const wData = await api.getWedding(weddingSlug);
        if (!isMounted) return;
        setWedding(wData);

        const pData = await api.getPhotos(weddingSlug, 1, 100);
        if (!isMounted) return;
        setPhotos(pData.items);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Unable to load wedding gallery');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    // Initialize real-time WebSocket connection
    const liveSync = new LiveSyncManager(
      weddingSlug,
      (newPhoto) => {
        setPhotos((prev) => {
          if (prev.some((p) => p.id === newPhoto.id)) return prev;
          return [newPhoto, ...prev];
        });
      },
      (deletedPhotoId) => {
        setPhotos((prev) => prev.filter((p) => p.id !== deletedPhotoId));
        setSelectedPhotoIds((prev) => {
          const next = new Set(prev);
          next.delete(deletedPhotoId);
          return next;
        });
      }
    );

    return () => {
      isMounted = false;
      liveSync.destroy();
    };
  }, [weddingSlug]);

  const toggleSelect = (photoId: string) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPhotoIds.size === photos.length) {
      setSelectedPhotoIds(new Set());
    } else {
      setSelectedPhotoIds(new Set(photos.map((p) => p.id)));
    }
  };

  const handleBatchDownload = async () => {
    if (selectedPhotoIds.size === 0) return;
    setIsBatchDownloading(true);
    try {
      const blob = await api.batchDownload(Array.from(selectedPhotoIds));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WedSnap_${weddingSlug}_Selection.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Batch download error: ' + err.message);
    } finally {
      setIsBatchDownloading(false);
    }
  };

  const formattedDate = useMemo(() => {
    if (!wedding?.wedding_date) return '';
    try {
      return new Date(wedding.wedding_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return wedding.wedding_date;
    }
  }, [wedding?.wedding_date]);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-champagne border-t-transparent rounded-full animate-spin" />
        <p className="font-serif text-lg tracking-widest text-charcoal">ENTERING WEDDING GALLERY...</p>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className="max-w-md mx-auto my-24 p-8 text-center bg-cream/40 rounded-2xl border border-cream-surface space-y-4">
        <AlertCircle className="w-10 h-10 text-champagne mx-auto stroke-[1.5]" />
        <h2 className="font-serif text-2xl text-charcoal">Gallery Not Found</h2>
        <p className="text-xs text-charcoal-muted leading-relaxed">
          {error || 'The requested wedding identifier is invalid or has ended.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Editorial Luxury Hero */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 text-center max-w-4xl mx-auto space-y-6">
        {/* Subtle Ornamental Crown */}
        <div className="flex items-center justify-center space-x-3 text-champagne">
          <span className="h-[1px] w-12 bg-champagne/40" />
          <span className="text-xs tracking-[0.25em] uppercase font-sans font-medium text-champagne-accent">
            THE WEDDING CELEBRATION OF
          </span>
          <span className="h-[1px] w-12 bg-champagne/40" />
        </div>

        {/* Bride & Groom Headings */}
        <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-normal text-charcoal tracking-wide uppercase leading-tight">
          {wedding.bride_name} <span className="text-champagne font-light italic">&</span> {wedding.groom_name}
        </h1>

        {/* Date & Venue */}
        <div className="text-xs sm:text-sm tracking-[0.18em] uppercase text-charcoal-muted font-sans font-medium">
          {formattedDate} {wedding.venue && <span>• {wedding.venue}</span>}
        </div>

        {/* Introduction */}
        {wedding.welcome_message && (
          <p className="max-w-xl mx-auto text-xs sm:text-sm text-charcoal/80 leading-relaxed font-sans font-normal pt-2">
            {wedding.welcome_message}
          </p>
        )}

        {/* Primary Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
          {wedding.face_search_enabled && (
            <button
              onClick={() => setIsFindMyPhotosOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-champagne hover:bg-champagne-hover text-white text-xs font-bold tracking-[0.15em] uppercase shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>FIND MY PHOTOS</span>
            </button>
          )}

          <a
            href="#gallery-feed"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full border border-champagne text-charcoal hover:bg-cream-surface text-xs font-semibold tracking-[0.15em] uppercase transition-all"
          >
            VIEW LIVE GALLERY ({photos.length})
          </a>
        </div>

        {/* Live Synchronizing Pill */}
        <div className="pt-4 flex items-center justify-center space-x-2 text-[11px] text-charcoal-muted">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-medium tracking-wide">
            Live Stream Active • DSLRs & Mobile Cameras Connected
          </span>
        </div>
      </section>

      {/* Main Live Gallery Section */}
      <section id="gallery-feed" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        {/* Gallery Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-cream-surface">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-charcoal">
              Live Wedding Gallery
            </h2>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Showing newest photographs first • Preserved in original HD resolution
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {photos.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="px-3.5 py-1.5 rounded-full border border-cream-surface hover:border-champagne text-charcoal text-xs font-medium flex items-center space-x-1.5 transition"
              >
                {selectedPhotoIds.size === photos.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-champagne" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-charcoal-muted" />
                )}
                <span>
                  {selectedPhotoIds.size === photos.length ? 'Deselect All' : 'Select All'}
                </span>
              </button>
            )}

            {selectedPhotoIds.size > 0 && (
              <button
                onClick={handleBatchDownload}
                disabled={isBatchDownloading}
                className="px-4 py-1.5 rounded-full bg-champagne text-white text-xs font-semibold tracking-wider flex items-center space-x-1.5 transition shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isBatchDownloading
                    ? 'PREPARING ZIP...'
                    : `DOWNLOAD (${selectedPhotoIds.size}) HD`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Photos Grid */}
        {photos.length === 0 ? (
          <div className="py-24 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-cream-surface flex items-center justify-center text-champagne mx-auto">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="font-serif text-xl text-charcoal">Awaiting First Captures</h3>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              Photographers are currently shooting. Newly captured photos from mobile cameras and tethered DSLRs will automatically stream to this screen without needing a page refresh.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 pt-6">
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                isSelected={selectedPhotoIds.has(photo.id)}
                onToggleSelect={toggleSelect}
                onOpenLightbox={(p) => setActiveLightboxPhoto(p)}
                selectionMode={selectedPhotoIds.size > 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* Lightbox Modal */}
      {activeLightboxPhoto && (
        <PhotoLightbox
          photo={activeLightboxPhoto}
          photos={photos}
          onClose={() => setActiveLightboxPhoto(null)}
          onNavigate={(p) => setActiveLightboxPhoto(p)}
        />
      )}

      {/* Find My Photos Modal */}
      <FindMyPhotosModal
        isOpen={isFindMyPhotosOpen}
        onClose={() => setIsFindMyPhotosOpen(false)}
        weddingSlug={weddingSlug}
        onOpenPhotoLightbox={(p) => {
          setIsFindMyPhotosOpen(false);
          setActiveLightboxPhoto(p);
        }}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        wedding={wedding}
      />
    </div>
  );
};
