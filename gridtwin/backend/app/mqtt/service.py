"""GRIDTWIN Backend - MQTT Communication Service"""
import json
import uuid
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Callable
import paho.mqtt.client as mqtt
from app.core.config import settings

logger = logging.getLogger("gridtwin.mqtt")


class MQTTService:
    """
    MQTT client service for ESP32 device communication.
    
    Topic scheme:
    - gridtwin/devices/{device_id}/status     - Device status updates
    - gridtwin/devices/{device_id}/telemetry   - Telemetry data
    - gridtwin/devices/{device_id}/commands    - Commands to device
    - gridtwin/devices/{device_id}/ack         - Command acknowledgements
    - gridtwin/devices/{device_id}/availability - Online/offline
    """

    def __init__(self):
        self.client: Optional[mqtt.Client] = None
        self.connected = False
        self._on_ack_callback: Optional[Callable] = None
        self._on_status_callback: Optional[Callable] = None
        self._on_telemetry_callback: Optional[Callable] = None
        self._on_availability_callback: Optional[Callable] = None
        self._pending_commands: dict[str, dict] = {}

    def connect(self):
        """Connect to the MQTT broker."""
        try:
            self.client = mqtt.Client(
                client_id=settings.mqtt_client_id,
                protocol=mqtt.MQTTv311,
            )
            
            if settings.mqtt_username:
                self.client.username_pw_set(
                    settings.mqtt_username,
                    settings.mqtt_password,
                )
            
            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            self.client.on_message = self._on_message
            
            # Set LWT
            self.client.will_set(
                "gridtwin/backend/status",
                json.dumps({"status": "offline", "timestamp": datetime.now(timezone.utc).isoformat()}),
                qos=1,
                retain=True,
            )
            
            self.client.connect_async(
                settings.mqtt_broker_host,
                settings.mqtt_broker_port,
                keepalive=60,
            )
            self.client.loop_start()
            logger.info(f"MQTT connecting to {settings.mqtt_broker_host}:{settings.mqtt_broker_port}")
        except Exception as e:
            logger.error(f"MQTT connection error: {e}")
            self.connected = False

    def disconnect(self):
        """Disconnect from the MQTT broker."""
        if self.client:
            # Publish offline status
            self.client.publish(
                "gridtwin/backend/status",
                json.dumps({"status": "offline", "timestamp": datetime.now(timezone.utc).isoformat()}),
                qos=1,
                retain=True,
            )
            self.client.loop_stop()
            self.client.disconnect()
            self.connected = False
            logger.info("MQTT disconnected")

    def _on_connect(self, client, userdata, flags, rc):
        """Callback when connected to broker."""
        if rc == 0:
            self.connected = True
            logger.info("MQTT connected to broker")
            
            # Subscribe to device topics
            client.subscribe("gridtwin/devices/+/ack", qos=1)
            client.subscribe("gridtwin/devices/+/status", qos=1)
            client.subscribe("gridtwin/devices/+/telemetry", qos=1)
            client.subscribe("gridtwin/devices/+/availability", qos=1)
            
            # Publish online status
            client.publish(
                "gridtwin/backend/status",
                json.dumps({"status": "online", "timestamp": datetime.now(timezone.utc).isoformat()}),
                qos=1,
                retain=True,
            )
        else:
            logger.error(f"MQTT connection failed with code {rc}")
            self.connected = False

    def _on_disconnect(self, client, userdata, rc):
        """Callback when disconnected."""
        self.connected = False
        if rc != 0:
            logger.warning(f"MQTT unexpected disconnect (rc={rc}), will reconnect")
        else:
            logger.info("MQTT clean disconnect")

    def _on_message(self, client, userdata, msg):
        """Callback when a message is received."""
        try:
            topic_parts = msg.topic.split("/")
            if len(topic_parts) < 4:
                return
            
            device_id = topic_parts[2]
            message_type = topic_parts[3]
            payload = json.loads(msg.payload.decode())
            
            logger.info(f"MQTT message: {msg.topic} -> {payload}")
            
            if message_type == "ack" and self._on_ack_callback:
                self._on_ack_callback(device_id, payload)
            elif message_type == "status" and self._on_status_callback:
                self._on_status_callback(device_id, payload)
            elif message_type == "telemetry" and self._on_telemetry_callback:
                self._on_telemetry_callback(device_id, payload)
            elif message_type == "availability" and self._on_availability_callback:
                self._on_availability_callback(device_id, payload)
                
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in MQTT message: {e}")
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")

    def send_command(
        self,
        device_id: str,
        output_id: str,
        requested_state: str,
        command_id: Optional[str] = None,
        timeout_seconds: int = 30,
    ) -> dict:
        """
        Send a command to a device via MQTT.
        
        Returns the command payload that was sent.
        """
        if not self.connected:
            raise ConnectionError("MQTT broker not connected")
        
        if not command_id:
            command_id = str(uuid.uuid4())
        
        now = datetime.now(timezone.utc)
        expires = now + timedelta(seconds=timeout_seconds)
        
        payload = {
            "schema_version": "1.0",
            "command_id": command_id,
            "device_id": device_id,
            "output_id": output_id,
            "requested_state": requested_state,
            "created_at": now.isoformat(),
            "expires_at": expires.isoformat(),
        }
        
        topic = f"gridtwin/devices/{device_id}/commands"
        
        result = self.client.publish(topic, json.dumps(payload), qos=1)
        
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            self._pending_commands[command_id] = payload
            logger.info(f"Command sent: {command_id} -> {device_id}/{output_id} = {requested_state}")
        else:
            logger.error(f"Failed to publish command: {result.rc}")
            raise RuntimeError(f"MQTT publish failed with code {result.rc}")
        
        return payload

    def set_ack_callback(self, callback: Callable):
        """Set callback for acknowledgement messages."""
        self._on_ack_callback = callback

    def set_status_callback(self, callback: Callable):
        """Set callback for device status messages."""
        self._on_status_callback = callback

    def set_telemetry_callback(self, callback: Callable):
        """Set callback for telemetry messages."""
        self._on_telemetry_callback = callback

    def set_availability_callback(self, callback: Callable):
        """Set callback for availability messages."""
        self._on_availability_callback = callback

    @property
    def is_connected(self) -> bool:
        return self.connected


# Global singleton
mqtt_service = MQTTService()
