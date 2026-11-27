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
    <header className="sticky top-0 z-40 bg-[#FAF3EB]/90 backdrop-blur-md border-b border-[#E8D4BE] shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Monogram */}
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl border border-orange-300 flex items-center justify-center text-orange-700 bg-white shadow-sm">
            <Camera className="w-5 h-5 stroke-[1.5]" />
          </div>
          <div>
            <span className="font-serif text-2xl tracking-[0.2em] font-medium text-stone-900 block leading-none">
              WEDSNAP
            </span>
            <span className="text-[10px] tracking-[0.18em] uppercase text-orange-700 font-sans font-semibold block mt-1">
              Live Wedding Memories
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {wedding && onOpenQR && (
            <button
              onClick={onOpenQR}
              className="p-2 sm:px-3 sm:py-2 rounded-full border border-[#D5A47D] bg-white/80 hover:bg-white text-stone-800 hover:text-orange-800 transition text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
              title="View Wedding QR Code"
            >
              <QrCode className="w-4 h-4 text-orange-600" />
              <span className="hidden sm:inline">QR Code</span>
            </button>
          )}

          {wedding && wedding.face_search_enabled && onOpenFindMyPhotos && (
            <button
              onClick={onOpenFindMyPhotos}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white hover:brightness-105 transition-all text-xs sm:text-sm font-semibold tracking-wide shadow-md flex items-center space-x-2 hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Find My Photos</span>
            </button>
          )}

          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="p-2.5 rounded-xl border border-transparent hover:border-[#E8D4BE] hover:bg-white/60 text-stone-600 hover:text-stone-900 transition"
              title="Admin & Camera Portal"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
