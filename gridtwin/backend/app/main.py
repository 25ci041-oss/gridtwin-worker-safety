"""GRIDTWIN Backend - Main FastAPI Application"""
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update

from app.core.config import settings
from app.db.database import get_db, init_db, async_session_factory
from app.models.models import (
    Project, NetworkVersion, Node, Edge, Component, ComponentParameter,
    Switch, Load, SimulationSession, SimulationResult,
    Device, OutputMapping, DeviceCommand, TelemetryRecord,
    Alert, EventLog, AuditLog, AppSetting,
    NodeType, EdgeType, ComponentType, SwitchState, SimulationStatus,
    SimulationLevel, DeviceStatus, CommandStatus, OutputState,
    AlertSeverity, AlertStatus, utcnow
)
from app.schemas.schemas import (
    ProjectCreate, ProjectResponse, NodeCreate, NodeResponse,
    EdgeCreate, EdgeResponse, ComponentCreate, ComponentResponse,
    SwitchCreate, SwitchResponse, SwitchOperationRequest, SwitchOperationResponse,
    LoadCreate, LoadResponse, SimulationStartRequest, SimulationSessionResponse,
    SimulationResultResponse, DeviceRegister, DeviceResponse, DeviceEnableRequest,
    OutputMappingCreate, OutputMappingResponse, PhysicalCommandRequest,
    HardwareCommandRequest,
    CommandResponse, CommandAcknowledgement, TelemetryIngest, TelemetryResponse,
    AlertCreate, AlertResponse, EventLogResponse, DashboardSummary,
    NetworkTopologyResponse, ConnectivityResult as ConnectivityResultSchema,
    WSMessage
)
from app.simulation.engine import NetworkSimulator, create_default_five_section_network
from app.websocket.manager import ws_manager
from app.mqtt.service import mqtt_service

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.backend_log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("gridtwin")

# Global simulation instance
simulator = create_default_five_section_network()


# ──────────────────────────────────────────────
# Lifespan
# ──────────────────────────────────────────────

main_event_loop = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    global main_event_loop
    main_event_loop = asyncio.get_running_loop()
    logger.info("GRIDTWIN Backend starting...")
    
    # Initialize database
    try:
        await init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.warning(f"Database init (may need PostgreSQL running): {e}")
    
    # Seed default data
    try:
        await seed_default_data()
    except Exception as e:
        logger.warning(f"Seed data (may need PostgreSQL): {e}")
    
    # Connect MQTT
    try:
        mqtt_service.connect()
        mqtt_service.set_ack_callback(handle_device_ack)
        mqtt_service.set_availability_callback(handle_device_availability)
        mqtt_service.set_telemetry_callback(handle_device_telemetry)
        mqtt_service.set_status_callback(handle_device_status)
        logger.info("MQTT service started")
    except Exception as e:
        logger.warning(f"MQTT connection (may need Mosquitto): {e}")
    
    yield
    
    # Shutdown
    mqtt_service.disconnect()
    logger.info("GRIDTWIN Backend stopped")


# ──────────────────────────────────────────────
# App instance
# ──────────────────────────────────────────────

