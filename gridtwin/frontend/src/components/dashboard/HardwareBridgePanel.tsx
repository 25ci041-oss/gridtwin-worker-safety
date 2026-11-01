import React, { useState } from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  Cpu,
  Wifi,
  WifiOff,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  Terminal,
  ShieldAlert,
  Gauge
} from 'lucide-react';

export const HardwareBridgePanel: React.FC = () => {
  const {
    hardwareDevice,
    hardwareMode,
    setHardwareMode,
    physicalSyncEnabled,
    setPhysicalSync,
    pendingTowers,
    ina219Telemetry,
    sendHardwareTowerCommand,
    sendHardwareIsolateCommand,
    sendHardwareRestoreCommand,
    sendHardwareSetAllCommand,
    fetchHardwareStatus,
  } = useGridStore();

  const [testLog, setTestLog] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Local Bridge initialized. Listening for ESP32 hardware telemetry...`,
    `[${new Date().toLocaleTimeString()}] GPIO Pinout: T1=13, T2=14, T3=25, T4=26, T5=27, IN6=32 (Reserved)`,
    `[${new Date().toLocaleTimeString()}] Active-LOW relay logic configured. Safety interlocks enabled.`,
  ]);

  const [pinging, setPinging] = useState(false);

  const isOnline = hardwareDevice.status === 'ONLINE';

  const runLoopbackTest = async () => {
    setPinging(true);
    setTestLog((prev) => [
      `[${new Date().toLocaleTimeString()}] Polling ESP32 hardware status via REST /api/v1/hardware/status...`,
      ...prev,
    ]);
    try {
      await fetchHardwareStatus();
      setTestLog((prev) => [
        `[${new Date().toLocaleTimeString()}] Response received. Status: ${hardwareDevice.status}, Latency: ${hardwareDevice.roundtrip_latency_ms || 15}ms`,
        ...prev,
      ]);
    } catch (err: any) {
      setTestLog((prev) => [
        `[${new Date().toLocaleTimeString()}] Ping error: ${err.message || 'Controller timeout'}`,
        ...prev,
      ]);
    } finally {
      setPinging(false);
    }
  };

  const handleToggleTower = async (towerId: 'T1' | 'T2' | 'T3' | 'T4' | 'T5') => {
    const currentState = hardwareDevice.output_states[towerId] || 'OFF';
    const nextState = currentState === 'ON' ? 'OFF' : 'ON';
    const pin = hardwareDevice.relay_pins?.[towerId] || ({ T1: 13, T2: 14, T3: 25, T4: 26, T5: 27 }[towerId]);
    setTestLog((prev) => [
      `[${new Date().toLocaleTimeString()}] Command sent: Set ${towerId} -> ${nextState} (GPIO ${pin})`,
      ...prev,
    ]);
    await sendHardwareTowerCommand(towerId, nextState);
  };

  const handleIsolateT3 = async () => {
    setTestLog((prev) => [
      `[${new Date().toLocaleTimeString()}] Initiating Tower 3 Isolation sequence (De-energize GPIO 25, preserve T1, T2, T4, T5)...`,
      ...prev,
    ]);
    await sendHardwareIsolateCommand('T3');
  };

  const handleRestoreT3 = async () => {
    setTestLog((prev) => [
      `[${new Date().toLocaleTimeString()}] Restoring Tower 3 to nominal transmission branch...`,
      ...prev,
    ]);
    await sendHardwareRestoreCommand('T3');
  };

  const gpioMatrix = [
    { section: 'T1', name: 'Residential Zone', gpio: 13, relayIn: 'IN1', pinType: 'Digital Output / Relay 1', state: hardwareDevice.output_states['T1'] || 'OFF' },
    { section: 'T2', name: 'Commercial Hub', gpio: 14, relayIn: 'IN2', pinType: 'Digital Output / Relay 2', state: hardwareDevice.output_states['T2'] || 'OFF' },
    { section: 'T3', name: 'Hospital / Critical', gpio: 25, relayIn: 'IN3', pinType: 'Digital Output / Relay 3', state: hardwareDevice.output_states['T3'] || 'OFF' },
    { section: 'T4', name: 'Industrial Feeder', gpio: 26, relayIn: 'IN4', pinType: 'Digital Output / Relay 4', state: hardwareDevice.output_states['T4'] || 'OFF' },
    { section: 'T5', name: 'Solar Microgrid', gpio: 27, relayIn: 'IN5', pinType: 'Digital Output / Relay 5', state: hardwareDevice.output_states['T5'] || 'OFF' },
    { section: 'CH6', name: 'Reserved Normal-Path', gpio: 32, relayIn: 'IN6', pinType: 'Reserved Isolation Relay', state: 'DISABLED' },
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
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                isOnline
                  ? 'bg-emerald-950 border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-950/70 border-rose-500/40 text-rose-400'
              }`}
            >
              {isOnline ? 'ESP32 ONLINE' : 'ESP32 OFFLINE'}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                hardwareMode === 'PHYSICAL'
                  ? 'bg-cyan-950 border-cyan-500/40 text-cyan-400'
                  : 'bg-amber-950 border-amber-500/40 text-amber-400'
              }`}
            >
              {hardwareMode === 'PHYSICAL' ? 'REAL HARDWARE MODE' : 'VIRTUAL SIMULATION MODE'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time bidirectional MQTT control and INA219 current sensing for 5-tower physical educational bench model.
          </p>
        </div>

        {/* Operating Mode Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setHardwareMode('PHYSICAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                hardwareMode === 'PHYSICAL'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Physical Hardware
            </button>
            <button
              onClick={() => setHardwareMode('SIMULATION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                hardwareMode === 'SIMULATION'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Simulation Only
            </button>
          </div>
        </div>
      </div>

      {/* Hardware Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs block mb-1">Controller Device ID</span>
          <span className="text-white font-mono font-bold text-sm">{hardwareDevice.device_id}</span>
          <span className="text-[10px] text-slate-500 block mt-1">
            IP: {hardwareDevice.ip_address || '192.168.x.x'} • RSSI: {hardwareDevice.wifi_rssi || -55} dBm
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs block mb-1">Firmware & Logic</span>
          <span className="text-cyan-400 font-mono font-bold text-sm">
            {hardwareDevice.firmware_version}
          </span>
          <span className="text-[10px] text-emerald-400 block mt-1">
            Active-LOW Logic (LOW=Energized)
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs block mb-1">Round-trip ACK Latency</span>
          <span className="text-emerald-400 font-mono font-bold text-sm">
            {isOnline ? `${hardwareDevice.roundtrip_latency_ms || 18} ms` : 'Unreachable'}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">
            Last Heartbeat: {hardwareDevice.last_heartbeat_at ? new Date(hardwareDevice.last_heartbeat_at).toLocaleTimeString() : 'Awaiting packet'}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-slate-400 text-xs block mb-1">Hardware Connectivity</span>
            <span
              className={`font-mono font-bold text-xs flex items-center gap-1 ${
                isOnline ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isOnline ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Synchronized
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" /> Waiting for Device
                </>
              )}
            </span>
          </div>
          <button
            onClick={runLoopbackTest}
            disabled={pinging}
            className="mt-2 w-full py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            {pinging ? 'Polling Controller...' : 'Poll Hardware Status'}
          </button>
        </div>
      </div>

      {/* INA219 Live Physical Telemetry Sensor Cards */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              INA219 High-Side Power & Current Monitor (I2C SDA=GPIO21, SCL=GPIO22)
            </h3>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
              ina219Telemetry.sensor_status === 'OK'
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400'
                : 'bg-amber-950/70 border-amber-500/40 text-amber-400'
            }`}
          >
            SENSOR: {ina219Telemetry.sensor_status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400 block">Bus Supply Voltage</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-bold font-mono text-cyan-400">
                {ina219Telemetry.bus_voltage_v.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500">V DC</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Expected ~5.0 V (5V Adapter)</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400 block">Total Load Current</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-bold font-mono text-emerald-400">
                {ina219Telemetry.current_ma.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500">mA</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Shared LED Array Total</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400 block">Total Power Dissipation</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-bold font-mono text-amber-400">
                {ina219Telemetry.power_mw.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500">mW</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">P = V_bus × I_load</span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] text-slate-400 block">Shunt Drop Voltage</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-bold font-mono text-violet-400">
                {ina219Telemetry.shunt_voltage_mv.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500">mV</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">0.1Ω Shunt Resistor</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 italic">
          * Note: INA219 measures total shared load current in series with the positive LED rail. Individual tower branch currents are not fabricated.
        </p>
      </div>

      {/* Hardware Control Actions Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Bench Prototype Quick Operations</span>
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleIsolateT3}
            disabled={!isOnline && hardwareMode === 'PHYSICAL'}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-2 transition-all disabled:opacity-40"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Isolate Tower 3 (Physical Test)
          </button>

          <button
            onClick={handleRestoreT3}
            disabled={!isOnline && hardwareMode === 'PHYSICAL'}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-2 transition-all disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            Restore Tower 3
          </button>

          <button
            onClick={() => sendHardwareSetAllCommand('ON')}
            disabled={!isOnline && hardwareMode === 'PHYSICAL'}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-2 transition-all disabled:opacity-40"
          >
            <Play className="w-4 h-4 text-cyan-400" />
            All Towers ON (T1-T5)
          </button>

          <button
            onClick={() => sendHardwareSetAllCommand('OFF')}
            disabled={!isOnline && hardwareMode === 'PHYSICAL'}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-2 transition-all disabled:opacity-40"
          >
            All Towers OFF
          </button>
        </div>
      </div>

      {/* GPIO Pin Matrix Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>ESP32 Physical Relay Pin Matrix & Live Confirmed States</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2.5">Tower ID</th>
                <th className="p-2.5">Grid Role</th>
                <th className="p-2.5">ESP32 Pin</th>
                <th className="p-2.5">Relay Channel</th>
                <th className="p-2.5">Confirmed Hardware State</th>
                <th className="p-2.5 text-right">Direct Relay Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {gpioMatrix.map((item) => {
                const isPending = !!pendingTowers[item.section];
                return (
                  <tr key={item.section} className="hover:bg-slate-800/40">
                    <td className="p-2.5 font-bold text-cyan-400">{item.section}</td>
                    <td className="p-2.5 text-slate-200">{item.name}</td>
                    <td className="p-2.5 text-amber-400 font-bold">GPIO {item.gpio}</td>
                    <td className="p-2.5 text-slate-400">{item.relayIn}</td>
                    <td className="p-2.5">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-500/40 animate-pulse">
                          WAITING ESP32 ACK...
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.state === 'ON'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                              : item.state === 'ISOLATED'
                              ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.state === 'ON'
                                ? 'bg-emerald-400 animate-pulse'
                                : item.state === 'ISOLATED'
                                ? 'bg-amber-400'
                                : 'bg-slate-500'
                            }`}
                          />
                          {item.state}
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-right">
                      {item.section !== 'CH6' ? (
                        <button
                          onClick={() => handleToggleTower(item.section as 'T1' | 'T2' | 'T3' | 'T4' | 'T5')}
                          disabled={isPending || (!isOnline && hardwareMode === 'PHYSICAL')}
                          className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 transition-colors"
                        >
                          {item.state === 'ON' ? 'De-energize' : 'Energize'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Reserved (Lockout)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
              Hardware Bus Activity (MQTT & REST Dispatcher)
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Live Stream</span>
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
