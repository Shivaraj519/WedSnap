import React, { useState, useRef } from 'react';
import { X, Sparkles, Upload, Camera, Shield, Check, AlertCircle, Download, ArrowLeft } from 'lucide-react';
import { FaceMatch, Photo } from '../types';
import { api } from '../services/api';

interface FindMyPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  weddingSlug: string;
  onOpenPhotoLightbox: (photo: Photo) => void;
}

export const FindMyPhotosModal: React.FC<FindMyPhotosModalProps> = ({
  isOpen,
  onClose,
  weddingSlug,
  onOpenPhotoLightbox,
}) => {
  const [consentGiven, setConsentGiven] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<FaceMatch[] | null>(null);
  const [serverMsg, setServerMsg] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleSearch = async () => {
    if (!consentGiven) {
      setErrorMsg('Please read and confirm the biometric privacy consent before proceeding.');
      return;
    }
    if (!selectedFile) {
      setErrorMsg('Please select or capture a clear photo of your face.');
      return;
    }

    setIsSearching(true);
    setErrorMsg(null);

    try {
      const resp = await api.searchMyPhotos(weddingSlug, selectedFile, consentGiven);
      setResults(resp.matches);
      setServerMsg(resp.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during facial discovery.');
    } finally {
      setIsSearching(false);
    }
  };

  const resetSearch = () => {
    setResults(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMsg(null);
    setServerMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="bg-ivory border border-cream-surface rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden relative text-charcoal">
        {/* Header */}
        <div className="px-6 py-5 border-b border-cream-surface flex items-center justify-between bg-cream/30">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-full bg-champagne-light text-champagne-accent">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-medium tracking-wide">Find My Photos</h3>
              <p className="text-[11px] text-charcoal-muted">AI-Powered Candid Photo Discovery</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-cream-surface text-charcoal-muted hover:text-charcoal transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {!results ? (
            <div className="space-y-6">
              {/* Privacy Notice Box */}
              <div className="p-4 rounded-xl bg-cream/50 border border-cream-surface text-xs text-charcoal/80 space-y-2">
                <div className="flex items-center space-x-2 font-medium text-charcoal">
                  <Shield className="w-4 h-4 text-champagne" />
                  <span>Biometric Privacy & Consent Guarantee</span>
                </div>
                <p className="leading-relaxed">
                  WedSnap uses a privacy-first facial feature matching engine. Your selfie is analyzed in memory solely to calculate a temporary mathematical embedding vector and search the wedding gallery. Your photo is <strong>destroyed immediately after processing</strong> and is never retained or used for AI model training.
                </p>
                <div className="pt-2">
                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      className="mt-0.5 rounded border-champagne text-champagne focus:ring-champagne"
                    />
                    <span className="text-[11px] text-charcoal font-medium">
                      I give my explicit consent to perform a temporary facial search for my wedding photos.
                    </span>
                  </label>
                </div>
              </div>

              {/* Upload / Selfie Capture Area */}
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  ref={cameraInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!previewUrl ? (
                  <div className="border-2 border-dashed border-champagne/40 rounded-xl p-8 text-center bg-cream/20 space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-champagne-light/50 flex items-center justify-center text-champagne-accent">
                      <Camera className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div>
                      <p className="font-serif text-lg text-charcoal">Upload or Take a Quick Selfie</p>
                      <p className="text-xs text-charcoal-muted mt-1">
                        A clear, well-lit photo of your face gives the most accurate matches.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-champagne text-white text-xs font-semibold tracking-wider hover:bg-champagne-hover transition flex items-center justify-center space-x-2"
                      >
                        <Camera className="w-4 h-4" />
                        <span>TAKE SELFIE</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-champagne text-charcoal text-xs font-semibold tracking-wider hover:bg-cream-surface transition flex items-center justify-center space-x-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>CHOOSE PHOTO</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center p-4 bg-cream/30 rounded-xl border border-cream-surface space-y-3">
                    <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-champagne shadow-md">
                      <img src={previewUrl} alt="Selfie preview" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs text-charcoal font-medium">Ready for facial discovery</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="text-[11px] text-charcoal-muted hover:text-charcoal underline"
                    >
                      Use a different photo
                    </button>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleSearch}
                disabled={isSearching || !consentGiven || !selectedFile}
                className={`w-full py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase transition flex items-center justify-center space-x-2 ${
                  isSearching || !consentGiven || !selectedFile
                    ? 'bg-cream-surface text-charcoal-muted cursor-not-allowed'
                    : 'bg-champagne text-white hover:bg-champagne-hover shadow-md'
                }`}
              >
                {isSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Searching Wedding Gallery...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Find My Photographs</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Results View */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif text-lg font-medium text-charcoal">
                    {results.length > 0
                      ? `Found ${results.length} Photographs Featuring You`
                      : 'No Matches Found Yet'}
                  </h4>
                  <p className="text-xs text-charcoal-muted mt-0.5">{serverMsg}</p>
                </div>

                <button
                  onClick={resetSearch}
                  className="text-xs text-champagne hover:text-champagne-accent font-medium flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Search Again</span>
                </button>
              </div>

              {results.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto pr-1">
                  {results.map(({ photo, match_score }) => (
                    <div
                      key={photo.id}
                      onClick={() => onOpenPhotoLightbox(photo)}
                      className="group relative rounded-lg overflow-hidden bg-cream-surface cursor-pointer shadow-sm hover:shadow-md transition"
                    >
                      <div className="aspect-[3/4] overflow-hidden">
                        <img
                          src={api.getThumbnailUrl(photo.id)}
                          alt={photo.original_filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm text-[10px] font-medium">
                        {match_score}% Match
                      </div>
                      <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-champagne text-white shadow transition group-hover:scale-110">
                        <Download className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-cream/30 rounded-xl space-y-3">
                  <p className="text-xs text-charcoal-muted">
                    Our photographers are actively shooting! You can check back anytime by scanning the QR code again.
                  </p>
                  <button
                    onClick={resetSearch}
                    className="px-4 py-2 rounded-full border border-champagne text-xs text-charcoal font-medium hover:bg-champagne hover:text-white transition"
                  >
                    Try with a Different Selfie
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
