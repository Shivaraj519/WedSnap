import React from 'react';
import { X, QrCode, Download, ExternalLink, Printer } from 'lucide-react';
import { WeddingPublic } from '../types';
import { api } from '../services/api';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  wedding: WeddingPublic;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  wedding,
}) => {
  if (!isOpen) return null;

  const publicUrl = `${window.location.origin}/wedding/${wedding.slug}`;
  const qrPngUrl = api.getQRCodeUrl(wedding.slug);
  const tableCardUrl = api.getTableCardUrl(wedding.slug);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-charcoal">
      <div className="bg-ivory border border-cream-surface rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative">
        <div className="px-6 py-4 border-b border-cream-surface flex items-center justify-between bg-cream/30">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-champagne" />
            <h3 className="font-serif text-lg font-medium">Guest Access QR Code</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-cream-surface text-charcoal-muted hover:text-charcoal transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center space-y-5">
          <div>
            <p className="font-serif text-2xl text-charcoal tracking-wide">
              {wedding.bride_name} & {wedding.groom_name}
            </p>
            <p className="text-xs text-charcoal-muted mt-1">
              Guests scan this QR code to access the real-time live gallery and Find My Photos.
            </p>
          </div>

          {/* QR Code Container */}
          <div className="mx-auto w-56 h-56 p-4 rounded-xl bg-ivory-light border-2 border-champagne/40 shadow-inner flex items-center justify-center">
            <img src={qrPngUrl} alt="Wedding QR Code" className="w-full h-full object-contain" />
          </div>

          <div className="p-3 bg-cream/40 rounded-lg text-xs font-mono text-charcoal/70 break-all select-all border border-cream-surface">
            {publicUrl}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <a
              href={tableCardUrl}
              download={`WedSnap_Table_Card_${wedding.slug}.jpg`}
              className="w-full py-3 rounded-xl bg-champagne text-white hover:bg-champagne-hover text-xs font-bold tracking-wider uppercase transition shadow flex items-center justify-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>DOWNLOAD 5x7 PRINTABLE TABLE CARD</span>
            </a>

            <a
              href={qrPngUrl}
              download={`qr_${wedding.slug}.png`}
              className="w-full py-2.5 rounded-xl border border-champagne text-charcoal hover:bg-cream-surface text-xs font-semibold tracking-wider transition flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4 text-champagne" />
              <span>DOWNLOAD QR CODE (PNG)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
