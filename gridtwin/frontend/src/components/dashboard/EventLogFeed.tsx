import React, { useState } from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  Info,
  Clock,
  Terminal,
  Trash2
} from 'lucide-react';

export const EventLogFeed: React.FC = () => {
  const { eventLogs, alerts, clearAlerts } = useGridStore();
  const [filter, setFilter] = useState<'all' | 'switch' | 'system' | 'alerts'>('all');

  const filteredLogs = eventLogs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'switch') return log.type === 'SWITCH_OP';
    if (filter === 'system') return log.type === 'SYSTEM' || log.type === 'SCENARIO';
    return true;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
      {/* Feed Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            SCADA Event & Alarm Log
          </h3>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
            {eventLogs.length}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 text-[11px] font-medium">
          {(['all', 'switch', 'system', 'alerts'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-2 py-0.5 rounded capitalize transition-colors ${
                filter === mode
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Active Alerts Banner if any */}
      {alerts.length > 0 && filter === 'alerts' && (
        <div className="flex flex-col gap-2">
          {alerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                alt.severity === 'CRITICAL'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  : alt.severity === 'WARNING'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{alt.source}</span>
                  <span className="font-mono text-[10px] opacity-75">{alt.timestamp}</span>
                </div>
                <p className="mt-0.5">{alt.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event Logs List */}
      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
          >
            <Clock className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />
            <span className="text-slate-400 text-[10px] flex-shrink-0">
              [{log.timestamp}]
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                log.type === 'SWITCH_OP'
                  ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                  : log.type === 'SCENARIO'
                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {log.type}
            </span>
            <span className="text-slate-200 flex-1">{log.event}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
