# WedSnap USB / ADB Laptop Connector Guide

The **WedSnap USB Connector** (`usb_connector/`) is an independent desktop utility for photographers or crew members who connect an Android phone directly to a Windows/macOS/Linux laptop via USB cable using Android Debug Bridge (ADB).

---

## Workflow Overview

1. Photographer connects their Android smartphone to laptop via USB cable.
2. Enable **USB Debugging** on the Android device.
3. WedSnap detects the phone and performs an initial baseline scan of `/sdcard/DCIM/Camera/`.
4. Previous photos on the phone are cataloged and ignored.
5. As new photos are clicked with the phone's native camera, WedSnap pulls them to local laptop staging, verifies the SHA-256 checksum, and uploads them to the WedSnap cloud gallery.
6. **Safety Guarantee:** Original photographs on the smartphone are never deleted or modified.

---

## Prerequisites

- Android phone with Developer Options & USB Debugging enabled.
- `adb` (Android Debug Bridge) in system PATH (comes with Android SDK Platform-Tools or standalone).
- Python 3.10+ installed on laptop.

---

## Quick Start

1. Edit `usb_connector/config.ini`:
   ```ini
   [WedSnap]
   backend_url = https://wedsnap-backend.onrender.com
   device_token = wds_your_usb_device_token_from_admin
   wedding_slug = sophia-alexander

   [ADB]
   adb_path = adb
   phone_camera_path = /sdcard/DCIM/Camera
   local_staging_dir = ./staging_cache
   poll_interval_seconds = 2
   ```

2. Run the connector:
   ```bash
   cd usb_connector
   python wedsnap_usb.py
   ```

3. The console will display:
   ```text
   ============================================================
             WEDSNAP USB / ADB LAPTOP CONNECTOR          
         Real-Time Mobile Camera Tethering & Cloud Sync   
   ============================================================
   Waiting for Android phone with USB Debugging enabled...
   Connected to Android Device: R58N90XXXXX
   Performing baseline inventory of existing gallery on phone...
   Ignored 342 existing photographs taken before activation.

   >>> ACTIVE PHOTOGRAPHY SESSION IN PROGRESS <<<
   Take photos with your phone camera. New captures will sync automatically.
   ```

4. Every newly captured photograph is pulled, verified, and uploaded automatically!
