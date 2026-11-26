import os
import time
import logging
from typing import Callable, Set
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from adapters.base import BaseCameraAdapter
from monitoring.write_lock import wait_for_file_completion

logger = logging.getLogger("wedsnap.dslr.folder")

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".cr2", ".cr3", ".arw", ".nef", ".dng"}

class FolderEventHandler(FileSystemEventHandler):
    def __init__(self, callback: Callable[[str], None], settle_delay: float = 1.0):
        super().__init__()
        self.callback = callback
        self.settle_delay = settle_delay
        self.processed_paths: Set[str] = set()

    def _process_candidate(self, filepath: str):
        filepath = os.path.abspath(filepath)
        ext = os.path.splitext(filepath)[1].lower()
        if ext not in IMAGE_EXTENSIONS:
            return

        if filepath in self.processed_paths:
            return

        # Wait until camera finishes writing
        if wait_for_file_completion(filepath, settle_delay=self.settle_delay):
            self.processed_paths.add(filepath)
            self.callback(filepath)

    def on_created(self, event):
        if not event.is_directory:
            self._process_candidate(event.src_path)

    def on_modified(self, event):
        if not event.is_directory:
            self._process_candidate(event.src_path)


class FolderWatchAdapter(BaseCameraAdapter):
    def __init__(self, watch_folder: str, on_photo_detected: Callable[[str], None], settle_delay: float = 1.0):
        super().__init__(on_photo_detected)
        self.watch_folder = os.path.abspath(watch_folder)
        self.settle_delay = settle_delay
        self.observer = Observer()
        os.makedirs(self.watch_folder, exist_ok=True)

    def start(self):
        handler = FolderEventHandler(self.on_photo_detected, settle_delay=self.settle_delay)
        self.observer.schedule(handler, path=self.watch_folder, recursive=True)
        self.observer.start()
        self.is_running = True
        logger.info(f"FolderWatchAdapter started monitoring: {self.watch_folder}")

    def stop(self):
        if self.is_running:
            self.observer.stop()
            self.observer.join()
            self.is_running = False
            logger.info("FolderWatchAdapter stopped.")
