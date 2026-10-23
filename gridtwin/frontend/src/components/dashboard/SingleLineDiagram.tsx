import React from 'react';
import { useGridStore } from '../../store/useGridStore';
import { SwitchState } from '../../types';
import {
  Zap,
  CheckCircle2,
  GitFork,
  Maximize2,
  ShieldCheck,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const SingleLineDiagram: React.FC = () => {
  const {
    switches,
    toggleSwitch,
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

  const isBypassClosed = bypassSwitchState === 'CLOSED';
  const switchMap = switches.reduce((acc, s) => ({ ...acc, [s.switch_id]: s.state }), {} as Record<string, SwitchState>);

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
    { id: 'T1' as const, x: 200, isLive: t1Live, isIso: isT1Iso, swId: 'SW-T1' },
    { id: 'T2' as const, x: 350, isLive: t2Live, isIso: isT2Iso, swId: 'SW-T2' },
    { id: 'T3' as const, x: 500, isLive: t3Live, isIso: isT3Iso, swId: 'SW-T3' },
    { id: 'T4' as const, x: 650, isLive: t4Live, isIso: isT4Iso, swId: 'SW-T4' },
    { id: 'T5' as const, x: 800, isLive: t5Live, isIso: isT5Iso, swId: 'SW-T5' },
  ];

  return (
    <div className="w-full bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl select-none flex flex-col gap-4">
      {/* Header matching Screenshot */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              GridTwin — Five-Tower Transmission & Universal Front Bypass Grid
            </h2>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              {isBypassClosed && isoList.length > 0
                ? `Bypass Active: Isolation connection around [${isoList.join(', ')}] (0 A) | Remaining powered via alternate bypass route`
                : !isBypassClosed && isoList.length > 0
                ? `ALERT: Bypass is OPEN while Tower(s) [${isoList.join(', ')}] Isolated! Turn Bypass ON to restore downstream power.`
                : isBypassClosed
                ? 'Bypass ON: Alternate bypass bus energized in parallel (standby ready) | All 5 towers energized'
                : 'Normal Connection: All 5 towers energized via main transmission route | Bypass standby'}
            </p>
          </div>
        </div>

        {/* Right Action Badges & Fullscreen matching Screenshot */}
        <div className="flex items-center gap-2">
          {/* Normal Connection / Status Badge */}
          <button
            onClick={restoreNormalOperation}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              !isBypassClosed && isoList.length === 0
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-sm shadow-emerald-500/20'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Normal</span>
          </button>

          {/* Bypass Standby / Active Toggle Button */}
          <button
            onClick={toggleBypassSwitch}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold font-mono border transition-all ${
              isBypassClosed
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 shadow-sm'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isBypassClosed ? 'Bypass Active' : 'Bypass Standby'}</span>
          </button>

          {/* Fullscreen Expand Icon */}
          <button
            onClick={() => {
              const elem = document.documentElement;
              if (!document.fullscreenElement) {
                elem.requestFullscreen?.().catch(() => {});
              } else {
                document.exitFullscreen?.().catch(() => {});
              }
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive SVG Diagram matching Screenshot */}
      <div className="w-full bg-[#070e24] border border-slate-800/80 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Subtle Cyber Grid Background Pattern */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <svg viewBox="0 0 1000 320" className="w-full max-w-5xl h-auto drop-shadow-2xl z-10">
          <defs>
            {/* Directional Arrow Marker */}
            <marker id="cyan-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#0ea5e9" />
            </marker>
            <marker id="purple-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#c084fc" />
            </marker>
          </defs>

          {/* 1. SOURCE on the Left */}
          <g transform="translate(70, 130)">
            <circle cx="0" cy="0" r="26" fill="#0b1736" stroke="#0ea5e9" strokeWidth="2.5" />
            {/* AC Sine Wave */}
            <path
              d="M -13 0 Q -6.5 -12 0 0 T 13 0"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <text x="0" y="44" fill="#cbd5e1" fontSize="12" textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">
              Source
            </text>
          </g>

          {/* Line: Source -> Tower 1 */}
          <line
            x1="96"
            y1="130"
            x2="175"
            y2="130"
            stroke={t1Live ? '#0ea5e9' : '#ef4444'}
            strokeWidth="3.5"
            strokeDasharray={t1Live ? undefined : '5 5'}
          />
          {t1Live && (
            <path d="M 130 126 L 138 130 L 130 134 Z" fill="#0ea5e9" />
          )}

          {/* 2. TOWERS T1, T2, T3, T4, T5 */}
          {towers.map((t) => (
            <g key={t.id} transform={`translate(${t.x}, 130)`} className="cursor-pointer" onClick={() => isolateTower(t.id)}>
              {/* Outer Glow Ring */}
              <circle
                cx="0"
                cy="0"
                r="22"
                fill="#07132c"
                stroke={t.isLive ? '#10b981' : '#ef4444'}
                strokeWidth="2.5"
                className="transition-colors duration-300"
              />

              {/* Stylized Transmission Tower Pylon Inside */}
              <g stroke={t.isLive ? '#34d399' : '#ef4444'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {/* 2 Slanted Legs */}
                <line x1="-8" y1="12" x2="0" y2="-12" />
                <line x1="8" y1="12" x2="0" y2="-12" />
                {/* Lower Crossarm */}
                <line x1="-12" y1="0" x2="12" y2="0" />
                {/* Upper Crossarm */}
                <line x1="-8" y1="-6" x2="8" y2="-6" />
                {/* Base tie */}
                <line x1="-6" y1="8" x2="6" y2="8" />
              </g>

              {/* Tower Label */}
              <text x="0" y="-30" fill="#f8fafc" fontSize="13" textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">
                {t.id}
              </text>
            </g>
          ))}

          {/* Line T1 -> T2 with Breaker SW-T2 */}
          <line x1="222" y1="130" x2="260" y2="130" stroke={t1Live && t2Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t1Live && t2Live ? undefined : '5 5'} />
          <g transform="translate(275, 130)" className="cursor-pointer" onClick={() => toggleSwitch('SW-T2')}>
            <rect x="-14" y="-12" width="28" height="24" rx="4" fill="#07132c" stroke={switchMap['SW-T2'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2" />
            <line x1="-7" y1="0" x2="7" y2="0" stroke={switchMap['SW-T2'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="3" />
          </g>
          <line x1="290" y1="130" x2="328" y2="130" stroke={t1Live && t2Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t1Live && t2Live ? undefined : '5 5'} />
          {t1Live && t2Live && <path d="M 312 126 L 320 130 L 312 134 Z" fill="#0ea5e9" />}

          {/* Line T2 -> T3 with Breaker SW-T3 */}
          <line x1="372" y1="130" x2="410" y2="130" stroke={t2Live && t3Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t2Live && t3Live ? undefined : '5 5'} />
          <g transform="translate(425, 130)" className="cursor-pointer" onClick={() => toggleSwitch('SW-T3')}>
            <rect x="-14" y="-12" width="28" height="24" rx="4" fill="#07132c" stroke={switchMap['SW-T3'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2" />
            <line x1="-7" y1="0" x2="7" y2="0" stroke={switchMap['SW-T3'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="3" />
          </g>
          <line x1="440" y1="130" x2="478" y2="130" stroke={t2Live && t3Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t2Live && t3Live ? undefined : '5 5'} />
          {t2Live && t3Live && <path d="M 462 126 L 470 130 L 462 134 Z" fill="#0ea5e9" />}

          {/* Line T3 -> T4 with Breaker SW-T4 */}
          <line x1="522" y1="130" x2="560" y2="130" stroke={t3Live && t4Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t3Live && t4Live ? undefined : '5 5'} />
          <g transform="translate(575, 130)" className="cursor-pointer" onClick={() => toggleSwitch('SW-T4')}>
            <rect x="-14" y="-12" width="28" height="24" rx="4" fill="#07132c" stroke={switchMap['SW-T4'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2" />
            <line x1="-7" y1="0" x2="7" y2="0" stroke={switchMap['SW-T4'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="3" />
          </g>
          <line x1="590" y1="130" x2="628" y2="130" stroke={t3Live && t4Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t3Live && t4Live ? undefined : '5 5'} />
          {t3Live && t4Live && <path d="M 612 126 L 620 130 L 612 134 Z" fill="#0ea5e9" />}

          {/* Line T4 -> T5 with Breaker SW-T5 */}
          <line x1="672" y1="130" x2="710" y2="130" stroke={t4Live && t5Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t4Live && t5Live ? undefined : '5 5'} />
          <g transform="translate(725, 130)" className="cursor-pointer" onClick={() => toggleSwitch('SW-T5')}>
            <rect x="-14" y="-12" width="28" height="24" rx="4" fill="#07132c" stroke={switchMap['SW-T5'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2" />
            <line x1="-7" y1="0" x2="7" y2="0" stroke={switchMap['SW-T5'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="3" />
          </g>
          <line x1="740" y1="130" x2="778" y2="130" stroke={t4Live && t5Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t4Live && t5Live ? undefined : '5 5'} />
          {t4Live && t5Live && <path d="M 762 126 L 770 130 L 762 134 Z" fill="#0ea5e9" />}

          {/* Line T5 -> LOAD */}
          <line x1="822" y1="130" x2="905" y2="130" stroke={t5Live ? '#0ea5e9' : '#475569'} strokeWidth="3.5" />
          {t5Live && <path d="M 865 126 L 873 130 L 865 134 Z" fill="#0ea5e9" />}

          {/* Load Facility Box on Right */}
          <g transform="translate(930, 130)">
            <rect x="-24" y="-22" width="48" height="44" rx="8" fill="#0b1736" stroke="#0ea5e9" strokeWidth="2.5" />
            {/* Electrical factory / transformer glyph */}
            <path
              d="M -12 8 L -12 -6 L -4 -6 L -4 8 M -4 8 L 4 8 M 4 8 L 4 -12 L 12 -12 L 12 8"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <text x="0" y="44" fill="#cbd5e1" fontSize="12" textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">
              Load
            </text>
          </g>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* 3. PURPLE BYPASS ROUTE AT BOTTOM                           */}
          {/* ─────────────────────────────────────────────────────────── */}
          {/* Drop line from T1 to Bypass Bus */}
          <line x1="200" y1="152" x2="200" y2="235" stroke="#a855f7" strokeWidth="3" />
          {/* Disconnect box on T1 drop */}
          <g transform="translate(200, 195)">
            <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#07132c" stroke="#a855f7" strokeWidth="2" />
            <line x1="-5" y1="0" x2="5" y2="0" stroke="#a855f7" strokeWidth="2.5" />
          </g>

          {/* Horizontal bypass bus to central switch */}
          <line x1="200" y1="235" x2="435" y2="235" stroke="#a855f7" strokeWidth="3.5" />
          <path d="M 320 231 L 328 235 L 320 239 Z" fill="#a855f7" />

          {/* CENTRAL BYPASS SWITCH (INTERACTIVE BOX) */}
          <g transform="translate(500, 235)" className="cursor-pointer" onClick={toggleBypassSwitch}>
            <rect
              x="-65"
              y="-18"
              width="130"
              height="36"
              rx="8"
              fill={isBypassClosed ? '#2e1065' : '#1e1b4b'}
              stroke="#a855f7"
              strokeWidth="2.5"
            />
            <text x="0" y="-3" fill="#f8fafc" fontSize="11" textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">
              Bypass Switch
            </text>
            <text
              x="0"
              y="11"
              fill={isBypassClosed ? '#4ade80' : '#f87171'}
              fontSize="10"
              textAnchor="middle"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {isBypassClosed ? 'CLOSED' : 'OPEN'}
            </text>
          </g>

          {/* Horizontal bypass bus from central switch to T4 and T5 */}
          <line x1="565" y1="235" x2="800" y2="235" stroke="#a855f7" strokeWidth="3.5" />
          <path d="M 680 231 L 688 235 L 680 239 Z" fill="#a855f7" />

          {/* Riser tap to T4 */}
          <line x1="650" y1="235" x2="650" y2="152" stroke="#a855f7" strokeWidth="3" />
          <g transform="translate(650, 195)">
            <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#07132c" stroke="#a855f7" strokeWidth="2" />
            <line x1="-5" y1="0" x2="5" y2="0" stroke="#a855f7" strokeWidth="2.5" />
          </g>

          {/* Riser tap to T5 */}
          <line x1="800" y1="235" x2="800" y2="152" stroke="#a855f7" strokeWidth="3" />
          <g transform="translate(800, 195)">
            <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#07132c" stroke="#a855f7" strokeWidth="2" />
            <line x1="-5" y1="0" x2="5" y2="0" stroke="#a855f7" strokeWidth="2.5" />
          </g>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* 4. LEGEND STRIP AT BOTTOM matching Screenshot              */}
          {/* ─────────────────────────────────────────────────────────── */}
          <g transform="translate(40, 290)">
            {/* 1. Main Route */}
            <g transform="translate(50, 0)">
              <line x1="0" y1="0" x2="26" y2="0" stroke="#0ea5e9" strokeWidth="3" />
              <path d="M 22 -3 L 28 0 L 22 3 Z" fill="#0ea5e9" />
              <text x="35" y="4" fill="#cbd5e1" fontSize="11" fontFamily="sans-serif">Main Transmission Route</text>
            </g>

            {/* 2. Bypass Route */}
            <g transform="translate(260, 0)">
              <line x1="0" y1="0" x2="26" y2="0" stroke="#a855f7" strokeWidth="3" />
              <path d="M 22 -3 L 28 0 L 22 3 Z" fill="#a855f7" />
              <text x="35" y="4" fill="#cbd5e1" fontSize="11" fontFamily="sans-serif">Bypass Route</text>
            </g>

            {/* 3. Closed Breaker */}
            <g transform="translate(430, 0)">
              <rect x="0" y="-8" width="18" height="16" rx="3" fill="#07132c" stroke="#10b981" strokeWidth="2" />
              <line x1="4" y1="0" x2="14" y2="0" stroke="#10b981" strokeWidth="2" />
              <text x="26" y="4" fill="#cbd5e1" fontSize="11" fontFamily="sans-serif">Breaker / Switch (Closed)</text>
            </g>

            {/* 4. Open Breaker */}
            <g transform="translate(620, 0)">
              <rect x="0" y="-8" width="18" height="16" rx="3" fill="#07132c" stroke="#ef4444" strokeWidth="2" />
              <line x1="4" y1="3" x2="14" y2="-3" stroke="#ef4444" strokeWidth="2" />
              <text x="26" y="4" fill="#cbd5e1" fontSize="11" fontFamily="sans-serif">Breaker / Switch (Open)</text>
            </g>

            {/* 5. Isolated Section */}
            <g transform="translate(805, 0)">
              <line x1="0" y1="0" x2="30" y2="0" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="5 4" />
              <text x="38" y="4" fill="#cbd5e1" fontSize="11" fontFamily="sans-serif">Isolated Section</text>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
};
