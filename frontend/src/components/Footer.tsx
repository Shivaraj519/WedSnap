import React from 'react';
import { Heart, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-24 border-t border-[#E8D4BE] bg-[#FAF3EB]/80 py-12 px-4 sm:px-6 text-center text-stone-600 text-xs">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-center space-x-2 text-orange-700 text-sm font-serif">
          <span>Every Moment</span>
          <span>•</span>
          <span>Every Memory</span>
          <span>•</span>
          <span>Instantly Yours</span>
        </div>

        <p className="max-w-md mx-auto text-stone-700 leading-relaxed">
          WedSnap cloud photography engine automatically delivers full-resolution original photographs to wedding guests in real-time.
        </p>

        <div className="flex items-center justify-center space-x-4 pt-2 text-[11px] text-stone-600">
          <span className="flex items-center space-x-1">
            <Lock className="w-3 h-3 text-orange-600" />
            <span>Encrypted Privacy & Biometric Purge</span>
          </span>
          <span>•</span>
          <span>No App Download Needed</span>
        </div>

        <div className="pt-4 text-[10px] text-stone-500 flex items-center justify-center space-x-1">
          <span>Crafted for wedding celebrations worldwide</span>
          <Heart className="w-3 h-3 text-orange-600 inline fill-orange-500/30" />
        </div>
      </div>
    </footer>
  );
};
