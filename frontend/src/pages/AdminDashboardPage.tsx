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
  ArrowLeft,
  Zap,
  Radio,
  Wifi,
  Usb,
  Video,
  Sliders,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Eye,
  Loader2
} from 'lucide-react';
import { WeddingAdmin, Device, Photo, AnalyticsSummary } from '../types';
import { api } from '../services/api';
import { HdmiViewfinder } from '../components/HdmiViewfinder';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'hdmi' | 'devices' | 'photos' | 'privacy'>('overview');

  // New Device Registration Dialog
  const [isRegisteringDevice, setIsRegisteringDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('Camera - HDMI Clean Feed');
  const [newDeviceType, setNewDeviceType] = useState<'hdmi_capture' | 'dslr_folder' | 'dslr_ftp' | 'android_direct' | 'usb_adb'>('hdmi_capture');
  const [isSubmittingDevice, setIsSubmittingDevice] = useState(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Default suggestions when switching connection types
  const defaultNames: Record<string, string> = {
    hdmi_capture: 'Camera - HDMI Clean Feed',
    dslr_folder: 'DSLR Hot Folder Watcher',
    dslr_ftp: 'DSLR Wi-Fi FTP Camera',
    android_direct: 'Photographer Android Phone',
    usb_adb: 'Wired USB Camera Bridge',
  };

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
      const resp = await api.adminLogin(weddingSlug, passwordInput.trim());
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
    // Guaranteed fallback name so clicking Generate ALWAYS succeeds even if field wasn't edited!
    const deviceName = newDeviceName.trim() || defaultNames[newDeviceType] || 'Photographer Camera';
    setIsSubmittingDevice(true);
    try {
      const resp = await api.registerDevice(weddingSlug, deviceName, newDeviceType);
      setNewlyCreatedToken(resp.api_token);
      if (token) {
        const dData = await api.listDevices(token);
        setDevices(dData);
      }
    } catch (err: any) {
      alert('Error registering camera device: ' + err.message);
    } finally {
      setIsSubmittingDevice(false);
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

  // Connection Options for Device Pairing
  const connectionOptions = [
    {
      id: 'hdmi_capture',
      title: 'HDMI Video Capture Card',
      subtitle: 'Clean HDMI cable via Cam Link / USB Capture dongle',
      badge: 'Zero Latency Clean Feed',
      badgeColor: 'bg-orange-100 text-orange-900 border-orange-300',
      icon: <Zap className="w-5 h-5 text-orange-600" />,
      description: 'Stream uncompressed full HD/4K stills straight from camera HDMI into WedSnap live browser viewfinder and instant shutter.',
      recommended: true,
    },
    {
      id: 'dslr_folder',
      title: 'DSLR Folder Monitor',
      subtitle: 'Canon EOS Utility / Sony Imaging Edge / Nikon NX Tether',
      badge: 'Hot Folder Watcher',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: <Camera className="w-5 h-5 text-amber-700" />,
      description: 'Monitors the laptop folder where camera tethering software saves photos; automatically uploads upon write completion.',
    },
    {
      id: 'dslr_ftp',
      title: 'DSLR Wi-Fi FTP Direct',
      subtitle: 'Direct camera-to-cloud Wi-Fi FTP transmission',
      badge: 'Port 2121 Wireless',
      badgeColor: 'bg-sky-100 text-sky-900 border-sky-300',
      icon: <Wifi className="w-5 h-5 text-sky-600" />,
      description: 'Zero cables. Configure your camera Wi-Fi to send every shutter click wirelessly to WedSnap FTP server on port 2121.',
    },
    {
      id: 'android_direct',
      title: 'Android Mobile Application',
      subtitle: 'WedSnap Native Android Background Service',
      badge: 'Direct Cloud Observer',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      icon: <Smartphone className="w-5 h-5 text-emerald-600" />,
      description: 'Monitors phone camera gallery in background and auto-uploads every photo in real-time.',
    },
    {
      id: 'usb_adb',
      title: 'USB Laptop ADB Connector',
      subtitle: 'Wired Android tether via high-speed USB bridge',
      badge: 'Wired ADB Tether',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
      icon: <Usb className="w-5 h-5 text-purple-600" />,
      description: 'Direct wired phone connection for venues with zero cellular reception or high-density Wi-Fi interference.',
    },
  ];

  // 1. Login View
  if (!token) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        {/* Ambient warm orange-beige glow orb */}
        <div className="absolute w-96 h-96 bg-orange-300/20 rounded-full blur-3xl pointer-events-none -z-10 animate-float" />

        <div className="max-w-md w-full bg-[#FAF3EB]/95 backdrop-blur-xl border border-[#E8D4BE] rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FED7AA] to-[#FDBA74] text-stone-900 flex items-center justify-center mx-auto shadow-inner border border-orange-300/60 animate-bounce-soft">
            <Lock className="w-7 h-7 stroke-[1.5] text-stone-900" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-orange-700">Admin Security Gate</span>
            <h2 className="font-serif text-3xl font-normal text-stone-900">Photographer Portal</h2>
            <p className="text-xs text-stone-600">
              Enter administration passcode for <strong className="text-stone-900">{weddingSlug}</strong>
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1.5 tracking-wide">
                Admin Passcode
              </label>
              <input
                type="password"
                placeholder="Enter passcode (e.g. wedding2026)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E8D4BE] bg-white text-stone-900 text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition"
                required
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#FB923C] hover:brightness-105 text-white text-xs font-bold tracking-widest uppercase transition shadow-lg active:scale-95"
            >
              ACCESS DASHBOARD
            </button>
          </form>

          <button onClick={onExit} className="text-xs text-stone-600 hover:text-stone-900 underline font-medium">
            Return to Public Wedding Gallery
          </button>
        </div>
      </div>
    );
  }

  // 2. Main Admin Dashboard
  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Cloud Status Bar */}
      <div className="bg-[#FAF3EB]/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-[#E8D4BE] shadow-sm flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <button
              onClick={onExit}
              className="text-xs text-stone-600 hover:text-stone-950 font-medium flex items-center space-x-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Gallery</span>
            </button>
            <span className="text-stone-300">|</span>
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>RENDER CLOUD ONLINE</span>
            </div>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-stone-900">
            {wedding?.bride_name} & {wedding?.groom_name}
          </h1>
          <p className="text-xs text-stone-600">
            WedSnap Multi-Camera Hub &bull; HDMI Live Viewfinder &bull; DSLR Tethering &bull; Mobile Observer
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab('hdmi')}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-bold text-xs tracking-wider uppercase hover:brightness-105 transition flex items-center space-x-2 shadow-md hover:scale-105 active:scale-95"
          >
            <Zap className="w-4 h-4 fill-current text-white" />
            <span>OPEN HDMI LIVE VIEWFINDER</span>
          </button>

          <a
            href={api.getTableCardUrl(weddingSlug)}
            download={`WedSnap_Table_Card_${weddingSlug}.jpg`}
            className="px-4 py-2.5 rounded-full border border-[#D5A47D] bg-white text-stone-800 text-xs font-semibold hover:bg-[#FDFBF7] transition flex items-center space-x-2 shadow-sm"
          >
            <Printer className="w-4 h-4 text-orange-700" />
            <span>Table Cards</span>
          </a>

          <button
            onClick={handleLogout}
            className="px-4 py-2.5 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-800 text-xs font-medium transition"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Analytics Summary Metric Tiles */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl bg-[#FAF3EB] border border-[#E8D4BE] shadow-sm hover:border-orange-400 transition hover:-translate-y-0.5">
            <div className="flex items-center space-x-2 text-stone-600 text-xs font-medium">
              <ImageIcon className="w-4 h-4 text-orange-600" />
              <span>TOTAL PHOTOS</span>
            </div>
            <p className="text-3xl font-serif text-stone-900 font-medium mt-2">{analytics.total_photos}</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF3EB] border border-[#E8D4BE] shadow-sm hover:border-orange-400 transition hover:-translate-y-0.5">
            <div className="flex items-center space-x-2 text-stone-600 text-xs font-medium">
              <Download className="w-4 h-4 text-orange-600" />
              <span>GUEST DOWNLOADS</span>
            </div>
            <p className="text-3xl font-serif text-stone-900 font-medium mt-2">{analytics.total_downloads}</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF3EB] border border-[#E8D4BE] shadow-sm hover:border-orange-400 transition hover:-translate-y-0.5">
            <div className="flex items-center space-x-2 text-stone-600 text-xs font-medium">
              <HardDrive className="w-4 h-4 text-orange-600" />
              <span>STORAGE USED</span>
            </div>
            <p className="text-3xl font-serif text-stone-900 font-medium mt-2">{analytics.storage_mb} MB</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF3EB] border border-[#E8D4BE] shadow-sm hover:border-orange-400 transition hover:-translate-y-0.5">
            <div className="flex items-center space-x-2 text-stone-600 text-xs font-medium">
              <Camera className="w-4 h-4 text-orange-600" />
              <span>ACTIVE CAMERAS</span>
            </div>
            <p className="text-3xl font-serif text-stone-900 font-medium mt-2">{analytics.active_devices}</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF3EB] border border-[#E8D4BE] shadow-sm hover:border-orange-400 transition hover:-translate-y-0.5">
            <div className="flex items-center space-x-2 text-stone-600 text-xs font-medium">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <span>FACES INDEXED</span>
            </div>
            <p className="text-3xl font-serif text-stone-900 font-medium mt-2">{analytics.faces_indexed}</p>
          </div>
        </div>
      )}

      {/* Elevated Luxury Navigation Tabs */}
      <div className="flex border-b border-[#E8D4BE] space-x-2 sm:space-x-8 text-sm overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-1 font-serif tracking-wider text-base transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-b-2 border-orange-600 text-orange-950 font-semibold'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('hdmi')}
          className={`pb-3 px-1 font-serif tracking-wider text-base transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'hdmi'
              ? 'border-b-2 border-orange-600 text-orange-950 font-semibold'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <Zap className="w-4 h-4 text-orange-600" />
          <span>HDMI Live Capture</span>
          <span className="px-2 py-0.5 rounded-full bg-orange-200 text-orange-950 text-[10px] font-bold tracking-wider animate-pulse">
            LIVE HUD
          </span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`pb-3 px-1 font-serif tracking-wider text-base transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'devices'
              ? 'border-b-2 border-orange-600 text-orange-950 font-semibold'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <span>Tethered Cameras</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
            {devices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('photos')}
          className={`pb-3 px-1 font-serif tracking-wider text-base transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'photos'
              ? 'border-b-2 border-orange-600 text-orange-950 font-semibold'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <span>Gallery Moderation</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
            {photos.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`pb-3 px-1 font-serif tracking-wider text-base transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'privacy'
              ? 'border-b-2 border-orange-600 text-orange-950 font-semibold'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <Shield className="w-4 h-4 text-stone-600" />
          <span>Privacy & Biometrics</span>
        </button>
      </div>

      {/* TAB 1: HDMI LIVE VIEWFINDER */}
      {activeTab === 'hdmi' && (
        <HdmiViewfinder
          weddingSlug={weddingSlug}
          adminToken={token}
          onPhotoUploaded={() => {
            if (token) loadDashboardData(token);
          }}
        />
      )}

      {/* TAB 2: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Action Card: Connect via HDMI */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#2D241E] via-[#3D2E24] to-[#201814] text-white border border-orange-400/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:shadow-2xl transition">
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-orange-400 text-stone-950 text-[10px] font-bold tracking-widest uppercase">
                  RECOMMENDED FOR WEDDINGS
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-normal text-amber-100">HDMI Video Capture Live Feed</h3>
                <p className="text-xs text-amber-200/80 max-w-lg leading-relaxed">
                  Plug your camera HDMI cable into a USB Video Capture Card on this laptop. 
                  View the real-time sensor feed and trigger candid photo uploads with spacebar or auto-timer.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('hdmi')}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-400 hover:brightness-110 text-stone-950 text-xs font-bold tracking-widest uppercase transition shadow-lg shrink-0 hover:scale-105 active:scale-95"
              >
                LAUNCH VIEWFINDER
              </button>
            </div>

            {/* Hardware Quick-Start Cards */}
            <div className="bg-[#FAF3EB] rounded-3xl p-6 sm:p-7 border border-[#E8D4BE] shadow-sm space-y-4">
              <h3 className="font-serif text-xl font-medium text-stone-900">Supported Photographer Connections</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-[#E8D4BE] space-y-1.5 hover:border-orange-400 transition">
                  <div className="flex items-center space-x-2 text-stone-900 font-semibold text-xs">
                    <Zap className="w-4 h-4 text-orange-600" />
                    <span>1. HDMI Direct Cable</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Camera Clean HDMI out &rarr; USB HDMI Capture Card (Cam Link). Zero software required on camera.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#E8D4BE] space-y-1.5 hover:border-orange-400 transition">
                  <div className="flex items-center space-x-2 text-stone-900 font-semibold text-xs">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>2. Android Mobile App</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Install WedSnap APK on photographer Android phone. Background service syncs gallery in real-time.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#E8D4BE] space-y-1.5 hover:border-orange-400 transition">
                  <div className="flex items-center space-x-2 text-stone-900 font-semibold text-xs">
                    <Camera className="w-4 h-4 text-amber-700" />
                    <span>3. DSLR USB Tethering</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Canon EOS Utility, Sony Imaging Edge, or Nikon NX Tether to a hot folder monitored by <code className="text-stone-800 font-mono">wedsnap_dslr.py</code>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#E8D4BE] space-y-1.5 hover:border-orange-400 transition">
                  <div className="flex items-center space-x-2 text-stone-900 font-semibold text-xs">
                    <Wifi className="w-4 h-4 text-sky-600" />
                    <span>4. DSLR Wi-Fi FTP Direct</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Camera transmits RAW/JPEG photos over Wi-Fi directly to WedSnap's background FTP receiver on port 2121.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code & Printable Sign Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-[#FAF3EB] border border-[#E8D4BE] shadow-sm flex flex-col items-center text-center space-y-5">
            <h3 className="font-serif text-xl font-medium text-stone-900">Guest Access QR Display</h3>
            <div className="p-3 bg-white rounded-2xl border border-[#E8D4BE] shadow-inner">
              <img
                src={api.getQRCodeUrl(weddingSlug)}
                alt="Wedding QR"
                className="w-44 h-44 p-2 bg-white rounded-xl shadow-sm"
              />
            </div>
            <div className="space-y-1 text-xs text-stone-600">
              <p className="font-semibold text-stone-900">Instant Guest Discovery</p>
              <p>Display on welcome signage and dining tables so guests can browse photos and use AI facial search in real-time.</p>
            </div>
            <a
              href={api.getTableCardUrl(weddingSlug)}
              download={`WedSnap_Table_Card_${weddingSlug}.jpg`}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-105 text-white text-xs font-bold tracking-wider uppercase transition shadow-md"
            >
              DOWNLOAD 5x7 TABLE CARD
            </a>
          </div>
        </div>
      )}

      {/* TAB 3: TETHERED CAMERAS */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-2xl font-normal text-stone-900">Tethered Cameras & Connectors</h3>
              <p className="text-xs text-stone-600 mt-1">
                Manage all paired photographer cameras, HDMI capture inputs, and Android mobile connectors
              </p>
            </div>
            <button
              onClick={() => {
                setIsRegisteringDevice(true);
                setNewlyCreatedToken(null);
                setNewDeviceName('Camera - HDMI Clean Feed');
                setNewDeviceType('hdmi_capture');
              }}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs font-semibold tracking-wider hover:brightness-110 transition flex items-center space-x-2 shadow-md hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>PAIR NEW CAMERA DEVICE</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {devices.map((dev) => (
              <div
                key={dev.id}
                className="p-6 rounded-3xl bg-[#FAF3EB] border border-[#E8D4BE] shadow-sm flex flex-col justify-between space-y-4 hover:border-orange-400 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#E8D4BE] flex items-center justify-center text-stone-700 shadow-sm">
                        {dev.device_type === 'hdmi_capture' && <Zap className="w-5 h-5 text-orange-600" />}
                        {dev.device_type === 'android_direct' && <Smartphone className="w-5 h-5 text-emerald-600" />}
                        {dev.device_type === 'dslr_folder' && <Camera className="w-5 h-5 text-amber-700" />}
                        {dev.device_type === 'dslr_ftp' && <Wifi className="w-5 h-5 text-sky-600" />}
                        {dev.device_type === 'usb_adb' && <Usb className="w-5 h-5 text-purple-600" />}
                      </div>
                      <div>
                        <span className="font-semibold text-stone-900 text-sm block">{dev.device_name}</span>
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider font-mono">
                          {dev.device_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                        dev.authentication_status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}
                    >
                      {dev.authentication_status}
                    </span>
                  </div>

                  <div className="pt-2 text-xs text-stone-600 space-y-1">
                    <p>
                      Photos Streamed: <strong className="text-stone-900">{dev.photo_count}</strong>
                    </p>
                    {dev.last_seen && (
                      <p className="text-[11px] text-stone-500">
                        Last seen: {new Date(dev.last_seen).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8D4BE]/70 flex items-center justify-between">
                  {dev.device_type === 'hdmi_capture' && (
                    <button
                      onClick={() => setActiveTab('hdmi')}
                      className="text-xs text-orange-700 hover:text-orange-900 font-semibold flex items-center space-x-1"
                    >
                      <Zap className="w-3.5 h-3.5 text-orange-600" />
                      <span>Open Live Viewfinder</span>
                    </button>
                  )}

                  {dev.authentication_status === 'active' && (
                    <button
                      onClick={() => handleRevokeDevice(dev.id)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium ml-auto"
                    >
                      Revoke Device
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PHOTO MODERATION */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-2xl font-normal text-stone-900">Gallery Photographs ({photos.length})</h3>
              <p className="text-xs text-stone-600 mt-0.5">Click the trash icon on any photo to remove it immediately</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {photos.map((p) => (
              <div key={p.id} className="relative group rounded-2xl overflow-hidden bg-white aspect-[3/4] shadow-sm border border-[#E8D4BE]">
                <img src={api.getThumbnailUrl(p.id)} alt={p.original_filename} className="w-full h-full object-cover" />
                <button
                  onClick={() => handleDeletePhoto(p.id)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition shadow hover:bg-red-700"
                  title="Delete Photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-white truncate font-mono opacity-0 group-hover:opacity-100 transition">
                  {p.original_filename}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PRIVACY & BIOMETRIC CONTROLS */}
      {activeTab === 'privacy' && wedding && (
        <div className="max-w-2xl bg-[#FAF3EB] border border-[#E8D4BE] rounded-3xl p-8 space-y-6 shadow-sm">
          <div>
            <h3 className="font-serif text-2xl font-normal text-stone-900">Privacy & Biometric Controls</h3>
            <p className="text-xs text-stone-600 mt-1">
              Data governance, guest consent, and AI facial recognition management
            </p>
          </div>

          <div className="flex items-center justify-between py-4 border-y border-[#E8D4BE]/70">
            <div>
              <p className="text-sm font-semibold text-stone-900">Find My Photos (Facial Recognition)</p>
              <p className="text-xs text-stone-600">Allow guests to discover their photos via selfie search</p>
            </div>
            <button
              onClick={handleToggleFaceSearch}
              className={`px-5 py-2 rounded-full text-xs font-bold tracking-wider transition ${
                wedding.face_search_enabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-200 text-stone-700'
              }`}
            >
              {wedding.face_search_enabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-stone-900">Purge All Biometric Embeddings</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
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

      {/* BESPOKE LUXURY MODAL: Pair Photographer Device */}
      {isRegisteringDevice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#FAF3EB] border border-[#E8D4BE] rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#E8D4BE]/80 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-100 border border-orange-200 text-orange-800 flex items-center justify-center shadow-sm">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-normal text-stone-900">Pair Photographer Camera</h3>
                  <p className="text-[11px] text-stone-500">Generate secure credentials for real-time streaming</p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisteringDevice(false)}
                className="text-stone-400 hover:text-stone-900 p-1.5 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {!newlyCreatedToken ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-stone-800 block mb-1.5">
                    Camera / Device Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sony A7 IV - HDMI Clean Feed"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D5A47D] bg-white text-stone-900 text-xs focus:ring-2 focus:ring-orange-400 focus:outline-none transition shadow-inner"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">Pre-filled with smart name — click Generate below anytime.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-800 block mb-2">Connection Method</label>
                  
                  {/* Interactive Connection Method Cards */}
                  <div className="space-y-2.5">
                    {connectionOptions.map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => {
                          setNewDeviceType(opt.id as any);
                          // Auto update name suggestion if user hasn't typed custom name
                          if (!newDeviceName || Object.values(defaultNames).includes(newDeviceName)) {
                            setNewDeviceName(defaultNames[opt.id]);
                          }
                        }}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition flex items-start space-x-3 ${
                          newDeviceType === opt.id
                            ? 'border-orange-500 bg-white ring-2 ring-orange-400/50 shadow-sm'
                            : 'border-[#E8D4BE] bg-white/70 hover:bg-white hover:border-orange-300'
                        }`}
                      >
                        <div className="p-2 rounded-xl bg-[#FAF3EB] border border-[#E8D4BE] shadow-sm shrink-0 mt-0.5">
                          {opt.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-stone-900 text-xs">{opt.title}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${opt.badgeColor}`}>
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">{opt.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  disabled={isSubmittingDevice}
                  onClick={handleRegisterDevice}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:brightness-105 text-white text-xs font-bold tracking-widest uppercase transition shadow-lg flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-70"
                >
                  {isSubmittingDevice ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>GENERATING CREDENTIALS...</span>
                    </>
                  ) : (
                    <span>GENERATE DEVICE CREDENTIALS</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-5 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-300 animate-bounce-soft">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h4 className="font-serif text-xl font-medium text-stone-900">Device Ready to Stream!</h4>
                  <p className="text-xs text-stone-600">
                    Use this dedicated token to authenticate uploads from your camera or connector script:
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#D5A47D] font-mono text-xs text-stone-900 break-all select-all flex items-center justify-between shadow-inner">
                  <span className="text-[11px] text-left">{newlyCreatedToken}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newlyCreatedToken);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="ml-2 p-2 bg-[#FAF3EB] rounded-lg border border-[#E8D4BE] hover:bg-orange-100 text-stone-800 transition"
                    title="Copy Token"
                  >
                    {copiedToken ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {newDeviceType === 'hdmi_capture' ? (
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => {
                        setIsRegisteringDevice(false);
                        setActiveTab('hdmi');
                      }}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-bold text-xs tracking-wider uppercase transition shadow-lg flex items-center justify-center space-x-2 hover:scale-105 active:scale-95"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>OPEN HDMI LIVE VIEWFINDER NOW</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsRegisteringDevice(false)}
                    className="w-full py-3 rounded-2xl bg-stone-900 text-white text-xs font-bold tracking-wider uppercase"
                  >
                    DONE
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
