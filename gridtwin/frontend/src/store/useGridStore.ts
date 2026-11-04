import { create } from 'zustand';
import {
  GridNode,
  GridEdge,
  GridSwitch,
  GridLoad,
  ConnectivityResult,
  HardwareDevice,
  GridAlert,
  SimulationMetric,
  SelectedElement,
  SwitchState,
  HardwareMode,
  INA219Telemetry
} from '../types';
 
const API_BASE = (
  import.meta.env.VITE_BACKEND_URL || 
  import.meta.env.VITE_API_BASE_URL || 
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? 'https://gridtwin-backend.onrender.com'
    : 'https://gridtwin-backend.onrender.com')
).replace(/\/$/, '');

const TOLLFREE_BASE = 'https://gridtwin-toll-free.onrender.com';

interface GridState {
  // Topology
  nodes: GridNode[];
  edges: GridEdge[];
  switches: GridSwitch[];
  loads: GridLoad[];
  connectivity: ConnectivityResult;

  // Real Hardware State Model
  hardwareDevice: HardwareDevice;
  hardwareMode: HardwareMode;
  pendingTowers: Record<string, boolean>;
  ina219Telemetry: INA219Telemetry;
  physicalSyncEnabled: boolean;
  isBackendConnected: boolean;
  mqttConnected: boolean;

  // Real-time telemetry history
  metricsHistory: SimulationMetric[];
  currentMetric: SimulationMetric;

  // UI & View state
  activeTab: 'dashboard' | '3d-twin' | 'sld' | 'hardware' | 'analytics' | 'scenarios' | 'monitoring' | 'devices' | 'alerts' | 'settings' | 'overview';
  isMobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  selectedElement: SelectedElement | null;
  cameraPreset: 'overview' | 'substation' | 'feeder1-3' | 'feeder4-5' | 'loads' | 'top' | 'side';
  isNightMode: boolean;
  showPowerFlow: boolean;
  showLabels: boolean;
  autoSimulation: boolean;

  // Alerts & Events
  alerts: GridAlert[];
  eventLogs: Array<{ id: string; timestamp: string; event: string; type: string }>;

  // Bypass Route State
  bypassSwitchState: SwitchState;
  isolatedTowerId: 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | null;
  isolatedTowers: ('T1' | 'T2' | 'T3' | 'T4' | 'T5')[];
  isT3Isolated: boolean;

  // Actions
  toggleSwitch: (switchId: string, bypassInterlock?: boolean) => Promise<void>;
  setSwitchState: (switchId: string, state: SwitchState) => Promise<void>;
  toggleBypassSwitch: () => void;
  isolateTower: (towerId: 'T1' | 'T2' | 'T3' | 'T4' | 'T5') => void;
  turnTowerOn: (towerId: 'T1' | 'T2' | 'T3' | 'T4' | 'T5') => void;
  turnTowerOff: (towerId: 'T1' | 'T2' | 'T3' | 'T4' | 'T5') => void;
  turnAllTowersOn: () => void;
  turnAllTowersOff: () => void;
  isolateT3WithBypass: () => void;
  restoreNormalOperation: () => void;
  applyIsolationLocally: (nextList: ('T1' | 'T2' | 'T3' | 'T4' | 'T5')[]) => void;
  toggleHardwareLogic: (action?: 'INVERT' | 'ACTIVE_HIGH' | 'ACTIVE_LOW') => Promise<void>;
  setSelectedElement: (element: SelectedElement | null) => void;
  setCameraPreset: (preset: 'overview' | 'substation' | 'feeder1-3' | 'feeder4-5' | 'loads' | 'top' | 'side') => void;
  setActiveTab: (tab: 'dashboard' | '3d-twin' | 'sld' | 'hardware' | 'analytics' | 'scenarios' | 'monitoring' | 'devices' | 'alerts' | 'settings' | 'overview') => void;
  setPhysicalSync: (enabled: boolean) => void;
  setHardwareMode: (mode: HardwareMode) => void;
  recomputeConnectivity: () => void;
  triggerScenario: (scenarioId: string) => void;
  addAlert: (alert: Omit<GridAlert, 'id' | 'timestamp'>) => void;
  clearAlerts: () => void;
  toggleNightMode: () => void;
  togglePowerFlow: () => void;
  toggleLabels: () => void;
  syncWithBackendData: (data: any) => void;

  // Dedicated Hardware Control Actions
  sendHardwareTowerCommand: (towerId: 'T1' | 'T2' | 'T3' | 'T4' | 'T5', targetState: 'ON' | 'OFF') => Promise<void>;
  sendHardwareIsolateCommand: (towerId: 'T1' | 'T2' | 'T3' | 'T4' | 'T5') => Promise<void>;
  sendHardwareRestoreCommand: (towerId: 'T1' | 'T2' | 'T3' | 'T4' | 'T5') => Promise<void>;
  sendHardwareSetAllCommand: (targetState: 'ON' | 'OFF') => Promise<void>;
  fetchHardwareStatus: () => Promise<void>;
  handleWebSocketMessage: (type: string, data: any) => void;
}

// Initial 5-Section Topology Data
const INITIAL_NODES: GridNode[] = [
  { id: 'node-ss', node_id: 'SS-01', node_type: 'SUBSTATION', name: 'Primary 33/11kV Substation', pos_x: -28, pos_y: 0, pos_z: 0, nominal_voltage_kv: 33, is_energized: true },
  { id: 'node-bus11', node_id: 'BUS-11', node_type: 'POLE', name: '11kV Main Distribution Bus', pos_x: -16, pos_y: 0, pos_z: 0, nominal_voltage_kv: 11, is_energized: true },
  
  // Section 1
  { id: 'node-n01', node_id: 'N-01', node_type: 'POLE', name: 'Feeder 1 Pole (West Sector)', pos_x: -6, pos_y: 0, pos_z: -14, nominal_voltage_kv: 11, is_energized: true },
  { id: 'node-xf1', node_id: 'TX-01', node_type: 'TRANSFORMER', name: 'T1 11kV/415V 500kVA Transformer', pos_x: 6, pos_y: 0, pos_z: -14, nominal_voltage_kv: 0.415, is_energized: true },
  
  // Section 2
  { id: 'node-n02', node_id: 'N-02', node_type: 'POLE', name: 'Feeder 2 Pole (Commercial Hub)', pos_x: -4, pos_y: 0, pos_z: -6, nominal_voltage_kv: 11, is_energized: true },
  { id: 'node-xf2', node_id: 'TX-02', node_type: 'TRANSFORMER', name: 'T2 11kV/415V 630kVA Transformer', pos_x: 8, pos_y: 0, pos_z: -6, nominal_voltage_kv: 0.415, is_energized: true },

  // Section 3
  { id: 'node-n03', node_id: 'N-03', node_type: 'POLE', name: 'Feeder 3 Pole (Healthcare District)', pos_x: -2, pos_y: 0, pos_z: 2, nominal_voltage_kv: 11, is_energized: true },
  { id: 'node-xf3', node_id: 'TX-03', node_type: 'TRANSFORMER', name: 'T3 11kV/415V 500kVA Transformer', pos_x: 10, pos_y: 0, pos_z: 2, nominal_voltage_kv: 0.415, is_energized: true },

  // Section 4
  { id: 'node-n04', node_id: 'N-04', node_type: 'POLE', name: 'Feeder 4 Pole (Industrial Park)', pos_x: 0, pos_y: 0, pos_z: 10, nominal_voltage_kv: 11, is_energized: true },
  { id: 'node-xf4', node_id: 'TX-04', node_type: 'TRANSFORMER', name: 'T4 11kV/415V 1000kVA Transformer', pos_x: 12, pos_y: 0, pos_z: 10, nominal_voltage_kv: 0.415, is_energized: true },

  // Section 5
  { id: 'node-n05', node_id: 'N-05', node_type: 'POLE', name: 'Feeder 5 Pole (Renewable Microgrid)', pos_x: 2, pos_y: 0, pos_z: 18, nominal_voltage_kv: 11, is_energized: true },
  { id: 'node-xf5', node_id: 'TX-05', node_type: 'TRANSFORMER', name: 'T5 11kV/415V 400kVA Transformer', pos_x: 14, pos_y: 0, pos_z: 18, nominal_voltage_kv: 0.415, is_energized: true }
];

