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
  SwitchState
} from '../types';

interface GridState {
  // Topology
  nodes: GridNode[];
  edges: GridEdge[];
  switches: GridSwitch[];
  loads: GridLoad[];
  connectivity: ConnectivityResult;

  // Hardware State
  hardwareDevice: HardwareDevice;
  physicalSyncEnabled: boolean;
  isBackendConnected: boolean;

  // Real-time telemetry history
  metricsHistory: SimulationMetric[];
  currentMetric: SimulationMetric;

  // UI & View state
  activeTab: 'dashboard' | '3d-twin' | 'sld' | 'hardware' | 'analytics' | 'scenarios' | 'monitoring' | 'devices' | 'alerts' | 'settings';
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
  isolateT3WithBypass: () => void;
  restoreNormalOperation: () => void;
  setSelectedElement: (element: SelectedElement | null) => void;
  setCameraPreset: (preset: 'overview' | 'substation' | 'feeder1-3' | 'feeder4-5' | 'loads' | 'top' | 'side') => void;
  setActiveTab: (tab: 'dashboard' | '3d-twin' | 'sld' | 'hardware' | 'analytics' | 'scenarios' | 'monitoring' | 'devices' | 'alerts' | 'settings') => void;
  setPhysicalSync: (enabled: boolean) => void;
  recomputeConnectivity: () => void;
  triggerScenario: (scenarioId: string) => void;
  addAlert: (alert: Omit<GridAlert, 'id' | 'timestamp'>) => void;
  clearAlerts: () => void;
  toggleNightMode: () => void;
  togglePowerFlow: () => void;
  toggleLabels: () => void;
  syncWithBackendData: (data: any) => void;
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
  { id: 'sw-1', switch_id: 'SW-T1', name: 'T1 Section Recloser (Residential)', controlled_edge_id: 'LINE-BUS-N01', state: 'CLOSED', section_id: 'T1', description: 'Controls Section 1 (Residential Quarter)', gpio_pin: 25, hardware_ack: true, last_operated: 'Just now' },
  { id: 'sw-2', switch_id: 'SW-T2', name: 'T2 Section Recloser (Commercial)', controlled_edge_id: 'LINE-BUS-N02', state: 'CLOSED', section_id: 'T2', description: 'Controls Section 2 (Commerce Plaza)', gpio_pin: 26, hardware_ack: true, last_operated: 'Just now' },
  { id: 'sw-3', switch_id: 'SW-T3', name: 'T3 Section Recloser (Critical/Hospital)', controlled_edge_id: 'LINE-BUS-N03', state: 'CLOSED', section_id: 'T3', description: 'Controls Section 3 (Metropolitan Hospital)', gpio_pin: 27, hardware_ack: true, last_operated: 'Just now' },
  { id: 'sw-4', switch_id: 'SW-T4', name: 'T4 Section Recloser (Industrial)', controlled_edge_id: 'LINE-BUS-N04', state: 'CLOSED', section_id: 'T4', description: 'Controls Section 4 (Industrial Complex)', gpio_pin: 14, hardware_ack: true, last_operated: 'Just now' },
  { id: 'sw-5', switch_id: 'SW-T5', name: 'T5 Section Recloser (Renewable Microgrid)', controlled_edge_id: 'LINE-BUS-N05', state: 'CLOSED', section_id: 'T5', description: 'Controls Section 5 (Solar & EV Station)', gpio_pin: 12, hardware_ack: true, last_operated: 'Just now' },
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
    device_id: 'ESP32_GRID_01',
    name: 'Lab Bench Miniature Controller',
    status: 'ONLINE',
    is_registered: true,
    is_enabled: true,
    last_seen_at: new Date().toISOString(),
    last_heartbeat_at: new Date().toISOString(),
    roundtrip_latency_ms: 18,
    firmware_version: 'v1.4.2-rel',
    output_states: {
      'T1': 'ON',
      'T2': 'ON',
      'T3': 'ON',
      'T4': 'ON',
      'T5': 'ON',
    }
  },
  physicalSyncEnabled: true,
  isBackendConnected: false,

  metricsHistory: Array.from({ length: 20 }).map((_, i) => ({
    timestamp: new Date(Date.now() - (20 - i) * 2000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    voltage_v: 11000 + (Math.random() * 80 - 40),
    current_a: 115 + (Math.random() * 8 - 4),
    active_power_kw: 2170 + (Math.random() * 30 - 15),
    reactive_power_kvar: 420 + (Math.random() * 10 - 5),
    power_factor: 0.94 + (Math.random() * 0.02 - 0.01),
    frequency_hz: 50.0 + (Math.random() * 0.08 - 0.04),
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

  isolateTower: (towerId: 'T1' | 'T2' | 'T3' | 'T4' | 'T5') => {
    const currentList: ('T1' | 'T2' | 'T3' | 'T4' | 'T5')[] = get().isolatedTowers || [];
    const isAlreadyIsolated = currentList.includes(towerId);

    // Toggle: if already isolated, remove it; if not, add it
    const nextList: ('T1' | 'T2' | 'T3' | 'T4' | 'T5')[] = isAlreadyIsolated
      ? currentList.filter(id => id !== towerId)
      : [...currentList, towerId];

    if (nextList.length === 0) {
      // When isolation is cleared, restore normal connection with bypass OFF
      get().restoreNormalOperation();
      return;
    }

    const swIdMap: Record<string, string> = {
      'T1': 'SW-T1',
      'T2': 'SW-T2',
      'T3': 'SW-T3',
      'T4': 'SW-T4',
      'T5': 'SW-T5',
    };

    const { switches } = get();
    // For every tower: if in nextList, switch is OPEN; otherwise switch is CLOSED
    const updatedSwitches = switches.map(s => {
      const isThisIsolated = Object.entries(swIdMap).some(
        ([tId, swId]) => nextList.includes(tId as any) && swId === s.switch_id
      );
      return {
        ...s,
        state: isThisIsolated ? ('OPEN' as SwitchState) : ('CLOSED' as SwitchState),
        last_operated: isThisIsolated ? 'Isolated (Breaker Open)' : 'Live via Bypass'
      };
    });

    // "make the connection of isolation when the bypass is on":
    // Setting bypass to CLOSED establishes the bypass connection around the isolated tower
    const connectivity = calculateConnectivity(updatedSwitches, 'CLOSED', nextList);
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
      bypassSwitchState: 'CLOSED',
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
      alerts: [
        {
          id: `alt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'WARNING',
          source: 'ISOLATION_CONTROLLER',
          message: `Tower Isolation Active: [${nextList.join(', ')}] isolated (NO CURRENT). Bypass is ON: current safely routed around isolated section to remaining towers (${newKw} kW served).`,
          is_active: true
        },
        ...get().alerts
      ],
      eventLogs: [
        {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          event: `Towers [${nextList.join(', ')}] isolated with Bypass ON. Power routed to healthy towers via bypass bus (${newKw} kW).`,
          type: 'SCENARIO'
        },
        ...get().eventLogs
      ]
    });
  },

  isolateT3WithBypass: () => {
    get().isolateTower('T3');
  },

  restoreNormalOperation: () => {
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
    const { switches, nodes, loads, hardwareDevice, physicalSyncEnabled } = get();
    
    // Update switch
    const updatedSwitches = switches.map(s => {
      if (s.switch_id === switchId) {
        return {
          ...s,
          state,
          last_operated: new Date().toLocaleTimeString(),
          hardware_ack: physicalSyncEnabled
        };
      }
      return s;
    });

    // Update multi-tower isolated list: add or remove section based on open/closed
    const currentList: ('T1' | 'T2' | 'T3' | 'T4' | 'T5')[] = get().isolatedTowers || [];
    let nextList = [...currentList];
    const swSectionMap: Record<string, 'T1' | 'T2' | 'T3' | 'T4' | 'T5'> = {
      'SW-T1': 'T1',
      'SW-T2': 'T2',
      'SW-T3': 'T3',
      'SW-T4': 'T4',
      'SW-T5': 'T5',
    };
    const affectedSection = swSectionMap[switchId];
    if (affectedSection) {
      if (state === 'OPEN' && !nextList.includes(affectedSection)) {
        nextList.push(affectedSection);
      } else if (state === 'CLOSED' && nextList.includes(affectedSection)) {
        nextList = nextList.filter(id => id !== affectedSection);
      }
    }

    const currentBypassState = get().bypassSwitchState;

    // Recompute connectivity with current bypass route state and isolated towers
    const connectivity = calculateConnectivity(updatedSwitches, currentBypassState, nextList);

    // Update node energized states
    const updatedNodes = nodes.map(n => ({
      ...n,
      is_energized: connectivity.energized_nodes.includes(n.node_id)
    }));

    // Update loads energized states
    const updatedLoads = loads.map(l => ({
      ...l,
      is_energized: connectivity.energized_loads.includes(l.load_id)
    }));

    // Update hardware outputs
    const swTarget = switches.find(s => s.switch_id === switchId);
    const sectionKey = swTarget?.section_id || 'T1';
    const outputValue = state === 'CLOSED' ? 'ON' : 'OFF';

    const updatedHardware: HardwareDevice = {
      ...hardwareDevice,
      output_states: {
        ...hardwareDevice.output_states,
        [sectionKey]: outputValue
      },
      last_seen_at: new Date().toISOString(),
      roundtrip_latency_ms: Math.floor(14 + Math.random() * 8)
    };

    // Calculate active power based on served loads
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

    const newEvent = {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      event: `Switch ${swTarget?.name || switchId} changed to ${state}. ${state === 'OPEN' ? 'Section isolated.' : 'Section energized.'}`,
      type: 'SWITCH_OP'
    };

    const newLogs = [newEvent, ...get().eventLogs.slice(0, 40)];
    const newMetricsHistory = [...get().metricsHistory.slice(1), newMetric];

    set({
      switches: updatedSwitches,
      isolatedTowers: nextList,
      isolatedTowerId: nextList[0] || null,
      isT3Isolated: nextList.includes('T3'),
      bypassSwitchState: currentBypassState,
      nodes: updatedNodes,
      loads: updatedLoads,
      connectivity,
      hardwareDevice: updatedHardware,
      currentMetric: newMetric,
      metricsHistory: newMetricsHistory,
      eventLogs: newLogs,
    });

    // Also send to backend if reachable
    try {
      fetch(`/api/switches/${switchId}/operate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_state: state })
      }).catch(() => {});
    } catch {
      // Offline fallback already handled client-side
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

  syncWithBackendData: (backendData: any) => {
    if (backendData.switches) {
      set({ switches: backendData.switches });
    }
    if (backendData.device) {
      set({ hardwareDevice: backendData.device, isBackendConnected: true });
    }
  }
}));
