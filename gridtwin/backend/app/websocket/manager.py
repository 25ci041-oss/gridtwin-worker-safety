"""GRIDTWIN Backend - WebSocket Manager for Real-Time Frontend Updates"""
import json
import asyncio
import logging
from datetime import datetime, timezone
from typing import Set
from fastapi import WebSocket
from starlette.websockets import WebSocketState

logger = logging.getLogger("gridtwin.websocket")


class ConnectionManager:
    """Manages WebSocket connections and broadcasts events to connected clients."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, payload: dict):
        """Broadcast an event to all connected clients."""
        message = {
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        message_text = json.dumps(message, default=str)
        
        dead_connections = set()
        
        async with self._lock:
            connections = self.active_connections.copy()
        
        for connection in connections:
            try:
                if connection.client_state == WebSocketState.CONNECTED:
                    await connection.send_text(message_text)
            except Exception as e:
                logger.warning(f"WebSocket send error: {e}")
                dead_connections.add(connection)
        
        # Clean up dead connections
        if dead_connections:
            async with self._lock:
                self.active_connections -= dead_connections

    async def send_to(self, websocket: WebSocket, event_type: str, payload: dict):
        """Send an event to a specific client."""
        message = {
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        try:
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_text(json.dumps(message, default=str))
        except Exception as e:
            logger.warning(f"WebSocket send error: {e}")

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


# Global singleton
ws_manager = ConnectionManager()