const INITIAL_EDGES: GridEdge[] = [
  { id: 'e-sub', edge_id: 'LINE-SS-BUS', edge_type: 'OVERHEAD_33KV', name: 'Substation Incomer 33kV', from_node_id: 'SS-01', to_node_id: 'BUS-11', length_km: 0.2, max_current_a: 600, is_active: true },
  
  // Section lines (controlled by switches)
  { id: 'e-sw1', edge_id: 'LINE-BUS-N01', edge_type: 'OVERHEAD_11KV', name: 'Feeder Trunk 1', from_node_id: 'BUS-11', to_node_id: 'N-01', length_km: 1.2, max_current_a: 300, is_active: true },
  { id: 'e-tx1', edge_id: 'LINE-N01-TX1', edge_type: 'OVERHEAD_11KV', name: 'T1 Transformer Drop', from_node_id: 'N-01', to_node_id: 'TX-01', length_km: 0.1, max_current_a: 200, is_active: true },

  { id: 'e-sw2', edge_id: 'LINE-BUS-N02', edge_type: 'OVERHEAD_11KV', name: 'Feeder Trunk 2', from_node_id: 'BUS-11', to_node_id: 'N-02', length_km: 1.5, max_current_a: 300, is_active: true },
  { id: 'e-tx2', edge_id: 'LINE-N02-TX2', edge_type: 'OVERHEAD_11KV', name: 'T2 Transformer Drop', from_node_id: 'N-02', to_node_id: 'TX-02', length_km: 0.1, max_current_a: 200, is_active: true },

  { id: 'e-sw3', edge_id: 'LINE-BUS-N03', edge_type: 'OVERHEAD_11KV', name: 'Feeder Trunk 3', from_node_id: 'BUS-11', to_node_id: 'N-03', length_km: 0.9, max_current_a: 300, is_active: true },
  { id: 'e-tx3', edge_id: 'LINE-N03-TX3', edge_type: 'OVERHEAD_11KV', name: 'T3 Transformer Drop', from_node_id: 'N-03', to_node_id: 'TX-03', length_km: 0.1, max_current_a: 200, is_active: true },

  { id: 'e-sw4', edge_id: 'LINE-BUS-N04', edge_type: 'OVERHEAD_11KV', name: 'Feeder Trunk 4', from_node_id: 'BUS-11', to_node_id: 'N-04', length_km: 2.1, max_current_a: 300, is_active: true },
  { id: 'e-tx4', edge_id: 'LINE-N04-TX4', edge_type: 'OVERHEAD_11KV', name: 'T4 Transformer Drop', from_node_id: 'N-04', to_node_id: 'TX-04', length_km: 0.1, max_current_a: 200, is_active: true },

  { id: 'e-sw5', edge_id: 'LINE-BUS-N05', edge_type: 'OVERHEAD_11KV', name: 'Feeder Trunk 5', from_node_id: 'BUS-11', to_node_id: 'N-05', length_km: 1.8, max_current_a: 300, is_active: true },
  { id: 'e-tx5', edge_id: 'LINE-N05-TX5', edge_type: 'OVERHEAD_11KV', name: 'T5 Transformer Drop', from_node_id: 'N-05', to_node_id: 'TX-05', length_km: 0.1, max_current_a: 200, is_active: true },
];

const INITIAL_SWITCHES: GridSwitch[] = [
  { id: 'sw-1', switch_id: 'SW-T1', name: 'T1 Section Recloser (Residential)', controlled_edge_id: 'LINE-BUS-N01', state: 'CLOSED', section_id: 'T1', description: 'Controls Section 1 (Residential Quarter)', gpio_pin: 13, hardware_ack: true, last_operated: 'Just now' },
  { id: 'sw-2', switch_id: 'SW-T2', name: 'T2 Section Recloser (Commercial)', controlled_edge_id: 'LINE-BUS-N02', state: 'CLOSED', section_id: 'T2', description: 'Controls Section 2 (Commerce Plaza)', gpio_pin: 14, hardware_ack: true, last_operated: 'Just now' },
  { id: 'sw-3', switch_id: 'SW-T3', name: 'T3 Section Recloser (Critical/Hospital)', controlled_edge_id: 'LINE-BUS-N03', state: 'CLOSED', section_id: 'T3', description: 'Controls Section 3 (Metropolitan Hospital)', gpio_pin: 25, hardware_ack: true, last_operated: 'Just now' },
  { id: 'sw-4', switch_id: 'SW-T4', name: 'T4 Section Recloser (Industrial)', controlled_edge_id: 'LINE-BUS-N04', state: 'CLOSED', section_id: 'T4', description: 'Controls Section 4 (Industrial Complex)', gpio_pin: 26, hardware_ack: true, last_operated: 'Just now' },
  { id: 'sw-5', switch_id: 'SW-T5', name: 'T5 Section Recloser (Renewable Microgrid)', controlled_edge_id: 'LINE-BUS-N05', state: 'CLOSED', section_id: 'T5', description: 'Controls Section 5 (Solar & EV Station)', gpio_pin: 27, hardware_ack: true, last_operated: 'Just now' },
];

const INITIAL_LOADS: GridLoad[] = [
  { id: 'ld-1', load_id: 'LOAD-T1', name: 'Maple Crest Residential Area', connected_node_id: 'TX-01', demand_kw: 345.5, power_factor: 0.96, is_connected: true, is_energized: true, section_id: 'T1', category: 'residential' },
  { id: 'ld-2', load_id: 'LOAD-T2', name: 'Central Commerce & Mall', connected_node_id: 'TX-02', demand_kw: 520.0, power_factor: 0.92, is_connected: true, is_energized: true, section_id: 'T2', category: 'commercial' },
  { id: 'ld-3', load_id: 'LOAD-T3', name: 'City Hospital & Trauma Center', connected_node_id: 'TX-03', demand_kw: 412.8, power_factor: 0.98, is_connected: true, is_energized: true, section_id: 'T3', category: 'critical' },
  { id: 'ld-4', load_id: 'LOAD-T4', name: 'Titan Precision Manufacturing', connected_node_id: 'TX-04', demand_kw: 685.0, power_factor: 0.88, is_connected: true, is_energized: true, section_id: 'T4', category: 'industrial' },
  { id: 'ld-5', load_id: 'LOAD-T5', name: 'Helios Solar Farm & EV Depot', connected_node_id: 'TX-05', demand_kw: 210.4, power_factor: 0.99, is_connected: true, is_energized: true, section_id: 'T5', category: 'renewable' },
];

