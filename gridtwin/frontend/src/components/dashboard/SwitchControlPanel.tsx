import React, { useState } from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Power,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  GitBranch
} from 'lucide-react';

export const SwitchControlPanel: React.FC = () => {
  const {
    switches,
    loads,
    toggleSwitch,
    setSwitchState,
    hardwareDevice,
    physicalSyncEnabled,
    bypassSwitchState,
    toggleBypassSwitch,
    isolatedTowerId,
    isolatedTowers = [],
    isolateTower,
    restoreNormalOperation,
  } = useGridStore();

  const isoList: ('T1' | 'T2' | 'T3' | 'T4' | 'T5')[] =
    isolatedTowers && isolatedTowers.length > 0
      ? isolatedTowers
      : (isolatedTowerId ? [isolatedTowerId] : []);

  const [interlockBypass, setInterlockBypass] = useState(false);

  const handleEnergizeAll = () => {
    switches.forEach(s => setSwitchState(s.switch_id, 'CLOSED'));
  };

  const handleIsolateAll = () => {
    switches.forEach(s => setSwitchState(s.switch_id, 'OPEN'));
  };

  const getSectionLoad = (secId?: string) => {
    return loads.find(l => l.section_id === secId);
  };

  const isBypassClosed = bypassSwitchState === 'CLOSED';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
      {/* Header with Title and Global Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm md:text-base font-extrabold text-white flex items-center gap-2">
            <Power className="w-5 h-5 text-cyan-400" />
            <span>SWITCHGEAR CONTROL CONSOLE & FRONT BYPASS NETWORK</span>
          </h2>
          <p className="text-xs text-slate-300 font-medium">
            Bidirectional switching for Feeder Sections T1–T5 and Universal Front Bypass Bus.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tower Isolation Quick Group */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-300 font-mono font-bold px-1">Isolate:</span>
            {(['T1', 'T2', 'T3', 'T4', 'T5'] as const).map((tId) => {
              const isThisIsolated = isoList.includes(tId);
              return (
                <button
                  key={tId}
                  onClick={() => isolateTower(tId)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all active:scale-95 ${
                    isThisIsolated
                      ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400'
                      : 'bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={`Toggle isolation for ${tId}`}
                >
                  {isThisIsolated ? `✕ ${tId}` : tId}
                </button>
              );
            })}
            {isoList.length > 0 && (
              <button
                onClick={restoreNormalOperation}
                className="px-3 py-1 text-xs font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/50 rounded-lg hover:bg-emerald-900 transition-all ml-1"
                title="Restore normal all-tower supply"
              >
                Restore Normal
              </button>
            )}
          </div>

          {/* Interlock Safety Toggle */}
          <button
            onClick={() => setInterlockBypass(!interlockBypass)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all active:scale-95 ${
              interlockBypass
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Bypass safety interlock restrictions for simulation"
          >
            {interlockBypass ? (
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
            <span>{interlockBypass ? 'Interlock BYPASSED' : 'Interlock ARMED'}</span>
          </button>

          <button
            onClick={handleEnergizeAll}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition-colors active:scale-95"
          >
            Energize All
          </button>

          <button
            onClick={handleIsolateAll}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 transition-colors active:scale-95"
          >
            Isolate All
          </button>
        </div>
      </div>

      {/* Grid of 5 Tower Switches + 1 Bypass Switch */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Main 5 Tower Section Switches */}
        {switches.map((sw) => {
          const isClosed = sw.state === 'CLOSED';
          const load = getSectionLoad(sw.section_id);
          const hardwareState = hardwareDevice.output_states[sw.section_id || ''] || 'OFF';

          return (
            <div
              key={sw.id}
              className={`relative rounded-xl border p-3 flex flex-col justify-between transition-all duration-300 ${
                isClosed
                  ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                  : 'bg-slate-950/90 border-rose-500/30 shadow-lg shadow-rose-500/5'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs md:text-sm font-black font-mono text-white bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                    {sw.section_id}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                      isClosed
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50'
                        : 'bg-rose-950/80 text-rose-400 border-rose-500/50'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isClosed ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                      }`}
                    />
                    {sw.state}
                  </span>
                </div>

                <h3 className="text-xs md:text-sm font-bold text-slate-100 line-clamp-1 mb-1" title={sw.name}>
                  {load?.name || sw.name}
                </h3>

                {/* Demand & Category */}
                <div className="flex items-center justify-between text-xs text-slate-300 font-mono mb-2">
                  <span>Demand:</span>
                  <span className={isClosed ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
                    {load ? `${load.demand_kw} kW` : '0 kW'}
                  </span>
                </div>
              </div>

              {/* Hardware Bridge Indicator */}
              <div className="bg-slate-950/70 rounded-lg p-2 border border-slate-800 mb-3 text-xs font-mono flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>GPIO {sw.gpio_pin}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Relay:</span>
                  <span
                    className={`font-black ${
                      hardwareState === 'ON' ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {hardwareState}
                  </span>
                  {physicalSyncEnabled && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-0.5" />
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => toggleSwitch(sw.switch_id, interlockBypass)}
                className={`w-full py-2 px-3 rounded-xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 ${
                  isClosed
                    ? 'bg-rose-600/25 hover:bg-rose-600/35 text-rose-200 border border-rose-500/50'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                }`}
              >
                {isClosed ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-rose-400" />
                    <span>TRIP / OPEN</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4" />
                    <span>CLOSE / ENERGIZE</span>
                  </>
                )}
              </button>

              <div className="mt-2 text-center text-[9px] text-slate-500 font-mono">
                {sw.last_operated || 'Online'}
              </div>
            </div>
          );
        })}

        {/* DEDICATED CARD: Alternate Route Bypass Switch */}
        <div
          className={`relative rounded-xl border p-3 flex flex-col justify-between transition-all duration-300 ${
            isBypassClosed
              ? 'bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-950/90 border-slate-700/60'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                BYPASS
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  isBypassClosed
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isBypassClosed ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                {bypassSwitchState}
              </span>
            </div>

            <h3 className="text-xs font-semibold text-white mb-1 flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bypass Switch</span>
            </h3>

            <p className="text-[10px] text-slate-400 leading-tight mb-2">
              Bypasses isolated sections and powers remaining healthy towers.
            </p>
          </div>

          <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800 mb-3 text-[10px] font-mono text-center">
            <span className="text-slate-400 block text-[9px]">CONNECTION MODE</span>
            <span className={isBypassClosed ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
              {isBypassClosed ? 'ISOLATION & BYPASS (ON)' : 'NORMAL CONNECTION'}
            </span>
          </div>

          <button
            onClick={toggleBypassSwitch}
            className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
              isBypassClosed
                ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {isBypassClosed ? (
              <>
                <ToggleRight className="w-4 h-4 text-slate-950" />
                <span>BYPASS ON (ACTIVE)</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-slate-400" />
                <span>TURN BYPASS ON</span>
              </>
            )}
          </button>

          <div className="mt-2 text-center text-[9px] text-slate-500 font-mono">
            {isBypassClosed ? 'Isolation Route Active' : 'Normal Main Line Route'}
          </div>
        </div>
      </div>
    </div>
  );
};