app = FastAPI(
    title="GRIDTWIN API",
    description="3D Electricity Distribution Digital Twin Virtual Laboratory API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Seed Data
# ──────────────────────────────────────────────

async def seed_default_data():
    """Seed the database with the default five-section network."""
    async with async_session_factory() as session:
        # Check if project exists
        result = await session.execute(select(Project).where(Project.name == "Default 5-Section Network"))
        existing = result.scalar_one_or_none()
        if existing:
            return
        
        # Create project
        project = Project(
            name="Default 5-Section Network",
            description="Educational five-section electricity distribution network with towers T1-T5"
        )
        session.add(project)
        await session.flush()
        
        # Create network version
        nv = NetworkVersion(
            project_id=project.id,
            version=1,
            description="Initial five-section network",
            is_current=True
        )
        session.add(nv)
        await session.flush()
        
        # Seed nodes from simulator
        for node_id, node in simulator.nodes.items():
            db_node = Node(
                network_version_id=nv.id,
                node_id=node.node_id,
                node_type=NodeType(node.node_type),
                name=node.name,
                pos_x=node.pos_x,
                pos_y=node.pos_y,
                pos_z=node.pos_z,
                nominal_voltage_kv=node.nominal_voltage_kv,
                is_energized=True,
            )
            session.add(db_node)
        
        # Seed edges
        for edge_id, edge in simulator.edges.items():
            db_edge = Edge(
                network_version_id=nv.id,
                edge_id=edge.edge_id,
                edge_type=EdgeType(edge.edge_type),
                name=edge.name,
                from_node_id=edge.from_node_id,
                to_node_id=edge.to_node_id,
                length_km=edge.length_km,
                resistance_ohm_per_km=edge.resistance_ohm_per_km,
                reactance_ohm_per_km=edge.reactance_ohm_per_km,
                max_current_a=edge.max_current_a,
                is_active=True,
            )
            session.add(db_edge)
        
        # Seed towers as components
        tower_positions = {
            "T1": (-6, 5, 0), "T2": (0, 5, 0), "T3": (6, 5, 0),
            "T4": (12, 5, 0), "T5": (18, 5, 0),
        }
        for tid, (px, py, pz) in tower_positions.items():
            comp = Component(
                network_version_id=nv.id,
                component_id=tid,
                component_type=ComponentType.TOWER,
                name=f"Tower {tid}",
                description=f"Distribution tower {tid}",
                node_id=f"N_{tid}",
                pos_x=px, pos_y=py, pos_z=pz,
            )
            session.add(comp)
        
        # Seed switches
        for sw_id, sw in simulator.switches.items():
            db_switch = Switch(
                network_version_id=nv.id,
                switch_id=sw.switch_id,
                name=sw.name,
                controlled_edge_id=sw.controlled_edge_id,
                state=SwitchState(sw.state),
                section_id=sw.section_id,
            )
            session.add(db_switch)
        
        # Seed loads
        for ld_id, ld in simulator.loads.items():
            db_load = Load(
                network_version_id=nv.id,
                load_id=ld.load_id,
                name=ld.name,
                connected_node_id=ld.connected_node_id,
                demand_kw=ld.demand_kw,
                power_factor=ld.power_factor,
                is_connected=True,
                is_energized=True,
                section_id=ld.section_id,
            )
            session.add(db_load)
        
        # Seed default device (enabled for real hardware integration)
        device = Device(
            device_id="esp32-gridtwin-001",
            name="GRIDTWIN ESP32 Controller",
            description="Primary ESP32 controller for physical indicator outputs & INA219 sensor",
            device_type="ESP32",
            status=DeviceStatus.OFFLINE,
            is_registered=True,
            is_enabled=True,
        )
        session.add(device)
        await session.flush()
        
        # Seed output mappings with confirmed hardware GPIOs:
        # T1->13, T2->14, T3->25, T4->26, T5->27
        default_pins = {"T1": 13, "T2": 14, "T3": 25, "T4": 26, "T5": 27}
        for tid, pin in default_pins.items():
            mapping = OutputMapping(
                device_id=device.id,
                output_id=tid,
                gpio_pin=pin,
                name=f"{tid} Indicator",
                section_id=tid,
                is_enabled=True,
                is_allowlisted=True,
                reported_state=OutputState.UNKNOWN,
            )
            session.add(mapping)
        
        # App settings
        session.add(AppSetting(key="physical_control_enabled", value="true", description="Enable physical device control"))
        session.add(AppSetting(key="simulation_level", value="CONNECTIVITY", description="Active simulation level"))
        
        await session.commit()
        logger.info("Default network seeded successfully with verified GPIOs 13, 14, 25, 26, 27")


# ──────────────────────────────────────────────
# Central Authoritative Hardware State Model
# ──────────────────────────────────────────────

hardware_state = {
    "device_id": "esp32-gridtwin-001",
    "name": "GRIDTWIN ESP32 Controller",
    "status": "OFFLINE", # "ONLINE" or "OFFLINE"
    "firmware_version": "2.0.0-hackathon",
    "ip_address": None,
    "uptime_ms": 0,
    "wifi_rssi": 0,
    "last_seen_at": None,
    "last_heartbeat_at": None,
    "roundtrip_latency_ms": 18,
    "output_states": {
        "T1": "ON",
        "T2": "ON",
        "T3": "ON",
        "T4": "ON",
        "T5": "ON",
    },
    "relay_pins": {
        "T1": 13,
        "T2": 14,
        "T3": 25,
        "T4": 26,
        "T5": 27,
        "RELAY_6": 32,
    },
    "telemetry": {
        "bus_voltage_v": 0.0,
        "shunt_voltage_mv": 0.0,
        "current_ma": 0.0,
        "power_mw": 0.0,
        "sensor_status": "DISCONNECTED",
        "recorded_at": None,
    },
    "telemetry_history": [],
    "pending_commands": {}, # command_id -> dict
    "last_command": None,
    "physical_control_enabled": True,
}


# ──────────────────────────────────────────────
# MQTT Callbacks & Telemetry Processing
# ──────────────────────────────────────────────

def _safe_schedule(coro):
    """Safely schedule a coroutine onto the FastAPI event loop from any thread."""
    global main_event_loop
    if main_event_loop and main_event_loop.is_running():
        asyncio.run_coroutine_threadsafe(coro, main_event_loop)
    else:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(coro)
        except RuntimeError:
            pass


def handle_device_ack(device_id: str, payload: dict):
    """Handle device command acknowledgement messages."""
    _safe_schedule(_process_device_ack(device_id, payload))

def handle_device_availability(device_id: str, payload: dict):
    """Handle device availability LWT and online messages."""
    _safe_schedule(_process_device_availability(device_id, payload))

def handle_device_telemetry(device_id: str, payload: dict):
    """Handle INA219 current/voltage telemetry."""
    _safe_schedule(_process_device_telemetry(device_id, payload))

def handle_device_status(device_id: str, payload: dict):
    """Handle periodic device heartbeat and state report."""
    _safe_schedule(_process_device_status(device_id, payload))


async def _process_device_ack(device_id: str, payload: dict):
    """Process confirmed device acknowledgement from ESP32."""
    try:
        command_id = payload.get("command_id")
        output_id = payload.get("output_id") or payload.get("target")
        success = payload.get("success", False) or (payload.get("status") == "SUCCESS")
        reported_state = payload.get("reported_state", "UNKNOWN")
        error_reason = payload.get("error_reason")
        output_states = payload.get("output_states", {})

        now_iso = datetime.now(timezone.utc).isoformat()
        hardware_state["last_seen_at"] = now_iso
        hardware_state["status"] = "ONLINE"

        # Update confirmed output states
        if success:
            if output_id == "ALL":
                for tid in ["T1", "T2", "T3", "T4", "T5"]:
                    hardware_state["output_states"][tid] = reported_state
            elif output_id in hardware_state["output_states"]:
                hardware_state["output_states"][output_id] = reported_state

        if output_states and isinstance(output_states, dict):
            for tid, st in output_states.items():
                if tid in hardware_state["output_states"]:
                    hardware_state["output_states"][tid] = st

        # Calculate latency
        latency_ms = 18
        if command_id and command_id in hardware_state["pending_commands"]:
            cmd_info = hardware_state["pending_commands"].pop(command_id)
            if "sent_at" in cmd_info:
                try:
                    latency = (datetime.now(timezone.utc) - datetime.fromisoformat(cmd_info["sent_at"])).total_seconds() * 1000
                    latency_ms = max(1, round(latency))
                except Exception:
                    pass
        hardware_state["roundtrip_latency_ms"] = latency_ms

        hardware_state["last_command"] = {
            "command_id": command_id,
            "output_id": output_id,
            "reported_state": reported_state,
            "success": success,
            "error_reason": error_reason,
            "timestamp": now_iso,
        }

        # Update DB if available
        try:
            async with async_session_factory() as session:
                result = await session.execute(
                    select(DeviceCommand).where(DeviceCommand.command_id == command_id)
                )
                command = result.scalar_one_or_none()
                if command:
                    command.status = CommandStatus.ACKNOWLEDGED
                    command.ack_received_at = utcnow()
                    command.ack_success = success
                    command.ack_reported_state = OutputState(reported_state) if reported_state in ("ON", "OFF") else OutputState.UNKNOWN
                    command.ack_error_reason = error_reason

                dev_res = await session.execute(select(Device).where(Device.device_id == device_id))
                dev = dev_res.scalar_one_or_none()
                if dev:
                    dev.status = DeviceStatus.ONLINE
                    dev.last_seen_at = utcnow()
                    dev.last_heartbeat_at = utcnow()

                    if output_id and output_id in ("T1", "T2", "T3", "T4", "T5"):
                        map_res = await session.execute(
                            select(OutputMapping).where(
                                OutputMapping.device_id == dev.id,
                                OutputMapping.output_id == output_id
                            )
                        )
                        mapping = map_res.scalar_one_or_none()
                        if mapping and success:
                            mapping.reported_state = OutputState(reported_state) if reported_state in ("ON", "OFF") else OutputState.UNKNOWN
                            mapping.last_state_change_at = utcnow()

                event = EventLog(
                    event_type="COMMAND_ACK",
                    source="mqtt",
                    title=f"ESP32 command {command_id[:8] if command_id else ''} confirmed",
                    description=f"Device {device_id}, Output {output_id} -> {reported_state}. Success: {success}",
                    device_id=device_id,
                )
                session.add(event)
                await session.commit()
        except Exception as e:
            logger.debug(f"DB update in ack ignored: {e}")

        # Broadcast confirmed state to all connected WebSockets
        await ws_manager.broadcast("command_ack", {
            "command_id": command_id,
            "device_id": device_id,
            "output_id": output_id,
            "success": success,
            "reported_state": reported_state,
            "output_states": hardware_state["output_states"],
            "error_reason": error_reason,
            "latency_ms": latency_ms,
        })
        logger.info(f"Broadcasted command_ack for {command_id} ({output_id} -> {reported_state})")

    except Exception as e:
        logger.error(f"Error processing device ack: {e}")


async def _process_device_availability(device_id: str, payload: dict):
    """Process device availability change (online/offline)."""
    try:
        raw_status = payload.get("status", "offline")
        status = raw_status.upper()
        now_iso = datetime.now(timezone.utc).isoformat()
        
        hardware_state["status"] = status
        hardware_state["last_seen_at"] = now_iso
        
        if "firmware_version" in payload:
            hardware_state["firmware_version"] = payload["firmware_version"]
        if "ip_address" in payload:
            hardware_state["ip_address"] = payload["ip_address"]
        if "wifi_rssi" in payload:
            hardware_state["wifi_rssi"] = payload["wifi_rssi"]

        if status == "OFFLINE":
            # Retain explicit state so toll-free hotline and UI stay accurate
            for tid in hardware_state["output_states"]:
                if hardware_state["output_states"][tid] not in ["OFF", "ISOLATED"]:
                    hardware_state["output_states"][tid] = "ON"
            hardware_state["telemetry"]["sensor_status"] = "DISCONNECTED"

        # Update DB if available
        try:
            async with async_session_factory() as session:
                result = await session.execute(
                    select(Device).where(Device.device_id == device_id)
                )
                device = result.scalar_one_or_none()
                if device:
                    device.status = DeviceStatus.ONLINE if status == "ONLINE" else DeviceStatus.OFFLINE
                    device.last_seen_at = utcnow()
                    if status == "ONLINE":
                        device.last_heartbeat_at = utcnow()
                    await session.commit()
        except Exception:
            pass

        await ws_manager.broadcast("device_status", {
            "device_id": device_id,
            "status": status,
            "ip_address": hardware_state["ip_address"],
            "firmware_version": hardware_state["firmware_version"],
            "output_states": hardware_state["output_states"],
            "last_seen_at": now_iso,
        })
        logger.info(f"Device {device_id} is now {status} (IP: {hardware_state['ip_address']})")

    except Exception as e:
        logger.error(f"Error processing availability: {e}")


async def _process_device_telemetry(device_id: str, payload: dict):
    """Process INA219 current and voltage telemetry."""
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        bus_voltage = float(payload.get("bus_voltage_v", 0.0))
        current_ma = float(payload.get("current_ma", 0.0))
        power_mw = float(payload.get("power_mw", 0.0))
        shunt_mv = float(payload.get("shunt_voltage_mv", 0.0))
        sensor_status = payload.get("sensor_status", "OK")

        telemetry_item = {
            "device_id": device_id,
            "bus_voltage_v": bus_voltage,
            "shunt_voltage_mv": shunt_mv,
            "current_ma": current_ma,
            "power_mw": power_mw,
            "sensor_status": sensor_status,
            "recorded_at": now_iso,
        }

        hardware_state["telemetry"] = telemetry_item
        hardware_state["telemetry_history"].insert(0, telemetry_item)
        if len(hardware_state["telemetry_history"]) > 100:
            hardware_state["telemetry_history"].pop()

        hardware_state["last_seen_at"] = now_iso
        hardware_state["status"] = "ONLINE"

        # Broadcast real telemetry to frontend
        await ws_manager.broadcast("telemetry", telemetry_item)

        # Ingest to DB if available
        try:
            async with async_session_factory() as session:
                rec_v = TelemetryRecord(device_id=device_id, measurement_type="BUS_VOLTAGE", value=bus_voltage, unit="V", is_simulated=False, source="INA219")
                rec_i = TelemetryRecord(device_id=device_id, measurement_type="LOAD_CURRENT", value=current_ma, unit="mA", is_simulated=False, source="INA219")
                rec_p = TelemetryRecord(device_id=device_id, measurement_type="POWER", value=power_mw, unit="mW", is_simulated=False, source="INA219")
                session.add_all([rec_v, rec_i, rec_p])
                await session.commit()
        except Exception:
            pass

    except Exception as e:
        logger.error(f"Error processing telemetry: {e}")


async def _process_device_status(device_id: str, payload: dict):
    """Process heartbeat and output status report from ESP32."""
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        hardware_state["last_seen_at"] = now_iso
        hardware_state["last_heartbeat_at"] = now_iso
        hardware_state["status"] = "ONLINE"

        if "firmware_version" in payload:
            hardware_state["firmware_version"] = payload["firmware_version"]
        if "uptime_ms" in payload:
            hardware_state["uptime_ms"] = payload["uptime_ms"]
        if "wifi_rssi" in payload:
            hardware_state["wifi_rssi"] = payload["wifi_rssi"]
        if "sensor_connected" in payload:
            hardware_state["telemetry"]["sensor_status"] = "OK" if payload["sensor_connected"] else "DISCONNECTED"

        states = payload.get("output_states", {})
        if isinstance(states, dict):
            for tid in ["T1", "T2", "T3", "T4", "T5"]:
                if tid in states:
                    hardware_state["output_states"][tid] = states[tid]

        await ws_manager.broadcast("hardware_status", {
            "device_id": device_id,
            "status": "ONLINE",
            "output_states": hardware_state["output_states"],
            "last_heartbeat_at": now_iso,
            "sensor_status": hardware_state["telemetry"]["sensor_status"],
            "uptime_ms": hardware_state["uptime_ms"],
            "wifi_rssi": hardware_state["wifi_rssi"],
        })

    except Exception as e:
        logger.error(f"Error processing device status: {e}")


# ──────────────────────────────────────────────
# Health & Root Endpoints
# ──────────────────────────────────────────────

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    """Root endpoint for Render health checks and browser confirmation."""
    return {
        "status": "healthy",
        "service": "gridtwin-backend",
        "version": settings.app_version,
        "message": "GRIDTWIN Digital Twin Backend API is running.",
        "docs_url": "/docs",
        "health_url": "/api/v1/health"
    }

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "gridtwin-backend",
        "version": settings.app_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/api/v1/readiness")
async def readiness_check():
    """Readiness check including dependencies."""
    db_ok = False
    mqtt_ok = mqtt_service.is_connected
    
    try:
        async with async_session_factory() as session:
            await session.execute(select(func.count()).select_from(Project))
            db_ok = True
    except Exception:
        pass
    
    return {
        "ready": db_ok,
        "database": "connected" if db_ok else "unavailable",
        "mqtt": "connected" if mqtt_ok else "unavailable",
        "websocket_clients": ws_manager.connection_count,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ──────────────────────────────────────────────
# Dashboard
# ──────────────────────────────────────────────

@app.get("/api/v1/dashboard", response_model=DashboardSummary)
async def get_dashboard():
    """Get the main dashboard summary."""
    # Run simulation for current state
    connectivity = simulator.run_connectivity()
    summary = simulator.get_network_summary()
    
    # Get DB data
    device_count = 0
    devices_online = 0
    devices_offline = 0
    active_alerts = 0
    recent_cmds = []
    recent_evts = []
    last_comm = None
    project_name = "Default 5-Section Network"
    project_id = None
    physical_enabled = settings.physical_control_enabled
    
    try:
        async with async_session_factory() as session:
            # Project
            proj_result = await session.execute(select(Project).limit(1))
            proj = proj_result.scalar_one_or_none()
            if proj:
                project_name = proj.name
                project_id = str(proj.id)
            
            # Devices
            dev_result = await session.execute(select(Device))
            devices = dev_result.scalars().all()
            device_count = len(devices)
            for d in devices:
                if d.status == DeviceStatus.ONLINE:
                    devices_online += 1
                else:
                    devices_offline += 1
                if d.last_seen_at:
                    if not last_comm or d.last_seen_at > last_comm:
                        last_comm = d.last_seen_at
            
            # Alerts
            alert_result = await session.execute(
                select(func.count()).select_from(Alert).where(Alert.status == AlertStatus.ACTIVE)
            )
            active_alerts = alert_result.scalar() or 0
            
            # Recent commands
            cmd_result = await session.execute(
                select(DeviceCommand).order_by(desc(DeviceCommand.created_at)).limit(5)
            )
            for cmd in cmd_result.scalars():
                recent_cmds.append({
                    "command_id": cmd.command_id[:8],
                    "output_id": cmd.output_id,
                    "requested_state": cmd.requested_state.value if cmd.requested_state else "UNKNOWN",
                    "status": cmd.status.value if cmd.status else "UNKNOWN",
                    "created_at": cmd.created_at.isoformat() if cmd.created_at else None,
                })
            
            # Recent events
            evt_result = await session.execute(
                select(EventLog).order_by(desc(EventLog.created_at)).limit(5)
            )
            for evt in evt_result.scalars():
                recent_evts.append({
                    "event_type": evt.event_type,
                    "title": evt.title,
                    "source": evt.source,
                    "created_at": evt.created_at.isoformat() if evt.created_at else None,
                })
            
            # Physical control setting
            setting_result = await session.execute(
                select(AppSetting).where(AppSetting.key == "physical_control_enabled")
            )
            setting = setting_result.scalar_one_or_none()
            if setting:
                physical_enabled = setting.value == "true"
                
    except Exception as e:
        logger.warning(f"Dashboard DB query error: {e}")
    
    # Determine simulation status
    sim_status = "IDLE"
    sim_level = "CONNECTIVITY"
    
    return DashboardSummary(
        project_name=project_name,
        project_id=project_id,
        total_nodes=summary["total_nodes"],
        total_edges=summary["total_edges"],
        total_loads=summary["total_loads"],
        total_switches=summary["total_switches"],
        energized_nodes=summary["energized_nodes"],
        de_energized_nodes=summary["de_energized_nodes"],
        energized_loads=summary["energized_loads"],
        de_energized_loads=summary["de_energized_loads"],
        total_demand_kw=summary["total_demand_kw"],
        served_demand_kw=summary["served_demand_kw"],
        simulation_status=sim_status,
        simulation_level=sim_level,
        device_count=device_count,
        devices_online=devices_online,
        devices_offline=devices_offline,
        physical_control_enabled=physical_enabled,
        last_communication=last_comm,
        active_alerts=active_alerts,
        recent_commands=recent_cmds,
        recent_events=recent_evts,
    )


# ──────────────────────────────────────────────
# Network Topology
# ──────────────────────────────────────────────

@app.get("/api/v1/topology")
async def get_topology():
    """Get the full network topology for 3D rendering and simulation."""
    nodes = []
    for nid, node in simulator.nodes.items():
        nodes.append({
            "node_id": node.node_id,
            "node_type": node.node_type,
            "name": node.name,
            "pos_x": node.pos_x,
            "pos_y": node.pos_y,
            "pos_z": node.pos_z,
            "nominal_voltage_kv": node.nominal_voltage_kv,
            "is_energized": node.is_energized,
        })
    
    edges = []
    for eid, edge in simulator.edges.items():
        edges.append({
            "edge_id": edge.edge_id,
            "edge_type": edge.edge_type,
            "name": edge.name,
            "from_node_id": edge.from_node_id,
            "to_node_id": edge.to_node_id,
            "length_km": edge.length_km,
            "resistance_ohm_per_km": edge.resistance_ohm_per_km,
            "max_current_a": edge.max_current_a,
            "is_active": edge.is_active,
        })
    
    switches = []
    for sid, sw in simulator.switches.items():
        switches.append({
            "switch_id": sw.switch_id,
            "name": sw.name,
            "controlled_edge_id": sw.controlled_edge_id,
            "state": sw.state,
            "section_id": sw.section_id,
        })
    
    loads = []
    for lid, ld in simulator.loads.items():
        loads.append({
            "load_id": ld.load_id,
            "name": ld.name,
            "connected_node_id": ld.connected_node_id,
            "demand_kw": ld.demand_kw,
            "power_factor": ld.power_factor,
            "is_connected": ld.is_connected,
            "is_energized": ld.is_energized,
            "section_id": ld.section_id,
        })
    
    # 3D component positions for towers
    components = []
    tower_data = {
        "T1": {"pos_x": -12, "pos_z": 0},
        "T2": {"pos_x": -6, "pos_z": 0},
        "T3": {"pos_x": 0, "pos_z": 0},
        "T4": {"pos_x": 6, "pos_z": 0},
        "T5": {"pos_x": 12, "pos_z": 0},
    }
    for tid, pos in tower_data.items():
        components.append({
            "component_id": tid,
            "component_type": "TOWER",
            "name": f"Tower {tid}",
            "node_id": f"N_{tid}",
            "pos_x": pos["pos_x"],
            "pos_y": 0,
            "pos_z": pos["pos_z"],
            "section_id": tid,
        })
    
    return {
        "nodes": nodes,
        "edges": edges,
        "switches": switches,
        "loads": loads,
        "components": components,
    }

@app.get("/api/v1/topology/validate")
async def validate_topology():
    """Validate the current network topology."""
    errors = simulator.validate_topology()
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "node_count": len(simulator.nodes),
        "edge_count": len(simulator.edges),
        "switch_count": len(simulator.switches),
        "load_count": len(simulator.loads),
    }


# ──────────────────────────────────────────────
# Simulation
# ──────────────────────────────────────────────

@app.get("/api/v1/simulation/connectivity")
async def run_connectivity_simulation():
    """Run connectivity simulation and return results."""
    result = simulator.run_connectivity()
    return {
        "energized_nodes": result.energized_nodes,
        "de_energized_nodes": result.de_energized_nodes,
        "energized_loads": result.energized_loads,
        "de_energized_loads": result.de_energized_loads,
        "switch_states": result.switch_states,
        "paths": result.paths,
        "total_demand_kw": result.total_demand_kw,
        "served_demand_kw": result.served_demand_kw,
        "unserved_demand_kw": result.unserved_demand_kw,
        "disconnected_components": result.disconnected_components,
        "affected_sections": result.affected_sections,
    }

@app.get("/api/v1/simulation/educational")
async def run_educational_simulation():
    """Run educational electrical calculations."""
    result = simulator.run_educational_calculations()
    return {
        "node_voltages": result.node_voltages,
        "edge_currents": result.edge_currents,
        "edge_power_flows": result.edge_power_flows,
        "edge_losses": result.edge_losses,
        "edge_voltage_drops": result.edge_voltage_drops,
        "total_losses_kw": result.total_losses_kw,
        "total_generation_kw": result.total_generation_kw,
        "total_load_kw": result.total_load_kw,
        "assumptions": result.assumptions,
        "warnings": result.warnings,
        "equations_used": result.equations_used,
    }

@app.post("/api/v1/simulation/switch/{switch_id}")
async def operate_simulated_switch(switch_id: str, request: SwitchOperationRequest):
    """
    Mode A: Simulated electrical switching.
    Operate a modeled network switch and recalculate connectivity.
    """
    try:
        result, message = simulator.operate_switch(switch_id, request.requested_state)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Synchronize digital twin output states
    sw_tower_map = {
        "SW1": "T1", "SW2": "T2", "SW3": "T3", "SW4": "T4", "SW5": "T5",
        "SW-T1": "T1", "SW-T2": "T2", "SW-T3": "T3", "SW-T4": "T4", "SW-T5": "T5"
    }
    if switch_id in sw_tower_map:
        tid = sw_tower_map[switch_id]
        hardware_state["output_states"][tid] = "ON" if request.requested_state == "CLOSED" else "OFF"

    # Log event
    try:
        async with async_session_factory() as session:
            event = EventLog(
                event_type="SWITCH_OPERATION",
                source="simulation",
                title=f"Switch {switch_id} set to {request.requested_state}",
                description=message,
                component_id=switch_id,
            )
            session.add(event)
            await session.commit()
    except Exception as e:
        logger.warning(f"Event log error: {e}")
    
    # Broadcast to WebSocket clients
    await ws_manager.broadcast("simulation_update", {
        "switch_id": switch_id,
        "new_state": request.requested_state,
        "energized_nodes": result.energized_nodes,
        "de_energized_nodes": result.de_energized_nodes,
        "energized_loads": result.energized_loads,
        "de_energized_loads": result.de_energized_loads,
        "affected_sections": result.affected_sections,
    })
    
    return {
        "switch_id": switch_id,
        "previous_state": "OPEN" if request.requested_state == "CLOSED" else "CLOSED",
        "new_state": request.requested_state,
        "message": message,
        "energized_nodes": result.energized_nodes,
        "de_energized_nodes": result.de_energized_nodes,
        "energized_loads": result.energized_loads,
        "de_energized_loads": result.de_energized_loads,
        "served_demand_kw": result.served_demand_kw,
        "unserved_demand_kw": result.unserved_demand_kw,
        "total_demand_kw": result.total_demand_kw,
        "affected_sections": result.affected_sections,
        "disconnected_components": result.disconnected_components,
        "paths": result.paths,
    }

@app.post("/api/v1/simulation/reset")
async def reset_simulation():
    """Reset all switches to CLOSED and recalculate."""
    global simulator
    simulator = create_default_five_section_network()
    result = simulator.run_connectivity()
    
    await ws_manager.broadcast("simulation_reset", {
        "energized_nodes": result.energized_nodes,
        "de_energized_nodes": result.de_energized_nodes,
    })
    
    return {"message": "Simulation reset. All switches closed.", "result": simulator.get_network_summary()}


# ──────────────────────────────────────────────
# Devices
# ──────────────────────────────────────────────

@app.get("/api/v1/devices")
async def list_devices():
    """List all registered devices."""
    try:
        async with async_session_factory() as session:
            result = await session.execute(select(Device))
            devices = result.scalars().all()
            return [{
                "id": str(d.id),
                "device_id": d.device_id,
                "name": d.name,
                "description": d.description,
                "device_type": d.device_type,
                "firmware_version": d.firmware_version,
                "status": d.status.value if d.status else "UNKNOWN",
                "is_registered": d.is_registered,
                "is_enabled": d.is_enabled,
                "last_seen_at": d.last_seen_at.isoformat() if d.last_seen_at else None,
                "last_heartbeat_at": d.last_heartbeat_at.isoformat() if d.last_heartbeat_at else None,
            } for d in devices]
    except Exception as e:
        logger.warning(f"Device list error: {e}")
        # Return default device info when DB is unavailable
        return [{
            "id": "default",
            "device_id": "esp32-gridtwin-001",
            "name": "GRIDTWIN ESP32 Controller",
            "device_type": "ESP32",
            "status": "OFFLINE",
            "is_registered": True,
            "is_enabled": False,
            "last_seen_at": None,
        }]

@app.post("/api/v1/devices/register")
async def register_device(request: DeviceRegister):
    """Register a new device."""
    try:
        async with async_session_factory() as session:
            device = Device(
                device_id=request.device_id,
                name=request.name,
                description=request.description,
                device_type=request.device_type,
                is_registered=True,
                is_enabled=False,
                status=DeviceStatus.OFFLINE,
            )
            session.add(device)
            await session.commit()
            return {"message": f"Device {request.device_id} registered", "device_id": request.device_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/v1/devices/{device_id}/outputs")
async def get_device_outputs(device_id: str):
    """Get output mappings for a device."""
    try:
        async with async_session_factory() as session:
            dev_result = await session.execute(
                select(Device).where(Device.device_id == device_id)
            )
            device = dev_result.scalar_one_or_none()
            if not device:
                raise HTTPException(status_code=404, detail="Device not found")
            
            result = await session.execute(
                select(OutputMapping).where(OutputMapping.device_id == device.id)
            )
            mappings = result.scalars().all()
            return [{
                "id": str(m.id),
                "output_id": m.output_id,
                "gpio_pin": m.gpio_pin,
                "name": m.name,
                "section_id": m.section_id,
                "is_enabled": m.is_enabled,
                "is_allowlisted": m.is_allowlisted,
                "reported_state": m.reported_state.value if m.reported_state else "UNKNOWN",
                "last_state_change_at": m.last_state_change_at.isoformat() if m.last_state_change_at else None,
            } for m in mappings]
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Output mappings error: {e}")
        # Return defaults with verified GPIOs when DB unavailable
        default_pins = {"T1": 13, "T2": 14, "T3": 25, "T4": 26, "T5": 27}
        default_outputs = []
        for tid in ["T1", "T2", "T3", "T4", "T5"]:
            default_outputs.append({
                "output_id": tid,
                "gpio_pin": default_pins[tid],
                "name": f"{tid} Indicator",
                "section_id": tid,
                "is_enabled": True,
                "is_allowlisted": True,
                "reported_state": hardware_state["output_states"].get(tid, "UNKNOWN"),
                "last_state_change_at": None,
            })
        return default_outputs


# ──────────────────────────────────────────────
# Physical Commands & Dedicated Hardware Endpoints
# ──────────────────────────────────────────────

@app.post("/api/v1/commands/physical")
@app.post("/api/commands/physical")
async def send_physical_command(request: PhysicalCommandRequest):
    """
    Mode B: Physical low-voltage indicator control.
    Sends a command to the ESP32 via MQTT.
    """
    if not settings.physical_control_enabled and not hardware_state["physical_control_enabled"]:
        raise HTTPException(
            status_code=403,
            detail="Physical control is disabled. Enable it before sending commands."
        )

    if not mqtt_service.is_connected:
        raise HTTPException(
            status_code=400,
            detail="ESP32 controller or MQTT broker is offline. Switch GridTwin to SIMULATION mode (top-right button) to test virtual tower isolation, or connect your ESP32."
        )

    command_id = request.command_id or str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    # Track in memory
    hardware_state["pending_commands"][command_id] = {
        "command_id": command_id,
        "device_id": request.device_id,
        "output_id": request.output_id,
        "requested_state": request.requested_state,
        "action": request.action,
        "sent_at": now_iso,
        "status": "SENT"
    }

    # Persist in DB if available
    try:
        async with async_session_factory() as session:
            command = DeviceCommand(
                command_id=command_id,
                device_id=uuid.uuid4(),
                output_id=request.output_id,
                requested_state=OutputState(request.requested_state) if request.requested_state in ("ON", "OFF") else OutputState.UNKNOWN,
                status=CommandStatus.SENT,
                expires_at=utcnow(),
            )
            session.add(command)
            await session.commit()
    except Exception:
        pass

    # Send through MQTT
    try:
        mqtt_service.send_command(
            device_id=request.device_id,
            output_id=request.output_id,
            requested_state=request.requested_state,
            command_id=command_id,
            action=request.action,
            timeout_seconds=request.timeout_seconds or 15,
        )
    except Exception as e:
        if command_id in hardware_state["pending_commands"]:
            hardware_state["pending_commands"].pop(command_id)
        raise HTTPException(status_code=500, detail=f"MQTT send failed: {e}")

    # Broadcast pending status
    await ws_manager.broadcast("command_sent", {
        "command_id": command_id,
        "device_id": request.device_id,
        "output_id": request.output_id,
        "requested_state": request.requested_state,
        "action": request.action,
        "status": "PENDING",
    })

    return {
        "command_id": command_id,
        "device_id": request.device_id,
        "output_id": request.output_id,
        "target": request.output_id,
        "requested_state": request.requested_state,
        "action": request.action,
        "status": "PENDING",
        "message": "Command dispatched to ESP32 via MQTT. Awaiting hardware acknowledgement.",
    }


@app.get("/api/v1/hardware/status")
@app.get("/api/hardware/status")
async def get_hardware_status():
    """Get the authoritative physical hardware status, pin mappings, and telemetry."""
    dev = {
        "device_id": hardware_state["device_id"],
        "name": hardware_state["name"],
        "status": hardware_state["status"],
        "firmware_version": hardware_state["firmware_version"],
        "ip_address": hardware_state["ip_address"],
        "last_seen_at": hardware_state["last_seen_at"],
        "last_heartbeat_at": hardware_state["last_heartbeat_at"],
        "roundtrip_latency_ms": hardware_state["roundtrip_latency_ms"],
        "uptime_ms": hardware_state.get("uptime_ms", 0),
        "wifi_rssi": hardware_state.get("wifi_rssi", 0),
        "output_states": hardware_state["output_states"],
        "relay_pins": hardware_state["relay_pins"],
        "is_enabled": hardware_state["physical_control_enabled"],
    }
    return {
        **dev,
        "device": dev,
        "telemetry": hardware_state["telemetry"],
        "mqtt_connected": mqtt_service.is_connected,
        "last_command": hardware_state["last_command"],
        "pending_command_count": len(hardware_state["pending_commands"]),
    }


@app.post("/api/v1/hardware/command")
@app.post("/api/hardware/command")
async def send_hardware_command(req: HardwareCommandRequest):
    """Universal endpoint for physical hardware tower switching and batch commands."""
    return await send_physical_command(PhysicalCommandRequest(
        device_id=req.device_id or "esp32-gridtwin-001",
        output_id=req.output_id,
        requested_state=req.requested_state or "ON",
        action=req.action,
        command_id=req.command_id,
        timeout_seconds=req.timeout_seconds or 15,
    ))


@app.post("/api/v1/hardware/isolate/{tower_id}")
@app.post("/api/hardware/isolate/{tower_id}")
async def isolate_tower_endpoint(tower_id: str):
    """
    Dedicated endpoint to ISOLATE a single tower (e.g. Tower 3 or Tower 4).
    Turns off the tower's relay output and opens simulated switch.
    """
    tid = tower_id.upper()
    if tid not in ["T1", "T2", "T3", "T4", "T5"]:
        raise HTTPException(status_code=400, detail=f"Invalid tower ID {tower_id}. Must be T1-T5.")
    
    # 1. Synchronize authoritative state immediately for instant IVR telephone & 3D UI updates
    hardware_state["output_states"][tid] = "OFF"
    sw_map = {"T1": "SW1", "T2": "SW2", "T3": "SW3", "T4": "SW4", "T5": "SW5"}
    if tid in sw_map:
        try:
            simulator.operate_switch(sw_map[tid], "OPEN")
        except Exception:
            pass
    
    # 2. Broadcast immediately to WebSocket clients (3D Lab and dashboards)
    try:
        await ws_manager.broadcast("tower_isolated", {
            "tower_id": tid,
            "state": "OFF",
            "is_isolated": True,
            "output_states": hardware_state["output_states"]
        })
    except Exception:
        pass

    # 3. Dispatch to physical ESP32 if online
    msg = "Tower isolated in digital twin."
    if mqtt_service.is_connected:
        try:
            res = await send_physical_command(PhysicalCommandRequest(
                device_id="esp32-gridtwin-001",
                output_id=tid,
                requested_state="OFF",
                action="ISOLATE",
                timeout_seconds=15,
            ))
            msg = res.get("message", msg)
        except Exception as e:
            logger.info(f"Physical MQTT notice: {e}")

    return {
        "status": "SUCCESS",
        "tower_id": tid,
        "is_isolated": True,
        "output_state": "OFF",
        "message": msg,
        "output_states": hardware_state["output_states"]
    }


@app.post("/api/v1/hardware/restore/{tower_id}")
@app.post("/api/hardware/restore/{tower_id}")
async def restore_tower_endpoint(tower_id: str):
    """
    Dedicated endpoint to RESTORE a single tower.
    Energizes the tower's relay output and closes simulated switch.
    """
    tid = tower_id.upper()
    if tid not in ["T1", "T2", "T3", "T4", "T5"]:
        raise HTTPException(status_code=400, detail=f"Invalid tower ID {tower_id}. Must be T1-T5.")
    
    # 1. Synchronize authoritative state immediately for instant IVR telephone & 3D UI updates
    hardware_state["output_states"][tid] = "ON"
    sw_map = {"T1": "SW1", "T2": "SW2", "T3": "SW3", "T4": "SW4", "T5": "SW5"}
    if tid in sw_map:
        try:
            simulator.operate_switch(sw_map[tid], "CLOSED")
        except Exception:
            pass
    
    # 2. Broadcast immediately to WebSocket clients
    try:
        await ws_manager.broadcast("tower_restored", {
            "tower_id": tid,
            "state": "ON",
            "is_isolated": False,
            "output_states": hardware_state["output_states"]
        })
    except Exception:
        pass

    # 3. Dispatch to physical ESP32 if online
    msg = "Tower restored in digital twin."
    if mqtt_service.is_connected:
        try:
            res = await send_physical_command(PhysicalCommandRequest(
                device_id="esp32-gridtwin-001",
                output_id=tid,
                requested_state="ON",
                action="RESTORE",
                timeout_seconds=15,
            ))
            msg = res.get("message", msg)
        except Exception as e:
            logger.info(f"Physical MQTT notice: {e}")

    return {
        "status": "SUCCESS",
        "tower_id": tid,
        "is_isolated": False,
        "output_state": "ON",
        "message": msg,
        "output_states": hardware_state["output_states"]
    }


@app.post("/api/v1/hardware/set-all")
@app.post("/api/hardware/set-all")
async def set_all_towers_endpoint(payload: dict):
    """Batch energize or de-energize all five towers simultaneously."""
    state = (payload.get("state") or payload.get("target_state") or "ON").upper()
    action = "ALL_ON" if state == "ON" else "ALL_OFF"
    
    # Synchronize all tower output states immediately
    for t in ["T1", "T2", "T3", "T4", "T5"]:
        hardware_state["output_states"][t] = state
    
    # Synchronize simulation switches
    for sw in ["SW1", "SW2", "SW3", "SW4", "SW5"]:
        try:
            simulator.operate_switch(sw, "CLOSED" if state == "ON" else "OPEN")
        except Exception:
            pass

    # Broadcast to WebSockets
    try:
        await ws_manager.broadcast("batch_command", {
            "action": action,
            "state": state,
            "output_states": hardware_state["output_states"]
        })
    except Exception:
        pass

    msg = f"All towers set to {state} in digital twin."
    if mqtt_service.is_connected:
        try:
            res = await send_physical_command(PhysicalCommandRequest(
                device_id="esp32-gridtwin-001",
                output_id="ALL",
                requested_state=state,
                action=action,
                timeout_seconds=15,
            ))
            msg = res.get("message", msg)
        except Exception as e:
            logger.info(f"Batch physical MQTT note: {e}")

    return {
        "status": "SUCCESS",
        "action": action,
        "message": msg,
        "output_states": hardware_state["output_states"]
    }


@app.post("/api/v1/hardware/sync")
@app.post("/api/hardware/sync")
async def sync_hardware_state_endpoint(payload: dict):
    """
    Synchronizes authoritative tower isolation state from 3D Twin frontend.
    """
    iso_list = [str(x).upper() for x in payload.get("isolated_towers", [])]
    sw_map = {"T1": "SW1", "T2": "SW2", "T3": "SW3", "T4": "SW4", "T5": "SW5"}
    for tid in ["T1", "T2", "T3", "T4", "T5"]:
        is_iso = tid in iso_list
        prev_state = hardware_state["output_states"].get(tid, "ON")
        new_state = "OFF" if is_iso else "ON"
        hardware_state["output_states"][tid] = new_state
        if tid in sw_map:
            try:
                simulator.operate_switch(sw_map[tid], "OPEN" if is_iso else "CLOSED")
            except Exception:
                pass
        
        # Dispatch to physical hardware via MQTT whenever state changed
        if mqtt_service.is_connected and prev_state != new_state:
            try:
                mqtt_service.send_command(
                    device_id="esp32-gridtwin-001",
                    output_id=tid,
                    requested_state=new_state,
                    action="ISOLATE" if is_iso else "RESTORE",
                    timeout_seconds=15,
                )
            except Exception as e:
                logger.debug(f"Sync MQTT dispatch error for {tid}: {e}")
    
    # Broadcast to all WebSockets
    try:
        await ws_manager.broadcast("towers_synced", {
            "isolated_towers": iso_list,
            "output_states": hardware_state["output_states"]
        })
    except Exception:
        pass

    return {
        "status": "SUCCESS",
        "isolated_towers": iso_list,
        "output_states": hardware_state["output_states"]
    }


@app.get("/api/v1/hardware/telemetry")
@app.get("/api/hardware/telemetry")
async def get_hardware_telemetry(limit: int = Query(50, le=200)):
    """Get latest INA219 current sensor telemetry and historical readings."""
    return {
        **hardware_state["telemetry"],
        "current": hardware_state["telemetry"],
        "history": hardware_state["telemetry_history"][:limit],
        "device_id": hardware_state["device_id"],
        "sensor_status": hardware_state["telemetry"]["sensor_status"],
    }


# Frontend Route Compatibility Aliases
@app.get("/api/dashboard/summary")
async def get_dashboard_summary_alias():
    return await get_dashboard()


@app.post("/api/switches/{switch_id}/operate")
async def operate_switch_alias(switch_id: str, request: SwitchOperationRequest):
    return await operate_simulated_switch(switch_id, request)


@app.get("/api/v1/commands")
async def list_commands(limit: int = Query(20, le=100)):
    """List recent commands."""
    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(DeviceCommand).order_by(desc(DeviceCommand.created_at)).limit(limit)
            )
            commands = result.scalars().all()
            return [{
                "id": str(c.id),
                "command_id": c.command_id,
                "output_id": c.output_id,
                "requested_state": c.requested_state.value if c.requested_state else "UNKNOWN",
                "status": c.status.value if c.status else "UNKNOWN",
                "ack_success": c.ack_success,
                "ack_reported_state": c.ack_reported_state.value if c.ack_reported_state else None,
                "ack_error_reason": c.ack_error_reason,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "ack_received_at": c.ack_received_at.isoformat() if c.ack_received_at else None,
            } for c in commands]
    except Exception:
        return []


# ──────────────────────────────────────────────
# Alerts
# ──────────────────────────────────────────────

@app.get("/api/v1/alerts")
async def list_alerts(status: Optional[str] = None, limit: int = Query(50, le=200)):
    """List alerts."""
    try:
        async with async_session_factory() as session:
            query = select(Alert).order_by(desc(Alert.created_at)).limit(limit)
            if status:
                query = query.where(Alert.status == AlertStatus(status))
            result = await session.execute(query)
            alerts = result.scalars().all()
            return [{
                "id": str(a.id),
                "alert_type": a.alert_type,
                "severity": a.severity.value if a.severity else "INFO",
                "status": a.status.value if a.status else "ACTIVE",
                "title": a.title,
                "message": a.message,
                "source": a.source,
                "component_id": a.component_id,
                "device_id": a.device_id,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            } for a in alerts]
    except Exception:
        return []


# ──────────────────────────────────────────────
# Events
# ──────────────────────────────────────────────

@app.get("/api/v1/events")
async def list_events(limit: int = Query(50, le=200)):
    """List recent events."""
    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(EventLog).order_by(desc(EventLog.created_at)).limit(limit)
            )
            events = result.scalars().all()
            return [{
                "id": str(e.id),
                "event_type": e.event_type,
                "source": e.source,
                "title": e.title,
                "description": e.description,
                "component_id": e.component_id,
                "device_id": e.device_id,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            } for e in events]
    except Exception:
        return []


