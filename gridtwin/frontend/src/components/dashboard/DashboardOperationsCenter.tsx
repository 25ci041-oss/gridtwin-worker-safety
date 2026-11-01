import React, { useState } from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  Activity,
  BarChart2,
  Radio,
  Zap,
  ShieldAlert,
  GitFork,
  FileText,
  Settings,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

export const DashboardOperationsCenter: React.FC = () => {
  const {
    currentMetric,
    connectivity,
    bypassSwitchState,
    toggleBypassSwitch,
    isolatedTowerId,
    isolatedTowers = [],
    isolateTower,
    setActiveTab,
  } = useGridStore();

  const [showQuickIsolateMenu, setShowQuickIsolateMenu] = useState(false);

  const isoList: ('T1' | 'T2' | 'T3' | 'T4' | 'T5')[] =
    isolatedTowers && isolatedTowers.length > 0
      ? isolatedTowers
      : (isolatedTowerId ? [isolatedTowerId] : []);

  const isBypassClosed = bypassSwitchState === 'CLOSED';

  // Tower Reachability along Z = 0
  const isT1Iso = isoList.includes('T1');
  const isT2Iso = isoList.includes('T2');
  const isT3Iso = isoList.includes('T3');
  const isT4Iso = isoList.includes('T4');
  const isT5Iso = isoList.includes('T5');

  const mainReachT1 = !isT1Iso;
  const mainReachT2 = mainReachT1 && !isT2Iso;
  const mainReachT3 = mainReachT2 && !isT3Iso;
  const mainReachT4 = mainReachT3 && !isT4Iso;
  const mainReachT5 = mainReachT4 && !isT5Iso;

  const t1Live = !isT1Iso && (mainReachT1 || isBypassClosed);
  const t2Live = !isT2Iso && (mainReachT2 || isBypassClosed);
  const t3Live = !isT3Iso && (mainReachT3 || isBypassClosed);
  const t4Live = !isT4Iso && (mainReachT4 || isBypassClosed);
  const t5Live = !isT5Iso && (mainReachT5 || isBypassClosed);

  const towers = [
    { id: 'T1' as const, name: 'T1', isLive: t1Live, isIso: isT1Iso, kw: t1Live ? 428 : 0 },
    { id: 'T2' as const, name: 'T2', isLive: t2Live, isIso: isT2Iso, kw: t2Live ? 432 : 0 },
    { id: 'T3' as const, name: 'T3', isLive: t3Live, isIso: isT3Iso, kw: t3Live ? 430 : 0 },
    { id: 'T4' as const, name: 'T4', isLive: t4Live, isIso: isT4Iso, kw: t4Live ? 431 : 0 },
    { id: 'T5' as const, name: 'T5', isLive: t5Live, isIso: isT5Iso, kw: t5Live ? 452 : 0 },
  ];

  const totalKw = towers.reduce((acc, t) => acc + t.kw, 0);
  const percentServed = Math.min(100, Math.round((totalKw / 2173.7) * 100));

  const hasIssues = isoList.length > 0 && !isBypassClosed;
  const isBypassed = isoList.length > 0 && isBypassClosed;
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 select-none">
      {/* ─── COLUMN 1: Grid Operation & Quick Actions ─── */}
      <div className="flex flex-col gap-4">
        {/* Card 1: Grid Operation */}
        <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Grid Operation</h3>
                <p className="text-[10px] text-slate-400 font-medium">Real-Time Transmission Status</p>
              </div>
            </div>
            <span
              className={`text-xs font-bold font-mono px-3 py-0.5 rounded-full border ${
                hasIssues
                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/20'
                  : isBypassClosed
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                  : 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
              }`}
            >
              {hasIssues ? 'Unserved' : isBypassClosed ? 'Bypass ON' : 'Normal'}
            </span>
          </div>

          <div className="flex items-start gap-2.5 pt-1">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex flex-col">
              <p className="text-xs font-semibold text-slate-200 leading-snug">
                {isBypassed
                  ? `Towers [${isoList.join(', ')}] Isolated (0 A) | Remaining via Bypass`
                  : hasIssues
                  ? `ALERT: Towers [${isoList.join(', ')}] Isolated with Bypass OPEN`
                  : 'T1 – T5 All Supplied via Main Transmission'}
              </p>
              <span
                className={`text-xs font-semibold block mt-1 ${
                  hasIssues ? 'text-rose-400' : isBypassed ? 'text-emerald-400' : 'text-emerald-400'
                }`}
              >
                {hasIssues ? '⚠ Action Required: Turn Bypass ON' : '✓ No Abnormalities detected'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Quick Actions */}
        <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Quick Actions</h3>
              <p className="text-[10px] text-slate-400 font-medium">Remote Breaker & Switch Control</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Isolate Tower */}
            <div className="relative">
              <button
                onClick={() => setShowQuickIsolateMenu(!showQuickIsolateMenu)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-500/50 shadow-sm"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Isolate Tower</span>
              </button>

              {/* Quick Tower Dropdown Popover */}
              {showQuickIsolateMenu && (
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl p-2.5 shadow-2xl z-50 flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-400 font-mono px-1 font-bold uppercase">
                    Select Tower to Toggle:
                  </span>
                  {(['T1', 'T2', 'T3', 'T4', 'T5'] as const).map((tId) => (
                    <button
                      key={tId}
                      onClick={() => {
                        isolateTower(tId);
                        setShowQuickIsolateMenu(false);
                      }}
                      className={`w-full py-1.5 px-2.5 text-xs font-bold font-mono rounded-lg text-left transition-all ${
                        isoList.includes(tId)
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {isoList.includes(tId) ? `✕ ${tId} (Isolated)` : `● ${tId} (Online)`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bypass Mode Toggle */}
            <button
              onClick={toggleBypassSwitch}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                isBypassClosed
                  ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/30'
                  : 'bg-blue-950/60 hover:bg-blue-900/70 text-blue-300 border-blue-500/50'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>Bypass Mode</span>
            </button>

            {/* View Logs */}
            <button
              onClick={() => setActiveTab('analytics')}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-900/90 hover:bg-slate-800 hover:text-white border border-slate-800 transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>View Logs</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setActiveTab('settings' as any)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-900/90 hover:bg-slate-800 hover:text-white border border-slate-800 transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── COLUMN 2: Live SCADA Telemetry & Alerts ─── */}
      <div className="flex flex-col gap-4">
        {/* Card 3: Live Readings */}
        <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Live Readings</h3>
              <p className="text-[10px] text-slate-400 font-medium">SCADA High-Voltage Telemetry</p>
            </div>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-sans font-medium">Voltage (Bus)</span>
              <span className="font-bold text-white text-xs">{(currentMetric.voltage_v / 1000).toFixed(2)} kV</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-sans font-medium">Frequency</span>
              <span className="font-bold text-white text-xs">{currentMetric.frequency_hz.toFixed(2)} Hz</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-sans font-medium">Power Factor</span>
              <span className="font-bold text-amber-400 text-xs">{currentMetric.power_factor.toFixed(3)} Lag</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-sans font-medium">Active Power</span>
              <span className="font-bold text-white text-xs">{connectivity.served_demand_kw.toFixed(1)} kW</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-sans font-medium">Reactive Power</span>
              <span className="font-bold text-cyan-400 text-xs">{currentMetric.reactive_power_kvar.toFixed(0)} kVAR</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400 font-sans font-medium">Load Status</span>
              <span className="font-bold text-white text-xs">
                {Math.round((connectivity.served_demand_kw / connectivity.total_demand_kw) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Recent Alerts */}
        <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                <Bell className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Recent Alerts</h3>
                <p className="text-[10px] text-slate-400 font-medium">System Notifications</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('alerts' as any)}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <span className="text-[10px]">❯</span>
            </button>
          </div>

          <div className="flex items-start gap-2.5 pt-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="text-slate-200 font-semibold block">
                {isoList.length > 0 ? `Tower ${isoList.join(', ')} isolated` : 'All systems normal'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                24 Oct 2026, 7:12 PM • SCADA Relay OK
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── COLUMN 3: Tower Status & Flow + How It Works ─── */}
      <div className="flex flex-col gap-4">
        {/* Card 5: Tower Status & Flow */}
        <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                <Radio className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Tower Status & Flow</h3>
                <p className="text-[10px] text-slate-400 font-medium">T1–T5 Pylon Telemetry</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">T1 – T5 Live</span>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            {towers.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-900/40 border border-slate-800/40"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{t.name}</span>
                  {t.isIso && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40">
                      ISO
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      t.isIso ? 'bg-rose-500 shadow-sm shadow-rose-500' : 'bg-emerald-400 shadow-sm shadow-emerald-400'
                    }`}
                  />
                  <span className={t.isIso ? 'text-rose-400 font-bold' : 'text-emerald-400 font-medium'}>
                    {t.isIso ? 'Isolated' : 'Online'}
                  </span>
                </div>

                <span className={`font-bold ${t.isLive ? 'text-white' : 'text-slate-500'}`}>
                  {t.kw > 0 ? `${t.kw}.0 kW` : '0 kW'}
                </span>
              </div>
            ))}
          </div>

          {/* Total Served Load Progress Bar */}
          <div className="pt-3 border-t border-slate-800/80 mt-2.5">
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-slate-400 font-medium">Total Served Load</span>
              <span className="font-bold text-white">{totalKw.toFixed(1)} kW</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-emerald-400"
                  style={{ width: `${percentServed}%` }}
                />
              </div>
              <span className="text-xs font-bold font-mono text-emerald-400">{percentServed}%</span>
            </div>
          </div>
        </div>

        {/* Card 6: How It Works */}
        <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl">
          <div
            onClick={() => setIsHowItWorksOpen(!isHowItWorksOpen)}
            className="flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide group-hover:text-amber-300 transition-colors">
                  How It Works
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Bypass & Isolation Protocol</p>
              </div>
            </div>
            <span className={`text-slate-400 font-bold transition-transform ${isHowItWorksOpen ? 'rotate-90' : ''}`}>
              ❯
            </span>
          </div>

          {/* Expandable Protocol Steps */}
          {isHowItWorksOpen && (
            <div className="flex flex-col gap-2 pt-3 mt-3 border-t border-slate-800/80 text-xs">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-[11px] text-slate-300">
                  <strong className="text-white">Normal:</strong> Main route active, bypass open.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p className="text-[11px] text-slate-300">
                  <strong className="text-white">Fault:</strong> Open breakers on isolated towers (T1–T5).
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p className="text-[11px] text-slate-300">
                  <strong className="text-white">Isolate:</strong> Disconnected towers receive 0 A current.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <p className="text-[11px] text-slate-300">
                  <strong className="text-white">Bypass:</strong> Front bypass bus routes current around isolated towers.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-teal-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  5
                </span>
                <p className="text-[11px] text-slate-300">
                  <strong className="text-white">Restore:</strong> Turning off isolation restores main transmission route.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
