"""GRIDTWIN Backend - Pydantic Schemas for API validation"""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


# ──────────────────────────────────────────────
# Base schemas
# ──────────────────────────────────────────────

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ──────────────────────────────────────────────
# Project
# ──────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None

class ProjectResponse(BaseSchema):
    id: uuid.UUID
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ──────────────────────────────────────────────
# Node
# ──────────────────────────────────────────────

class NodeCreate(BaseModel):
    node_id: str = Field(..., min_length=1, max_length=50)
    node_type: str
    name: str
    description: Optional[str] = None
    pos_x: float = 0.0
    pos_y: float = 0.0
    pos_z: float = 0.0
    nominal_voltage_kv: Optional[float] = None
    metadata_json: Optional[dict] = None

class NodeResponse(BaseSchema):
    id: uuid.UUID
    node_id: str
    node_type: str
    name: str
    description: Optional[str]
    pos_x: float
    pos_y: float
    pos_z: float
    nominal_voltage_kv: Optional[float]
    is_energized: bool
    metadata_json: Optional[dict]


# ──────────────────────────────────────────────
# Edge
# ──────────────────────────────────────────────

class EdgeCreate(BaseModel):
    edge_id: str = Field(..., min_length=1, max_length=50)
    edge_type: str
    name: str
    from_node_id: str
    to_node_id: str
    length_km: Optional[float] = None
    resistance_ohm_per_km: Optional[float] = None
    reactance_ohm_per_km: Optional[float] = None
    max_current_a: Optional[float] = None
    metadata_json: Optional[dict] = None

class EdgeResponse(BaseSchema):
    id: uuid.UUID
    edge_id: str
    edge_type: str
    name: str
    from_node_id: str
    to_node_id: str
    length_km: Optional[float]
    resistance_ohm_per_km: Optional[float]
    max_current_a: Optional[float]
    is_active: bool


# ──────────────────────────────────────────────
# Component
# ──────────────────────────────────────────────

class ComponentCreate(BaseModel):
    component_id: str
    component_type: str
    name: str
    description: Optional[str] = None
    node_id: Optional[str] = None
    edge_id: Optional[str] = None
    pos_x: float = 0.0
    pos_y: float = 0.0
    pos_z: float = 0.0
    rotation_y: float = 0.0
    scale: float = 1.0
    metadata_json: Optional[dict] = None

class ComponentResponse(BaseSchema):
    id: uuid.UUID
    component_id: str
    component_type: str
    name: str
    description: Optional[str]
    node_id: Optional[str]
    edge_id: Optional[str]
    pos_x: float
    pos_y: float
    pos_z: float
    rotation_y: float
    scale: float
    metadata_json: Optional[dict]


# ──────────────────────────────────────────────
# Switch
# ──────────────────────────────────────────────

class SwitchCreate(BaseModel):
    switch_id: str
    name: str
    description: Optional[str] = None
    controlled_edge_id: str
    state: str = "CLOSED"
    section_id: Optional[str] = None

class SwitchResponse(BaseSchema):
    id: uuid.UUID
    switch_id: str
    name: str
    controlled_edge_id: str
    state: str
    section_id: Optional[str]

class SwitchOperationRequest(BaseModel):
    requested_state: str = Field(..., pattern="^(OPEN|CLOSED)$")

class SwitchOperationResponse(BaseModel):
    switch_id: str
    previous_state: str
    new_state: str
    affected_nodes: list[str]
    affected_loads: list[str]
    energized_nodes: list[str]
    de_energized_nodes: list[str]
    message: str


# ──────────────────────────────────────────────
# Load
# ──────────────────────────────────────────────

class LoadCreate(BaseModel):
    load_id: str
    name: str
    connected_node_id: str
    demand_kw: float = 10.0
    power_factor: float = 0.95
    section_id: Optional[str] = None

class LoadResponse(BaseSchema):
    id: uuid.UUID
    load_id: str
    name: str
    connected_node_id: str
    demand_kw: float
    power_factor: float
    is_connected: bool
    is_energized: bool
    section_id: Optional[str]


# ──────────────────────────────────────────────
# Simulation
# ──────────────────────────────────────────────

class SimulationStartRequest(BaseModel):
    level: str = "CONNECTIVITY"
    speed_multiplier: float = 1.0

class SimulationSessionResponse(BaseSchema):
    id: uuid.UUID
    status: str
    level: str
    simulation_time: float
    speed_multiplier: float
    started_at: Optional[datetime]
    created_at: datetime

class SimulationResultResponse(BaseSchema):
    id: uuid.UUID
    session_id: uuid.UUID
    timestamp: datetime
    result_type: str
    energized_nodes: Optional[dict]
    de_energized_nodes: Optional[dict]
    affected_loads: Optional[dict]
    switch_states: Optional[dict]
    calculations: Optional[dict]

