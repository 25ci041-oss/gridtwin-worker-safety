import React from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  X,
  Zap,
  Activity,
  Layers,
  Power,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const ElementInspectorModal: React.FC = () => {
  const { selectedElement, setSelectedElement, toggleSwitch, switches } = useGridStore();

  if (!selectedElement) return null;

  const isSwitch = selectedElement.type === 'switch';
  const switchObj = isSwitch ? switches.find(s => s.switch_id === selectedElement.id) : null;
  const isClosed = switchObj ? switchObj.state === 'CLOSED' : selectedElement.status?.includes('ENERGIZED');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative select-none">
        {/* Close Button */}
        <button
          onClick={() => setSelectedElement(null)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3 border-b border-slate-800 pb-4 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {selectedElement.type}
              </span>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {selectedElement.id}
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-1">
              {selectedElement.title}
            </h2>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-4 flex items-center justify-between font-mono text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">OPERATIONAL STATE</span>
            <span
              className={`font-bold flex items-center gap-1.5 ${
                isClosed ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isClosed ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              {selectedElement.status}
            </span>
          </div>

          {selectedElement.power_kw !== undefined && (
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">ACTIVE FLOW</span>
              <span className="font-bold text-cyan-400 text-sm">
                {selectedElement.power_kw} kW
              </span>
            </div>
          )}
        </div>

        {/* Detailed Specs Table */}
        <div className="space-y-2 mb-6">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Specifications & SCADA Telemetry</span>
          </h3>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl divide-y divide-slate-800/60 overflow-hidden text-xs font-mono">
            {Object.entries(selectedElement.details).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between p-2.5">
                <span className="text-slate-400">{key}</span>
                <span className="text-slate-200 font-semibold">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center gap-3">
          {isSwitch && (
            <button
              onClick={() => {
                toggleSwitch(selectedElement.id);
                setSelectedElement(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                isClosed
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-600/20'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isClosed ? 'Trip / Open Switch' : 'Close / Energize Switch'}</span>
            </button>
          )}

          <button
            onClick={() => setSelectedElement(null)}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-center"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
