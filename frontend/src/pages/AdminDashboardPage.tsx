import React, { useState, useEffect } from 'react';
import {
  Shield,
  Smartphone,
  Camera,
  Trash2,
  Lock,
  Plus,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Printer,
  Sparkles,
  BarChart3,
  HardDrive,
  Download,
  Users,
  Image as ImageIcon,
  ArrowLeft
} from 'lucide-react';
import { WeddingAdmin, Device, Photo, AnalyticsSummary } from '../types';
import { api } from '../services/api';

interface AdminDashboardPageProps {
  weddingSlug: string;
  onExit: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  weddingSlug,
  onExit,
}) => {
  // Auth state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(`admin_token_${weddingSlug}`));
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Data state
  const [wedding, setWedding] = useState<WeddingAdmin | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'photos' | 'privacy'>('overview');

  // New Device Registration Dialog
  const [isRegisteringDevice, setIsRegisteringDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('dslr_folder');
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Load Admin Data
  const loadDashboardData = async (authToken: string) => {
    setIsLoading(true);
    try {
      const wData = await api.getAdminWedding(weddingSlug, authToken);
      setWedding(wData);

      const dData = await api.listDevices(authToken);
      setDevices(dData);

      const pData = await api.getPhotos(weddingSlug, 1, 100);
      setPhotos(pData.items);

      const aData = await api.getAnalytics(wData.id, authToken);
      setAnalytics(aData);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('Invalid')) {
        setToken(null);
        localStorage.removeItem(`admin_token_${weddingSlug}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboardData(token);
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const resp = await api.adminLogin(weddingSlug, passwordInput);
      setToken(resp.access_token);
      localStorage.setItem(`admin_token_${weddingSlug}`, resp.access_token);
      loadDashboardData(resp.access_token);
    } catch (err: any) {
      setLoginError(err.message || 'Incorrect passcode');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem(`admin_token_${weddingSlug}`);
  };

  const handleRegisterDevice = async () => {
    if (!newDeviceName.trim()) return;
    try {
      const resp = await api.registerDevice(weddingSlug, newDeviceName, newDeviceType);
      setNewlyCreatedToken(resp.api_token);
      if (token) {
        const dData = await api.listDevices(token);
        setDevices(dData);
      }
    } catch (err: any) {
      alert('Error registering device: ' + err.message);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!token || !confirm('Are you sure you want to revoke this camera device?')) return;
    try {
      await api.revokeDevice(deviceId, token);
      const dData = await api.listDevices(token);
      setDevices(dData);
    } catch (err: any) {
      alert('Error revoking device: ' + err.message);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!token || !confirm('Permanently delete this photo from the wedding gallery?')) return;
    try {
      await api.deletePhoto(photoId, token);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err: any) {
      alert('Error deleting photo: ' + err.message);
    }
  };

  const handleToggleFaceSearch = async () => {
    if (!token || !wedding) return;
    try {
      const updated = await api.updateWedding(
        wedding.id,
        { face_search_enabled: !wedding.face_search_enabled },
        token
      );
      setWedding({ ...wedding, face_search_enabled: updated.face_search_enabled });
    } catch (err: any) {
      alert('Error updating setting: ' + err.message);
    }
  };

  const handlePurgeBiometrics = async () => {
    if (!token || !wedding) return;
    if (
      !confirm(
        'WARNING: This will permanently delete all facial recognition embeddings for this wedding. Guests will not be able to find photos by face until re-indexed. Proceed?'
      )
    )
      return;

    try {
      await api.purgeBiometrics(wedding.id, token);
      alert('All biometric face indexes successfully purged.');
      loadDashboardData(token);
    } catch (err: any) {
      alert('Error purging biometrics: ' + err.message);
    }
  };

  // Login View
  if (!token) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-ivory border border-cream-surface rounded-2xl p-8 shadow-xl text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-champagne-light text-champagne-accent flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 stroke-[1.5]" />
          </div>

          <div>
            <h2 className="font-serif text-2xl font-medium text-charcoal">Photographer & Admin Portal</h2>
            <p className="text-xs text-charcoal-muted mt-1">
              Enter wedding administration passcode for '{weddingSlug}'
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Admin Passcode"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-cream-surface bg-cream/30 text-charcoal text-center text-sm tracking-wider focus:outline-none focus:border-champagne"
              required
            />

            {loginError && <p className="text-xs text-red-600">{loginError}</p>}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-champagne hover:bg-champagne-hover text-white text-xs font-bold tracking-widest uppercase transition shadow"
            >
              ACCESS DASHBOARD
            </button>
          </form>

          <button onClick={onExit} className="text-xs text-charcoal-muted hover:text-charcoal underline">
            Return to Public Wedding Gallery
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cream-surface pb-6">
        <div>
          <button
            onClick={onExit}
            className="text-xs text-champagne hover:text-champagne-accent font-medium flex items-center space-x-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>View Public Gallery</span>
          </button>
          <h1 className="font-serif text-3xl font-medium text-charcoal">
            {wedding?.bride_name} & {wedding?.groom_name} — Admin
          </h1>
          <p className="text-xs text-charcoal-muted">WedSnap Live Tethering & Multi-Camera Management</p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={api.getTableCardUrl(weddingSlug)}
            download={`WedSnap_Table_Card_${weddingSlug}.jpg`}
            className="px-4 py-2 rounded-full border border-champagne text-charcoal text-xs font-medium hover:bg-cream-surface transition flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4 text-champagne" />
            <span>Printable Table Card</span>
          </a>

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-full bg-cream-surface hover:bg-cream text-charcoal text-xs font-medium transition"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-5 rounded-xl bg-cream/40 border border-cream-surface">
            <div className="flex items-center space-x-2 text-charcoal-muted text-xs">
              <ImageIcon className="w-4 h-4 text-champagne" />
              <span>TOTAL PHOTOS</span>
            </div>
            <p className="text-3xl font-serif text-charcoal font-semibold mt-2">{analytics.total_photos}</p>
          </div>

          <div className="p-5 rounded-xl bg-cream/40 border border-cream-surface">
            <div className="flex items-center space-x-2 text-charcoal-muted text-xs">
              <Download className="w-4 h-4 text-champagne" />
              <span>GUEST DOWNLOADS</span>
            </div>
            <p className="text-3xl font-serif text-charcoal font-semibold mt-2">{analytics.total_downloads}</p>
          </div>

          <div className="p-5 rounded-xl bg-cream/40 border border-cream-surface">
            <div className="flex items-center space-x-2 text-charcoal-muted text-xs">
              <HardDrive className="w-4 h-4 text-champagne" />
              <span>STORAGE USED</span>
            </div>
            <p className="text-3xl font-serif text-charcoal font-semibold mt-2">{analytics.storage_mb} MB</p>
          </div>

          <div className="p-5 rounded-xl bg-cream/40 border border-cream-surface">
            <div className="flex items-center space-x-2 text-charcoal-muted text-xs">
              <Camera className="w-4 h-4 text-champagne" />
              <span>ACTIVE CAMERAS</span>
            </div>
            <p className="text-3xl font-serif text-charcoal font-semibold mt-2">{analytics.active_devices}</p>
          </div>

          <div className="p-5 rounded-xl bg-cream/40 border border-cream-surface">
            <div className="flex items-center space-x-2 text-charcoal-muted text-xs">
              <Sparkles className="w-4 h-4 text-champagne" />
              <span>FACES INDEXED</span>
            </div>
            <p className="text-3xl font-serif text-charcoal font-semibold mt-2">{analytics.faces_indexed}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-cream-surface space-x-8 text-sm">
        {(['overview', 'devices', 'photos', 'privacy'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 font-serif tracking-wider capitalize text-base transition ${
              activeTab === tab
                ? 'border-b-2 border-champagne text-charcoal font-medium'
                : 'text-charcoal-muted hover:text-charcoal'
            }`}
          >
            {tab === 'devices' ? `Camera Devices (${devices.length})` : tab}
          </button>
        ))}
      </div>

      {/* Tab: Camera Devices */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-xl font-medium text-charcoal">Tethered Cameras & Connectors</h3>
              <p className="text-xs text-charcoal-muted">
                Android phones, DSLR hot folders, and Wi-Fi FTP camera streams
              </p>
            </div>
            <button
              onClick={() => {
                setIsRegisteringDevice(true);
                setNewlyCreatedToken(null);
                setNewDeviceName('');
              }}
              className="px-4 py-2 rounded-full bg-champagne text-white text-xs font-semibold tracking-wider hover:bg-champagne-hover transition flex items-center space-x-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>PAIR NEW CAMERA</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {devices.map((dev) => (
              <div
                key={dev.id}
                className="p-5 rounded-xl bg-cream/30 border border-cream-surface flex items-start justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    {dev.device_type.includes('android') || dev.device_type.includes('usb') ? (
                      <Smartphone className="w-4 h-4 text-champagne" />
                    ) : (
                      <Camera className="w-4 h-4 text-champagne" />
                    )}
                    <span className="font-medium text-charcoal text-sm">{dev.device_name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                        dev.authentication_status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {dev.authentication_status}
                    </span>
                  </div>

                  <p className="text-xs text-charcoal-muted">Type: {dev.device_type}</p>
                  <p className="text-[11px] text-charcoal-muted">
                    Photos Uploaded: <strong>{dev.photo_count}</strong>
                  </p>
                  {dev.last_seen && (
                    <p className="text-[10px] text-charcoal-muted/70">
                      Last seen: {new Date(dev.last_seen).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                {dev.authentication_status === 'active' && (
                  <button
                    onClick={() => handleRevokeDevice(dev.id)}
                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Revoke Access
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Photo Management */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-medium text-charcoal">Gallery Photographs ({photos.length})</h3>
            <p className="text-xs text-charcoal-muted">Click delete to remove any photograph immediately</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {photos.map((p) => (
              <div key={p.id} className="relative group rounded-lg overflow-hidden bg-cream-surface aspect-[3/4]">
                <img src={api.getThumbnailUrl(p.id)} alt={p.original_filename} className="w-full h-full object-cover" />
                <button
                  onClick={() => handleDeletePhoto(p.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition shadow hover:bg-red-700"
                  title="Delete Photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-0 inset-x-0 p-2 bg-black/60 text-[10px] text-white truncate font-mono opacity-0 group-hover:opacity-100 transition">
                  {p.original_filename}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Privacy & Biometrics */}
      {activeTab === 'privacy' && wedding && (
        <div className="max-w-2xl bg-cream/30 border border-cream-surface rounded-xl p-6 space-y-6">
          <div>
            <h3 className="font-serif text-xl font-medium text-charcoal">Privacy & Biometric Controls</h3>
            <p className="text-xs text-charcoal-muted mt-1">
              Admin controls for wedding guest data and AI facial recognition features
            </p>
          </div>

          <div className="flex items-center justify-between py-3 border-y border-cream-surface">
            <div>
              <p className="text-sm font-medium text-charcoal">Find My Photos (Facial Recognition)</p>
              <p className="text-xs text-charcoal-muted">Allow guests to discover their photos via selfie search</p>
            </div>
            <button
              onClick={handleToggleFaceSearch}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                wedding.face_search_enabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-cream-surface text-charcoal-muted'
              }`}
            >
              {wedding.face_search_enabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-charcoal">Purge All Biometric Embeddings</h4>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              Permanently purges all computed facial embeddings for this wedding from database storage. This immediately destroys all biometric index records.
            </p>
            <button
              onClick={handlePurgeBiometrics}
              className="px-5 py-2.5 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold tracking-wider transition"
            >
              PURGE BIOMETRIC RECORDS
            </button>
          </div>
        </div>
      )}

      {/* Tab: Overview & Quick Pairing */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-cream/30 border border-cream-surface space-y-4">
            <h3 className="font-serif text-xl font-medium text-charcoal">How to Connect Cameras</h3>
            <div className="space-y-3 text-xs text-charcoal/80 leading-relaxed">
              <p>
                <strong>1. Android Mobile App:</strong> Enter this server URL and pair using a Device Token. Shoot photos with camera; new photos sync to the gallery instantly.
              </p>
              <p>
                <strong>2. DSLR USB Tethering:</strong> Connect Canon, Sony, or Nikon to laptop. Launch tethering software into a hot folder. Start <code className="bg-cream-surface px-1.5 py-0.5 rounded">python wedsnap_dslr.py</code>.
              </p>
              <p>
                <strong>3. Wi-Fi FTP Direct:</strong> In camera Wi-Fi settings, set FTP server to laptop IP on port 2121. Every click transmits wirelessly straight to WedSnap.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-cream/30 border border-cream-surface flex flex-col items-center text-center space-y-4">
            <h3 className="font-serif text-xl font-medium text-charcoal">Guest Access QR Display</h3>
            <img
              src={api.getQRCodeUrl(weddingSlug)}
              alt="Wedding QR"
              className="w-40 h-40 p-2 bg-white rounded-lg border border-cream-surface"
            />
            <p className="text-xs text-charcoal-muted">
              Display this on welcome signs and dining tables so guests can view photos and find their moments in real-time.
            </p>
            <a
              href={api.getTableCardUrl(weddingSlug)}
              download={`WedSnap_Table_Card_${weddingSlug}.jpg`}
              className="px-5 py-2.5 rounded-full bg-champagne text-white text-xs font-bold tracking-wider uppercase hover:bg-champagne-hover transition shadow"
            >
              DOWNLOAD 5x7 PRINTABLE TABLE CARD
            </a>
          </div>
        </div>
      )}

      {/* Register Device Dialog */}
      {isRegisteringDevice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ivory border border-cream-surface rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-surface pb-3">
              <h3 className="font-serif text-lg font-medium text-charcoal">Pair Photographer Device</h3>
              <button
                onClick={() => setIsRegisteringDevice(false)}
                className="text-charcoal-muted hover:text-charcoal"
              >
                ✕
              </button>
            </div>

            {!newlyCreatedToken ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-charcoal block mb-1">Device Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sony A7 IV - Lead Photographer"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-cream-surface bg-white text-xs text-charcoal"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-charcoal block mb-1">Connection Method</label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-cream-surface bg-white text-xs text-charcoal"
                  >
                    <option value="dslr_folder">DSLR Folder Monitor (Canon EOS / Sony / Nikon)</option>
                    <option value="dslr_ftp">DSLR Wi-Fi FTP Direct Transfer</option>
                    <option value="android_direct">Android Mobile Application (Direct Cloud)</option>
                    <option value="usb_adb">USB Laptop ADB Connector</option>
                  </select>
                </div>

                <button
                  onClick={handleRegisterDevice}
                  className="w-full py-2.5 rounded-xl bg-champagne text-white text-xs font-bold tracking-wider uppercase hover:bg-champagne-hover transition"
                >
                  GENERATE DEVICE CREDENTIALS
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-xs text-charcoal-muted">
                  Device registered successfully! Copy this API token into your camera connector config:
                </p>

                <div className="p-3 bg-white rounded-lg border border-cream-surface font-mono text-xs text-charcoal break-all select-all flex items-center justify-between">
                  <span>{newlyCreatedToken}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newlyCreatedToken);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="ml-2 p-1.5 text-champagne hover:text-champagne-hover"
                  >
                    {copiedToken ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-[11px] text-charcoal-muted">
                  Set this in <code className="bg-cream-surface px-1 py-0.5 rounded">config.ini</code> or paste into the Android app.
                </p>

                <button
                  onClick={() => setIsRegisteringDevice(false)}
                  className="w-full py-2 rounded-xl bg-charcoal text-white text-xs font-medium"
                >
                  DONE
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
