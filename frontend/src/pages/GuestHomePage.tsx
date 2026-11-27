import React, { useEffect, useState, useMemo } from 'react';
import { Sparkles, Download, CheckSquare, Square, RefreshCw, AlertCircle, Heart, ChevronDown, Camera, Zap } from 'lucide-react';
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
        <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="font-serif text-lg tracking-widest text-stone-800">ENTERING WEDDING GALLERY...</p>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className="max-w-md mx-auto my-24 p-8 text-center bg-[#FAF3EB] rounded-3xl border border-[#E8D4BE] space-y-4 shadow-sm">
        <AlertCircle className="w-10 h-10 text-orange-600 mx-auto stroke-[1.5]" />
        <h2 className="font-serif text-2xl text-stone-900">Gallery Not Found</h2>
        <p className="text-xs text-stone-600 leading-relaxed">
          {error || 'The requested wedding identifier is invalid or has ended.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ambient warm orange-beige glow orbs */}
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-orange-300/15 rounded-full blur-3xl pointer-events-none -z-10 animate-float" />
      <div className="absolute top-48 right-10 w-[450px] h-[450px] bg-amber-300/15 rounded-full blur-3xl pointer-events-none -z-10 animate-float-slow" />

      {/* Editorial Luxury Hero with Blended Couple Photo Backgrounds */}
      <section className="relative min-h-[92vh] flex items-center justify-center pt-16 pb-20 px-4 text-center overflow-hidden">
        {/* Full-Bleed Primary Couple Photo in Background */}
        <div className="absolute inset-0 -z-20 overflow-hidden">
          <img
            src="/hero_couple.jpg"
            alt="Vinutha B.S. & Mayuresh C.Noola Wedding Backdrop"
            className="w-full h-full object-cover object-center filter brightness-[0.88] contrast-[1.05] transform scale-105 transition-transform duration-1000 ease-out"
          />
          {/* Seamless Warm Orange/Amber Luxury Vignette Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/60 via-stone-900/30 to-[#F8EFE4]" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-amber-950/20 to-black/60 pointer-events-none" />
        </div>

        {/* Left Blended Ambient Photo Panel: Sacred Ritual */}
        <div className="hidden xl:flex flex-col items-center absolute left-10 top-1/2 -translate-y-1/2 z-10 w-64 p-2 rounded-2xl bg-black/40 backdrop-blur-md border border-amber-300/40 shadow-2xl rotate-[-3deg] hover:rotate-0 hover:scale-105 transition-all duration-500 group animate-float">
          <div className="w-full h-72 rounded-xl overflow-hidden relative">
            <img
              src="/ceremony_ritual.jpg"
              alt="Sacred Wedding Ritual"
              className="w-full h-full object-cover filter brightness-95 group-hover:brightness-105 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 text-left">
              <span className="text-[10px] tracking-widest uppercase font-semibold text-amber-300">TRADITIONAL RITUAL</span>
              <p className="text-xs text-white font-serif italic">Sacred Blessings</p>
            </div>
          </div>
        </div>

        {/* Right Blended Ambient Photo Panel: Mandap Celebration */}
        <div className="hidden xl:flex flex-col items-center absolute right-10 top-1/2 -translate-y-1/2 z-10 w-64 p-2 rounded-2xl bg-black/40 backdrop-blur-md border border-amber-300/40 shadow-2xl rotate-[3deg] hover:rotate-0 hover:scale-105 transition-all duration-500 group animate-float-slow">
          <div className="w-full h-72 rounded-xl overflow-hidden relative">
            <img
              src="/mandap_celebration.jpg"
              alt="Mandap Wedding Ceremony"
              className="w-full h-full object-cover filter brightness-95 group-hover:brightness-105 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 text-left">
              <span className="text-[10px] tracking-widest uppercase font-semibold text-amber-300">MANDAP CEREMONY</span>
              <p className="text-xs text-white font-serif italic">Auspicious Vows</p>
            </div>
          </div>
        </div>

        {/* Frameless Hero Centerpiece - Transparent and Visually Blended */}
        <div className="relative z-10 max-w-4xl w-full mx-auto space-y-6 px-4">
          {/* Royal Gold Header Crown */}
          <div className="flex items-center justify-center space-x-3 text-amber-300 drop-shadow-md">
            <span className="h-[1px] w-12 sm:w-20 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
            <span className="text-[11px] sm:text-xs tracking-[0.3em] uppercase font-sans font-semibold text-amber-200 drop-shadow">
              THE WEDDING CELEBRATION OF
            </span>
            <span className="h-[1px] w-12 sm:w-20 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
          </div>

          {/* Bride & Groom Royal Serif Title */}
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal text-white tracking-wider uppercase leading-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
            {wedding.bride_name} <span className="text-amber-400 font-light italic font-serif">&</span> {wedding.groom_name}
          </h1>

          {/* Date & Venue Badge */}
          <div className="inline-block px-5 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-amber-300/30 text-amber-100 text-xs sm:text-sm tracking-[0.2em] uppercase font-sans font-medium drop-shadow-md">
            {formattedDate} {wedding.venue && <span>• {wedding.venue}</span>}
          </div>

          {/* Mobile Blended Visual Panels (Shown on screens < 1280px) */}
          <div className="xl:hidden flex items-center justify-center gap-3 pt-2">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-amber-300/50 shadow-xl relative">
              <img src="/ceremony_ritual.jpg" alt="Rituals" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-1.5">
                <span className="text-[9px] text-amber-200 font-medium tracking-wider uppercase">Rituals</span>
              </div>
            </div>
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-amber-300/50 shadow-xl relative">
              <img src="/mandap_celebration.jpg" alt="Mandap" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-1.5">
                <span className="text-[9px] text-amber-200 font-medium tracking-wider uppercase">Mandap</span>
              </div>
            </div>
          </div>

          {/* Welcome Message */}
          {wedding.welcome_message && (
            <p className="max-w-xl mx-auto text-xs sm:text-sm text-stone-200 leading-relaxed font-sans font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] pt-1">
              {wedding.welcome_message}
            </p>
          )}

          {/* Primary Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            {wedding.face_search_enabled && (
              <button
                onClick={() => setIsFindMyPhotosOpen(true)}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:brightness-110 text-white text-xs font-bold tracking-[0.15em] uppercase shadow-xl shadow-orange-950/40 transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2.5 active:scale-95 border border-amber-300/40"
              >
                <Sparkles className="w-4 h-4 text-amber-100" />
                <span>FIND MY PHOTOS (AI FACE RECOGNITION)</span>
              </button>
            )}

            <a
              href="#gallery-feed"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full border border-amber-300/60 bg-black/40 hover:bg-black/60 text-amber-100 hover:text-white text-xs font-semibold tracking-[0.15em] uppercase transition-all shadow-lg backdrop-blur-sm hover:-translate-y-0.5"
            >
              VIEW LIVE GALLERY ({photos.length})
            </a>
          </div>

          {/* Live Synchronizing Pill */}
          <div className="pt-2 flex items-center justify-center space-x-2 text-[11px] text-amber-200/90 drop-shadow">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            <span className="font-medium tracking-wide">
              Live Stream Active • DSLR & Mobile Cameras Connected
            </span>
          </div>

          {/* Floating Animated Scroll Down Indicator */}
          <div className="pt-4 flex justify-center">
            <a
              href="#gallery-feed"
              className="inline-flex flex-col items-center space-y-1 px-6 py-2 rounded-full bg-black/40 hover:bg-black/60 text-amber-200 hover:text-white text-[11px] font-semibold tracking-widest uppercase transition-all shadow-lg border border-amber-300/30 backdrop-blur-sm animate-bounce-soft group"
            >
              <span>SCROLL DOWN TO LIVE STREAM</span>
              <ChevronDown className="w-4 h-4 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      {/* Main Live Gallery Section */}
      <section id="gallery-feed" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        {/* Gallery Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E8D4BE]">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-stone-900">
              Live Wedding Gallery
            </h2>
            <p className="text-xs text-stone-600 mt-0.5">
              Showing newest photographs first • Preserved in original HD resolution
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {photos.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="px-3.5 py-1.5 rounded-full border border-[#E8D4BE] bg-white hover:border-orange-400 text-stone-800 text-xs font-medium flex items-center space-x-1.5 transition shadow-sm"
              >
                {selectedPhotoIds.size === photos.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-orange-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-stone-400" />
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
                className="px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-105 text-white text-xs font-semibold tracking-wider flex items-center space-x-1.5 transition shadow"
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
            <div className="w-16 h-16 rounded-full bg-white border border-[#E8D4BE] flex items-center justify-center text-orange-600 mx-auto shadow-sm">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="font-serif text-xl text-stone-900">Awaiting First Captures</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Photographers are currently shooting. Newly captured photos from mobile cameras, HDMI live view, and tethered DSLRs will automatically stream to this screen without needing a page refresh.
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
          onPhotoDeleted={(deletedId) => {
            setPhotos((prev) => prev.filter((p) => p.id !== deletedId));
            setSelectedPhotoIds((prev) => {
              const next = new Set(prev);
              next.delete(deletedId);
              return next;
            });
          }}
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
