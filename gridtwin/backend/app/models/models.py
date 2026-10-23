"""GRIDTWIN Backend - Database Models

Complete relational model for the digital twin application.
All timestamps stored in UTC.
"""
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, Enum, JSON, UniqueConstraint, Index, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db.database import Base


def utcnow():
    return datetime.now(timezone.utc)


def new_uuid():
    return uuid.uuid4()


# ──────────────────────────────────────────────
# Enumerations
# ──────────────────────────────────────────────

class NodeType(str, enum.Enum):
    SOURCE = "SOURCE"
    BUSBAR = "BUSBAR"
    JUNCTION = "JUNCTION"
    TOWER = "TOWER"
    LOAD_POINT = "LOAD_POINT"
    MEASUREMENT = "MEASUREMENT"


class EdgeType(str, enum.Enum):
    CONDUCTOR = "CONDUCTOR"
    CABLE = "CABLE"
    BUSBAR_SECTION = "BUSBAR_SECTION"
    TRANSFORMER_WINDING = "TRANSFORMER_WINDING"


class ComponentType(str, enum.Enum):
    TOWER = "TOWER"
    SWITCH = "SWITCH"
    CIRCUIT_BREAKER = "CIRCUIT_BREAKER"
    TRANSFORMER = "TRANSFORMER"
    LOAD = "LOAD"
    SOURCE = "SOURCE"
    INSULATOR = "INSULATOR"
    CONDUCTOR_SPAN = "CONDUCTOR_SPAN"
    MEASUREMENT_POINT = "MEASUREMENT_POINT"
    INDICATOR = "INDICATOR"


