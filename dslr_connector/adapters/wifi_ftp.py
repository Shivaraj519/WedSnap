import os
import threading
import logging
from typing import Callable
from pyftpdlib.authorizers import DummyAuthorizer
from pyftpdlib.handlers import FTPHandler
from pyftpdlib.servers import FTPServer

from adapters.base import BaseCameraAdapter

logger = logging.getLogger("wedsnap.dslr.ftp")

class CameraFTPHandler(FTPHandler):
    callback: Callable[[str], None] = None

    def on_file_received(self, file: str):
        logger.info(f"FTP: Received complete photograph from camera: {os.path.basename(file)}")
        if CameraFTPHandler.callback:
            CameraFTPHandler.callback(file)

class WiFiFTPAdapter(BaseCameraAdapter):
    """
    Direct Wi-Fi FTP Receiver Server for wireless DSLR/Mirrorless cameras.
    Supported out-of-the-box by Canon EOS R, Sony Alpha, and Nikon Z series.
    """
    def __init__(
        self, 
        storage_dir: str, 
        on_photo_detected: Callable[[str], None], 
        port: int = 2121, 
        user: str = "wedsnap", 
        password: str = "camera"
    ):
        super().__init__(on_photo_detected)
        self.storage_dir = os.path.abspath(storage_dir)
        self.port = port
        self.user = user
        self.password = password
        self.server = None
        self.thread = None
        os.makedirs(self.storage_dir, exist_ok=True)

    def start(self):
        CameraFTPHandler.callback = self.on_photo_detected
        authorizer = DummyAuthorizer()
        authorizer.add_user(self.user, self.password, self.storage_dir, perm="elradfmw")

        handler = CameraFTPHandler
        handler.authorizer = authorizer
        handler.banner = "WedSnap Wireless Camera Receiver Ready."

        address = ("0.0.0.0", self.port)
        self.server = FTPServer(address, handler)

        def run_server():
            logger.info(f"Wi-Fi FTP Server active on port {self.port} (User: {self.user})")
            self.server.serve_forever()

        self.thread = threading.Thread(target=run_server, daemon=True)
        self.thread.start()
        self.is_running = True

    def stop(self):
        if self.is_running and self.server:
            self.server.close_all()
            self.is_running = False
            logger.info("Wi-Fi FTP Server stopped.")
