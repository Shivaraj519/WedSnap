# WedSnap Professional DSLR & Mirrorless Camera Workflow Guide

WedSnap includes a dedicated desktop background service (`dslr_connector/`) designed for wedding photographers shooting with professional digital cameras (Canon, Sony, Nikon, Fujifilm, Lumix).

---

## Workflow Overview

Wedding photographers can connect their cameras to WedSnap using four supported methods:

| Method | Best For | Technology |
| :--- | :--- | :--- |
| **1. Hot-Folder Monitoring** | Tethered USB shoots (Capture One, Lightroom, EOS Utility, Imaging Edge) | Filesystem Watchdog |
| **2. Canon EOS Utility** | Canon R-series and DSLR cameras via USB cable | Canon Profile Adapter |
| **3. Sony Imaging Edge** | Sony A7 IV, A7R V, A9, A1 via USB-C or Wi-Fi PC Remote | Sony Profile Adapter |
| **4. Direct Wi-Fi FTP** | Untethered wireless cameras with built-in Wi-Fi | Built-in RFC FTP Server (Port 2121) |

---

## Setup & Configuration

1. Navigate to the `dslr_connector/` folder.
2. Edit `config.ini`:
   ```ini
   [WedSnap]
   backend_url = https://wedsnap-backend.onrender.com
   device_token = wds_your_dslr_device_token_from_admin
   wedding_slug = sophia-alexander

   [Tethering]
   # Options: 'canon', 'sony', 'nikon', 'folder', 'ftp'
   adapter = folder
   watch_folder = ./incoming_dslr_photos
   write_settle_delay = 1.0

   [FTP_Server]
   enabled = false
   port = 2121
   user = wedsnap
   password = camera
   storage_dir = ./ftp_incoming
   ```

---

## Method 1: USB Tethering via Manufacturer Software

### Canon EOS Workflow
1. Connect Canon camera via USB cable to laptop.
2. Launch **Canon EOS Utility 3**.
3. Select **Preferences** > **Destination Folder** > point to `./incoming_dslr_photos` (or note the default directory).
4. In `config.ini`, set `adapter = canon`.
5. Run the connector:
   ```bash
   python wedsnap_dslr.py
   ```
6. Every photograph clicked automatically downloads to the folder; WedSnap verifies file write completion and immediately uploads it to the live guest gallery.

### Sony Alpha Workflow
1. Connect Sony camera via USB-C.
2. On camera: **Menu** > **Network** > **PC Remote Function** > **On**.
3. Launch **Sony Imaging Edge Desktop (Remote)**.
4. Set save destination to `./incoming_dslr_photos`.
5. In `config.ini`, set `adapter = sony`.
6. Run: `python wedsnap_dslr.py`.

### Nikon Z / D-Series Workflow
1. Connect Nikon camera via USB.
2. Open **Nikon NX Tether** or **Camera Control Pro 2**.
3. Point download directory to `./incoming_dslr_photos`.
4. In `config.ini`, set `adapter = nikon`.
5. Run: `python wedsnap_dslr.py`.

---

## Method 2: Wireless Direct Wi-Fi FTP Transfer

For cameras that support direct FTP transmission over local Wi-Fi / hotspot (Canon 1DX/R3/R5/R6, Sony A1/A9/A7R, Nikon Z8/Z9):

1. Connect both camera and laptop to the same Wi-Fi router or mobile phone hotspot.
2. In `config.ini`, enable the built-in FTP server:
   ```ini
   [FTP_Server]
   enabled = true
   port = 2121
   user = wedsnap
   password = camera
   ```
3. Run the connector:
   ```bash
   python wedsnap_dslr.py
   ```
4. In camera menu, set FTP Transfer:
   - Server IP: Laptop's local IP address (e.g. `192.168.1.45`)
   - Port: `2121`
   - User: `wedsnap`
   - Password: `camera`
   - Target Folder: `/`
5. Set camera to **Auto Transfer on Capture**.
6. Walk freely around the wedding banquet hall; every photograph transmits wirelessly to the laptop and lands in the cloud gallery in real-time!