function calculateConnectivity(
  switches: GridSwitch[],
  bypassState: SwitchState = 'OPEN',
  isolatedInput: ('T1' | 'T2' | 'T3' | 'T4' | 'T5')[] | ('T1' | 'T2' | 'T3' | 'T4' | 'T5') | null = []
): ConnectivityResult {
  const switchMap = switches.reduce((acc, s) => ({ ...acc, [s.switch_id]: s.state }), {} as Record<string, SwitchState>);
  const isoList: string[] = Array.isArray(isolatedInput)
    ? isolatedInput
    : isolatedInput ? [isolatedInput] : [];

  const isBypassActive = bypassState === 'CLOSED';

  // Section nodes & loads mapping
  const sectionMapping: Record<string, { nodes: string[]; load: string; kw: number }> = {
    'SW-T1': { nodes: ['N-01', 'TX-01'], load: 'LOAD-T1', kw: 345.5 },
    'SW-T2': { nodes: ['N-02', 'TX-02'], load: 'LOAD-T2', kw: 520.0 },
    'SW-T3': { nodes: ['N-03', 'TX-03'], load: 'LOAD-T3', kw: 412.8 },
    'SW-T4': { nodes: ['N-04', 'TX-04'], load: 'LOAD-T4', kw: 685.0 },
    'SW-T5': { nodes: ['N-05', 'TX-05'], load: 'LOAD-T5', kw: 210.4 },
  };

  const energizedNodes = ['SS-01', 'BUS-11'];
  const deEnergizedNodes: string[] = [];
  const energizedLoads: string[] = [];
  const deEnergizedLoads: string[] = [];
  let servedDemand = 0;
  let unservedDemand = 0;
  const totalDemand = 2173.7;

  // 1. Transmission Corridor Reachability:
  // Source is at Substation -> T1 -> T2 -> T3 -> T4 -> T5.
  // When a tower is isolated, it is disconnected from the main route (zero current).
  // Power travels along unbroken main line spans from the source:
  const isT1Isolated = isoList.includes('T1');
  const isT2Isolated = isoList.includes('T2');
  const isT3Isolated = isoList.includes('T3');
  const isT4Isolated = isoList.includes('T4');
  const isT5Isolated = isoList.includes('T5');

  const mainReachT1 = !isT1Isolated;
  const mainReachT2 = mainReachT1 && !isT2Isolated;
  const mainReachT3 = mainReachT2 && !isT3Isolated;
  const mainReachT4 = mainReachT3 && !isT4Isolated;
  const mainReachT5 = mainReachT4 && !isT5Isolated;

  // 2. Tower Energization:
  // - An isolated tower NEVER receives current (0 A, completely isolated).
  // - Non-isolated towers are energized if:
  //   (a) Reached via the unbroken main transmission line, OR
  //   (b) The Alternate Bypass Route is ACTIVE (Bypass is ON / CLOSED).
  const isTower1Energized = !isT1Isolated && (mainReachT1 || isBypassActive);
  const isTower2Energized = !isT2Isolated && (mainReachT2 || isBypassActive);
  const isTower3Energized = !isT3Isolated && (mainReachT3 || isBypassActive);
  const isTower4Energized = !isT4Isolated && (mainReachT4 || isBypassActive);
  const isTower5Energized = !isT5Isolated && (mainReachT5 || isBypassActive);

  // 3. Local Consumer Load Feeder Energization:
  // Each load is energized IF its local tower is energized AND its feeder switchgear is CLOSED
  const isLoad1Energized = isTower1Energized && switchMap['SW-T1'] === 'CLOSED';
  const isLoad2Energized = isTower2Energized && switchMap['SW-T2'] === 'CLOSED';
  const isLoad3Energized = isTower3Energized && switchMap['SW-T3'] === 'CLOSED';
  const isLoad4Energized = isTower4Energized && switchMap['SW-T4'] === 'CLOSED';
  const isLoad5Energized = isTower5Energized && switchMap['SW-T5'] === 'CLOSED';

  const loadStatus: Record<string, boolean> = {
    'SW-T1': isLoad1Energized,
    'SW-T2': isLoad2Energized,
    'SW-T3': isLoad3Energized,
    'SW-T4': isLoad4Energized,
    'SW-T5': isLoad5Energized,
  };

  Object.entries(sectionMapping).forEach(([swId, section]) => {
    const isEnergized = loadStatus[swId];
    if (isEnergized) {
      energizedNodes.push(...section.nodes);
      energizedLoads.push(section.load);
      servedDemand += section.kw;
    } else {
      deEnergizedNodes.push(...section.nodes);
      deEnergizedLoads.push(section.load);
      unservedDemand += section.kw;
    }
  });

  return {
    energized_nodes: energizedNodes,
    de_energized_nodes: deEnergizedNodes,
    energized_loads: energizedLoads,
    de_energized_loads: deEnergizedLoads,
    switch_states: switchMap,
    paths: {
      'T1': isLoad1Energized ? (isBypassActive ? ['SS-01', 'BYPASS-BUS', 'BP-T1', 'N-01', 'TX-01', 'LOAD-T1'] : ['SS-01', 'BUS-11', 'N-01', 'TX-01', 'LOAD-T1']) : [],
      'T2': isLoad2Energized ? (isBypassActive && !mainReachT2 ? ['SS-01', 'BYPASS-BUS', 'BP-T2', 'N-02', 'TX-02', 'LOAD-T2'] : ['SS-01', 'BUS-11', 'N-02', 'TX-02', 'LOAD-T2']) : [],
      'T3': isLoad3Energized ? (isBypassActive && !mainReachT3 ? ['SS-01', 'BYPASS-BUS', 'BP-T3', 'N-03', 'TX-03', 'LOAD-T3'] : ['SS-01', 'BUS-11', 'N-03', 'TX-03', 'LOAD-T3']) : [],
      'T4': isLoad4Energized ? (isBypassActive && !mainReachT4 ? ['SS-01', 'BYPASS-BUS', 'BP-T4', 'N-04', 'TX-04', 'LOAD-T4'] : ['SS-01', 'BUS-11', 'N-04', 'TX-04', 'LOAD-T4']) : [],
      'T5': isLoad5Energized ? (isBypassActive && !mainReachT5 ? ['SS-01', 'BYPASS-BUS', 'BP-T5', 'N-05', 'TX-05', 'LOAD-T5'] : ['SS-01', 'BUS-11', 'N-05', 'TX-05', 'LOAD-T5']) : [],
    },
    total_demand_kw: totalDemand,
    served_demand_kw: Math.round(servedDemand * 10) / 10,
    unserved_demand_kw: Math.round(unservedDemand * 10) / 10,
  };
}

