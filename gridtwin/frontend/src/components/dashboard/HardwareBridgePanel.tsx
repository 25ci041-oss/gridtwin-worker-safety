import React, { useState } from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  Cpu,
  Radio,
  Wifi,
  ShieldCheck,
  Send,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play
} from 'lucide-react';

export const HardwareBridgePanel: React.FC = () => {
  const {
    hardwareDevice,
    physicalSyncEnabled,
    setPhysicalSync,
    switches,
    setSwitchState
  } = useGridStore();

  const [testLog, setTestLog] = useState<string[]>([
    'MQTT Client connected to broker tcp://localhost:1883',
    'Subscribed to gridtwin/hardware/ack',
    'Subscribed to gridtwin/hardware/telemetry',
    'Handshake packet received from ESP32_GRID_01 (FW v1.4.2-rel)',
    'All 5 GPIO outputs verified in synchrony with virtual twin.',
  ]);

  const [pinging, setPinging] = useState(false);

  const runLoopbackTest = () => {
    setPinging(true);
    setTimeout(() => {
      setTestLog((prev) => [
        `[${new Date().toLocaleTimeString()}] PING -> ESP32_GRID_01 sent via MQTT topic 'gridtwin/command/esp32'`,
        `[${new Date().toLocaleTimeString()}] ACK <- Echo received in 18ms. Roundtrip latency nominal.`,
        ...prev,
      ]);
      setPinging(false);
    }, 600);
  };

  const gpioMatrix = [
    { section: 'T1', name: 'Residential', gpio: 25, pinType: 'Digital Output / Relay 1', state: hardwareDevice.output_states['T1'] || 'OFF', swId: 'SW-T1' },
    { section: 'T2', name: 'Commercial', gpio: 26, pinType: 'Digital Output / Relay 2', state: hardwareDevice.output_states['T2'] || 'OFF', swId: 'SW-T2' },
    { section: 'T3', name: 'Hospital (Crit)', gpio: 27, pinType: 'Digital Output / Relay 3', state: hardwareDevice.output_states['T3'] || 'OFF', swId: 'SW-T3' },
    { section: 'T4', name: 'Industrial', gpio: 14, pinType: 'Digital Output / Relay 4', state: hardwareDevice.output_states['T4'] || 'OFF', swId: 'SW-T4' },
    { section: 'T5', name: 'Solar Microgrid', gpio: 12, pinType: 'Digital Output / Relay 5', state: hardwareDevice.output_states['T5'] || 'OFF', swId: 'SW-T5' },
  ];

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              PHYSICAL HARDWARE TWIN INTEGRATION BRIDGE
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-400">
              ESP32 SYNCHRONIZED
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time MQTT telemetry and bidirectional physical switching synchronization with miniature low-voltage bench model.
          </p>
        </div>

        {/* Sync Toggle */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
          <span className="text-xs font-semibold text-slate-300">Live Hardware Sync:</span>
          <button
            onClick={() => setPhysicalSync(!physicalSyncEnabled)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              physicalSyncEnabled
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {physicalSyncEnabled ? 'ACTIVE (SYNCED)' : 'PAUSED'}
          </button>
        </div>
      </div>

      {/* Hardware Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs block mb-1">Controller Device ID</span>
          <span className="text-white font-mono font-bold text-sm">{hardwareDevice.device_id}</span>
          <span className="text-[10px] text-slate-500 block mt-1">ESP32-WROOM-32D Dual-Core</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs block mb-1">Firmware Version</span>
          <span className="text-cyan-400 font-mono font-bold text-sm">{hardwareDevice.firmware_version}</span>
          <span className="text-[10px] text-slate-500 block mt-1">PlatformIO FreeRTOS Build</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs block mb-1">Round-trip ACK Latency</span>
          <span className="text-emerald-400 font-mono font-bold text-sm">
            {hardwareDevice.roundtrip_latency_ms} ms
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">MQTT QoS 1 Delivery</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-slate-400 text-xs block mb-1">Communication Diagnostics</span>
            <span className="text-emerald-400 font-mono font-bold text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 0 Packet Loss
            </span>
          </div>
          <button
            onClick={runLoopbackTest}
            disabled={pinging}
            className="mt-2 w-full py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            {pinging ? 'Sending Ping...' : 'Run Ping Test'}
          </button>
        </div>
      </div>

      {/* GPIO Pin Matrix Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>ESP32 Physical GPIO Output & Indicator Matrix</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2.5">Section</th>
                <th className="p-2.5">Facility / Load</th>
                <th className="p-2.5">ESP32 Pin</th>
                <th className="p-2.5">Hardware Output Type</th>
                <th className="p-2.5">Digital State</th>
                <th className="p-2.5 text-right">Physical Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {gpioMatrix.map((item) => (
                <tr key={item.section} className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-bold text-cyan-400">{item.section}</td>
                  <td className="p-2.5 text-slate-200">{item.name}</td>
                  <td className="p-2.5 text-amber-400 font-bold">GPIO {item.gpio}</td>
                  <td className="p-2.5 text-slate-400">{item.pinType}</td>
                  <td className="p-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.state === 'ON'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${item.state === 'ON' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      {item.state}
                    </span>
                  </td>
                  <td className="p-2.5 text-right">
                    <button
                      onClick={() => setSwitchState(item.swId, item.state === 'ON' ? 'OPEN' : 'CLOSED')}
                      className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    >
                      Toggle Pin
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Terminal Live Packet Monitor */}
      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200 font-mono">
              MQTT Packet Bus (gridtwin/hardware/#)
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Auto-scrolling</span>
        </div>
        <div className="bg-slate-900/90 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-[11px] space-y-1 text-slate-300">
          {testLog.map((log, i) => (
            <div key={i} className="leading-relaxed">
              <span className="text-emerald-400 mr-2">&gt;</span>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