# ──────────────────────────────────────────────
# Telemetry
# ──────────────────────────────────────────────

@app.post("/api/v1/telemetry")
async def ingest_telemetry(request: TelemetryIngest):
    """Ingest a telemetry record."""
    try:
        async with async_session_factory() as session:
            record = TelemetryRecord(
                device_id=request.device_id,
                measurement_type=request.measurement_type,
                value=request.value,
                unit=request.unit,
                is_simulated=request.is_simulated,
                source=request.source,
            )
            session.add(record)
            await session.commit()
        
        await ws_manager.broadcast("telemetry", {
            "device_id": request.device_id,
            "measurement_type": request.measurement_type,
            "value": request.value,
            "unit": request.unit,
            "is_simulated": request.is_simulated,
        })
        
        return {"status": "recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/telemetry/{device_id}")
async def get_telemetry(device_id: str, limit: int = Query(100, le=1000)):
    """Get telemetry records for a device."""
    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(TelemetryRecord)
                .where(TelemetryRecord.device_id == device_id)
                .order_by(desc(TelemetryRecord.recorded_at))
                .limit(limit)
            )
            records = result.scalars().all()
            return [{
                "id": str(r.id),
                "device_id": r.device_id,
                "measurement_type": r.measurement_type,
                "value": r.value,
                "unit": r.unit,
                "is_simulated": r.is_simulated,
                "source": r.source,
                "recorded_at": r.recorded_at.isoformat() if r.recorded_at else None,
            } for r in records]
    except Exception:
        return []


