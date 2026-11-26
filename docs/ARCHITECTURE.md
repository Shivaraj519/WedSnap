# WedSnap System Architecture & Technical Specifications

> **Tagline:** Every Moment. Every Memory. Instantly Yours.  
> **Platform:** AI-Powered Real-Time Wedding Photography Sharing & Discovery Platform

---

## 1. Executive Summary

WedSnap solves the fundamental problem of modern wedding photography: guests wait weeks or months for photographs while relying on blurry WhatsApp pictures. WedSnap streams original, high-resolution photographs to wedding guests immediately after they are captured by professional photographers—whether using Android smartphones, flagship DSLRs, or mirrorless cameras.

Guests scan an elegant table QR code on their smartphone to view a real-time live gallery, discover photographs containing their face using AI, and download uncompressed original HD memories—with **zero app installation required**.

---

## 2. Unified System Architecture

```
                      +-----------------------------+
                      |   PHOTOGRAPHY INPUT SOURCES |
                      +-----------------------------+
                                     |
         +---------------------------+---------------------------+
         |                                                       |
         v                                                       v
+-----------------------------+                         +-----------------------------+
|    ANDROID SMARTPHONE       |                         |    DSLR / MIRRORLESS        |
| - ContentObserver MediaStore|                         | - Canon EOS Utility (USB)   |
| - Foreground Service Mode   |                         | - Sony Imaging Edge Remote  |
| - Persistent Room Queue     |                         | - Nikon NX Tether           |
| - Direct Cloud Upload API   |                         | - Wi-Fi Direct FTP Server   |
+-----------------------------+                         +-----------------------------+
         |                                                       |
         |                                                       |
         v                                                       v
+-----------------------------------------------------------------------------+
|                     WEDSNAP UNIFIED CLOUD UPLOAD ENGINE                     |
|                                                                             |
|  1. Pre-flight Checksum Query (SHA-256 Deduplication)                       |
|  2. Token Authentication (X-Device-Token Validation)                        |
|  3. Original Photo Storage (Supabase Storage / Resilient Cloud Volume)       |
|  4. EXIF Extraction & WebP Thumbnail Generation (Pillow LANCZOS)            |
|  5. AI Face Detection & Biometric Vector Indexing (512-dim Normalized)      |
|  6. Database Record Insertion (PostgreSQL / Supabase)                       |
|  7. Real-Time Broadcast (WebSocket to Live Gallery Viewers)                 |
+-----------------------------------------------------------------------------+
                                     |
         +---------------------------+---------------------------+
         |                                                       |
         v                                                       v
+-----------------------------+                         +-----------------------------+
|   PUBLIC GUEST EXPERIENCE   |                         |   PHOTOGRAPHER & ADMIN      |
| - Editorial Ivory/Champagne |                         | - Multi-Device Pairing      |
| - Real-Time Live Stream     |                         | - Photo & Gallery Moderation|
| - "Find My Photos" AI Search|                         | - Live Analytics & Bandwidth|
| - Individual / Batch HD Zips|                         | - 5x7 Printable Table Cards |
| - Zero App Install (Web)    |                         | - Biometric Purge Controls  |
+-----------------------------+                         +-----------------------------+
```

---

## 3. Core Architectural Modules

### 3.1 Backend Architecture (`backend/`)
- **Runtime:** Python 3.11+ / FastAPI
- **Database Layer:** SQLAlchemy ORM with PostgreSQL (Supabase with `pgvector` support, zero-dependency local SQLite for rapid offline development).
- **Security & Authorization:**
  - Devices authenticate using high-entropy tokens (`wds_...`) hashed with SHA-256 in the database.
  - Admins authenticate via bcrypt-verified passwords yielding short-lived JWT tokens.
  - Secure signed URLs and streaming endpoints for full-resolution downloads.
- **Real-Time Distribution:** ConnectionManager coordinating WebSocket topics per wedding gallery with automated heartbeat and client keep-alives.

### 3.2 AI Facial Recognition Engine (`backend/app/services/face_recognition_service.py`)
- **Detection:** Dual-engine architecture combining OpenCV multi-scale Haar cascade detection with adaptive skin chrominance contour bounding fallback.
- **Representation:** 512-dimensional facial embedding vectors normalized to unit Euclidean length ($L2 = 1.0$).
- **Similarity Metric:** Cosine similarity via vector dot product ($\text{similarity} = u \cdot v$).
- **Privacy & Biometric Governance:**
  - Mandatory explicit guest consent before search execution.
  - Guest selfie bytes are processed strictly in-memory and destroyed immediately after matching.
  - Selfies are never saved to disk and never used for AI model training.
  - Admins possess one-click biometric purging to erase all vector indexes for the wedding.

### 3.3 Mobile Integration (`android/`)
- **Technology:** Kotlin, Jetpack Compose, Material3, Room Database, Retrofit, WorkManager.
- **Zero-Loss Camera Monitoring:** Uses Android `MediaStore` with `ContentObserver`.
- **Activation Timestamp Baseline:** Records exact millisecond of session activation, completely ignoring existing older photographs on the phone.
- **Offline Resilient Queue:** Stores pending uploads in local SQLite via Room. Automatically resumes upon internet restoration with exponential backoff.

### 3.4 DSLR & Mirrorless Connector (`dslr_connector/`)
- **Technology:** Python, Watchdog, Pillow, pyftpdlib.
- **Modular Adapter System:**
  - `FolderWatchAdapter`: Monitors incoming tethering hot folders.
  - `CanonAdapter`: Tuned for Canon EOS Utility 3 and EOS R workflows.
  - `SonyAdapter`: Tuned for Sony Imaging Edge Remote shooting.
  - `NikonAdapter`: Tuned for Nikon NX Tether.
  - `WiFiFTPAdapter`: Embedded RFC-compliant FTP receiver on port 2121 for direct wireless transmission from cameras with built-in Wi-Fi.
- **Write-Lock Verification (`write_lock.py`):** Monitors file byte stability and verification before upload, preventing partial or locked RAW/JPEG file reads.

### 3.5 USB / ADB Connector (`usb_connector/`)
- **Independent Laptop Bridge:** Detects Android phones via Android Debug Bridge (ADB).
- Scans `/sdcard/DCIM/Camera/` without modifying or deleting phone storage.
- Pulls new captures, verifies SHA-256 checksum, and streams to WedSnap cloud.

### 3.6 Frontend Guest Experience (`frontend/`)
- **Design Philosophy:** Luxury editorial wedding aesthetic.
  - Background: Warm Ivory (`#FAF8F5`)
  - Typography: Serif headings (Cormorant Garamond) + Modern sans-serif (Plus Jakarta Sans)
  - Accents: Champagne Gold (`#C5A880`) and Charcoal (`#232120`)
- **Deployment:** Vercel-ready with zero-config client-side routing.
