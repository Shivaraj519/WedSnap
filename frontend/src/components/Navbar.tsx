import React from 'react';
import { Camera, Sparkles, Shield, QrCode } from 'lucide-react';
import { WeddingPublic } from '../types';

interface NavbarProps {
  wedding?: WeddingPublic | null;
  onOpenFindMyPhotos?: () => void;
  onOpenAdmin?: () => void;
  onOpenQR?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  wedding,
  onOpenFindMyPhotos,
  onOpenAdmin,
  onOpenQR,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-ivory/90 backdrop-blur-md border-b border-cream-surface/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Monogram */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full border border-champagne flex items-center justify-center text-champagne bg-ivory-light shadow-sm">
            <Camera className="w-5 h-5 stroke-[1.5]" />
          </div>
          <div>
            <span className="font-serif text-2xl tracking-[0.2em] font-medium text-charcoal block leading-none">
              WEDSNAP
            </span>
            <span className="text-[10px] tracking-[0.18em] uppercase text-champagne-accent font-sans block mt-1">
              Live Wedding Memories
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {wedding && onOpenQR && (
            <button
              onClick={onOpenQR}
              className="p-2 sm:px-3 sm:py-2 rounded-full border border-champagne/40 hover:border-champagne text-charcoal hover:text-champagne-accent transition text-xs font-medium flex items-center space-x-1.5"
              title="View Wedding QR Code"
            >
              <QrCode className="w-4 h-4 text-champagne" />
              <span className="hidden sm:inline">QR Code</span>
            </button>
          )}

          {wedding && wedding.face_search_enabled && onOpenFindMyPhotos && (
            <button
              onClick={onOpenFindMyPhotos}
              className="px-4 py-2 rounded-full bg-champagne text-white hover:bg-champagne-hover transition-all text-xs sm:text-sm font-medium tracking-wide shadow-sm flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Find My Photos</span>
            </button>
          )}

          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="p-2 text-charcoal-muted hover:text-charcoal transition"
              title="Admin Portal"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