class ConnectivityResult(BaseModel):
    energized_nodes: list[str]
    de_energized_nodes: list[str]
    energized_loads: list[str]
    de_energized_loads: list[str]
    switch_states: dict[str, str]
    paths: dict[str, list[str]]
    total_demand_kw: float
    served_demand_kw: float
    unserved_demand_kw: float


# ──────────────────────────────────────────────
# Device
# ──────────────────────────────────────────────

class DeviceRegister(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    device_type: str = "ESP32"

class DeviceResponse(BaseSchema):
    id: uuid.UUID
    device_id: str
    name: str
    description: Optional[str]
    device_type: str
    firmware_version: Optional[str]
    status: str
    is_registered: bool
    is_enabled: bool
    last_seen_at: Optional[datetime]
    last_heartbeat_at: Optional[datetime]

class DeviceEnableRequest(BaseModel):
    enabled: bool

class OutputMappingCreate(BaseModel):
    output_id: str
    gpio_pin: int
    name: str
    section_id: Optional[str] = None
    is_enabled: bool = False
    is_allowlisted: bool = False

class OutputMappingResponse(BaseSchema):
    id: uuid.UUID
    output_id: str
    gpio_pin: int
    name: str
    section_id: Optional[str]
    is_enabled: bool
    is_allowlisted: bool
    reported_state: str
    last_state_change_at: Optional[datetime]


# ──────────────────────────────────────────────
# Commands
# ──────────────────────────────────────────────

class PhysicalCommandRequest(BaseModel):
    device_id: str
    output_id: str
    requested_state: str = Field(..., pattern="^(ON|OFF)$")

class CommandResponse(BaseSchema):
    id: uuid.UUID
    command_id: str
    device_id: uuid.UUID
    output_id: str
    requested_state: str
    status: str
    ack_received_at: Optional[datetime]
    ack_success: Optional[bool]
    ack_reported_state: Optional[str]
    ack_error_reason: Optional[str]
    created_at: datetime

class CommandAcknowledgement(BaseModel):
    schema_version: str = "1.0"
    command_id: str
    device_id: str
    output_id: str
    success: bool
    reported_state: str
    timestamp: str
    error_reason: Optional[str] = None


# ──────────────────────────────────────────────
# Telemetry
# ──────────────────────────────────────────────

class TelemetryIngest(BaseModel):
    device_id: str
    measurement_type: str
    value: float
    unit: Optional[str] = None
    is_simulated: bool = False
    source: str = "device"

class TelemetryResponse(BaseSchema):
    id: uuid.UUID
    device_id: str
    measurement_type: str
    value: float
    unit: Optional[str]
    is_simulated: bool
    source: str
    recorded_at: datetime


# ──────────────────────────────────────────────
# Alerts & Events
# ──────────────────────────────────────────────

class AlertCreate(BaseModel):
    alert_type: str
    severity: str = "INFO"
    title: str
    message: str
    source: Optional[str] = None
    component_id: Optional[str] = None
    device_id: Optional[str] = None

class AlertResponse(BaseSchema):
    id: uuid.UUID
    alert_type: str
    severity: str
    status: str
    title: str
    message: str
    source: Optional[str]
    component_id: Optional[str]
    device_id: Optional[str]
    created_at: datetime

class EventLogResponse(BaseSchema):
    id: uuid.UUID
    event_type: str
    source: str
    title: str
    description: Optional[str]
    component_id: Optional[str]
    device_id: Optional[str]
    created_at: datetime


# ──────────────────────────────────────────────
# Dashboard
# ──────────────────────────────────────────────

class DashboardSummary(BaseModel):
    project_name: str
    project_id: Optional[str] = None
    total_nodes: int
    total_edges: int
    total_loads: int
    total_switches: int
    energized_nodes: int
    de_energized_nodes: int
    energized_loads: int
    de_energized_loads: int
    total_demand_kw: float
    served_demand_kw: float
    simulation_status: str
    simulation_level: str
    device_count: int
    devices_online: int
    devices_offline: int
    physical_control_enabled: bool
    last_communication: Optional[datetime] = None
    active_alerts: int
    recent_commands: list[dict] = []
    recent_events: list[dict] = []

class NetworkTopologyResponse(BaseModel):
    nodes: list[NodeResponse]
    edges: list[EdgeResponse]
    components: list[ComponentResponse]
    switches: list[SwitchResponse]
    loads: list[LoadResponse]


# ──────────────────────────────────────────────
# WebSocket Messages
# ──────────────────────────────────────────────

class WSMessage(BaseModel):
    type: str
    payload: dict
    timestamp: str
