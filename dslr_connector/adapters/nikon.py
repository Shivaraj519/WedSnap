import os
import logging
from typing import Callable
from adapters.folder_watch import FolderWatchAdapter

logger = logging.getLogger("wedsnap.dslr.nikon")

class NikonAdapter(FolderWatchAdapter):
    """
    Dedicated Nikon Z-series & D-series tether adapter.
    Tuned for Nikon NX Tether & Camera Control Pro 2.
    Handles NEF and High-Quality JPEG incoming transfers.
    """
    def __init__(self, watch_folder: str, on_photo_detected: Callable[[str], None], settle_delay: float = 1.0):
        if not watch_folder or watch_folder == "./incoming_dslr_photos":
            user_pics = os.path.expanduser("~/Pictures/Nikon")
            if os.path.exists(user_pics):
                watch_folder = user_pics
        super().__init__(watch_folder, on_photo_detected, settle_delay=settle_delay)
        logger.info(f"Initialized Nikon NX Tether adapter for: {self.watch_folder}")
