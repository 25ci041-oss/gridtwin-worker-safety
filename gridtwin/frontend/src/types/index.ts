// GRIDTWIN Frontend Types & Interfaces

export type SwitchState = 'CLOSED' | 'OPEN';
export type NodeType = 'SUBSTATION' | 'POLE' | 'TRANSFORMER' | 'LOAD' | 'SWITCH' | 'SOLAR';
export type EdgeType = 'OVERHEAD_33KV' | 'OVERHEAD_11KV' | 'UNDERGROUND_11KV' | 'LOW_VOLTAGE_415V';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface GridNode {
  id: string;
  node_id: string;
  node_type: NodeType;
  name: string;
  description?: string;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  nominal_voltage_kv?: number;
  is_energized: boolean;
  metadata_json?: Record<string, any>;
}

export interface GridEdge {
  id: string;
  edge_id: string;
  edge_type: EdgeType;
  name: string;
  from_node_id: string;
  to_node_id: string;
  length_km?: number;
  resistance_ohm_per_km?: number;
  max_current_a?: number;
  is_active: boolean;
}

export interface GridSwitch {
  id: string;
  switch_id: string;
  name: string;
  controlled_edge_id: string;
  state: SwitchState;
  section_id?: string;
  description?: string;
  gpio_pin?: number;
  hardware_ack?: boolean;
  last_operated?: string;
}

export interface GridLoad {
  id: string;
  load_id: string;
  name: string;
  connected_node_id: string;
  demand_kw: number;
  power_factor: number;
  is_connected: boolean;
  is_energized: boolean;
  section_id?: string;
  category: 'residential' | 'commercial' | 'industrial' | 'critical' | 'renewable';
}

export interface ConnectivityResult {
  energized_nodes: string[];
  de_energized_nodes: string[];
  energized_loads: string[];
  de_energized_loads: string[];
  switch_states: Record<string, SwitchState>;
  paths: Record<string, string[]>;
  total_demand_kw: number;
  served_demand_kw: number;
  unserved_demand_kw: number;
}

export type HardwareMode = 'PHYSICAL' | 'SIMULATION';

export interface INA219Telemetry {
  bus_voltage_v: number;
  shunt_voltage_mv: number;
  current_ma: number;
  power_mw: number;
  sensor_status: 'OK' | 'DISCONNECTED' | 'ERROR';
  recorded_at?: string;
}

export interface HardwareDevice {
  device_id: string;
  name: string;
  status: DeviceStatus | 'UNKNOWN';
  is_registered: boolean;
  is_enabled: boolean;
  ip_address?: string;
  wifi_rssi?: number;
  last_seen_at?: string;
  last_heartbeat_at?: string;
  roundtrip_latency_ms?: number;
  firmware_version?: string;
  output_states: Record<string, 'ON' | 'OFF' | 'ISOLATED' | 'UNKNOWN'>;
  relay_pins?: Record<string, number>;
}

export interface GridAlert {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  source: string;
  message: string;
  is_active: boolean;
}

export interface SimulationMetric {
  timestamp: string;
  voltage_v: number;
  current_a: number;
  active_power_kw: number;
  reactive_power_kvar: number;
  power_factor: number;
  frequency_hz: number;
}

export interface SelectedElement {
  id: string;
  type: 'substation' | 'switch' | 'transformer' | 'load' | 'pole' | 'line';
  title: string;
  voltage_kv?: number;
  status?: string;
  current_a?: number;
  power_kw?: number;
  details: Record<string, any>;
}