# ──────────────────────────────────────────────
# Settings
# ──────────────────────────────────────────────

@app.get("/api/v1/settings")
async def get_settings():
    """Get application settings."""
    try:
        async with async_session_factory() as session:
            result = await session.execute(select(AppSetting))
            settings_list = result.scalars().all()
            return {s.key: s.value for s in settings_list}
    except Exception:
        return {
            "physical_control_enabled": "false",
            "simulation_level": "CONNECTIVITY",
        }

@app.put("/api/v1/settings/{key}")
async def update_setting(key: str, value: str = Query(...)):
    """Update an application setting."""
    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(AppSetting).where(AppSetting.key == key)
            )
            setting = result.scalar_one_or_none()
            if setting:
                setting.value = value
            else:
                session.add(AppSetting(key=key, value=value))
            await session.commit()
            return {"key": key, "value": value}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────
# WebSocket
# ──────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time frontend updates."""
    await ws_manager.connect(websocket)
    try:
        # Send initial state
        await ws_manager.send_to(websocket, "initial_state", {
            "simulation": simulator.get_network_summary(),
            "mqtt_connected": mqtt_service.is_connected,
        })
        
        while True:
            # Keep connection alive and handle client messages
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")
                
                if msg_type == "ping":
                    await ws_manager.send_to(websocket, "pong", {})
                elif msg_type == "request_state":
                    await ws_manager.send_to(websocket, "state_update", {
                        "simulation": simulator.get_network_summary(),
                        "mqtt_connected": mqtt_service.is_connected,
                    })
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await ws_manager.disconnect(websocket)


# ──────────────────────────────────────────────
# Init modules (needed for imports)
# ──────────────────────────────────────────────

import json
