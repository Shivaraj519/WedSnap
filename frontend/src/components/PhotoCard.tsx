import React, { useState } from 'react';
import { Download, Check, Camera, Maximize2 } from 'lucide-react';
import { Photo } from '../types';
import { api } from '../services/api';

interface PhotoCardProps {
  photo: Photo;
  isSelected: boolean;
  onToggleSelect: (photoId: string) => void;
  onOpenLightbox: (photo: Photo) => void;
  selectionMode: boolean;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  isSelected,
  onToggleSelect,
  onOpenLightbox,
  selectionMode,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    try {
      const url = api.getOriginalDownloadUrl(photo.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.original_filename || `photo_${photo.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(() => setIsDownloading(false), 1200);
    }
  };

  const cameraModel = photo.exif_metadata?.Model || photo.exif_metadata?.Make;

  return (
    <div
      onClick={() => {
        if (selectionMode) {
          onToggleSelect(photo.id);
        } else {
          onOpenLightbox(photo);
        }
      }}
      className={`group relative overflow-hidden bg-cream-surface rounded-lg cursor-pointer transition-all duration-300 transform-gpu ${
        isSelected
          ? 'ring-2 ring-champagne scale-[0.98]'
          : 'hover:shadow-lg hover:-translate-y-0.5'
      }`}
    >
      {/* Thumbnail Aspect Ratio Placeholder */}
      <div className="aspect-[4/5] sm:aspect-[3/4] w-full overflow-hidden bg-cream/40">
        <img
          src={api.getThumbnailUrl(photo.id)}
          alt={photo.original_filename}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105 ${
            isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
          }`}
        />
      </div>

      {/* Selection Checkmark Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(photo.id);
        }}
        className={`absolute top-3 left-3 w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
          isSelected
            ? 'bg-champagne border-champagne text-white shadow-md'
            : 'bg-black/30 border-white/60 text-transparent hover:border-white'
        } ${selectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <Check className="w-4 h-4 stroke-[2.5]" />
      </button>

      {/* Quick Action Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Bottom Info Bar */}
      <div className="absolute bottom-0 inset-x-0 p-3 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="text-white text-[11px] truncate pr-2">
          {cameraModel && (
            <span className="flex items-center space-x-1 font-medium tracking-wide drop-shadow">
              <Camera className="w-3 h-3 text-champagne-light" />
              <span className="truncate">{cameraModel}</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1 pointer-events-auto">
          <button
            onClick={() => onOpenLightbox(photo)}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition"
            title="Expand Full Screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-2 rounded-full bg-champagne hover:bg-champagne-hover text-white shadow-sm transition"
            title="Download HD Original"
          >
            {isDownloading ? (
              <Check className="w-3.5 h-3.5 animate-bounce" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
