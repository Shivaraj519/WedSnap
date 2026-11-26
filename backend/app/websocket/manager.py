import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger("wedsnap.websocket")

class ConnectionManager:
    def __init__(self):
        # Map wedding_id -> set of active WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, wedding_id: str, websocket: WebSocket):
        await websocket.accept()
        if wedding_id not in self.active_connections:
            self.active_connections[wedding_id] = set()
        self.active_connections[wedding_id].add(websocket)
        logger.info(f"Client connected to wedding {wedding_id}. Active: {len(self.active_connections[wedding_id])}")

    def disconnect(self, wedding_id: str, websocket: WebSocket):
        if wedding_id in self.active_connections:
            self.active_connections[wedding_id].discard(websocket)
            if not self.active_connections[wedding_id]:
                del self.active_connections[wedding_id]
        logger.info(f"Client disconnected from wedding {wedding_id}")

    async def broadcast_to_wedding(self, wedding_id: str, message: dict):
        if wedding_id not in self.active_connections:
            return
        
        dead_sockets = set()
        data_text = json.dumps(message)
        for connection in list(self.active_connections[wedding_id]):
            try:
                await connection.send_text(data_text)
            except Exception as e:
                logger.warning(f"Error sending to websocket: {e}")
                dead_sockets.add(connection)
        
        for dead in dead_sockets:
            self.disconnect(wedding_id, dead)

ws_manager = ConnectionManager()
