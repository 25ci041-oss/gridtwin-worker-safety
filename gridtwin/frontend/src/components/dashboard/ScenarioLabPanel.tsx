import React from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  Sliders,
  Play,
  ShieldAlert,
  Sun,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  GitBranch
} from 'lucide-react';

export const ScenarioLabPanel: React.FC = () => {
  const { triggerScenario, connectivity, switches } = useGridStore();

  const scenarios = [
    {
      id: 'nominal',
      name: 'Nominal Full Grid Operation',
      badge: 'STANDARD',
      badgeColor: 'bg-emerald-950 text-emerald-400 border-emerald-500/30',
      description: 'All 5 distribution reclosers closed. All consumer categories energized under balanced 1.00 p.u. nominal voltage profile.',
      icon: CheckCircle2,
      impact: 'Served Demand: 2173.7 kW (100%)',
    },
    {
      id: 't3_isolated_bypass',
      name: 'Tower 3 Fault Isolation & Alternate Route Bypass',
      badge: 'ALTERNATE ROUTE (N-1)',
      badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-400/50 shadow-sm shadow-cyan-500/20',
      description: 'Breakers on both sides of Tower 3 open to isolate transmission fault. Bypass Switch immediately CLOSES, rerouting power from T1/T2 to T4/T5.',
      icon: GitBranch,
      impact: 'T1, T2, T4, T5 100% Supplied via Bypass (1760.9 kW served)',
    },
    {
      id: 'fault_feeder2',
      name: 'Section 2 Commercial Feeder Ground Fault',
      badge: 'FAULT INJECTION',
      badgeColor: 'bg-rose-950 text-rose-400 border-rose-500/30',
      description: 'Simulates high-current line-to-ground fault on Feeder Trunk 2. Protective relay trips SW-T2 in 40ms to isolate the fault.',
      icon: AlertTriangle,
      impact: 'Isolates Commercial Plaza (520 kW shed)',
    },
    {
      id: 'industrial_maintenance',
      name: 'Scheduled Feeder 4 Industrial Maintenance',
      badge: 'MAINTENANCE',
      badgeColor: 'bg-amber-950 text-amber-400 border-amber-500/30',
      description: 'Controlled isolation of Industrial Park Feeder for transformer oil sampling and insulator washing with safety interlocks engaged.',
      icon: Wrench,
      impact: 'Isolates Titan Precision (685 kW shed)',
    },
    {
      id: 'island_hospital',
      name: 'Emergency Priority Islanding (Hospital Critical Care)',
      badge: 'CONTINGENCY',
      badgeColor: 'bg-cyan-950 text-cyan-400 border-cyan-500/30',
      description: 'Automated selective load shedding: isolates non-critical Feeders 1, 2, and 4 while preserving supply to Hospital Trauma Center and Solar Microgrid.',
      icon: ShieldAlert,
      impact: 'Preserves Critical Life Support (623.2 kW preserved)',
    },
    {
      id: 'blackout',
      name: 'Total Substation Blackout & Islanding',
      badge: 'BLACKOUT',
      badgeColor: 'bg-purple-950 text-purple-400 border-purple-500/30',
      description: 'Trips all distribution switches simultaneously. Prepares grid for step-by-step black start restoration protocol.',
      icon: RotateCcw,
      impact: 'Total De-energization (0 kW served)',
    },
  ];

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6 select-none">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white tracking-wide">
            VIRTUAL LABORATORY SCENARIO SIMULATOR
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Execute contingency simulations, test protection coordination logic, and observe automatic low-voltage load shedding.
        </p>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          return (
            <div
              key={sc.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-4 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${sc.badgeColor}`}>
                    {sc.badge}
                  </span>
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">{sc.name}</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">{sc.description}</p>
              </div>

              <div>
                <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800/80 text-[11px] font-mono text-cyan-400 mb-3">
                  {sc.impact}
                </div>
                <button
                  onClick={() => triggerScenario(sc.id)}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-cyan-600/20 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/40 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute Scenario</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
