# WedSnap HDMI Clean Feed & Video Capture Card Setup Guide

WedSnap supports direct **Clean HDMI Video Capture** alongside DSLR hot-folder tethering, Wi-Fi FTP, and Android mobile background sync.

With HDMI capture:
- **Zero software needed on the camera**: Plug in the HDMI cable and WedSnap sees the camera sensor feed directly.
- **Zero latency**: 1080p / 4K 60fps real-time viewfinder.
- **Instant Cloud Streaming**: Press `SPACEBAR` or click **"Snap & Stream"** to grab uncompressed frames and push them live to the wedding gallery.
- **Built-in Automation**: Intervalometer auto-snap (e.g. every 10s for dance floor / stage coverage) and motion detection auto-snap.

---

## 1. Hardware Requirements

1. **Camera**: Any DSLR or Mirrorless camera with an HDMI output (Sony Alpha, Canon EOS, Nikon Z, Fujifilm X, Panasonic Lumix, Blackmagic).
2. **HDMI Cable**:
   - Camera end: Micro-HDMI (Type D) or Mini-HDMI (Type C) or full HDMI (Type A) depending on your camera model.
   - Computer end: Standard HDMI (Type A).
3. **USB HDMI Video Capture Card**:
   - Elgato Cam Link 4K, or
   - Any standard USB 3.0 / USB-C HDMI Video Capture dongle ($15–$25 on Amazon/Flipkart).
   - *No driver installation required — standard UVC (USB Video Class).*

---

## 2. Enabling "Clean HDMI" on Your Camera

"Clean HDMI" outputs the raw sensor image without battery indicators, shutter speed text, or focus boxes overlaid on the recorded image.

### Sony Alpha (A7 IV, A7 III, A7R V, A6700, FX3)
1. Press **Menu** &rarr; go to **Setup** (Yellow toolbox icon).
2. Navigate to **HDMI Settings**.
3. Set **HDMI Info. Display** to **OFF** (Crucial).
4. Set **HDMI Resolution** to **1080p** or **2160p (Auto)**.

### Canon EOS (R5, R6, R8, 5D Mark IV, EOS R)
1. Press **Menu** &rarr; go to **Shooting Menu (Red)**.
2. Select **HDMI display**.
3. Choose **Without info / Clean**.
4. Press the **INFO** button on the camera body if any overlay remains.

### Nikon (Z6 II, Z7 II, Z8, Z9, D850)
1. Press **Menu** &rarr; **Setup Menu**.
2. Select **HDMI** &rarr; **Output resolution** &rarr; **Auto**.
3. Under **Advanced**, turn **Live view on-screen display** to **OFF**.
4. Set standby timer / auto power-off to **No Limit**.

### Fujifilm (X-T4, X-T5, X-H2)
1. Press **Menu** &rarr; **Set Up** &rarr; **Connection Setting**.
2. Select **Information Display** &rarr; **OFF**.

---

## 3. Option A: Browser-Based Live HDMI Viewfinder (Zero Installation)

1. Connect the HDMI cable from your camera to your USB Capture Card plugged into your laptop.
2. Open the WedSnap Photographer & Admin Dashboard:
   - Navigate to `https://wed-snap-go2d.vercel.app/sophia-alexander` (or your wedding slug).
   - Enter passcode `wedding2026`.
3. Click the **"HDMI Live Capture"** tab (or click **"OPEN HDMI LIVE VIEWFINDER"**).
4. Select your capture card from the **Input** dropdown (e.g. `USB Video`, `Cam Link 4K`).
5. Click **"CONNECT HDMI FEED"**:
   - You will see your camera's live viewfinder in crisp 1080p with grid overlay and live HUD!
6. **Triggering Captures**:
   - **Manual**: Press **SPACEBAR** or **ENTER** or click the gold **"SNAP & STREAM"** button.
   - **Auto-Snap Intervalometer**: Choose `5s`, `10s`, or `30s` for continuous event coverage.
   - **Motion Sensor**: Turn on `Motion Trigger` to auto-snap when guests step into the frame.
   - *Every snap plays an authentic mechanical DSLR shutter sound and flashes the screen.*

---

## 4. Option B: Headless Python Background HDMI Connector

For photographers who want a background process without keeping a browser tab in focus:

```bash
# 1. Install dependencies
pip install opencv-python httpx

# 2. Run the HDMI Connector
python dslr_connector/hdmi_connector.py --server https://wedsnap-1.onrender.com --slug sophia-alexander --token YOUR_DEVICE_TOKEN
```

### Controls in the Python Window:
- `SPACEBAR` or `ENTER`: Snap frame & upload to WedSnap.
- `A`: Toggle auto-snap intervalometer.
- `Q`: Quit.