class SwitchState(str, enum.Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"


class SimulationStatus(str, enum.Enum):
    IDLE = "IDLE"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"


class SimulationLevel(str, enum.Enum):
    CONNECTIVITY = "CONNECTIVITY"
    EDUCATIONAL = "EDUCATIONAL"
    ADVANCED = "ADVANCED"


class DeviceStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    ERROR = "ERROR"
    UNKNOWN = "UNKNOWN"


class CommandStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    TIMEOUT = "TIMEOUT"
    FAILED = "FAILED"
    REJECTED = "REJECTED"


class OutputState(str, enum.Enum):
    ON = "ON"
    OFF = "OFF"
    UNKNOWN = "UNKNOWN"


class AlertSeverity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class AlertStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"


# ──────────────────────────────────────────────
# Projects
# ──────────────────────────────────────────────

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    network_versions = relationship("NetworkVersion", back_populates="project", cascade="all, delete-orphan")


class NetworkVersion(Base):
    __tablename__ = "network_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    # Relationships
    project = relationship("Project", back_populates="network_versions")
    nodes = relationship("Node", back_populates="network_version", cascade="all, delete-orphan")
    edges = relationship("Edge", back_populates="network_version", cascade="all, delete-orphan")
    components = relationship("Component", back_populates="network_version", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("project_id", "version", name="uq_project_version"),
    )


# ──────────────────────────────────────────────
# Network Topology
# ──────────────────────────────────────────────

class Node(Base):
    __tablename__ = "nodes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    network_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("network_versions.id"), nullable=False)
    node_id: Mapped[str] = mapped_column(String(50), nullable=False)
    node_type: Mapped[NodeType] = mapped_column(Enum(NodeType), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    
    # 3D Position (separate from electrical topology)
    pos_x: Mapped[float] = mapped_column(Float, default=0.0)
    pos_y: Mapped[float] = mapped_column(Float, default=0.0)
    pos_z: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Electrical parameters
    nominal_voltage_kv: Mapped[float] = mapped_column(Float, nullable=True)
    is_energized: Mapped[bool] = mapped_column(Boolean, default=True)
    
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    network_version = relationship("NetworkVersion", back_populates="nodes")

    __table_args__ = (
        UniqueConstraint("network_version_id", "node_id", name="uq_network_node"),
        Index("ix_nodes_node_id", "node_id"),
    )


class Edge(Base):
    __tablename__ = "edges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    network_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("network_versions.id"), nullable=False)
    edge_id: Mapped[str] = mapped_column(String(50), nullable=False)
    edge_type: Mapped[EdgeType] = mapped_column(Enum(EdgeType), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    from_node_id: Mapped[str] = mapped_column(String(50), nullable=False)
    to_node_id: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Electrical parameters
    length_km: Mapped[float] = mapped_column(Float, nullable=True)
    resistance_ohm_per_km: Mapped[float] = mapped_column(Float, nullable=True)
    reactance_ohm_per_km: Mapped[float] = mapped_column(Float, nullable=True)
    max_current_a: Mapped[float] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    network_version = relationship("NetworkVersion", back_populates="edges")

    __table_args__ = (
        UniqueConstraint("network_version_id", "edge_id", name="uq_network_edge"),
        Index("ix_edges_edge_id", "edge_id"),
    )


class Component(Base):
    __tablename__ = "components"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    network_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("network_versions.id"), nullable=False)
    component_id: Mapped[str] = mapped_column(String(50), nullable=False)
    component_type: Mapped[ComponentType] = mapped_column(Enum(ComponentType), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Association to topology
    node_id: Mapped[str] = mapped_column(String(50), nullable=True)
    edge_id: Mapped[str] = mapped_column(String(50), nullable=True)
    
    # 3D rendering info
    pos_x: Mapped[float] = mapped_column(Float, default=0.0)
    pos_y: Mapped[float] = mapped_column(Float, default=0.0)
    pos_z: Mapped[float] = mapped_column(Float, default=0.0)
    rotation_y: Mapped[float] = mapped_column(Float, default=0.0)
    scale: Mapped[float] = mapped_column(Float, default=1.0)
    
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    network_version = relationship("NetworkVersion", back_populates="components")
    parameters = relationship("ComponentParameter", back_populates="component", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("network_version_id", "component_id", name="uq_network_component"),
        Index("ix_components_component_id", "component_id"),
    )


class ComponentParameter(Base):
    __tablename__ = "component_parameters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    component_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("components.id"), nullable=False)
    param_key: Mapped[str] = mapped_column(String(100), nullable=False)
    param_value: Mapped[str] = mapped_column(String(500), nullable=False)
    param_unit: Mapped[str] = mapped_column(String(50), nullable=True)
    
    component = relationship("Component", back_populates="parameters")

    __table_args__ = (
        UniqueConstraint("component_id", "param_key", name="uq_component_param"),
    )


# ──────────────────────────────────────────────
# Switches (Modeled network switches)
# ──────────────────────────────────────────────

class Switch(Base):
    __tablename__ = "switches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    network_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("network_versions.id"), nullable=False)
    switch_id: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    
    # References to the edge(s) this switch controls
    controlled_edge_id: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Current simulated state
    state: Mapped[SwitchState] = mapped_column(Enum(SwitchState), default=SwitchState.CLOSED)
    
    # Associated tower/section
    section_id: Mapped[str] = mapped_column(String(50), nullable=True)
    
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    __table_args__ = (
        UniqueConstraint("network_version_id", "switch_id", name="uq_network_switch"),
    )


# ──────────────────────────────────────────────
# Loads
# ──────────────────────────────────────────────

class Load(Base):
    __tablename__ = "loads"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    network_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("network_versions.id"), nullable=False)
    load_id: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Connected to which node
    connected_node_id: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Load parameters
    demand_kw: Mapped[float] = mapped_column(Float, default=10.0)
    power_factor: Mapped[float] = mapped_column(Float, default=0.95)
    is_connected: Mapped[bool] = mapped_column(Boolean, default=True)
    is_energized: Mapped[bool] = mapped_column(Boolean, default=True)
    
    section_id: Mapped[str] = mapped_column(String(50), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        UniqueConstraint("network_version_id", "load_id", name="uq_network_load"),
    )


# ──────────────────────────────────────────────
# Simulation
# ──────────────────────────────────────────────

class SimulationSession(Base):
    __tablename__ = "simulation_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    network_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("network_versions.id"), nullable=False)
    status: Mapped[SimulationStatus] = mapped_column(Enum(SimulationStatus), default=SimulationStatus.IDLE)
    level: Mapped[SimulationLevel] = mapped_column(Enum(SimulationLevel), default=SimulationLevel.CONNECTIVITY)
    
    simulation_time: Mapped[float] = mapped_column(Float, default=0.0)
    speed_multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    
    results = relationship("SimulationResult", back_populates="session", cascade="all, delete-orphan")


class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("simulation_sessions.id"), nullable=False)
    
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    result_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "connectivity", "educational", "advanced"
    
    # Connectivity results
    energized_nodes: Mapped[dict] = mapped_column(JSON, nullable=True)  # list of node IDs
    de_energized_nodes: Mapped[dict] = mapped_column(JSON, nullable=True)
    affected_loads: Mapped[dict] = mapped_column(JSON, nullable=True)
    switch_states: Mapped[dict] = mapped_column(JSON, nullable=True)
    
    # Educational calculation results
    calculations: Mapped[dict] = mapped_column(JSON, nullable=True)
    
    # Full result snapshot
    full_result: Mapped[dict] = mapped_column(JSON, nullable=True)
    
    session = relationship("SimulationSession", back_populates="results")


# ──────────────────────────────────────────────
# Devices & Physical Control
# ──────────────────────────────────────────────

class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    device_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    
    device_type: Mapped[str] = mapped_column(String(50), default="ESP32")
    firmware_version: Mapped[str] = mapped_column(String(50), nullable=True)
    
    status: Mapped[DeviceStatus] = mapped_column(Enum(DeviceStatus), default=DeviceStatus.OFFLINE)
    is_registered: Mapped[bool] = mapped_column(Boolean, default=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    last_heartbeat_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    output_mappings = relationship("OutputMapping", back_populates="device", cascade="all, delete-orphan")
    commands = relationship("DeviceCommand", back_populates="device", cascade="all, delete-orphan")


class OutputMapping(Base):
    __tablename__ = "output_mappings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False)
    
    output_id: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "T1", "T2", etc.
    gpio_pin: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # The section/tower this output maps to
    section_id: Mapped[str] = mapped_column(String(50), nullable=True)
    
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    is_allowlisted: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Current reported state
    reported_state: Mapped[OutputState] = mapped_column(Enum(OutputState), default=OutputState.UNKNOWN)
    last_state_change_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    device = relationship("Device", back_populates="output_mappings")

    __table_args__ = (
        UniqueConstraint("device_id", "output_id", name="uq_device_output"),
    )


class DeviceCommand(Base):
    __tablename__ = "device_commands"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    command_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False)
    
    output_id: Mapped[str] = mapped_column(String(50), nullable=False)
    requested_state: Mapped[OutputState] = mapped_column(Enum(OutputState), nullable=False)
    
    status: Mapped[CommandStatus] = mapped_column(Enum(CommandStatus), default=CommandStatus.PENDING)
    
    # Acknowledgement
    ack_received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    ack_success: Mapped[bool] = mapped_column(Boolean, nullable=True)
    ack_reported_state: Mapped[OutputState] = mapped_column(Enum(OutputState), nullable=True)
    ack_error_reason: Mapped[str] = mapped_column(Text, nullable=True)
    
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    device = relationship("Device", back_populates="commands")

    __table_args__ = (
        Index("ix_commands_status", "status"),
        Index("ix_commands_device_output", "device_id", "output_id"),
    )


# ──────────────────────────────────────────────
# Telemetry
# ──────────────────────────────────────────────

class TelemetryRecord(Base):
    __tablename__ = "telemetry_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    device_id: Mapped[str] = mapped_column(String(100), nullable=False)
    
    measurement_type: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=True)
    
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(50), default="device")  # "device" or "simulation"
    
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        Index("ix_telemetry_device_time", "device_id", "recorded_at"),
    )


# ──────────────────────────────────────────────
# Alerts & Events
# ──────────────────────────────────────────────

class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    alert_type: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[AlertSeverity] = mapped_column(Enum(AlertSeverity), default=AlertSeverity.INFO)
    status: Mapped[AlertStatus] = mapped_column(Enum(AlertStatus), default=AlertStatus.ACTIVE)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    
    source: Mapped[str] = mapped_column(String(100), nullable=True)
    component_id: Mapped[str] = mapped_column(String(50), nullable=True)
    device_id: Mapped[str] = mapped_column(String(100), nullable=True)
    
    acknowledged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        Index("ix_alerts_status", "status"),
        Index("ix_alerts_severity", "severity"),
    )


class EventLog(Base):
    __tablename__ = "event_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    
    component_id: Mapped[str] = mapped_column(String(50), nullable=True)
    device_id: Mapped[str] = mapped_column(String(100), nullable=True)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        Index("ix_events_type", "event_type"),
        Index("ix_events_created", "created_at"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(100), nullable=True)
    
    user_id: Mapped[str] = mapped_column(String(100), nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    
    details: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AppSetting(Base):
    __tablename__ = "app_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
