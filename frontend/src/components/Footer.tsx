import React from 'react';
import { Heart, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-24 border-t border-cream-surface bg-cream/40 py-12 px-4 sm:px-6 text-center text-charcoal-muted text-xs">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-center space-x-2 text-champagne text-sm font-serif">
          <span>Every Moment</span>
          <span>•</span>
          <span>Every Memory</span>
          <span>•</span>
          <span>Instantly Yours</span>
        </div>

        <p className="max-w-md mx-auto text-charcoal/70 leading-relaxed">
          WedSnap cloud photography engine automatically delivers full-resolution original photographs to wedding guests in real-time.
        </p>

        <div className="flex items-center justify-center space-x-4 pt-2 text-[11px] text-charcoal-muted">
          <span className="flex items-center space-x-1">
            <Lock className="w-3 h-3 text-champagne" />
            <span>Encrypted Privacy & Temporary Biometrics</span>
          </span>
          <span>•</span>
          <span>No App Installation Required</span>
        </div>

        <div className="pt-4 text-[10px] text-charcoal-muted/70 flex items-center justify-center space-x-1">
          <span>Crafted for wedding celebrations worldwide</span>
          <Heart className="w-3 h-3 text-champagne inline fill-champagne/30" />
        </div>
      </div>
    </footer>
  );
};
