import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Camera, Info, Calendar, ShieldCheck } from 'lucide-react';
import { Photo } from '../types';
import { api } from '../services/api';

interface PhotoLightboxProps {
  photo: Photo | null;
  photos: Photo[];
  onClose: () => void;
  onNavigate: (newPhoto: Photo) => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photo,
  photos,
  onClose,
  onNavigate,
}) => {
  const [showExif, setShowExif] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!photo) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo, photos]);

  if (!photo) return null;

  const currentIndex = photos.findIndex((p) => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const handlePrev = () => {
    if (hasPrev) onNavigate(photos[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) onNavigate(photos[currentIndex + 1]);
  };

  const handleDownload = () => {
    setIsDownloading(true);
    const url = api.getOriginalDownloadUrl(photo.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = photo.original_filename || `photo_${photo.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setIsDownloading(false), 1200);
  };

  const exif = photo.exif_metadata || {};
  const formattedDate = photo.capture_timestamp
    ? new Date(photo.capture_timestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/95 backdrop-blur-md flex flex-col justify-between text-white animate-fade-in">
      {/* Top Bar */}
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 z-10 bg-charcoal/40">
        <div className="text-xs text-white/70 font-sans tracking-wider">
          PHOTO {currentIndex + 1} OF {photos.length}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowExif(!showExif)}
            className={`p-2 rounded-full transition ${
              showExif ? 'bg-champagne text-white' : 'hover:bg-white/10 text-white/80'
            }`}
            title="Photo Details & EXIF"
          >
            <Info className="w-5 h-5" />
          </button>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-4 py-1.5 rounded-full bg-champagne hover:bg-champagne-hover text-white text-xs font-semibold tracking-wider flex items-center space-x-1.5 transition shadow"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'DOWNLOADING...' : 'DOWNLOAD HD'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/80 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Photo Center */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {hasPrev && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white transition z-20 backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <img
          src={api.getOriginalDownloadUrl(photo.id)}
          alt={photo.original_filename}
          className="max-h-[82vh] max-w-full object-contain rounded shadow-2xl transition-all select-none"
        />

        {hasNext && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white transition z-20 backdrop-blur-sm"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Slide-out EXIF Metadata Drawer */}
        {showExif && (
          <div className="absolute top-4 right-4 max-w-xs w-full bg-charcoal/90 border border-white/15 rounded-xl p-5 backdrop-blur-md shadow-2xl text-xs space-y-3 z-30 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-serif text-sm tracking-wider text-champagne font-semibold">
                CAMERA METADATA
              </span>
              <button onClick={() => setShowExif(false)} className="text-white/50 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-white/80">
              <div className="flex items-center space-x-2">
                <Camera className="w-3.5 h-3.5 text-champagne" />
                <span className="font-medium text-white">
                  {exif.Make} {exif.Model || 'Digital Camera'}
                </span>
              </div>

              {exif.LensModel && (
                <div className="text-[11px] text-white/60 pl-5">Lens: {exif.LensModel}</div>
              )}

              {formattedDate && (
                <div className="flex items-center space-x-2">
                  <Calendar className="w-3.5 h-3.5 text-champagne" />
                  <span>{formattedDate}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px]">
                {exif.FNumber && <div>Aperture: ƒ/{exif.FNumber}</div>}
                {exif.ExposureTime && <div>Shutter: {exif.ExposureTime}s</div>}
                {exif.ISOSpeedRatings && <div>ISO: {exif.ISOSpeedRatings}</div>}
                {photo.width > 0 && (
                  <div>
                    Resolution: {photo.width} × {photo.height}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-white/10 text-[10px] text-white/50 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-champagne" />
                <span>Original Uncompressed Quality Preserved</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Minimal Filename */}
      <div className="h-10 px-6 flex items-center justify-center text-[11px] text-white/40 tracking-wider font-mono">
        {photo.original_filename}
      </div>
    </div>
  );
};
