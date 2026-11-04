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
  RotateCcw,
  Power,
  FileText,
  ArrowLeftRight,
  Radio,
  Circle,
  Building,
  Home,
  Activity,
  Factory,
  Sun
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
    turnTowerOn,
    turnTowerOff,
    turnAllTowersOn,
    turnAllTowersOff,
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

  // Sections perfectly reflecting the 3D Digital Twin model
  const sections = [
    {
      id: 'T1' as const,
      swId: 'SW-T1',
      name: 'Tower 1',
      zone: 'Residential Sector',
      loadName: 'Residential Quarter',
      demandKw: 345.5,
      x: 195,
      isLive: t1Live,
      isIso: isT1Iso,
      category: 'residential',
    },
    {
      id: 'T2' as const,
      swId: 'SW-T2',
      name: 'Tower 2',
      zone: 'Commercial Corridor',
      loadName: 'Commercial Center',
      demandKw: 520.0,
      x: 350,
      isLive: t2Live,
      isIso: isT2Iso,
      category: 'commercial',
    },
    {
      id: 'T3' as const,
      swId: 'SW-T3',
      name: 'Tower 3',
      zone: 'Metropolitan Spine',
      loadName: 'Hospital & ER',
      demandKw: 412.8,
      x: 505,
      isLive: t3Live,
      isIso: isT3Iso,
      category: 'critical',
    },
    {
      id: 'T4' as const,
      swId: 'SW-T4',
      name: 'Tower 4',
      zone: 'Industrial Zone',
      loadName: 'Heavy Manufacturing',
      demandKw: 685.0,
      x: 660,
      isLive: t4Live,
      isIso: isT4Iso,
      category: 'industrial',
    },
    {
      id: 'T5' as const,
      swId: 'SW-T5',
      name: 'Tower 5',
      zone: 'Renewable Terminal',
      loadName: 'Solar Farm & BESS',
      demandKw: 210.4,
      x: 815,
      isLive: t5Live,
      isIso: isT5Iso,
      category: 'renewable',
    },
  ];

  return (
    <div className="w-full bg-[#071126]/95 border border-slate-800/90 rounded-2xl p-5 shadow-2xl select-none flex flex-col gap-4">
      {/* 1. Header with Title and Global Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shadow-md">
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
              <span>2D LAB — FIVE-TOWER TRANSMISSION & FRONT BYPASS SCHEMATIC</span>
            </h2>
            <p className="text-xs font-mono text-slate-300 mt-0.5">
              {isBypassClosed && isoList.length > 0
                ? `Bypass Active: Isolation barrier active around [${isoList.join(', ')}] (0 A) | Downstream fed via Universal Front Bypass Bus`
                : !isBypassClosed && isoList.length > 0
                ? `ALERT: Bypass OPEN while Tower(s) [${isoList.join(', ')}] Isolated! Turn Bypass ON to restore downstream power.`
                : isBypassClosed
                ? 'Bypass ON: Alternate bypass bus energized in parallel (standby ready) | All 5 towers energized'
                : 'Normal Connection: All 5 towers energized via main transmission corridor | Bypass in standby'}
            </p>
          </div>
        </div>

        {/* Action Badges */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={restoreNormalOperation}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95 ${
              !isBypassClosed && isoList.length === 0
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/25'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Normal State</span>
          </button>

          <button
            onClick={toggleBypassSwitch}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono border transition-all active:scale-95 ${
              isBypassClosed
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/70 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <GitFork className="w-4 h-4 text-cyan-400" />
            <span>{isBypassClosed ? 'Bypass Active' : 'Bypass Standby'}</span>
          </button>

          <button
            onClick={() => {
              const elem = document.documentElement;
              if (!document.fullscreenElement) {
                elem.requestFullscreen?.().catch(() => {});
              } else {
                document.exitFullscreen?.().catch(() => {});
              }
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Interactive 2D Digital Twin SVG Schematic (Matching 3D Twin) */}
      <div className="w-full bg-[#050b18] border border-slate-800/80 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
        {/* Subtle Cyber Grid Background Pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <svg viewBox="0 0 1000 480" className="w-full max-w-6xl h-auto drop-shadow-2xl z-10">
          <defs>
            <marker id="cyan-arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#0ea5e9" />
            </marker>
            <marker id="green-arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#10b981" />
            </marker>
            <marker id="purple-arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#c084fc" />
            </marker>
          </defs>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* A. 33/11kV PRIMARY SUBSTATION (SOURCE) ON THE LEFT           */}
          {/* ─────────────────────────────────────────────────────────── */}
          <g transform="translate(68, 110)">
            <rect x="-34" y="-30" width="68" height="60" rx="8" fill="#0b1736" stroke="#0ea5e9" strokeWidth="2.5" />
            {/* Substation Transformer Coils */}
            <circle cx="-10" cy="-4" r="14" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
            <circle cx="10" cy="-4" r="14" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
            <text x="0" y="44" fill="#f1f5f9" fontSize="12" textAnchor="middle" fontWeight="bold">
              33/11kV Substation
            </text>
            <text x="0" y="58" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
              GRID SOURCE (LIVE)
            </text>
          </g>

          {/* Incomer Line: Substation -> Tower 1 */}
          <line
            x1="102"
            y1="110"
            x2="170"
            y2="110"
            stroke={t1Live ? '#0ea5e9' : '#ef4444'}
            strokeWidth="3.5"
            strokeDasharray={t1Live ? undefined : '6 4'}
          />
          {t1Live && (
            <path d="M 132 106 L 140 110 L 132 114 Z" fill="#0ea5e9" />
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* B. MAIN TRANSMISSION CORRIDOR INTERLINK LINES & BREAKER BOXES */}
          {/* ─────────────────────────────────────────────────────────── */}
          {/* T1 -> T2 */}
          <line x1="220" y1="110" x2="252" y2="110" stroke={t1Live && t2Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t1Live && t2Live ? undefined : '5 4'} />
          <g transform="translate(268, 110)" className="cursor-pointer" onClick={() => toggleSwitch('SW-T2')}>
            <rect x="-14" y="-12" width="28" height="24" rx="5" fill="#07132c" stroke={switchMap['SW-T2'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2" />
            <line x1="-7" y1="0" x2="7" y2="0" stroke={switchMap['SW-T2'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="3" />
            <text x="0" y="24" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">SW-T2</text>
          </g>
          <line x1="284" y1="110" x2="325" y2="110" stroke={t1Live && t2Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t1Live && t2Live ? undefined : '5 4'} />
          {t1Live && t2Live && <path d="M 308 106 L 316 110 L 308 114 Z" fill="#0ea5e9" />}

          {/* T2 -> T3 */}
          <line x1="375" y1="110" x2="407" y2="110" stroke={t2Live && t3Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t2Live && t3Live ? undefined : '5 4'} />
          <g transform="translate(423, 110)" className="cursor-pointer" onClick={() => toggleSwitch('SW-T3')}>
            <rect x="-14" y="-12" width="28" height="24" rx="5" fill="#07132c" stroke={switchMap['SW-T3'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2" />
            <line x1="-7" y1="0" x2="7" y2="0" stroke={switchMap['SW-T3'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="3" />
            <text x="0" y="24" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">SW-T3</text>
          </g>
          <line x1="439" y1="110" x2="480" y2="110" stroke={t2Live && t3Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t2Live && t3Live ? undefined : '5 4'} />
          {t2Live && t3Live && <path d="M 463 106 L 471 110 L 463 114 Z" fill="#0ea5e9" />}

          {/* T3 -> T4 */}
          <line x1="530" y1="110" x2="562" y2="110" stroke={t3Live && t4Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t3Live && t4Live ? undefined : '5 4'} />
          <g transform="translate(578, 110)" className="cursor-pointer" onClick={() => toggleSwitch('SW-T4')}>
            <rect x="-14" y="-12" width="28" height="24" rx="5" fill="#07132c" stroke={switchMap['SW-T4'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2" />
            <line x1="-7" y1="0" x2="7" y2="0" stroke={switchMap['SW-T4'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="3" />
            <text x="0" y="24" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">SW-T4</text>
          </g>
          <line x1="594" y1="110" x2="635" y2="110" stroke={t3Live && t4Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t3Live && t4Live ? undefined : '5 4'} />
          {t3Live && t4Live && <path d="M 618 106 L 626 110 L 618 114 Z" fill="#0ea5e9" />}

          {/* T4 -> T5 */}
          <line x1="685" y1="110" x2="717" y2="110" stroke={t4Live && t5Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t4Live && t5Live ? undefined : '5 4'} />
          <g transform="translate(733, 110)" className="cursor-pointer" onClick={() => toggleSwitch('SW-T5')}>
            <rect x="-14" y="-12" width="28" height="24" rx="5" fill="#07132c" stroke={switchMap['SW-T5'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="2" />
            <line x1="-7" y1="0" x2="7" y2="0" stroke={switchMap['SW-T5'] === 'CLOSED' ? '#10b981' : '#ef4444'} strokeWidth="3" />
            <text x="0" y="24" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">SW-T5</text>
          </g>
          <line x1="749" y1="110" x2="790" y2="110" stroke={t4Live && t5Live ? '#0ea5e9' : '#ef4444'} strokeWidth="3" strokeDasharray={t4Live && t5Live ? undefined : '5 4'} />
          {t4Live && t5Live && <path d="M 773 106 L 781 110 L 773 114 Z" fill="#0ea5e9" />}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* C. VISUAL ISOLATION BLOCK INDICATORS (XX) ON SPANS         */}
          {/* ─────────────────────────────────────────────────────────── */}
          {isT1Iso && (
            <g>
              <g transform="translate(136, 110)">
                <rect x="-16" y="-12" width="32" height="24" rx="4" fill="#070e24" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="5" fill="#ef4444" fontSize="13" textAnchor="middle" fontWeight="black" fontFamily="sans-serif">XX</text>
              </g>
              <g transform="translate(242, 110)">
                <rect x="-16" y="-12" width="32" height="24" rx="4" fill="#070e24" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="5" fill="#ef4444" fontSize="13" textAnchor="middle" fontWeight="black" fontFamily="sans-serif">XX</text>
              </g>
            </g>
          )}

          {isT2Iso && (
            <g>
              <g transform="translate(242, 110)">
                <rect x="-16" y="-12" width="32" height="24" rx="4" fill="#070e24" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="5" fill="#ef4444" fontSize="13" textAnchor="middle" fontWeight="black" fontFamily="sans-serif">XX</text>
              </g>
              <g transform="translate(397, 110)">
                <rect x="-16" y="-12" width="32" height="24" rx="4" fill="#070e24" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="5" fill="#ef4444" fontSize="13" textAnchor="middle" fontWeight="black" fontFamily="sans-serif">XX</text>
              </g>
            </g>
          )}

          {isT3Iso && (
            <g>
              <g transform="translate(397, 110)">
                <rect x="-16" y="-12" width="32" height="24" rx="4" fill="#070e24" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="5" fill="#ef4444" fontSize="13" textAnchor="middle" fontWeight="black" fontFamily="sans-serif">XX</text>
              </g>
              <g transform="translate(552, 110)">
                <rect x="-16" y="-12" width="32" height="24" rx="4" fill="#070e24" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="5" fill="#ef4444" fontSize="13" textAnchor="middle" fontWeight="black" fontFamily="sans-serif">XX</text>
              </g>
            </g>
          )}

          {isT4Iso && (
            <g>
              <g transform="translate(552, 110)">
                <rect x="-16" y="-12" width="32" height="24" rx="4" fill="#070e24" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="5" fill="#ef4444" fontSize="13" textAnchor="middle" fontWeight="black" fontFamily="sans-serif">XX</text>
              </g>
              <g transform="translate(707, 110)">
                <rect x="-16" y="-12" width="32" height="24" rx="4" fill="#070e24" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="5" fill="#ef4444" fontSize="13" textAnchor="middle" fontWeight="black" fontFamily="sans-serif">XX</text>
              </g>
            </g>
          )}

          {isT5Iso && (
            <g>
              <g transform="translate(707, 110)">
                <rect x="-16" y="-12" width="32" height="24" rx="4" fill="#070e24" stroke="#ef4444" strokeWidth="1.5" />
                <text x="0" y="5" fill="#ef4444" fontSize="13" textAnchor="middle" fontWeight="black" fontFamily="sans-serif">XX</text>
              </g>
            </g>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* D. FIVE TRANSMISSION TOWERS T1 TO T5 & CONSUMER BRANCHES    */}
          {/* ─────────────────────────────────────────────────────────── */}
          {sections.map((sec) => {
            const towerColor = sec.isIso ? '#fbbf24' : sec.isLive ? '#0ea5e9' : '#64748b';
            const statusTextColor = sec.isIso ? '#f59e0b' : sec.isLive ? '#10b981' : '#94a3b8';

            return (
              <g key={sec.id}>
                {/* 1. Tower Top Billboard Badge matching 3D Twin */}
                <g transform={`translate(${sec.x}, 52)`}>
                  <rect
                    x="-38"
                    y="-18"
                    width="76"
                    height="32"
                    rx="8"
                    fill="#071126"
                    stroke={sec.isIso ? '#fbbf24' : '#0284c7'}
                    strokeWidth="1.5"
                  />
                  <text x="0" y="-3" fill="#ffffff" fontSize="11" textAnchor="middle" fontWeight="bold">
                    {sec.name}
                  </text>
                  <text x="0" y="9" fill={statusTextColor} fontSize="9" textAnchor="middle" fontWeight="extrabold" fontFamily="monospace">
                    {sec.isIso ? '● ISOLATED' : '● ON'}
                  </text>
                </g>

                {/* 2. Main High-Voltage Steel Lattice Pylon Vector Glyph */}
                <g
                  transform={`translate(${sec.x}, 110)`}
                  className="cursor-pointer group"
                  onClick={() => isolateTower(sec.id)}
                >
                  {/* Outer Circular Ring */}
                  <circle
                    cx="0"
                    cy="0"
                    r="24"
                    fill={sec.isIso ? '#2d1a04' : '#07132c'}
                    stroke={towerColor}
                    strokeWidth={sec.isIso ? '3.5' : '2.5'}
                    className="transition-colors duration-300"
                  />

                  {/* Steel Lattice Transmission Pylon Glyph */}
                  <g stroke={towerColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {/* 2 Slanted Corner Legs */}
                    <line x1="-9" y1="13" x2="0" y2="-13" />
                    <line x1="9" y1="13" x2="0" y2="-13" />
                    {/* Lower Wide Cantilever Crossarm */}
                    <line x1="-14" y1="1" x2="14" y2="1" />
                    {/* Upper Cantilever Crossarm */}
                    <line x1="-9" y1="-5" x2="9" y2="-5" />
                    {/* Foundation tie */}
                    <line x1="-7" y1="9" x2="7" y2="9" />
                    {/* Apex Warning Spire */}
                    <circle cx="0" cy="-14" r="1.5" fill={sec.isIso ? '#fbbf24' : '#ef4444'} />
                  </g>
                </g>

                {/* 3. PERPENDICULAR DROP FROM TOWER TO LOCAL STEP-DOWN SUBSTATION & LOAD */}
                {/* Branch line from tower down to local transformer */}
                <line
                  x1={sec.x}
                  y1="134"
                  x2={sec.x}
                  y2="178"
                  stroke={sec.isLive ? '#0ea5e9' : '#475569'}
                  strokeWidth="2.5"
                  strokeDasharray={sec.isLive ? undefined : '4 3'}
                />

                {/* Local Section Disconnect Switch */}
                <g transform={`translate(${sec.x}, 160)`} className="cursor-pointer" onClick={() => isolateTower(sec.id)}>
                  <rect x="-10" y="-8" width="20" height="16" rx="4" fill="#07132c" stroke={sec.isLive ? '#10b981' : '#ef4444'} strokeWidth="1.5" />
                  <line x1="-5" y1="0" x2="5" y2="0" stroke={sec.isLive ? '#10b981' : '#ef4444'} strokeWidth="2.5" />
                </g>

                {/* Local Distribution Transformer (11kV to 415V) */}
                <g transform={`translate(${sec.x}, 200)`}>
                  <circle cx="0" cy="-6" r="10" fill="none" stroke={sec.isLive ? '#38bdf8' : '#475569'} strokeWidth="2" />
                  <circle cx="0" cy="6" r="10" fill="none" stroke={sec.isLive ? '#38bdf8' : '#475569'} strokeWidth="2" />
                  <text x="18" y="3" fill="#94a3b8" fontSize="8" fontFamily="monospace">11kV/415V</text>
                </g>

                {/* Drop from transformer to consumer load */}
                <line
                  x1={sec.x}
                  y1="216"
                  x2={sec.x}
                  y2="242"
                  stroke={sec.isLive ? '#10b981' : '#475569'}
                  strokeWidth="2.5"
                />

                {/* Consumer Load Building Box */}
                <g transform={`translate(${sec.x}, 268)`}>
                  <rect
                    x="-42"
                    y="-20"
                    width="84"
                    height="40"
                    rx="8"
                    fill="#0b1736"
                    stroke={sec.isLive ? '#10b981' : '#475569'}
                    strokeWidth={sec.isLive ? '2' : '1.5'}
                  />
                  <text x="0" y="-4" fill="#f8fafc" fontSize="10" textAnchor="middle" fontWeight="bold">
                    {sec.loadName}
                  </text>
                  <text
                    x="0"
                    y="11"
                    fill={sec.isLive ? '#34d399' : '#f87171'}
                    fontSize="10"
                    textAnchor="middle"
                    fontWeight="extrabold"
                    fontFamily="monospace"
                  >
                    {sec.isLive ? `${sec.demandKw} kW` : '0 kW (OFF)'}
                  </text>
                </g>

                {/* 4. Riser connection from Universal Bypass Bus up to this branch */}
                <line
                  x1={sec.x}
                  y1="360"
                  x2={sec.x}
                  y2="312"
                  stroke={isBypassClosed && !sec.isIso ? '#10b981' : '#a855f7'}
                  strokeWidth="2"
                  strokeDasharray={isBypassClosed && !sec.isIso ? undefined : '4 3'}
                />
                <circle cx={sec.x} cy="360" r="3.5" fill={isBypassClosed ? '#10b981' : '#a855f7'} />
              </g>
            );
          })}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* E. UNIVERSAL FRONT BYPASS BUS ROUTE (RUNNING ACROSS Y = 360)*/}
          {/* ─────────────────────────────────────────────────────────── */}
          {/* Drop line from Substation to Bypass Bus */}
          <line x1="68" y1="140" x2="68" y2="360" stroke="#a855f7" strokeWidth="3" />
          <path d="M 64 240 L 68 248 L 72 240 Z" fill="#a855f7" />

          {/* Horizontal bypass bus to central switch */}
          <line
            x1="68"
            y1="360"
            x2="445"
            y2="360"
            stroke={isBypassClosed ? '#10b981' : '#a855f7'}
            strokeWidth="3.5"
          />
          {isBypassClosed && (
            <g fill="#10b981">
              <path d="M 270 356 L 278 360 L 270 364 Z" />
              <path d="M 390 356 L 398 360 L 390 364 Z" />
            </g>
          )}

          {/* CENTRAL FRONT BYPASS BUS SWITCH */}
          <g transform="translate(505, 360)" className="cursor-pointer" onClick={toggleBypassSwitch}>
            <rect
              x="-60"
              y="-18"
              width="120"
              height="36"
              rx="8"
              fill={isBypassClosed ? '#064e3b' : '#2e1065'}
              stroke={isBypassClosed ? '#10b981' : '#a855f7'}
              strokeWidth="2.5"
            />
            <text x="0" y="-3" fill="#f8fafc" fontSize="11" textAnchor="middle" fontWeight="bold">
              Bypass Bus Switch
            </text>
            <text
              x="0"
              y="11"
              fill={isBypassClosed ? '#34d399' : '#f87171'}
              fontSize="11"
              textAnchor="middle"
              fontWeight="black"
              fontFamily="monospace"
            >
              {isBypassClosed ? 'CLOSED (ACTIVE)' : 'OPEN (STANDBY)'}
            </text>
          </g>

          {/* Horizontal bypass bus from central switch to T4 and T5 */}
          <line
            x1="565"
            y1="360"
            x2="840"
            y2="360"
            stroke={isBypassClosed ? '#10b981' : '#a855f7'}
            strokeWidth="3.5"
          />
          {isBypassClosed && (
            <g fill="#10b981">
              <path d="M 610 356 L 618 360 L 610 364 Z" />
              <path d="M 740 356 L 748 360 L 740 364 Z" />
            </g>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* F. SCHEMATIC LEGEND STRIP AT BOTTOM                         */}
          {/* ─────────────────────────────────────────────────────────── */}
          <g transform="translate(30, 440)">
            <g transform="translate(40, 0)">
              <line x1="0" y1="0" x2="26" y2="0" stroke="#0ea5e9" strokeWidth="3" />
              <path d="M 22 -3 L 28 0 L 22 3 Z" fill="#0ea5e9" />
              <text x="35" y="4" fill="#cbd5e1" fontSize="11" fontWeight="bold">Main Transmission Line</text>
            </g>

            <g transform="translate(260, 0)">
              <line x1="0" y1="0" x2="26" y2="0" stroke="#a855f7" strokeWidth="3" />
              <path d="M 22 -3 L 28 0 L 22 3 Z" fill="#a855f7" />
              <text x="35" y="4" fill="#cbd5e1" fontSize="11" fontWeight="bold">Universal Bypass Route</text>
            </g>

            <g transform="translate(470, 0)">
              <rect x="0" y="-8" width="18" height="16" rx="3" fill="#07132c" stroke="#10b981" strokeWidth="2" />
              <line x1="4" y1="0" x2="14" y2="0" stroke="#10b981" strokeWidth="2" />
              <text x="26" y="4" fill="#cbd5e1" fontSize="11" fontWeight="bold">Breaker (Closed)</text>
            </g>

            <g transform="translate(640, 0)">
              <rect x="0" y="-8" width="18" height="16" rx="3" fill="#07132c" stroke="#ef4444" strokeWidth="2" />
              <line x1="4" y1="3" x2="14" y2="-3" stroke="#ef4444" strokeWidth="2" />
              <text x="26" y="4" fill="#cbd5e1" fontSize="11" fontWeight="bold">Breaker (Open)</text>
            </g>

            <g transform="translate(800, 0)">
              <rect x="0" y="-8" width="22" height="16" rx="3" fill="#070e24" stroke="#ef4444" strokeWidth="1.5" />
              <text x="11" y="4" fill="#ef4444" fontSize="10" textAnchor="middle" fontWeight="black">XX</text>
              <text x="30" y="4" fill="#cbd5e1" fontSize="11" fontWeight="bold">Isolation Air-Gap</text>
            </g>
          </g>
        </svg>
      </div>

      {/* 3. MODERN MODULAR THREE-PANEL CONTROL CONSOLE (IDENTICAL TO 3D LAB) */}
      <div className="bg-[#0b132b]/95 border border-slate-800/90 rounded-2xl p-3 shadow-2xl flex flex-col gap-2.5 shrink-0 select-none">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-stretch">

          {/* Panel 1: Grid Master */}
          <div className="md:col-span-4 bg-slate-900/75 border border-slate-800/90 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600/25 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-sm">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs md:text-sm font-extrabold text-white tracking-wide truncate">Grid Master</h3>
                <p className="text-xs text-slate-400 truncate">Control all towers together</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={turnAllTowersOn}
                className="px-4 py-2 rounded-full text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-emerald-500/25 transition-all active:scale-95"
                title="Energize ALL 5 towers (Powers relays and turns ON all tower LEDs)"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ALL ON</span>
              </button>

              <button
                onClick={turnAllTowersOff}
                className="px-4 py-2 rounded-full text-xs sm:text-sm font-black bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                title="Isolate / Turn OFF ALL 5 towers"
              >
                <Power className="w-4 h-4 text-slate-400" />
                <span>ALL OFF</span>
              </button>
            </div>
          </div>

          {/* Panel 2: Bypass Bus */}
          <div className="md:col-span-3 bg-slate-900/75 border border-slate-800/90 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-cyan-600/25 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs md:text-sm font-extrabold text-white tracking-wide truncate">Bypass Bus</h3>
                <p className="text-xs text-slate-400 truncate">Open / Close bypass line</p>
              </div>
            </div>

            <button
              onClick={toggleBypassSwitch}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-mono font-bold flex items-center gap-2 border transition-all active:scale-95 shrink-0 ${
                isBypassClosed
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/70 shadow-sm shadow-emerald-500/20'
                  : 'bg-cyan-950/40 text-cyan-300 border-cyan-500/60 hover:bg-cyan-900/50'
              }`}
              title="Toggle Front Bypass Bus State"
            >
              <Circle className="w-2.5 h-2.5 text-cyan-400 fill-cyan-400" />
              <span>{bypassSwitchState}</span>
            </button>
          </div>

          {/* Panel 3: Individual Towers */}
          <div className="md:col-span-5 bg-slate-900/75 border border-slate-800/90 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5 shrink-0 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/25 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
                <Radio className="w-4 h-4" />
              </div>
              <div className="min-w-0 hidden xl:block">
                <h3 className="text-xs md:text-sm font-extrabold text-white tracking-wide truncate">Individual Towers</h3>
                <p className="text-xs text-slate-400 truncate">Control each tower separately</p>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto justify-end flex-1">
              {sections.map((sec) => {
                const tId = sec.id;
                const isThisIsolated = isoList.includes(tId);
                return (
                  <div
                    key={tId}
                    className="flex flex-col items-center gap-1 px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 shrink-0"
                  >
                    <span className="text-xs font-mono font-black text-slate-300">{tId}</span>
                    <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
                      <button
                        onClick={() => turnTowerOn(tId)}
                        className={`px-2 py-0.5 rounded text-xs font-black font-mono tracking-wider transition-all active:scale-95 ${
                          !isThisIsolated
                            ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30'
                            : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title={`Turn Tower ${tId} ON (Energize)`}
                      >
                        ON
                      </button>
                      <button
                        onClick={() => turnTowerOff(tId)}
                        className={`px-2 py-0.5 rounded text-xs font-black font-mono tracking-wider transition-all active:scale-95 ${
                          isThisIsolated
                            ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30 ring-1 ring-rose-400'
                            : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title={`Turn Tower ${tId} OFF (Isolate)`}
                      >
                        OFF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Status Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/70">
          <div className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-xs md:text-sm font-mono font-semibold">
            <span className={`w-2.5 h-2.5 rounded-full ${isoList.length > 0 ? (isBypassClosed ? 'bg-amber-400 animate-pulse' : 'bg-rose-500 animate-pulse') : 'bg-emerald-400 animate-pulse'}`} />
            <span className={isoList.length > 0 ? (isBypassClosed ? 'text-amber-300' : 'text-rose-300') : 'text-emerald-300'}>
              {isoList.length > 0
                ? (isBypassClosed ? `Bypass Active (Isolated: ${isoList.join(', ')})` : `Alert: Isolated ${isoList.join(', ')} (Unserved)`)
                : 'Normal Grid Operation'}
            </span>
          </div>

          <div className="flex items-center gap-3.5 text-xs md:text-sm font-mono">
            {sections.map((sec) => {
              const tId = sec.id;
              const isThisIsolated = isoList.includes(tId);
              return (
                <div key={`status-${tId}`} className="flex items-center gap-1.5">
                  <span className="text-slate-300 font-bold">{tId}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${isThisIsolated ? 'bg-rose-500' : 'bg-cyan-400'}`} />
                  <span className={`text-xs md:text-sm font-extrabold ${isThisIsolated ? 'text-rose-400' : 'text-cyan-300'}`}>
                    {isThisIsolated ? 'OFF' : 'ON'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
