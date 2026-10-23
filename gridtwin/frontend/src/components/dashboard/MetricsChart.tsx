import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useGridStore } from '../../store/useGridStore';
import { BarChart3, TrendingUp, Zap, Activity } from 'lucide-react';

export const MetricsChart: React.FC = () => {
  const { metricsHistory, currentMetric, connectivity } = useGridStore();
  const [metricView, setMetricView] = useState<'power' | 'voltage' | 'frequency'>('power');

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span>REAL-TIME POWER & TELEMETRY ANALYTICS</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-mono">
            High-speed SCADA telemetry polling at 500ms intervals.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'power', label: 'Power (P & Q)', icon: Zap },
            { id: 'voltage', label: 'Voltage & Current', icon: BarChart3 },
            { id: 'frequency', label: 'Grid Frequency', icon: Activity },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = metricView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setMetricView(item.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {metricView === 'power' ? (
            <AreaChart data={metricsHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="powerKwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="reactiveKvarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timestamp" stroke="#64748b" fontSize={11} fontFamily="monospace" />
              <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" unit=" kW" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                itemStyle={{ fontSize: '12px', fontFamily: 'monospace' }}
              />
              <Area
                type="monotone"
                dataKey="active_power_kw"
                name="Active Power P (kW)"
                stroke="#38bdf8"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#powerKwGrad)"
              />
              <Area
                type="monotone"
                dataKey="reactive_power_kvar"
                name="Reactive Power Q (kVAR)"
                stroke="#fbbf24"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#reactiveKvarGrad)"
              />
            </AreaChart>
          ) : metricView === 'voltage' ? (
            <LineChart data={metricsHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timestamp" stroke="#64748b" fontSize={11} fontFamily="monospace" />
              <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" domain={[10800, 11200]} unit=" V" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                itemStyle={{ fontSize: '12px', fontFamily: 'monospace' }}
              />
              <Line
                type="monotone"
                dataKey="voltage_v"
                name="Phase-to-Phase Voltage (V)"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          ) : (
            <LineChart data={metricsHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timestamp" stroke="#64748b" fontSize={11} fontFamily="monospace" />
              <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" domain={[49.8, 50.2]} unit=" Hz" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                itemStyle={{ fontSize: '12px', fontFamily: 'monospace' }}
              />
              <Line
                type="monotone"
                dataKey="frequency_hz"
                name="System Frequency (Hz)"
                stroke="#06b6d4"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Live Data Summary Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs font-mono">
        <div>
          <span className="text-slate-400 block text-[10px]">CURRENT P (ACTIVE):</span>
          <span className="text-cyan-400 font-bold text-sm">{currentMetric.active_power_kw.toFixed(1)} kW</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">CURRENT Q (REACTIVE):</span>
          <span className="text-amber-400 font-bold text-sm">{currentMetric.reactive_power_kvar.toFixed(1)} kVAR</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">SYSTEM VOLTAGE:</span>
          <span className="text-emerald-400 font-bold text-sm">{currentMetric.voltage_v.toFixed(0)} V</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">GRID FREQUENCY:</span>
          <span className="text-sky-400 font-bold text-sm">{currentMetric.frequency_hz.toFixed(2)} Hz</span>
        </div>
      </div>
    </div>
  );
};
