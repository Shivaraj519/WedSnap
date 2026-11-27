import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Play,
  Square,
  RefreshCw,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Clock,
  Layers,
  Zap,
  Radio
} from 'lucide-react';
import { api } from '../services/api';
import { playShutterSound } from '../utils/shutterSound';

interface HdmiViewfinderProps {
  weddingSlug: string;
  adminToken?: string;
  deviceToken?: string;
  onPhotoUploaded?: () => void;
}

interface CapturedPhotoItem {
  id: string;
  dataUrl: string;
  timestamp: string;
  status: 'uploading' | 'success' | 'failed';
  error?: string;
}

export const HdmiViewfinder: React.FC<HdmiViewfinderProps> = ({
  weddingSlug,
  adminToken,
  deviceToken,
  onPhotoUploaded,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Device & Stream State
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamResolution, setStreamResolution] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Viewfinder UX Controls
  const [showGrid, setShowGrid] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Automation: Intervalometer
  const [intervalSeconds, setIntervalSeconds] = useState<number>(0); // 0 = off
  const [intervalCountdown, setIntervalCountdown] = useState<number>(0);
  const intervalTimerRef = useRef<any>(null);

  // Automation: Motion Detection
  const [motionTriggerEnabled, setMotionTriggerEnabled] = useState(false);
  const [motionThreshold, setMotionThreshold] = useState(18); // Sensitivity
  const [motionScore, setMotionScore] = useState(0);
  const motionLastSnapTime = useRef<number>(0);
  const motionLoopRef = useRef<any>(null);

  // Captured Photos History
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhotoItem[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  // 1. Enumerate Video Inputs on Mount
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        setStreamError('Your browser does not support media device enumeration.');
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);

      // Prefer HDMI / Capture / Cam Link / USB Video devices
      if (!selectedDeviceId && videoInputs.length > 0) {
        const hdmiCandidate = videoInputs.find((d) =>
          /hdmi|capture|cam link|camlink|video|elgato|uvc/i.test(d.label)
        );
        setSelectedDeviceId(hdmiCandidate ? hdmiCandidate.deviceId : videoInputs[0].deviceId);
      }
    } catch (err: any) {
      setStreamError('Could not list video devices: ' + (err.message || 'Permission denied'));
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // 2. Start Video Stream from selected HDMI Capture Card
  const startStream = useCallback(async (deviceIdToUse?: string) => {
    setStreamError(null);
    stopStream();

    const targetId = deviceIdToUse || selectedDeviceId;
    const constraints: MediaStreamConstraints = {
      video: targetId
        ? {
            deviceId: { exact: targetId },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 60, min: 24 },
          }
        : {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60 },
          },
      audio: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);

        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        setStreamResolution({
          width: settings.width || 1920,
          height: settings.height || 1080,
        });

        // Re-enumerate to get friendly labels now that permission is granted
        refreshDevices();
      }
    } catch (err: any) {
      setIsStreaming(false);
      setStreamError(
        'Unable to access HDMI Capture Card: ' +
          (err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access in browser.'
            : err.message || 'Device disconnected or in use by another application.')
      );
    }
  }, [selectedDeviceId, refreshDevices]);

  const stopStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    clearInterval(intervalTimerRef.current);
    cancelAnimationFrame(motionLoopRef.current);
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // 3. Shutter Snap & Direct Cloud Stream
  const snapAndUpload = useCallback(async () => {
    if (!videoRef.current || !isStreaming || isCapturing) return;

    setIsCapturing(true);

    // Audio & Visual Shutter Feedback
    if (soundEnabled) {
      playShutterSound();
    }
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 120);

    try {
      const video = videoRef.current;
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;

      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw exact clean video frame
      ctx.drawImage(video, 0, 0, width, height);

      const timestamp = new Date();
      const formattedTime = timestamp.toLocaleTimeString();
      const filename = `HDMI_${timestamp.getFullYear()}${String(timestamp.getMonth() + 1).padStart(2, '0')}${String(
        timestamp.getDate()
      ).padStart(2, '0')}_${String(timestamp.getHours()).padStart(2, '0')}${String(
        timestamp.getMinutes()
      ).padStart(2, '0')}${String(timestamp.getSeconds()).padStart(2, '0')}.jpg`;

      // Convert to high-quality JPEG Blob
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95)
      );

      if (!blob) throw new Error('Failed to create photo blob from HDMI frame');

      const dataUrl = canvas.toDataURL('image/jpeg', 0.3); // lightweight preview for tray
      const photoId = 'snap_' + Math.random().toString(36).substring(2, 9);

      const newCapturedItem: CapturedPhotoItem = {
        id: photoId,
        dataUrl,
        timestamp: formattedTime,
        status: 'uploading',
      };

      setCapturedPhotos((prev) => [newCapturedItem, ...prev.slice(0, 19)]); // keep last 20

      // Upload to WedSnap Backend
      try {
        await api.uploadPhoto(weddingSlug, blob, filename, {
          token: adminToken,
          deviceToken,
        });

        setCapturedPhotos((prev) =>
          prev.map((item) => (item.id === photoId ? { ...item, status: 'success' } : item))
        );
        if (onPhotoUploaded) onPhotoUploaded();
      } catch (uploadErr: any) {
        setCapturedPhotos((prev) =>
          prev.map((item) =>
            item.id === photoId ? { ...item, status: 'failed', error: uploadErr.message } : item
          )
        );
      }
    } catch (err: any) {
      console.error('HDMI capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [isStreaming, isCapturing, soundEnabled, weddingSlug, adminToken, deviceToken, onPhotoUploaded]);

  // 4. Keyboard Shutter Trigger (SPACE or ENTER)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.code === 'Space' || e.code === 'Enter') && isStreaming) {
        e.preventDefault();
        snapAndUpload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming, snapAndUpload]);

  // 5. Intervalometer Automation
  useEffect(() => {
    clearInterval(intervalTimerRef.current);
    if (!isStreaming || intervalSeconds <= 0) {
      setIntervalCountdown(0);
      return;
    }

    setIntervalCountdown(intervalSeconds);

    intervalTimerRef.current = setInterval(() => {
      setIntervalCountdown((prev) => {
        if (prev <= 1) {
          snapAndUpload();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalTimerRef.current);
  }, [isStreaming, intervalSeconds, snapAndUpload]);

  // 6. Motion Detection Loop
  useEffect(() => {
    cancelAnimationFrame(motionLoopRef.current);
    if (!isStreaming || !motionTriggerEnabled) {
      setMotionScore(0);
      return;
    }

    const checkMotion = () => {
      if (!videoRef.current || !isStreaming) return;
      const video = videoRef.current;
      const w = 120;
      const h = 68;

      if (!prevFrameCanvasRef.current) {
        prevFrameCanvasRef.current = document.createElement('canvas');
        prevFrameCanvasRef.current.width = w;
        prevFrameCanvasRef.current.height = h;
      }

      const canvas = prevFrameCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const prevData = ctx.getImageData(0, 0, w, h);
        ctx.drawImage(video, 0, 0, w, h);
        const currData = ctx.getImageData(0, 0, w, h);

        let diff = 0;
        const totalPixels = w * h;
        for (let i = 0; i < currData.data.length; i += 4) {
          const rDiff = Math.abs(currData.data[i] - prevData.data[i]);
          const gDiff = Math.abs(currData.data[i + 1] - prevData.data[i + 1]);
          const bDiff = Math.abs(currData.data[i + 2] - prevData.data[i + 2]);
          if ((rDiff + gDiff + bDiff) / 3 > 30) {
            diff++;
          }
        }
        const score = Math.round((diff / totalPixels) * 100);
        setMotionScore(score);

        const now = Date.now();
        // Trigger snap if motion exceeds threshold and at least 3 seconds have passed since last snap
        if (score >= motionThreshold && now - motionLastSnapTime.current > 3000) {
          motionLastSnapTime.current = now;
          snapAndUpload();
        }
      }

      motionLoopRef.current = setTimeout(checkMotion, 350);
    };

    motionLoopRef.current = setTimeout(checkMotion, 600);

    return () => {
      clearTimeout(motionLoopRef.current);
    };
  }, [isStreaming, motionTriggerEnabled, motionThreshold, snapAndUpload]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Hardware Status */}
      <div className="bg-gradient-to-r from-stone-900 via-[#2A2622] to-stone-900 rounded-2xl p-6 text-white border border-champagne/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-champagne text-stone-900 text-[10px] font-bold tracking-widest uppercase flex items-center space-x-1">
              <Zap className="w-3 h-3 fill-current" />
              <span>HDMI DIRECT TETHER</span>
            </span>
            {isStreaming && (
              <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-semibold tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>CLEAN FEED LIVE ({streamResolution.width}x{streamResolution.height})</span>
              </span>
            )}
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-stone-100">
            HDMI Clean Feed Live Viewfinder & Shutter
          </h2>
          <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
            Connect any DSLR or Mirrorless camera via HDMI cable to a USB Video Capture Card (Cam Link, Elgato, or USB3 capture card). 
            Stream live uncompressed stills directly to the wedding gallery with zero software needed on the camera.
          </p>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-stone-200 text-xs font-medium transition flex items-center space-x-1.5 shrink-0"
        >
          <span>Clean HDMI Camera Setup Guide</span>
          {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Clean HDMI Setup Guide Accordion */}
      {showGuide && (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4 animate-in fade-in duration-200">
          <h3 className="font-serif text-lg font-medium text-stone-900 flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-champagne" />
            <span>How to Set Up "Clean HDMI" on Your Camera</span>
          </h3>
          <p className="text-xs text-stone-600">
            "Clean HDMI" outputs the camera sensor view without battery icons, focus boxes, or shutter speed text overlaid on the screen.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-700">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <p className="font-bold text-stone-900">Sony Alpha (A7 IV, A7 III, FX3)</p>
              <ol className="list-decimal list-inside space-y-1 text-stone-600 text-[11px]">
                <li>Menu &rarr; Setup (Yellow toolbox)</li>
                <li>HDMI Settings &rarr; <strong>HDMI Info. Display: OFF</strong></li>
                <li>Set HDMI Resolution to <strong>1080p</strong> or <strong>2160p</strong></li>
              </ol>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <p className="font-bold text-stone-900">Canon EOS (R5, R6, 5D Mk IV)</p>
              <ol className="list-decimal list-inside space-y-1 text-stone-600 text-[11px]">
                <li>Menu &rarr; Shooting Menu (Red)</li>
                <li>HDMI display &rarr; <strong>Without info / Clean</strong></li>
                <li>Press INFO button on camera to toggle clear viewfinder</li>
              </ol>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <p className="font-bold text-stone-900">Nikon Z & Fuji (Z6, Z8, X-T5)</p>
              <ol className="list-decimal list-inside space-y-1 text-stone-600 text-[11px]">
                <li>Setup Menu &rarr; HDMI &rarr; Output resolution: Auto</li>
                <li>Advanced &rarr; <strong>Live View On-Screen Display: OFF</strong></li>
                <li>Disable camera auto power-off timer</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Main Viewfinder Monitor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Cols: Cinematic Viewfinder */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-stone-950 aspect-[16/10] sm:aspect-[16/9] border-2 border-stone-800 shadow-2xl flex items-center justify-center">
            {/* Shutter White Flash Effect */}
            <div
              className={`absolute inset-0 bg-white z-40 pointer-events-none transition-opacity duration-150 ${
                isFlashing ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Live Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-contain ${isStreaming ? 'block' : 'hidden'}`}
            />

            {/* Offline / Placeholder State */}
            {!isStreaming && (
              <div className="text-center p-8 space-y-4 max-w-md z-10">
                <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center mx-auto text-champagne shadow-inner">
                  <Camera className="w-8 h-8 stroke-[1.5]" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-serif text-xl text-stone-200 font-normal">HDMI Viewfinder Inactive</h4>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Select your USB HDMI Capture Card below and click <strong>"CONNECT HDMI FEED"</strong> to start the clean live preview.
                  </p>
                </div>
                {streamError && (
                  <div className="p-3 rounded-xl bg-red-950/80 border border-red-800/60 text-red-200 text-xs flex items-center space-x-2 text-left">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{streamError}</span>
                  </div>
                )}
                <button
                  onClick={() => startStream()}
                  className="px-6 py-3 rounded-full bg-champagne hover:bg-champagne-hover text-stone-900 text-xs font-bold tracking-widest uppercase transition shadow-lg inline-flex items-center space-x-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>CONNECT HDMI FEED</span>
                </button>
              </div>
            )}

            {/* Viewfinder Rule-of-Thirds Grid Overlay */}
            {isStreaming && showGrid && (
              <div className="absolute inset-0 pointer-events-none z-20 grid grid-cols-3 grid-rows-3 border border-white/20">
                <div className="border-r border-b border-white/15"></div>
                <div className="border-r border-b border-white/15"></div>
                <div className="border-b border-white/15"></div>
                <div className="border-r border-b border-white/15"></div>
                <div className="border-r border-b border-white/15"></div>
                <div className="border-b border-white/15"></div>
                <div className="border-r border-white/15"></div>
                <div className="border-r border-white/15"></div>
                <div></div>

                {/* Center Crosshair */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-champagne/60 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-champagne rounded-full"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Live Viewfinder HUD Badges */}
            {isStreaming && (
              <div className="absolute top-4 inset-x-4 flex items-center justify-between z-30 pointer-events-none">
                <div className="flex items-center space-x-2">
                  <div className="px-3 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-white text-[11px] font-mono flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    <span className="font-bold text-red-400">REC / LIVE</span>
                    <span className="text-stone-400">|</span>
                    <span>{streamResolution.width}x{streamResolution.height}</span>
                  </div>

                  {intervalSeconds > 0 && (
                    <div className="px-3 py-1 rounded-md bg-amber-950/80 backdrop-blur-md border border-amber-600/40 text-amber-300 text-[11px] font-mono flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      <span>AUTO-SNAP IN: <strong>{intervalCountdown}s</strong></span>
                    </div>
                  )}

                  {motionTriggerEnabled && (
                    <div className="px-3 py-1 rounded-md bg-sky-950/80 backdrop-blur-md border border-sky-600/40 text-sky-300 text-[11px] font-mono flex items-center space-x-1.5">
                      <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                      <span>MOTION SENSOR: <strong>{motionScore}%</strong></span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 pointer-events-auto">
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`p-2 rounded-md backdrop-blur-md border text-xs transition ${
                      showGrid
                        ? 'bg-champagne text-stone-900 border-champagne'
                        : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                    }`}
                    title="Toggle Rule of Thirds Grid"
                  >
                    <Layers className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-2 rounded-md backdrop-blur-md border text-xs transition ${
                      soundEnabled
                        ? 'bg-black/60 text-stone-200 border-white/20 hover:bg-black/80'
                        : 'bg-red-950/80 text-red-400 border-red-700/60'
                    }`}
                    title="Toggle Shutter Sound"
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Bar Controls inside Viewfinder */}
            {isStreaming && (
              <div className="absolute bottom-4 inset-x-4 flex items-center justify-between z-30 pointer-events-none">
                <div className="text-[11px] font-mono text-white/80 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md border border-white/10 hidden sm:block">
                  Press <strong>SPACEBAR</strong> or <strong>ENTER</strong> to Snap
                </div>

                <div className="pointer-events-auto ml-auto">
                  <button
                    onClick={stopStream}
                    className="px-3 py-1.5 rounded-md bg-stone-900/90 hover:bg-stone-800 text-stone-300 border border-white/10 text-xs font-medium transition flex items-center space-x-1.5"
                  >
                    <Square className="w-3.5 h-3.5 text-red-400" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Main Shutter & Trigger Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              {/* Shutter Button */}
              <button
                disabled={!isStreaming || isCapturing}
                onClick={snapAndUpload}
                className={`w-full sm:w-auto px-8 py-4 rounded-2xl text-stone-950 font-bold tracking-widest text-sm uppercase transition flex items-center justify-center space-x-3 shadow-lg active:scale-95 ${
                  isStreaming && !isCapturing
                    ? 'bg-gradient-to-r from-[#D4AF37] via-[#E2C775] to-[#C5A880] hover:brightness-105 ring-4 ring-champagne/30'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                <Camera className="w-5 h-5 fill-current" />
                <span>{isCapturing ? 'STREAMING...' : 'SNAP & STREAM TO GALLERY'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end text-xs text-stone-700">
              {/* Device Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-stone-500 font-medium">Input:</label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    if (isStreaming) startStream(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 text-xs focus:ring-2 focus:ring-champagne focus:outline-none max-w-[200px] truncate"
                >
                  {videoDevices.map((d, idx) => (
                    <option key={d.deviceId || idx} value={d.deviceId}>
                      {d.label || `Video Device ${idx + 1}`}
                    </option>
                  ))}
                </select>
                <button
                  onClick={refreshDevices}
                  className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 transition"
                  title="Refresh Connected Devices"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {!isStreaming ? (
                <button
                  onClick={() => startStream()}
                  className="px-4 py-2 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 transition"
                >
                  Connect
                </button>
              ) : (
                <button
                  onClick={stopStream}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-medium hover:bg-stone-200 transition"
                >
                  Stop
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Automation & Live Capture Stream Tray */}
        <div className="space-y-6">
          {/* Automation Control Panel */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
            <h4 className="font-serif text-base font-semibold text-stone-900 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-champagne" />
              <span>Capture Automation</span>
            </h4>

            {/* Intervalometer Mode */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-700">Auto-Snap Timer</span>
                <span className="text-[11px] text-stone-500">
                  {intervalSeconds > 0 ? `Every ${intervalSeconds}s` : 'Disabled'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[11px]">
                {[0, 5, 10, 30].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setIntervalSeconds(sec)}
                    className={`py-1.5 rounded-lg border font-medium transition ${
                      intervalSeconds === sec
                        ? 'bg-champagne text-white border-champagne'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {sec === 0 ? 'OFF' : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Motion Sensor Mode */}
            <div className="pt-3 border-t border-stone-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-medium text-stone-800">Motion Trigger</p>
                  <p className="text-[10px] text-stone-500">Snap when guests step in</p>
                </div>
                <button
                  onClick={() => setMotionTriggerEnabled(!motionTriggerEnabled)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider transition ${
                    motionTriggerEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {motionTriggerEnabled ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

              {motionTriggerEnabled && (
                <div className="space-y-1 pt-1 text-[11px] text-stone-600">
                  <div className="flex justify-between">
                    <span>Sensitivity:</span>
                    <span>{motionThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="40"
                    value={motionThreshold}
                    onChange={(e) => setMotionThreshold(Number(e.target.value))}
                    className="w-full accent-champagne"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Recently Captured Stills Tray */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-base font-semibold text-stone-900">
                HDMI Capture Tray ({capturedPhotos.length})
              </h4>
              <span className="text-[10px] text-stone-400">Live Session</span>
            </div>

            {capturedPhotos.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-xs">
                No stills captured yet this session. Press <strong>Spacebar</strong> to snap from the live video feed.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {capturedPhotos.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-xl bg-stone-50 border border-stone-200 flex items-center space-x-3 text-xs"
                  >
                    <img
                      src={item.dataUrl}
                      alt="Capture"
                      className="w-14 h-10 object-cover rounded-lg border border-stone-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[11px] text-stone-800 truncate">{item.timestamp}</p>
                      <div className="flex items-center space-x-1 mt-0.5">
                        {item.status === 'uploading' && (
                          <span className="text-amber-600 text-[10px] flex items-center space-x-1 font-medium">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            <span>Uploading...</span>
                          </span>
                        )}
                        {item.status === 'success' && (
                          <span className="text-emerald-700 text-[10px] flex items-center space-x-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Live on Gallery</span>
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="text-red-600 text-[10px] flex items-center space-x-1 font-medium" title={item.error}>
                            <AlertCircle className="w-3 h-3" />
                            <span>Upload failed</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
