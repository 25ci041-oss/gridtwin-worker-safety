import React, { useState } from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  Activity,
  Zap,
  BarChart2,
  ShieldAlert,
  GitFork,
  FileText,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sliders,
  Bell
} from 'lucide-react';

export const RightSidebar: React.FC = () => {
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
    { id: 'T1' as const, name: 'T1', isLive: t1Live, isIso: isT1Iso },
    { id: 'T2' as const, name: 'T2', isLive: t2Live, isIso: isT2Iso },
    { id: 'T3' as const, name: 'T3', isLive: t3Live, isIso: isT3Iso },
    { id: 'T4' as const, name: 'T4', isLive: t4Live, isIso: isT4Iso },
    { id: 'T5' as const, name: 'T5', isLive: t5Live, isIso: isT5Iso },
  ];

  const hasIssues = isoList.length > 0 && !isBypassClosed;
  const isBypassed = isoList.length > 0 && isBypassClosed;

  return (
    <aside className="w-80 shrink-0 bg-[#070d1e] border-l border-slate-800/80 flex flex-col gap-4 p-4 select-none overflow-y-auto">
      {/* 1. Grid Operation Card */}
      <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide">Grid Operation</h3>
          </div>
          <span
            className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border ${
              hasIssues
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                : isBypassed
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                : 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
            }`}
          >
            {hasIssues ? 'Unserved' : isBypassed ? 'Bypass ON' : 'Normal'}
          </span>
        </div>

        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <p className="text-xs font-medium text-slate-200 leading-snug">
              {isBypassed
                ? `Towers [${isoList.join(', ')}] Isolated (0 A) | Remaining via Bypass`
                : hasIssues
                ? `ALERT: Towers [${isoList.join(', ')}] Isolated with Bypass OPEN`
                : 'T1-T5 All Supplied via Main Transmission'}
            </p>
            <span
              className={`text-xs font-mono font-semibold block mt-1 ${
                hasIssues ? 'text-rose-400' : isBypassed ? 'text-emerald-400' : 'text-emerald-400'
              }`}
            >
              {hasIssues ? '⚠ Action Required: Turn Bypass ON' : 'No Abnormalities'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Live Readings Card */}
      <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2.5 mb-3.5">
          <BarChart2 className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">Live Readings</h3>
        </div>

        <div className="space-y-2.5 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Voltage (Bus)</span>
            <span className="font-bold text-white">{(currentMetric.voltage_v / 1000).toFixed(2)} kV</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Frequency</span>
            <span className="font-bold text-white">{currentMetric.frequency_hz.toFixed(2)} Hz</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Power Factor</span>
            <span className="font-bold text-amber-400">{currentMetric.power_factor.toFixed(3)} Lag</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Active Power</span>
            <span className="font-bold text-white">{connectivity.served_demand_kw.toFixed(1)} kW</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-sans">Reactive Power</span>
            <span className="font-bold text-white">{currentMetric.reactive_power_kvar.toFixed(0)} kVAR</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-slate-400 font-sans">Load Status</span>
            <span className="font-bold text-white">
              {Math.round((connectivity.served_demand_kw / connectivity.total_demand_kw) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* 3. Tower Status Card */}
      <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">Tower Status</h3>
          </div>
          <span className="text-xs font-sans text-slate-400 font-medium">T1 - T5 Telemetry</span>
        </div>

        <div className="space-y-2.5 font-mono text-xs">
          {towers.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-0.5">
              <span className="font-bold text-slate-300">{t.name}</span>

              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    t.isIso ? 'bg-rose-500 shadow-sm shadow-rose-500' : 'bg-emerald-400 shadow-sm shadow-emerald-400'
                  }`}
                />
                <span className={t.isIso ? 'text-rose-400 font-bold' : 'text-emerald-400 font-semibold'}>
                  {t.isIso ? 'Isolated' : 'Online'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Quick Actions */}
      <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2.5 mb-3.5">
          <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">Quick Actions</h3>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Top-Left: Isolate Tower Action */}
          <div className="relative">
            <button
              onClick={() => setShowQuickIsolateMenu(!showQuickIsolateMenu)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 shadow-sm"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Isolate Tower</span>
            </button>

            {/* Quick Tower Dropdown Popover */}
            {showQuickIsolateMenu && (
              <div className="absolute bottom-full mb-1.5 left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-2xl z-50 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-mono px-1">Select Tower:</span>
                {(['T1', 'T2', 'T3', 'T4', 'T5'] as const).map((tId) => (
                  <button
                    key={tId}
                    onClick={() => {
                      isolateTower(tId);
                      setShowQuickIsolateMenu(false);
                    }}
                    className={`w-full py-1 px-2 text-xs font-bold font-mono rounded-lg text-left transition-all ${
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

          {/* Top-Right: Bypass Mode Toggle */}
          <button
            onClick={toggleBypassSwitch}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
              isBypassClosed
                ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/30'
                : 'bg-blue-950/60 hover:bg-blue-900/70 text-blue-300 border-blue-500/40'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Bypass Mode</span>
          </button>

          {/* Bottom-Left: View Logs */}
          <button
            onClick={() => setActiveTab('analytics')}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-900/90 hover:bg-slate-800 hover:text-white border border-slate-800 transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>View Logs</span>
          </button>

          {/* Bottom-Right: Settings */}
          <button
            onClick={() => setActiveTab('settings' as any)}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-900/90 hover:bg-slate-800 hover:text-white border border-slate-800 transition-all"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* 5. Recent Alerts matching Screenshot */}
      <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl mt-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Bell className="w-3 h-3 text-cyan-400" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide">Recent Alerts</h3>
          </div>
          <button
            onClick={() => setActiveTab('alerts' as any)}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
          >
            View All
          </button>
        </div>

        <div className="flex items-start gap-2.5 pt-0.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="text-slate-200 font-semibold block">
              {isoList.length > 0 ? `Tower ${isoList.join(', ')} isolated` : 'All systems normal'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
              23 Oct 2026, 7:12 PM
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
