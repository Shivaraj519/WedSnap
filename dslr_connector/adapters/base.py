from abc import ABC, abstractmethod
from typing import Callable

class BaseCameraAdapter(ABC):
    def __init__(self, on_photo_detected: Callable[[str], None]):
        self.on_photo_detected = on_photo_detected
        self.is_running = False

    @abstractmethod
    def start(self):
        pass

    @abstractmethod
    def stop(self):
        pass
