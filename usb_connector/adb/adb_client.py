import subprocess
import shutil
import logging
from typing import List, Optional, Tuple

logger = logging.getLogger("wedsnap.usb.adb")

class ADBClient:
    def __init__(self, adb_path: str = "adb"):
        self.adb_path = adb_path
        self._check_installed()

    def _check_installed(self) -> bool:
        if shutil.which(self.adb_path) is None:
            logger.warning(f"ADB executable '{self.adb_path}' not found in system PATH. Ensure Android SDK Platform-Tools is installed.")
            return False
        return True

    def run_command(self, args: List[str], timeout: int = 15) -> Tuple[int, str, str]:
        cmd = [self.adb_path] + args
        try:
            res = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=timeout,
                encoding="utf-8",
                errors="replace"
            )
            return res.returncode, res.stdout.strip(), res.stderr.strip()
        except subprocess.TimeoutExpired:
            return -1, "", "Command timed out"
        except FileNotFoundError:
            return -1, "", f"ADB binary '{self.adb_path}' not found."

    def list_devices(self) -> List[str]:
        """Returns list of connected and authorized Android device serial numbers."""
        code, out, _ = self.run_command(["devices"])
        if code != 0:
            return []
        
        devices = []
        for line in out.splitlines()[1:]:
            parts = line.split()
            if len(parts) >= 2 and parts[1] == "device":
                devices.append(parts[0])
        return devices

    def list_files(self, device_serial: str, remote_path: str) -> List[str]:
        """Lists image files in remote phone directory."""
        code, out, _ = self.run_command(["-s", device_serial, "shell", "ls", "-1", remote_path])
        if code != 0:
            return []
        
        files = []
        for f in out.splitlines():
            f = f.strip()
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".heic", ".dng")):
                files.append(f)
        return files

    def pull_file(self, device_serial: str, remote_path: str, local_destination: str) -> bool:
        """Pulls a single file from phone to laptop staging. Never deletes phone file."""
        code, _, err = self.run_command(["-s", device_serial, "pull", remote_path, local_destination], timeout=60)
        return code == 0
