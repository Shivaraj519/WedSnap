import os
import logging
from typing import Callable
from adapters.folder_watch import FolderWatchAdapter

logger = logging.getLogger("wedsnap.dslr.sony")

class SonyAdapter(FolderWatchAdapter):
    """
    Dedicated Sony Alpha Mirrorless adapter.
    Tuned for Sony Imaging Edge Remote & Remote Shooting.
    Handles ARW RAW + JPEG simultaneous PC transfer.
    """
    def __init__(self, watch_folder: str, on_photo_detected: Callable[[str], None], settle_delay: float = 1.0):
        if not watch_folder or watch_folder == "./incoming_dslr_photos":
            user_pics = os.path.expanduser("~/Pictures/Imaging Edge")
            if os.path.exists(user_pics):
                watch_folder = user_pics
        super().__init__(watch_folder, on_photo_detected, settle_delay=settle_delay)
        logger.info(f"Initialized Sony Imaging Edge adapter for: {self.watch_folder}")
