import os
import sys
import time
import configparser
import logging
from typing import Set

from adb.adb_client import ADBClient
from upload.uploader import PhotoUploader

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [WedSnap-USB] %(levelname)s: %(message)s"
)
logger = logging.getLogger("wedsnap.usb.main")

def print_banner():
    print("=" * 60)
    print("          WEDSNAP USB / ADB LAPTOP CONNECTOR          ")
    print("      Real-Time Mobile Camera Tethering & Cloud Sync   ")
    print("=" * 60)

def main():
    print_banner()

    config_path = os.path.join(os.path.dirname(__file__), "config.ini")
    if not os.path.exists(config_path):
        logger.error(f"Configuration file {config_path} not found.")
        sys.exit(1)

    config = configparser.ConfigParser()
    config.read(config_path)

    backend_url = config.get("WedSnap", "backend_url", fallback="http://localhost:8000")
    device_token = config.get("WedSnap", "device_token", fallback="")
    wedding_slug = config.get("WedSnap", "wedding_slug", fallback="sophia-alexander")
    adb_path = config.get("ADB", "adb_path", fallback="adb")
    phone_path = config.get("ADB", "phone_camera_path", fallback="/sdcard/DCIM/Camera")
    staging_dir = config.get("ADB", "local_staging_dir", fallback="./staging_cache")
    poll_sec = config.getint("ADB", "poll_interval_seconds", fallback=2)

    os.makedirs(staging_dir, exist_ok=True)

    adb = ADBClient(adb_path=adb_path)
    uploader = PhotoUploader(backend_url=backend_url, device_token=device_token, wedding_slug=wedding_slug)

    logger.info(f"Target Wedding: {wedding_slug}")
    logger.info(f"Cloud Endpoint: {backend_url}")
    logger.info(f"Phone Monitoring Path: {phone_path}")
    logger.info(f"Local Staging Cache: {os.path.abspath(staging_dir)}")

    print("\nWaiting for Android phone with USB Debugging enabled...")
    active_device = None
    while not active_device:
        devices = adb.list_devices()
        if devices:
            active_device = devices[0]
            logger.info(f"Connected to Android Device: {active_device}")
        else:
            time.sleep(2)

    # Initial baseline scan - Record files already on phone to avoid uploading old camera roll
    logger.info("Performing baseline inventory of existing gallery on phone...")
    existing_files: Set[str] = set(adb.list_files(active_device, phone_path))
    logger.info(f"Ignored {len(existing_files)} existing photographs taken before activation.")
    print("\n>>> ACTIVE PHOTOGRAPHY SESSION IN PROGRESS <<<")
    print("Take photos with your phone camera. New captures will sync automatically.\n")

    uploaded_count = 0

    try:
        while True:
            # Verify phone still connected
            current_devices = adb.list_devices()
            if active_device not in current_devices:
                logger.warning(f"Device {active_device} disconnected. Waiting for reconnection...")
                active_device = None
                while not active_device:
                    devs = adb.list_devices()
                    if devs:
                        active_device = devs[0]
                        logger.info(f"Reconnected: {active_device}")
                    time.sleep(2)

            # Poll for new files
            current_files = set(adb.list_files(active_device, phone_path))
            new_files = current_files - existing_files

            for filename in sorted(new_files):
                logger.info(f"NEW PHOTOGRAPH DETECTED: {filename}")
                remote_file = f"{phone_path}/{filename}"
                local_dest = os.path.join(staging_dir, filename)

                # Pull to laptop
                if adb.pull_file(active_device, remote_file, local_dest):
                    logger.info(f"Transferred to laptop: {filename}")
                    # Upload to cloud
                    if uploader.upload_photo(local_dest, wedding_id=wedding_slug):
                        uploaded_count += 1
                        logger.info(f"Synced to Live Gallery! (Total session syncs: {uploaded_count})")
                    existing_files.add(filename)
                else:
                    logger.warning(f"Could not pull {filename} from phone. Will retry next cycle.")

            time.sleep(poll_sec)
    except KeyboardInterrupt:
        print("\nSession stopped by user. All local files preserved in staging directory.")

if __name__ == "__main__":
    main()
