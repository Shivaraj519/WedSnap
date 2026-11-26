import os
import time
import logging
from PIL import Image

logger = logging.getLogger("wedsnap.dslr.write_lock")

def wait_for_file_completion(filepath: str, timeout: float = 30.0, settle_delay: float = 1.0) -> bool:
    """
    Monitors an incoming DSLR image file until writing has ceased and the file size stabilizes.
    Prevents reading incomplete or locked files during active camera transfer.
    """
    start_time = time.time()
    last_size = -1

    while time.time() - start_time < timeout:
        if not os.path.exists(filepath):
            time.sleep(0.5)
            continue

        try:
            current_size = os.path.getsize(filepath)
            # Must be non-empty and unchanged after settle delay
            if current_size > 0 and current_size == last_size:
                # Test opening file handle
                with open(filepath, "rb") as f:
                    f.read(512)
                
                # Test image validity if JPEG/PNG/WebP
                if filepath.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                    try:
                        with Image.open(filepath) as img:
                            img.verify()
                    except Exception as e:
                        logger.debug(f"Image verify pending for {os.path.basename(filepath)}: {e}")
                        time.sleep(0.5)
                        continue

                logger.debug(f"File write completed and stabilized: {os.path.basename(filepath)} ({current_size} bytes)")
                return True

            last_size = current_size
        except (PermissionError, OSError):
            # File is currently locked by tethering software
            pass

        time.sleep(settle_delay)

    logger.warning(f"File completion timed out after {timeout}s: {filepath}")
    return False
