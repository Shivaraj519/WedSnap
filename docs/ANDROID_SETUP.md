# WedSnap Android Photographer Application Setup & User Guide

The WedSnap Android Application is a dedicated companion tool for event photographers using Android smartphones. It monitors the smartphone's camera roll in real-time, automatically detects newly captured photographs, and streams original-resolution files directly to the WedSnap cloud gallery.

---

## Key Features

- **Selective Activation Baseline:** Only photographs taken *after* you activate the wedding session are synced. Your personal camera roll and existing gallery photos are strictly ignored.
- **Background Foreground Service:** Operates during active shooting sessions even when switching between camera apps or when the screen dims.
- **Zero Resolution Loss:** Uploads original uncompressed camera files directly via streams.
- **SHA-256 Checksumming:** Verifies file integrity and prevents duplicate uploads.
- **Offline Resilient Queue:** If cellular coverage drops in remote banquet halls or outdoor lawns, uploads are queued locally in an encrypted Room SQLite database and automatically retried when signal returns.

---

## Prerequisites

- Android 8.0 (API Level 26) or higher.
- Android Studio Ladybug (2024.2+) or Gradle command-line tools.
- JDK 17.

---

## Building the APK

1. Open Android Studio and choose **Open an Existing Project**, pointing to the `android/` directory in this repository.
2. Allow Gradle sync to complete.
3. Build the debug or release APK:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
4. Output APK location:
   `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Installation & First-Time Setup

1. Install the APK onto the photographer's Android device:
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```
2. Launch **WedSnap Photographer** on the phone.
3. Grant **Photos & Videos** and **Notification** permissions when prompted.
4. On the pairing screen:
   - **WedSnap Server URL:** Enter your backend endpoint (e.g. `https://wedsnap-backend.onrender.com` or local testing `http://10.0.2.2:8000`).
   - **Wedding Identifier (Slug):** e.g. `sophia-alexander`.
   - **Photographer Device Token:** Enter the token generated from your Admin Dashboard (starts with `wds_`).
5. Tap **ACTIVATE LIVE TETHERING**.

---

## Operating During the Wedding

1. You will see a persistent notification: *"WedSnap Photographer Sync — Monitoring camera for new photos..."*.
2. Open your favorite native camera app (e.g. Samsung Camera, Google Pixel Camera, ProShot) and start taking photographs of the wedding.
3. Every time you snap a photo, WedSnap automatically detects the capture, calculates its SHA-256 checksum, checks for duplicates, and uploads the original high-definition file.
4. Return to the WedSnap app at any point to view:
   - **Photos Synced Counter**
   - **In Queue Counter**
   - **Pause / Resume Synchronization Toggle**
