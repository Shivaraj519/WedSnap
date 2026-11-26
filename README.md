# WEDSNAP

> **Tagline:** Every Moment. Every Memory. Instantly Yours.  
> **Platform:** AI-Powered Real-Time Wedding Photography Sharing & Intelligent Photo Discovery Platform

WedSnap is an enterprise-grade wedding photography distribution platform that automatically streams photographs from mobile smartphones and professional DSLR/mirrorless cameras to wedding guests immediately after they are captured.

---

## Key Highlights

- **Multi-Camera Input Sources:**
  - Android native Kotlin/Compose photographer app with MediaStore ContentObserver & WorkManager offline queue.
  - DSLR/Mirrorless tethering support with Canon EOS Utility, Sony Imaging Edge, and Nikon NX Tether adapters.
  - Wireless direct Wi-Fi FTP camera reception (Canon R-series, Sony Alpha, Nikon Z).
  - USB / ADB laptop bridge.
- **Unified Cloud Upload Engine:**
  - SHA-256 pre-flight duplicate checking.
  - High-resolution original file preservation with WebP thumbnail generation.
  - EXIF metadata extraction (Camera body, Lens, Focal length, Shutter speed, Aperture, ISO).
  - Real-time WebSocket event distribution to connected guests.
- **Luxury Editorial Guest Experience:**
  - Warm Ivory (`#FAF8F5`) and Champagne Gold (`#C5A880`) visual aesthetic.
  - Real-time live photo feed with newest photos appearing automatically.
  - Zero application installation required for guests.
  - Single and batch original HD downloads.
- **Find My Photos (AI Facial Recognition):**
  - Instant candid discovery using 512-dimension vector embeddings and cosine similarity.
  - Privacy-first design: mandatory explicit consent, zero selfie retention (in-memory processing with immediate destruction), and one-click admin biometric purge.
- **Table Card & QR Code Generator:**
  - Unique unguessable QR codes per wedding.
  - Print-ready 5x7 inch editorial banquet table cards generated on the fly.
- **Zero Docker Requirement:** Designed for managed cloud architectures (Vercel + Render + Supabase).

---

## Monorepo Directory Structure

```text
wedsnap/
├── backend/                  # FastAPI Cloud Backend
│   ├── app/
│   │   ├── api/              # REST & WebSocket endpoints (auth, weddings, photos, devices, face_search, qr, analytics)
│   │   ├── database/         # Session management & PostgreSQL/SQLite support
│   │   ├── models/           # SQLAlchemy models (Wedding, Device, Photo, FaceIndex, FaceSearchSession, DownloadLog)
│   │   ├── schemas/          # Pydantic v2 schemas
│   │   ├── services/         # Upload engine, thumbnail generator, face recognition, storage, QR generator
│   │   ├── websocket/        # Real-time WebSocket connection manager
│   │   ├── security/         # Device tokens (SHA-256), Admin JWTs, signed download URLs
│   │   └── main.py           # Application entrypoint & live WebSocket route
│   ├── requirements.txt
│   ├── render.yaml           # Cloud deployment manifest for Render
│   └── test_e2e.py           # Comprehensive 13-stage integration test suite
│
├── frontend/                 # React 18/19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/       # Navbar, Footer, PhotoCard, PhotoLightbox, FindMyPhotosModal, QRCodeModal
│   │   ├── pages/            # GuestHomePage, AdminDashboardPage
│   │   ├── services/         # API client & WebSocket live sync manager
│   │   └── types/            # TypeScript type definitions
│   ├── tailwind.config.js    # Luxury warm ivory / champagne gold design system
│   └── vercel.json           # Vercel cloud deployment config
│
├── android/                  # Android Photographer Application
│   ├── app/src/main/
│   │   ├── java/com/wedsnap/photographer/
│   │   │   ├── data/local/   # Room Database offline queue (PhotoEntity, PhotoDao)
│   │   │   ├── data/remote/  # Retrofit API service
│   │   │   ├── service/      # MediaObserverService (Foreground) & PhotoUploadWorker (WorkManager)
│   │   │   ├── ui/           # Jetpack Compose PairingScreen & StatusScreen
│   │   │   └── utils/        # ChecksumUtils (SHA-256 streaming)
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
│
├── dslr_connector/           # Professional DSLR & Mirrorless Laptop Tethering
│   ├── adapters/             # FolderWatch, Canon, Sony, Nikon, and Wi-Fi FTP adapters
│   ├── monitoring/           # Write-lock file stabilization checker
│   ├── upload/               # Multi-threaded uploader with duplicate prevention
│   └── wedsnap_dslr.py       # Main CLI runner
│
├── usb_connector/            # Android Phone USB / ADB Laptop Bridge
│   ├── adb/                  # ADB client wrapper
│   ├── upload/               # Cloud uploader
│   └── wedsnap_usb.py        # Main CLI runner
│
├── supabase/
│   └── schema.sql            # Production Supabase PostgreSQL schema with pgvector & RLS
│
├── docs/                     # Comprehensive Architecture & Setup Guides
│   ├── ARCHITECTURE.md
│   ├── CLOUD_DEPLOYMENT.md
│   ├── ANDROID_SETUP.md
│   ├── DSLR_WORKFLOW_GUIDE.md
│   └── USB_ADB_GUIDE.md
│
├── .env.example
└── README.md
```

---

## Quick Start (Local & Cloud Testing)

### 1. Launch the Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate          # Windows (or source venv/bin/activate on Unix)
pip install -r requirements.txt
pip install opencv-python-headless
python run.py
```
Backend will be live at `http://localhost:8000` with Swagger documentation at `http://localhost:8000/docs`.

### 2. Launch the Guest Website
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173/sophia-alexander` in your browser or smartphone.

### 3. Run Integration Tests
```bash
cd backend
python test_e2e.py
```

---

## Production Cloud Deployment (No Docker)

- **Frontend:** Import the `frontend` folder into [Vercel](https://vercel.com).
- **Backend:** Connect the repository to [Render](https://render.com) Web Service using `render.yaml`.
- **Database & Storage:** Run `supabase/schema.sql` in [Supabase](https://supabase.com).

For step-by-step instructions, see [`docs/CLOUD_DEPLOYMENT.md`](docs/CLOUD_DEPLOYMENT.md).

---

## License
Proprietary — Designed for professional wedding studios and event photography agencies.