export const useGridStore = create<GridState>((set, get) => ({
  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,
  switches: INITIAL_SWITCHES,
  loads: INITIAL_LOADS,
  connectivity: calculateConnectivity(INITIAL_SWITCHES),

  hardwareDevice: {
    device_id: 'esp32-gridtwin-001',
    name: 'GRIDTWIN ESP32 Controller',
    status: 'OFFLINE',
    is_registered: true,
    is_enabled: true,
    last_seen_at: undefined,
    last_heartbeat_at: undefined,
    roundtrip_latency_ms: 0,
    firmware_version: '2.0.0-hackathon',
    output_states: {
      'T1': 'UNKNOWN',
      'T2': 'UNKNOWN',
      'T3': 'UNKNOWN',
      'T4': 'UNKNOWN',
      'T5': 'UNKNOWN',
    },
    relay_pins: {
      'T1': 13,
      'T2': 14,
      'T3': 25,
      'T4': 26,
      'T5': 27,
      'RELAY_6': 32
    }
  },
  hardwareMode: 'PHYSICAL',
  pendingTowers: {},
  ina219Telemetry: {
    bus_voltage_v: 0.0,
    shunt_voltage_mv: 0.0,
    current_ma: 0.0,
    power_mw: 0.0,
    sensor_status: 'DISCONNECTED',
  },
  physicalSyncEnabled: true,
  isBackendConnected: false,
  mqttConnected: false,

  metricsHistory: Array.from({ length: 20 }).map((_, i) => ({
    timestamp: new Date(Date.now() - (20 - i) * 2000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    voltage_v: 11024,
    current_a: 114.2,
    active_power_kw: 2173.7,
    reactive_power_kvar: 428.1,
    power_factor: 0.945,
    frequency_hz: 50.01,
  })),

  currentMetric: {
    timestamp: new Date().toLocaleTimeString(),
    voltage_v: 11024,
    current_a: 114.2,
    active_power_kw: 2173.7,
    reactive_power_kvar: 428.1,
    power_factor: 0.945,
    frequency_hz: 50.01,
  },

  activeTab: 'dashboard',
  isMobileNavOpen: false,
  setMobileNavOpen: (open: boolean) => set({ isMobileNavOpen: open }),
  toggleMobileNav: () => set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen })),
  selectedElement: null,
  cameraPreset: 'overview',
  isNightMode: true,
  showPowerFlow: true,
  showLabels: true,
  autoSimulation: true,

  bypassSwitchState: 'OPEN' as SwitchState,
  isolatedTowerId: null as 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | null,
  isolatedTowers: [] as ('T1' | 'T2' | 'T3' | 'T4' | 'T5')[],
  isT3Isolated: false,

  alerts: [
    {
      id: 'alt-01',
      timestamp: new Date().toLocaleTimeString(),
      severity: 'INFO',
      source: 'SIMULATION_ENGINE',
      message: 'Grid operating within nominal parameters: 11.02 kV, 50.01 Hz.',
      is_active: true
    }
  ],

  eventLogs: [
    { id: 'evt-01', timestamp: new Date().toLocaleTimeString(), event: 'Digital Twin Model initialized with 5 distribution sections and Alternate Bypass Route.', type: 'SYSTEM' },
    { id: 'evt-02', timestamp: new Date().toLocaleTimeString(), event: 'Physical ESP32 hardware handshake verified on broker: gridtwin/hardware/#.', type: 'MQTT' },
  ],

  toggleBypassSwitch: () => {
    const currentState = get().bypassSwitchState;
    const nextState: SwitchState = currentState === 'CLOSED' ? 'OPEN' : 'CLOSED';
    const { switches, isolatedTowers = [] } = get();

    // Preserve the user's isolated towers — NEVER automatically isolate T3!
    const targetIsoList = [...isolatedTowers];

    const connectivity = calculateConnectivity(switches, nextState, targetIsoList);
    const updatedNodes = get().nodes.map(n => ({
      ...n,
      is_energized: connectivity.energized_nodes.includes(n.node_id)
    }));
    const updatedLoads = get().loads.map(l => ({
      ...l,
      is_energized: connectivity.energized_loads.includes(l.load_id)
    }));
    const newKw = connectivity.served_demand_kw;
    const newMetric: SimulationMetric = {
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      voltage_v: Math.round(11000 + (2200 - newKw) * 0.05),
      current_a: Math.round((newKw / (Math.sqrt(3) * 11 * 0.945)) * 10) / 10,
      active_power_kw: newKw,
      reactive_power_kvar: Math.round(newKw * 0.28 * 10) / 10,
      power_factor: 0.945,
      frequency_hz: 50.0 + (newKw > 1500 ? 0.01 : (newKw === 0 ? -0.1 : -0.02))
    };

    const newAlerts = [...get().alerts];
    if (nextState === 'CLOSED') {
      if (targetIsoList.length > 0) {
        newAlerts.unshift({
          id: `alt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'INFO',
          source: 'BYPASS_CONTROLLER',
          message: `Bypass ON: Alternate bypass route active! Power safely routed around isolated Tower(s) [${targetIsoList.join(', ')}] to remaining towers (${newKw} kW served).`,
          is_active: true
        });
      } else {
        newAlerts.unshift({
          id: `alt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'INFO',
          source: 'BYPASS_CONTROLLER',
          message: `Bypass ON: Alternate bypass bus energized in parallel (standby ready). All 5 towers energized (${newKw} kW served).`,
          is_active: true
        });
      }
    } else {
      if (targetIsoList.length > 0) {
        newAlerts.unshift({
          id: `alt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'WARNING',
          source: 'PROTECTION_RELAY',
          message: `Bypass OFF: Alternate route opened while Tower(s) [${targetIsoList.join(', ')}] are isolated! Downstream towers have lost power (${newKw} kW served).`,
          is_active: true
        });
      } else {
        newAlerts.unshift({
          id: `alt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'INFO',
          source: 'SYSTEM_OPERATOR',
          message: `Bypass OFF: Normal transmission connection active on main line (2173.7 kW served). Bypass bus in standby.`,
          is_active: true
        });
      }
    }

    set({
      bypassSwitchState: nextState,
      isolatedTowers: targetIsoList,
      isolatedTowerId: targetIsoList[0] || null,
      isT3Isolated: targetIsoList.includes('T3'),
      connectivity,
      nodes: updatedNodes,
      loads: updatedLoads,
      currentMetric: newMetric,
      metricsHistory: [...get().metricsHistory.slice(1), newMetric],
      alerts: newAlerts.slice(0, 20),
      eventLogs: [
        {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          event: nextState === 'CLOSED'
            ? `Bypass Switch CLOSED (ON): Alternate route active.${targetIsoList.length > 0 ? ` Bypassing [${targetIsoList.join(', ')}].` : ''}`
            : `Bypass Switch OPEN (OFF): Normal line route active.`,
          type: 'SWITCH_OP'
        },
        ...get().eventLogs
      ]
    });
  },

  // Update local Zustand store and electrical state ONLY (Zero network calls, safe for WS updates)
  applyIsolationLocally: (nextList: ('T1' | 'T2' | 'T3' | 'T4' | 'T5')[]) => {
    const swIdMap: Record<string, string> = {
      'T1': 'SW-T1',
      'T2': 'SW-T2',
      'T3': 'SW-T3',
      'T4': 'SW-T4',
      'T5': 'SW-T5',
    };

    const { switches, bypassSwitchState } = get();
    // For every tower: if in nextList, switch is OPEN (isolated); otherwise switch is CLOSED (energized)
    const updatedSwitches = switches.map(s => {
      const isThisIsolated = Object.entries(swIdMap).some(
        ([tId, swId]) => nextList.includes(tId as any) && swId === s.switch_id
      );
      return {
        ...s,
        state: isThisIsolated ? ('OPEN' as SwitchState) : ('CLOSED' as SwitchState),
        last_operated: isThisIsolated ? 'Isolated (Breaker Open)' : 'Live Transmission'
      };
    });

    const connectivity = calculateConnectivity(updatedSwitches, bypassSwitchState, nextList);
    const updatedNodes = get().nodes.map(n => ({
      ...n,
      is_energized: connectivity.energized_nodes.includes(n.node_id)
    }));
    const updatedLoads = get().loads.map(l => ({
      ...l,
      is_energized: connectivity.energized_loads.includes(l.load_id)
    }));
    const newKw = connectivity.served_demand_kw;
    const newMetric: SimulationMetric = {
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      voltage_v: Math.round(11000 + (2200 - newKw) * 0.05),
      current_a: Math.round((newKw / (Math.sqrt(3) * 11 * 0.945)) * 10) / 10,
      active_power_kw: newKw,
      reactive_power_kvar: Math.round(newKw * 0.28 * 10) / 10,
      power_factor: 0.945,
      frequency_hz: 50.0 + (newKw > 1500 ? 0.01 : -0.02)
    };

    const updatedOutputs: Record<string, 'ON' | 'OFF'> = {
      'T1': nextList.includes('T1') ? 'OFF' : 'ON',
      'T2': nextList.includes('T2') ? 'OFF' : 'ON',
      'T3': nextList.includes('T3') ? 'OFF' : 'ON',
      'T4': nextList.includes('T4') ? 'OFF' : 'ON',
      'T5': nextList.includes('T5') ? 'OFF' : 'ON',
    };

    set({
      isolatedTowers: nextList,
      isolatedTowerId: nextList[0] || null,
      isT3Isolated: nextList.includes('T3'),
      switches: updatedSwitches,
      connectivity,
      nodes: updatedNodes,
      loads: updatedLoads,
      currentMetric: newMetric,
      metricsHistory: [...get().metricsHistory.slice(1), newMetric],
      hardwareDevice: {
        ...get().hardwareDevice,
        output_states: updatedOutputs
      },
      alerts: nextList.length > 0 ? [
        {
          id: `alt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'WARNING',
          source: 'ISOLATION_CONTROLLER',
          message: `Tower Isolation: [${nextList.join(', ')}] Isolated. In and Out power flow blocked (0 A).`,
          is_active: true
        },
        ...get().alerts
      ] : get().alerts,
      eventLogs: [
        {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          event: nextList.length > 0
            ? `Towers [${nextList.join(', ')}] isolated. Current flow blocked in and out.`
            : `All towers normalized / energized.`,
          type: 'SCENARIO'
        },
        ...get().eventLogs
      ]
    });
  },

  // Apply Virtual Isolation List & Sync to Network Endpoints (Called ONLY from user-initiated actions)
  _applyIsolationState: (nextList: ('T1' | 'T2' | 'T3' | 'T4' | 'T5')[]) => {
    get().applyIsolationLocally(nextList);

    // 2-Way Simultaneous Sync to Toll-Free Hotline & Backend
    const syncPayload = JSON.stringify({ isolated_towers: nextList });
    fetch(`${API_BASE}/api/v1/hardware/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: syncPayload,
    }).catch(() => {});
    fetch(`${TOLLFREE_BASE}/api/towers/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: syncPayload,
    }).catch(() => {});
  },

  turnTowerOn: (towerId: 'T1' | 'T2' | 'T3' | 'T4' | 'T5') => {
    const { isolatedTowers = [], isolatedTowerId } = get();
    const curList = isolatedTowers.length > 0 ? isolatedTowers : (isolatedTowerId ? [isolatedTowerId] : []);
    const nextList = curList.filter(id => id !== towerId);

    // Clear pending state immediately so user action takes precedence
    set(state => {
      const nextPending = { ...state.pendingTowers };
      delete nextPending[towerId];
      return { pendingTowers: nextPending };
    });

    // 1. Immediately apply locally to guarantee zero latency & prevent reverting
    get().applyIsolationLocally(nextList);

    // 2. Dispatch dedicated RESTORE command to physical ESP32
    get().sendHardwareRestoreCommand(towerId);

    // 3. Dispatch batch sync to backend & toll-free
    const syncPayload = JSON.stringify({ isolated_towers: nextList });
    fetch(`${API_BASE}/api/v1/hardware/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: syncPayload,
    }).catch(() => {});
    fetch(`${TOLLFREE_BASE}/api/towers/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: syncPayload,
    }).catch(() => {});
  },

  turnTowerOff: (towerId: 'T1' | 'T2' | 'T3' | 'T4' | 'T5') => {
    const { isolatedTowers = [], isolatedTowerId } = get();
    const curList = isolatedTowers.length > 0 ? isolatedTowers : (isolatedTowerId ? [isolatedTowerId] : []);
    const nextList = curList.includes(towerId) ? curList : [...curList, towerId];

    // 1. Immediately apply locally to guarantee zero latency & prevent reverting
    get().applyIsolationLocally(nextList);

    // 2. Dispatch dedicated ISOLATE command to physical ESP32
    get().sendHardwareIsolateCommand(towerId);

    // 3. Dispatch batch sync to backend & toll-free
    const syncPayload = JSON.stringify({ isolated_towers: nextList });
    fetch(`${API_BASE}/api/v1/hardware/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: syncPayload,
    }).catch(() => {});
    fetch(`${TOLLFREE_BASE}/api/towers/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: syncPayload,
    }).catch(() => {});
  },

  turnAllTowersOn: () => {
    get().sendHardwareSetAllCommand('ON');
    get().restoreNormalOperation();
  },

  turnAllTowersOff: () => {
    get().sendHardwareSetAllCommand('OFF');
    (get() as any)._applyIsolationState(['T1', 'T2', 'T3', 'T4', 'T5']);
  },

  isolateTower: (towerId: 'T1' | 'T2' | 'T3' | 'T4' | 'T5') => {
    const { isolatedTowers = [], isolatedTowerId } = get();
    const curList = isolatedTowers.length > 0 ? isolatedTowers : (isolatedTowerId ? [isolatedTowerId] : []);
    const isAlreadyIsolated = curList.includes(towerId);

    if (isAlreadyIsolated) {
      get().turnTowerOn(towerId);
    } else {
      get().turnTowerOff(towerId);
    }
  },

  isolateT3WithBypass: () => {
    get().isolateTower('T3');
  },

  toggleHardwareLogic: async (action: 'INVERT' | 'ACTIVE_HIGH' | 'ACTIVE_LOW' = 'INVERT') => {
    try {
      await fetch(`${API_BASE}/api/v1/hardware/logic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      get().addAlert({
        severity: 'INFO',
        source: 'HARDWARE_CONFIG',
        message: `Dispatched logic command '${action}' to ESP32 prototype.`,
        is_active: true,
      });
    } catch (e: any) {
      console.warn('Logic toggle failed:', e);
    }
  },

  restoreNormalOperation: () => {
    const { hardwareMode, hardwareDevice } = get();
    // Dispatch to physical hardware whenever online or in PHYSICAL mode
    if (hardwareDevice.status === 'ONLINE' || hardwareMode === 'PHYSICAL') {
      get().sendHardwareSetAllCommand('ON');
    }

    const { switches } = get();
    const updatedSwitches = switches.map(s => ({ ...s, state: 'CLOSED' as SwitchState, last_operated: 'Normal Restored' }));
    const connectivity = calculateConnectivity(updatedSwitches, 'OPEN', []);
    const updatedNodes = get().nodes.map(n => ({
      ...n,
      is_energized: connectivity.energized_nodes.includes(n.node_id)
    }));
    const updatedLoads = get().loads.map(l => ({
      ...l,
      is_energized: connectivity.energized_loads.includes(l.load_id)
    }));
    const newKw = connectivity.served_demand_kw;
    const newMetric: SimulationMetric = {
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      voltage_v: Math.round(11000 + (2200 - newKw) * 0.05),
      current_a: Math.round((newKw / (Math.sqrt(3) * 11 * 0.945)) * 10) / 10,
      active_power_kw: newKw,
      reactive_power_kvar: Math.round(newKw * 0.28 * 10) / 10,
      power_factor: 0.945,
      frequency_hz: 50.01
    };

    set({
      isolatedTowers: [],
      isolatedTowerId: null,
      isT3Isolated: false,
      bypassSwitchState: 'OPEN',
      switches: updatedSwitches,
      connectivity,
      nodes: updatedNodes,
      loads: updatedLoads,
      currentMetric: newMetric,
      metricsHistory: [...get().metricsHistory.slice(1), newMetric],
      hardwareDevice: {
        ...get().hardwareDevice,
        output_states: {
          'T1': 'ON',
          'T2': 'ON',
          'T3': 'ON',
          'T4': 'ON',
          'T5': 'ON',
        }
      },
      alerts: [
        {
          id: `alt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'INFO',
          source: 'SYSTEM_OPERATOR',
          message: 'Normal connection restored: All 5 towers energized via main transmission line. Bypass bus in STANDBY (2173.7 kW served).',
          is_active: true
        },
        ...get().alerts
      ],
      eventLogs: [
        {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          event: 'Normal operation restored: All 5 towers energized via main route. Bypass standby.',
          type: 'SCENARIO'
        },
        ...get().eventLogs
      ]
    });
  },

  toggleSwitch: async (switchId: string, _bypassInterlock = false) => {
    const sw = get().switches.find(s => s.switch_id === switchId);
    if (!sw) return;
    const newState: SwitchState = sw.state === 'CLOSED' ? 'OPEN' : 'CLOSED';
    await get().setSwitchState(switchId, newState);
  },

  setSwitchState: async (switchId: string, state: SwitchState) => {
    const swSectionMap: Record<string, 'T1' | 'T2' | 'T3' | 'T4' | 'T5'> = {
      'SW-T1': 'T1',
      'SW-T2': 'T2',
      'SW-T3': 'T3',
      'SW-T4': 'T4',
      'SW-T5': 'T5',
    };
    const affectedSection = swSectionMap[switchId];

    if (affectedSection) {
      if (state === 'OPEN') {
        get().turnTowerOff(affectedSection);
      } else {
        get().turnTowerOn(affectedSection);
      }
    } else {
      // General switch without dedicated tower (e.g. bypass)
      const { switches, nodes, loads, bypassSwitchState } = get();
      const updatedSwitches = switches.map(s => s.switch_id === switchId ? { ...s, state, last_operated: new Date().toLocaleTimeString() } : s);
      const connectivity = calculateConnectivity(updatedSwitches, bypassSwitchState, get().isolatedTowers);
      set({
        switches: updatedSwitches,
        connectivity,
        nodes: nodes.map(n => ({ ...n, is_energized: connectivity.energized_nodes.includes(n.node_id) })),
        loads: loads.map(l => ({ ...l, is_energized: connectivity.energized_loads.includes(l.load_id) })),
      });
      fetch(`${API_BASE}/api/switches/${switchId}/operate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_state: state })
      }).catch(() => {});
    }
  },

  setSelectedElement: (element) => set({ selectedElement: element }),

  setCameraPreset: (preset) => set({ cameraPreset: preset }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setPhysicalSync: (enabled) => set({ physicalSyncEnabled: enabled }),

  recomputeConnectivity: () => {
    const connectivity = calculateConnectivity(get().switches, get().bypassSwitchState, get().isolatedTowers);
    const updatedNodes = get().nodes.map(n => ({
      ...n,
      is_energized: connectivity.energized_nodes.includes(n.node_id)
    }));
    const updatedLoads = get().loads.map(l => ({
      ...l,
      is_energized: connectivity.energized_loads.includes(l.load_id)
    }));
    const newKw = connectivity.served_demand_kw;
    const newMetric: SimulationMetric = {
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      voltage_v: Math.round(11000 + (2200 - newKw) * 0.05),
      current_a: Math.round((newKw / (Math.sqrt(3) * 11 * 0.945)) * 10) / 10,
      active_power_kw: newKw,
      reactive_power_kvar: Math.round(newKw * 0.28 * 10) / 10,
      power_factor: 0.945,
      frequency_hz: 50.0 + (newKw > 1500 ? 0.01 : -0.02)
    };
    set({
      connectivity,
      nodes: updatedNodes,
      loads: updatedLoads,
      currentMetric: newMetric,
      metricsHistory: [...get().metricsHistory.slice(1), newMetric]
    });
  },

  triggerScenario: (scenarioId: string) => {
    const { switches } = get();
    let targetStates: Record<string, SwitchState> = {
      'SW-T1': 'CLOSED',
      'SW-T2': 'CLOSED',
      'SW-T3': 'CLOSED',
      'SW-T4': 'CLOSED',
      'SW-T5': 'CLOSED',
    };

    let targetBypassState: SwitchState = 'OPEN';
    let targetIsolatedTowers: ('T1' | 'T2' | 'T3' | 'T4' | 'T5')[] = [];
    let scenarioName = '';

    if (scenarioId === 'nominal') {
      scenarioName = 'Nominal Full Supply';
      targetStates = { 'SW-T1': 'CLOSED', 'SW-T2': 'CLOSED', 'SW-T3': 'CLOSED', 'SW-T4': 'CLOSED', 'SW-T5': 'CLOSED' };
      targetBypassState = 'OPEN';
      targetIsolatedTowers = [];
    } else if (scenarioId === 't1_isolated_bypass') {
      scenarioName = 'Tower 1 Fault Isolation & Bypass';
      targetStates = { 'SW-T1': 'OPEN', 'SW-T2': 'CLOSED', 'SW-T3': 'CLOSED', 'SW-T4': 'CLOSED', 'SW-T5': 'CLOSED' };
      targetBypassState = 'CLOSED';
      targetIsolatedTowers = ['T1'];
    } else if (scenarioId === 't2_isolated_bypass') {
      scenarioName = 'Tower 2 Fault Isolation & Bypass';
      targetStates = { 'SW-T1': 'CLOSED', 'SW-T2': 'OPEN', 'SW-T3': 'CLOSED', 'SW-T4': 'CLOSED', 'SW-T5': 'CLOSED' };
      targetBypassState = 'CLOSED';
      targetIsolatedTowers = ['T2'];
    } else if (scenarioId === 't3_isolated_bypass') {
      scenarioName = 'Tower 3 Fault Isolation & Alternate Route Bypass';
      targetStates = { 'SW-T1': 'CLOSED', 'SW-T2': 'CLOSED', 'SW-T3': 'OPEN', 'SW-T4': 'CLOSED', 'SW-T5': 'CLOSED' };
      targetBypassState = 'CLOSED';
      targetIsolatedTowers = ['T3'];
    } else if (scenarioId === 't4_isolated_bypass') {
      scenarioName = 'Tower 4 Fault Isolation & Bypass';
      targetStates = { 'SW-T1': 'CLOSED', 'SW-T2': 'CLOSED', 'SW-T3': 'CLOSED', 'SW-T4': 'OPEN', 'SW-T5': 'CLOSED' };
      targetBypassState = 'CLOSED';
      targetIsolatedTowers = ['T4'];
    } else if (scenarioId === 't5_isolated_bypass') {
      scenarioName = 'Tower 5 Fault Isolation & Bypass';
      targetStates = { 'SW-T1': 'CLOSED', 'SW-T2': 'CLOSED', 'SW-T3': 'CLOSED', 'SW-T4': 'CLOSED', 'SW-T5': 'OPEN' };
      targetBypassState = 'CLOSED';
      targetIsolatedTowers = ['T5'];
    } else if (scenarioId === 'fault_feeder2') {
      scenarioName = 'Section 2 Commercial Feeder Ground Fault';
      targetStates = { 'SW-T1': 'CLOSED', 'SW-T2': 'OPEN', 'SW-T3': 'CLOSED', 'SW-T4': 'CLOSED', 'SW-T5': 'CLOSED' };
      targetBypassState = 'CLOSED';
      targetIsolatedTowers = ['T2'];
    } else if (scenarioId === 'industrial_maintenance') {
      scenarioName = 'Scheduled Maintenance Section 4';
      targetStates = { 'SW-T1': 'CLOSED', 'SW-T2': 'CLOSED', 'SW-T3': 'CLOSED', 'SW-T4': 'OPEN', 'SW-T5': 'CLOSED' };
      targetBypassState = 'CLOSED';
      targetIsolatedTowers = ['T4'];
    } else if (scenarioId === 'island_hospital') {
      scenarioName = 'Priority Health Preservation (Sections 1, 2 & 4 shed)';
      targetStates = { 'SW-T1': 'OPEN', 'SW-T2': 'OPEN', 'SW-T3': 'CLOSED', 'SW-T4': 'OPEN', 'SW-T5': 'CLOSED' };
      targetBypassState = 'CLOSED';
      targetIsolatedTowers = ['T1', 'T2', 'T4'];
    } else if (scenarioId === 'blackout') {
      scenarioName = 'Complete Blackout & Islanding';
      targetStates = { 'SW-T1': 'OPEN', 'SW-T2': 'OPEN', 'SW-T3': 'OPEN', 'SW-T4': 'OPEN', 'SW-T5': 'OPEN' };
      targetBypassState = 'OPEN';
      targetIsolatedTowers = ['T1', 'T2', 'T3', 'T4', 'T5'];
    }

    const updatedSwitches = switches.map(s => ({
      ...s,
      state: targetStates[s.switch_id] || 'CLOSED',
      last_operated: 'Scenario: ' + scenarioName
    }));

    const connectivity = calculateConnectivity(updatedSwitches, targetBypassState, targetIsolatedTowers);

    const updatedNodes = get().nodes.map(n => ({
      ...n,
      is_energized: connectivity.energized_nodes.includes(n.node_id)
    }));

    const updatedLoads = get().loads.map(l => ({
      ...l,
      is_energized: connectivity.energized_loads.includes(l.load_id)
    }));

    const updatedHardware: HardwareDevice = {
      ...get().hardwareDevice,
      output_states: {
        'T1': targetStates['SW-T1'] === 'CLOSED' ? 'ON' : 'OFF',
        'T2': targetStates['SW-T2'] === 'CLOSED' ? 'ON' : 'OFF',
        'T3': targetStates['SW-T3'] === 'CLOSED' ? 'ON' : 'OFF',
        'T4': targetStates['SW-T4'] === 'CLOSED' ? 'ON' : 'OFF',
        'T5': targetStates['SW-T5'] === 'CLOSED' ? 'ON' : 'OFF',
      }
    };

    const newKw = connectivity.served_demand_kw;
    const newMetric: SimulationMetric = {
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      voltage_v: Math.round(11000 + (2200 - newKw) * 0.05),
      current_a: Math.round((newKw / (Math.sqrt(3) * 11 * 0.94)) * 10) / 10,
      active_power_kw: newKw,
      reactive_power_kvar: Math.round(newKw * 0.28 * 10) / 10,
      power_factor: 0.945,
      frequency_hz: 50.0 + (newKw > 1500 ? 0.01 : -0.02)
    };

    set({
      switches: updatedSwitches,
      bypassSwitchState: targetBypassState,
      isolatedTowers: targetIsolatedTowers,
      isolatedTowerId: targetIsolatedTowers[0] || null,
      isT3Isolated: targetIsolatedTowers.includes('T3'),
      nodes: updatedNodes,
      loads: updatedLoads,
      connectivity,
      hardwareDevice: updatedHardware,
      currentMetric: newMetric,
      metricsHistory: [...get().metricsHistory.slice(1), newMetric],
      eventLogs: [
        {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          event: `Simulation Scenario executed: [${scenarioName}]. Demand: ${newKw} kW served.`,
          type: 'SCENARIO'
        },
        ...get().eventLogs
      ]
    });
  },

  addAlert: (alert) => {
    const newAlert: GridAlert = {
      ...alert,
      id: `alt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString()
    };
    set({ alerts: [newAlert, ...get().alerts.slice(0, 19)] });
  },

  clearAlerts: () => set({ alerts: [] }),

  toggleNightMode: () => set(state => ({ isNightMode: !state.isNightMode })),
  togglePowerFlow: () => set(state => ({ showPowerFlow: !state.showPowerFlow })),
  toggleLabels: () => set(state => ({ showLabels: !state.showLabels })),

  setHardwareMode: (mode: HardwareMode) => {
    set({ hardwareMode: mode });
    get().addAlert({
      severity: 'INFO',
      source: 'OPERATOR_CONSOLE',
      message: mode === 'PHYSICAL'
        ? 'Switched to PHYSICAL HARDWARE Mode: Real ESP32 relays and INA219 sensor active.'
        : 'Switched to SIMULATION LAB Mode: Virtual twin simulation running locally.',
      is_active: true
    });
  },

  sendHardwareTowerCommand: async (towerId, targetState) => {
    set(state => ({
      pendingTowers: { ...state.pendingTowers, [towerId]: true },
      eventLogs: [
        {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          event: `[MQTT OUT] Command sent: Tower ${towerId} -> ${targetState} (Awaiting ESP32 ACK)...`,
          type: 'MQTT'
        },
        ...state.eventLogs
      ]
    }));

    try {
      const res = await fetch(`${API_BASE}/api/v1/hardware/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: 'esp32-gridtwin-001',
          output_id: towerId,
          requested_state: targetState,
          action: targetState === 'OFF' ? 'ISOLATE' : 'RESTORE',
          timeout_seconds: 15
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'HTTP Command Failed' }));
        throw new Error(err.detail || 'Hardware command rejected');
      }

      const data = await res.json();
      get().addAlert({
        severity: 'INFO',
        source: 'HARDWARE_BRIDGE',
        message: `Command ${data.command_id?.slice(0, 8) || ''} dispatched to ESP32: Tower ${towerId} -> ${targetState}. Waiting for physical relay ACK...`,
        is_active: true
      });
    } catch (err: any) {
      set(state => {
        const next = { ...state.pendingTowers };
        delete next[towerId];
        return { pendingTowers: next };
      });
      get().addAlert({
        severity: 'CRITICAL',
        source: 'HARDWARE_BRIDGE',
        message: `Failed to switch Tower ${towerId}: ${err.message || 'Connection error'}. Physical state unchanged.`,
        is_active: true
      });
    }
  },

  sendHardwareIsolateCommand: async (towerId) => {
    // Notify Toll-Free IVR hotline service immediately
    fetch(`${TOLLFREE_BASE}/api/towers/${towerId}/isolate`, { method: 'POST' }).catch(() => {});

    set(state => ({
      pendingTowers: { ...state.pendingTowers, [towerId]: true },
      eventLogs: [
        {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          event: `[MQTT OUT] ISOLATE Tower ${towerId} sent to ESP32 (Awaiting Relay ACK)...`,
          type: 'MQTT'
        },
        ...state.eventLogs
      ]
    }));

    try {
      const res = await fetch(`${API_BASE}/api/v1/hardware/isolate/${towerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'HTTP Command Failed' }));
        throw new Error(err.detail || 'Hardware isolation rejected');
      }

      const data = await res.json();
      get().addAlert({
        severity: 'INFO',
        source: 'HARDWARE_BRIDGE',
        message: `Isolation command dispatched: Isolating Tower ${towerId} on physical relay. Waiting for ACK...`,
        is_active: true
      });
      setTimeout(() => {
        set(state => {
          if (state.pendingTowers[towerId]) {
            const next = { ...state.pendingTowers };
            delete next[towerId];
            return { pendingTowers: next };
          }
          return state;
        });
      }, 5000);
    } catch (err: any) {
      set(state => {
        const next = { ...state.pendingTowers };
        delete next[towerId];
        return { pendingTowers: next };
      });
      get().addAlert({
        severity: 'CRITICAL',
        source: 'HARDWARE_BRIDGE',
        message: `Failed to isolate Tower ${towerId}: ${err.message || 'Connection error'}. Physical state unchanged.`,
        is_active: true
      });
    }
  },

  sendHardwareRestoreCommand: async (towerId) => {
    // Notify Toll-Free IVR hotline service immediately
    fetch(`${TOLLFREE_BASE}/api/towers/${towerId}/restore`, { method: 'POST' }).catch(() => {});

    set(state => ({
      pendingTowers: { ...state.pendingTowers, [towerId]: true },
      eventLogs: [
        {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          event: `[MQTT OUT] RESTORE Tower ${towerId} sent to ESP32 (Awaiting Relay ACK)...`,
          type: 'MQTT'
        },
        ...state.eventLogs
      ]
    }));

    try {
      const res = await fetch(`${API_BASE}/api/v1/hardware/restore/${towerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'HTTP Command Failed' }));
        throw new Error(err.detail || 'Hardware restore rejected');
      }

      get().addAlert({
        severity: 'INFO',
        source: 'HARDWARE_BRIDGE',
        message: `Restore command dispatched: Energizing Tower ${towerId} on physical relay. Waiting for ACK...`,
        is_active: true
      });
      setTimeout(() => {
        set(state => {
          if (state.pendingTowers[towerId]) {
            const next = { ...state.pendingTowers };
            delete next[towerId];
            return { pendingTowers: next };
          }
          return state;
        });
      }, 5000);
    } catch (err: any) {
      set(state => {
        const next = { ...state.pendingTowers };
        delete next[towerId];
        return { pendingTowers: next };
      });
      get().addAlert({
        severity: 'CRITICAL',
        source: 'HARDWARE_BRIDGE',
        message: `Failed to restore Tower ${towerId}: ${err.message || 'Connection error'}. Physical state unchanged.`,
        is_active: true
      });
    }
  },

  sendHardwareSetAllCommand: async (targetState) => {
    const allTowers = ['T1', 'T2', 'T3', 'T4', 'T5'];
    const pendingObj = allTowers.reduce((acc, t) => ({ ...acc, [t]: true }), {});
    set(state => ({
      pendingTowers: { ...state.pendingTowers, ...pendingObj },
      eventLogs: [
        {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          event: `[MQTT OUT] Batch Command: Set all towers ${targetState} dispatched to ESP32...`,
          type: 'MQTT'
        },
        ...state.eventLogs
      ]
    }));

    try {
      const res = await fetch(`${API_BASE}/api/v1/hardware/set-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: targetState, target_state: targetState })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'HTTP Command Failed' }));
        throw new Error(err.detail || 'Batch command rejected');
      }

      get().addAlert({
        severity: 'INFO',
        source: 'HARDWARE_BRIDGE',
        message: `Batch command sent: Set all towers ${targetState}. Waiting for ESP32 confirmation...`,
        is_active: true
      });
    } catch (err: any) {
      set({ pendingTowers: {} });
      get().addAlert({
        severity: 'CRITICAL',
        source: 'HARDWARE_BRIDGE',
        message: `Failed to switch all towers: ${err.message || 'Connection error'}.`,
        is_active: true
      });
    }
  },

  fetchHardwareStatus: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/hardware/status`);
      if (res.ok) {
        const data = await res.json();
        const dev = data.device || {};
        const tel = data.telemetry || {};

        set(state => {
          const isDevOnline = dev.status === 'ONLINE' || data.status === 'ONLINE';
          const hasPending = Object.keys(state.pendingTowers || {}).length > 0;
          // Protect pending user commands from being clobbered by background polling
          const confirmedOutputs = hasPending
            ? state.hardwareDevice.output_states
            : (dev.output_states || data.output_states || state.hardwareDevice.output_states);

          return {
            isBackendConnected: true,
            mqttConnected: data.mqtt_connected ?? state.mqttConnected,
            hardwareDevice: {
              ...state.hardwareDevice,
              device_id: dev.device_id || state.hardwareDevice.device_id,
              name: dev.name || state.hardwareDevice.name,
              status: isDevOnline ? 'ONLINE' : 'OFFLINE',
              firmware_version: dev.firmware_version || state.hardwareDevice.firmware_version,
              ip_address: dev.ip_address || state.hardwareDevice.ip_address,
              last_seen_at: dev.last_seen_at || state.hardwareDevice.last_seen_at,
              last_heartbeat_at: dev.last_heartbeat_at || state.hardwareDevice.last_heartbeat_at,
              roundtrip_latency_ms: dev.roundtrip_latency_ms || state.hardwareDevice.roundtrip_latency_ms,
              output_states: confirmedOutputs,
              relay_pins: dev.relay_pins || state.hardwareDevice.relay_pins,
            },
            ina219Telemetry: {
              bus_voltage_v: tel.bus_voltage_v || 0.0,
              shunt_voltage_mv: tel.shunt_voltage_mv || 0.0,
              current_ma: tel.current_ma || 0.0,
              power_mw: tel.power_mw || 0.0,
              sensor_status: tel.sensor_status || 'DISCONNECTED',
              recorded_at: tel.recorded_at,
            }
          };
        });
      }
    } catch {
      set({ isBackendConnected: false });
    }
  },

  handleWebSocketMessage: (type: string, data: any) => {
    if (type === 'tower_isolated') {
      const tid = data.tower_id as ('T1' | 'T2' | 'T3' | 'T4' | 'T5');
      if (tid) {
        const cur = get().isolatedTowers || [];
        if (!cur.includes(tid)) {
          get().applyIsolationLocally([...cur, tid]);
        }
      }
    } else if (type === 'tower_restored') {
      const tid = data.tower_id as ('T1' | 'T2' | 'T3' | 'T4' | 'T5');
      if (tid) {
        const cur = get().isolatedTowers || [];
        if (cur.includes(tid)) {
          get().applyIsolationLocally(cur.filter(t => t !== tid));
        }
      }
    } else if (type === 'towers_synced') {
      const isoList = (data.isolated_towers || []) as ('T1' | 'T2' | 'T3' | 'T4' | 'T5')[];
      get().applyIsolationLocally(isoList);
    } else if (type === 'batch_command') {
      const st = (data.state || (data.action === 'ALL_OFF' ? 'OFF' : 'ON')).toUpperCase();
      if (st === 'OFF' || st === 'ALL_OFF') {
        get().applyIsolationLocally(['T1', 'T2', 'T3', 'T4', 'T5']);
      } else {
        get().applyIsolationLocally([]);
      }
    } else if (type === 'command_ack') {
      const { output_id, success, reported_state, output_states, latency_ms, error_reason } = data;

      // Clear pending status for affected tower(s)
      set(state => {
        const nextPending = { ...state.pendingTowers };
        if (output_id === 'ALL') {
          return { pendingTowers: {} };
        } else if (output_id && nextPending[output_id]) {
          delete nextPending[output_id];
        }
        return { pendingTowers: nextPending };
      });

      if (success) {
        const updatedOutputs = { ...get().hardwareDevice.output_states };
        if (output_states && typeof output_states === 'object') {
          Object.assign(updatedOutputs, output_states);
        } else if (output_id && reported_state) {
          if (output_id === 'ALL') {
            for (const t of ['T1', 'T2', 'T3', 'T4', 'T5']) {
              updatedOutputs[t] = (reported_state === 'ISOLATED' || reported_state === 'OFF' || reported_state === 'ALL_OFF') ? 'OFF' : 'ON';
            }
          } else {
            updatedOutputs[output_id] = (reported_state === 'ISOLATED' || reported_state === 'OFF') ? 'OFF' : 'ON';
          }
        }

        // Determine isolated towers list from confirmed hardware state
        const confirmedIso: ('T1'|'T2'|'T3'|'T4'|'T5')[] = [];
        for (const t of (['T1', 'T2', 'T3', 'T4', 'T5'] as const)) {
          if (updatedOutputs[t] === 'ISOLATED' || updatedOutputs[t] === 'OFF' || (output_id === t && (reported_state === 'ISOLATED' || reported_state === 'OFF'))) {
            confirmedIso.push(t);
          }
        }

        get().applyIsolationLocally(confirmedIso);

        set({
          hardwareDevice: {
            ...get().hardwareDevice,
            status: 'ONLINE',
            output_states: updatedOutputs,
            roundtrip_latency_ms: latency_ms || 18,
            last_seen_at: new Date().toISOString()
          },
          eventLogs: [
            {
              id: `evt-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              event: `✓ Physical ACK from ESP32: Output ${output_id} confirmed ${reported_state} (${latency_ms || 18}ms latency).`,
              type: 'HARDWARE'
            },
            ...get().eventLogs
          ]
        });

        get().addAlert({
          severity: 'INFO',
          source: 'HARDWARE_CONFIRM',
          message: `Hardware Confirmed: ${output_id} is physically ${reported_state}. Virtual 3D twin synchronized.`,
          is_active: true
        });
      } else {
        get().addAlert({
          severity: 'CRITICAL',
          source: 'HARDWARE_ERROR',
          message: `ESP32 rejected command for ${output_id}: ${error_reason || 'Hardware error'}.`,
          is_active: true
        });
      }
    } else if (type === 'telemetry') {
      const { bus_voltage_v, shunt_voltage_mv, current_ma, power_mw, sensor_status, recorded_at } = data;
      set({
        ina219Telemetry: {
          bus_voltage_v: bus_voltage_v || 0.0,
          shunt_voltage_mv: shunt_voltage_mv || 0.0,
          current_ma: current_ma || 0.0,
          power_mw: power_mw || 0.0,
          sensor_status: sensor_status || 'OK',
          recorded_at: recorded_at || new Date().toISOString()
        },
        hardwareDevice: {
          ...get().hardwareDevice,
          status: 'ONLINE',
          last_seen_at: new Date().toISOString()
        }
      });
    } else if (type === 'device_status' || type === 'hardware_status') {
      const { status, output_states, ip_address, firmware_version, last_heartbeat_at } = data;
      const devStatus = status === 'ONLINE' ? 'ONLINE' : 'OFFLINE';

      set(state => ({
        hardwareDevice: {
          ...state.hardwareDevice,
          status: devStatus,
          ip_address: ip_address || state.hardwareDevice.ip_address,
          firmware_version: firmware_version || state.hardwareDevice.firmware_version,
          output_states: output_states || state.hardwareDevice.output_states,
          last_heartbeat_at: last_heartbeat_at || state.hardwareDevice.last_heartbeat_at,
          last_seen_at: new Date().toISOString()
        }
      }));
    }
  },

  syncWithBackendData: (backendData: any) => {
    if (backendData.switches) {
      set({ switches: backendData.switches });
    }
    if (backendData.device) {
      set({ hardwareDevice: backendData.device, isBackendConnected: true });
    }
    if (backendData.telemetry) {
      set({ ina219Telemetry: backendData.telemetry });
    }
  }
}));
