import React from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  Activity,
  Gauge,
  Zap,
  Radio,
  Power,
  Flame
} from 'lucide-react';

export const KPIBar: React.FC = () => {
  const { currentMetric, connectivity, hardwareDevice } = useGridStore();

  const servedPercent = Math.round((connectivity.served_demand_kw / connectivity.total_demand_kw) * 100);
  const activeFeedersCount = connectivity.energized_loads.length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3.5 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-[#070d1e] border-b border-slate-800/80 select-none">
      {/* KPI 1: Active Demand */}
      <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between shadow-md hover:border-emerald-500/40 transition-all">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 fill-emerald-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Active Demand
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-xl font-black font-mono text-white tracking-tight">
                {connectivity.served_demand_kw.toFixed(1)}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-300 font-mono font-medium">kW</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-emerald-400 font-semibold block mt-0.5">
              {servedPercent}% Served
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 sm:mt-3 overflow-hidden">
          <div
            className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-emerald-400"
            style={{ width: `${servedPercent}%` }}
          />
        </div>
      </div>

      {/* KPI 2: Bus Voltage */}
      <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between shadow-md hover:border-blue-500/40 transition-all">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 fill-blue-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Bus Voltage
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-xl font-black font-mono text-white tracking-tight">
                {(currentMetric.voltage_v / 1000).toFixed(2)}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-300 font-mono font-medium">kV</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-blue-400 font-semibold block mt-0.5">
              Normal (±2%)
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 sm:mt-3 overflow-hidden">
          <div className="bg-blue-500 h-full rounded-full w-[96%] shadow-sm shadow-blue-400" />
        </div>
      </div>

      {/* KPI 3: Grid Frequency */}
      <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between shadow-md hover:border-cyan-500/40 transition-all">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              System Frequency
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-xl font-black font-mono text-white tracking-tight">
                {currentMetric.frequency_hz.toFixed(2)}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-300 font-mono font-medium">Hz</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-cyan-400 font-semibold block mt-0.5">
              Stable Grid
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 sm:mt-3 overflow-hidden">
          <div className="bg-cyan-400 h-full rounded-full w-[99%] shadow-sm shadow-cyan-400" />
        </div>
      </div>

      {/* KPI 4: Power Factor */}
      <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between shadow-md hover:border-amber-500/40 transition-all">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Power Factor
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-xl font-black font-mono text-white tracking-tight">
                {currentMetric.power_factor.toFixed(3)}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-300 font-mono font-medium">Lag</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-amber-400 font-semibold block mt-0.5 truncate">
              Q: {currentMetric.reactive_power_kvar.toFixed(0)} kVAR
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 sm:mt-3 overflow-hidden">
          <div className="bg-amber-400 h-full rounded-full w-[94%] shadow-sm shadow-amber-400" />
        </div>
      </div>

      {/* KPI 5: Feeders Energized */}
      <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between shadow-md hover:border-emerald-500/40 transition-all">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Power className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Active Feeders
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-xl font-black font-mono text-white tracking-tight">
                {activeFeedersCount} / 5
              </span>
              <span className="text-[10px] sm:text-xs text-slate-300 font-mono font-medium">Closed</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-emerald-400 font-semibold block mt-0.5 truncate">
              {activeFeedersCount === 5 ? 'All Feeders Supplied' : `${5 - activeFeedersCount} Isolated`}
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 sm:mt-3 overflow-hidden">
          <div
            className="bg-emerald-400 h-full rounded-full transition-all duration-300 shadow-sm shadow-emerald-400"
            style={{ width: `${(activeFeedersCount / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* KPI 6: Physical Twin Link */}
      <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between shadow-md hover:border-cyan-500/40 transition-all">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Physical ESP32
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-xl font-black font-mono text-white tracking-tight">
                {hardwareDevice.status}
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-cyan-400 font-semibold block mt-0.5 truncate">
              Ping: {hardwareDevice.roundtrip_latency_ms || 18} ms
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 sm:mt-3 overflow-hidden">
          <div className="bg-cyan-400 h-full rounded-full w-full shadow-sm shadow-cyan-400" />
        </div>
      </div>
    </div>
  );
};
