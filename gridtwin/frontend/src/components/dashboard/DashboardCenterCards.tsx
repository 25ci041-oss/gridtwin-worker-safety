import React from 'react';
import { useGridStore } from '../../store/useGridStore';
import { Lightbulb, Zap, ArrowRight } from 'lucide-react';

export const DashboardCenterCards: React.FC = () => {
  const {
    connectivity,
    bypassSwitchState,
    isolatedTowerId,
    isolatedTowers = [],
  } = useGridStore();

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
    { id: 'T1', name: 'T1', isLive: t1Live, isIso: isT1Iso, kw: t1Live ? 428 : 0 },
    { id: 'T2', name: 'T2', isLive: t2Live, isIso: isT2Iso, kw: t2Live ? 432 : 0 },
    { id: 'T3', name: 'T3', isLive: t3Live, isIso: isT3Iso, kw: t3Live ? 430 : 0 },
    { id: 'T4', name: 'T4', isLive: t4Live, isIso: isT4Iso, kw: t4Live ? 431 : 0 },
    { id: 'T5', name: 'T5', isLive: t5Live, isIso: isT5Iso, kw: t5Live ? 452 : 0 },
  ];

  const totalKw = towers.reduce((acc, t) => acc + t.kw, 0);
  const percentServed = Math.min(100, Math.round((totalKw / 2173.7) * 100));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left Card: How It Works */}
      <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl select-none">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-wide">How It Works</h3>
        </div>

        <div className="flex flex-col gap-3">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <div>
              <h4 className="text-xs font-bold text-white">Normal Operation</h4>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Main route active, bypass open.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <div>
              <h4 className="text-xs font-bold text-white">Fault / Tower Isolation</h4>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Detect fault / command → Open breakers on isolated towers (T1, T3, etc.).
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <div>
              <h4 className="text-xs font-bold text-white">Isolate Towers</h4>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Isolated towers are disconnected and receive ZERO current (0 A).
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-cyan-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              4
            </span>
            <div>
              <h4 className="text-xs font-bold text-white">Enable Front Bypass</h4>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Front bypass bus routes current around isolated towers to remaining towers.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-teal-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              5
            </span>
            <div>
              <h4 className="text-xs font-bold text-white">Restore</h4>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Turning off isolation restores current flow through the main route.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Card: Tower Status & Power Flow */}
      <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl flex flex-col justify-between select-none">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide">Tower Status & Power Flow</h3>
          </div>

          {/* Table */}
          <div className="w-full">
            <div className="grid grid-cols-4 text-[11px] font-bold text-slate-400 uppercase font-mono pb-2 border-b border-slate-800">
              <span>Tower</span>
              <span>Status</span>
              <span className="text-center font-normal text-slate-500">➔</span>
              <span className="text-right">Power Flow</span>
            </div>

            <div className="flex flex-col divide-y divide-slate-800/60 font-mono text-xs">
              {towers.map((t) => (
                <div key={t.id} className="grid grid-cols-4 items-center py-2">
                  <span className="font-bold text-white">{t.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        t.isLive ? 'bg-emerald-400' : 'bg-rose-500'
                      }`}
                    />
                    <span className={t.isLive ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                      {t.isLive ? 'Supplied' : 'Isolated (0 A)'}
                    </span>
                  </div>
                  <span className="text-center text-emerald-400 font-bold">➔</span>
                  <span className={`text-right font-bold ${t.isLive ? 'text-white' : 'text-slate-500'}`}>
                    {t.kw > 0 ? `${t.kw} kW` : '0 kW'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Total Load Progress Bar */}
        <div className="pt-4 border-t border-slate-800/80 mt-2">
          <div className="flex items-center justify-between text-xs font-mono mb-1.5">
            <span className="text-slate-400 font-semibold">Total Load</span>
            <span className="font-bold text-white">{totalKw.toFixed(1)} kW</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentServed}%` }}
              />
            </div>
            <span className="text-xs font-bold font-mono text-emerald-400">{percentServed}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
