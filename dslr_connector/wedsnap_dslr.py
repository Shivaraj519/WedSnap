import os
import sys
import time
import configparser
import logging

from adapters.folder_watch import FolderWatchAdapter
from adapters.canon import CanonAdapter
from adapters.sony import SonyAdapter
from adapters.nikon import NikonAdapter
from adapters.wifi_ftp import WiFiFTPAdapter
from upload.uploader import DSLRUploader

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [WedSnap-DSLR] %(levelname)s: %(message)s"
)
logger = logging.getLogger("wedsnap.dslr.main")

def print_banner():
    print("=" * 65)
    print("           WEDSNAP PRO DSLR & MIRRORLESS CONNECTOR            ")
    print("    Automated Zero-Touch Photo Distribution for Photographers ")
    print("=" * 65)

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
    adapter_type = config.get("Tethering", "adapter", fallback="folder").lower()
    watch_folder = config.get("Tethering", "watch_folder", fallback="./incoming_dslr_photos")
    settle_delay = config.getfloat("Tethering", "write_settle_delay", fallback=1.0)

    # Optional FTP Server
    ftp_enabled = config.getboolean("FTP_Server", "enabled", fallback=False)
    ftp_port = config.getint("FTP_Server", "port", fallback=2121)
    ftp_user = config.get("FTP_Server", "user", fallback="wedsnap")
    ftp_pass = config.get("FTP_Server", "password", fallback="camera")
    ftp_dir = config.get("FTP_Server", "storage_dir", fallback="./ftp_incoming")

    uploader = DSLRUploader(
        backend_url=backend_url,
        device_token=device_token,
        wedding_slug=wedding_slug
    )

    def on_photo_ready(filepath: str):
        logger.info(f"DSLR Capture Ready: {os.path.basename(filepath)}")
        uploader.enqueue(filepath)

    # Select adapter
    adapters = []
    if adapter_type == "canon":
        adapters.append(CanonAdapter(watch_folder, on_photo_ready, settle_delay=settle_delay))
    elif adapter_type == "sony":
        adapters.append(SonyAdapter(watch_folder, on_photo_ready, settle_delay=settle_delay))
    elif adapter_type == "nikon":
        adapters.append(NikonAdapter(watch_folder, on_photo_ready, settle_delay=settle_delay))
    elif adapter_type == "ftp":
        adapters.append(WiFiFTPAdapter(ftp_dir, on_photo_ready, port=ftp_port, user=ftp_user, password=ftp_pass))
    else: # Default folder watch
        adapters.append(FolderWatchAdapter(watch_folder, on_photo_ready, settle_delay=settle_delay))

    if ftp_enabled and adapter_type != "ftp":
        adapters.append(WiFiFTPAdapter(ftp_dir, on_photo_ready, port=ftp_port, user=ftp_user, password=ftp_pass))

    logger.info(f"Wedding Gallery: {wedding_slug}")
    logger.info(f"Backend Server: {backend_url}")
    logger.info(f"Active Adapter: {adapter_type.upper()}")
    
    for a in adapters:
        a.start()

    print("\n>>> WEDSNAP DSLR CONNECTOR IS LIVE <<<")
    print("Every photograph shot on your tethered camera will instantly appear in the guest gallery.")
    print("Press Ctrl+C to terminate session.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping WedSnap DSLR connector...")
        for a in adapters:
            a.stop()
        uploader.stop()
        print("Session ended cleanly.")

if __name__ == "__main__":
    main()
