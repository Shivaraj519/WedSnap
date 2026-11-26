import os
import logging
from typing import Callable
from adapters.folder_watch import FolderWatchAdapter

logger = logging.getLogger("wedsnap.dslr.canon")

class CanonAdapter(FolderWatchAdapter):
    """
    Dedicated Canon DSLR/Mirrorless tethering adapter.
    Tuned for Canon EOS Utility 3 & EOS R tethered pipelines.
    Monitors default Canon incoming folders and handles CR2, CR3, and JPEG dual-writes.
    """
    def __init__(self, watch_folder: str, on_photo_detected: Callable[[str], None], settle_delay: float = 1.0):
        if not watch_folder or watch_folder == "./incoming_dslr_photos":
            # Auto-detect standard Windows Canon tether directory if exists
            user_pics = os.path.expanduser("~/Pictures/EOS Utility")
            if os.path.exists(user_pics):
                watch_folder = user_pics
        super().__init__(watch_folder, on_photo_detected, settle_delay=settle_delay)
        logger.info(f"Initialized Canon EOS Utility adapter for: {self.watch_folder}")
