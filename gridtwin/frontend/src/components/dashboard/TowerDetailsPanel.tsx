import React, { useState } from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  Zap,
  ShieldAlert,
  ShieldCheck,
  Power,
  RotateCcw,
  Sliders,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
  Cpu,
  Info,
  Building2,
  Gauge
} from 'lucide-react';

export const TowerDetailsPanel: React.FC = () => {
  const {
    switches,
    toggleSwitch,
    bypassSwitchState,
    toggleBypassSwitch,
    isolatedTowerId,
    isolatedTowers = [],
    isolateTower,
    restoreNormalOperation,
    setSelectedElement,
  } = useGridStore();

  const [selectedTower, setSelectedTower] = useState<'ALL' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5'>('ALL');

  const isoList: ('T1' | 'T2' | 'T3' | 'T4' | 'T5')[] =
    isolatedTowers && isolatedTowers.length > 0
      ? isolatedTowers
      : (isolatedTowerId ? [isolatedTowerId] : []);

  const isBypassClosed = bypassSwitchState === 'CLOSED';
  const switchMap = switches.reduce((acc, s) => ({ ...acc, [s.switch_id]: s.state }), {} as Record<string, string>);

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

  const t1Energized = !isT1Iso && (mainReachT1 || isBypassClosed);
  const t2Energized = !isT2Iso && (mainReachT2 || isBypassClosed);
  const t3Energized = !isT3Iso && (mainReachT3 || isBypassClosed);
  const t4Energized = !isT4Iso && (mainReachT4 || isBypassClosed);
  const t5Energized = !isT5Iso && (mainReachT5 || isBypassClosed);

  const towerData = [
    {
      id: 'T1' as const,
      name: 'Tower 1 — Residential Quarter Pylon',
      shortName: 'T1 Residential',
      isEnergized: t1Energized,
      isIsolated: isT1Iso,
      viaBypass: !isT1Iso && !mainReachT1 && isBypassClosed,
      swId: 'SW-T1',
      gpio: 25,
      txId: 'TX-01',
      txRating: '500 kVA',
      facilityName: 'Maple Crest Residential Quarter',
      facilityType: 'Urban Residential Grid',
      demandKw: 345.5,
      voltageKv: 110.0,
      feederKv: 11.02,
      secondaryV: 415,
      currentA: t1Energized ? 48.2 : 0,
      powerFactor: 0.96,
      reactiveKvar: 78.4,
      height: '14.0 meters',
      structureClass: 'Double-Circuit Galvanized Steel Lattice (Waisted Pylon)',
      footprint: '4.2m × 4.2m Quad Concrete Footing',
      crossarms: 'Dual-Tier Cantilever Trusses (Upper: 5.6m, Lower: 7.2m)',
      insulators: '9-Disc Toughened Glass Suspension Strings',
      shieldWire: 'Apex Optical Ground Wire (OPGW, Low Impedance Earthing)',
      earthing: '1.8 Ω Quad Driven Copper Grounding Rods',
      windRating: '160 km/h Gust Loading Capacity',
    },
    {
      id: 'T2' as const,
      name: 'Tower 2 — Commercial Hub Corridor Pylon',
      shortName: 'T2 Commercial',
      isEnergized: t2Energized,
      isIsolated: isT2Iso,
      viaBypass: !isT2Iso && !mainReachT2 && isBypassClosed,
      swId: 'SW-T2',
      gpio: 26,
      txId: 'TX-02',
      txRating: '630 kVA',
      facilityName: 'Metropolis Commercial Skyscraper & Mall',
      facilityType: 'Commercial High-Rise',
      demandKw: 520.0,
      voltageKv: 110.0,
      feederKv: 11.01,
      secondaryV: 415,
      currentA: t2Energized ? 72.8 : 0,
      powerFactor: 0.94,
      reactiveKvar: 122.5,
      height: '15.0 meters',
      structureClass: 'Heavy-Duty Galvanized Lattice Angular Truss',
      footprint: '4.5m × 4.5m Deep Reinforced Piles',
      crossarms: 'Dual-Tier Reinforced Steel Cantilevers (7.2m Lower Span)',
      insulators: '10-Disc Hydrophobic Polymer Composite Strings',
      shieldWire: 'OPGW Apex Ground Shield with Surge Arrester',
      earthing: '1.6 Ω Low-Resistance Grid Mesh',
      windRating: '165 km/h Windstorm Resistance',
    },
    {
      id: 'T3' as const,
      name: 'Tower 3 — Metropolitan Healthcare Spine Pylon',
      shortName: 'T3 Trauma Hospital',
      isEnergized: t3Energized,
      isIsolated: isT3Iso,
      viaBypass: !isT3Iso && !mainReachT3 && isBypassClosed,
      swId: 'SW-T3',
      gpio: 27,
      txId: 'TX-03',
      txRating: '500 kVA',
      facilityName: 'Regional Trauma Hospital & Emergency Center',
      facilityType: 'Tier-1 Critical Infrastructure',
      demandKw: 412.8,
      voltageKv: 110.0,
      feederKv: 11.02,
      secondaryV: 415,
      currentA: t3Energized ? 57.6 : 0,
      powerFactor: 0.98,
      reactiveKvar: 61.2,
      height: '16.5 meters',
      structureClass: 'Galvanized Heavy Tower (Aviation Obstruction Red Beacon)',
      footprint: '4.8m × 4.8m Seismic Dampened Base',
      crossarms: 'Dual-Tier Extended Trusses (Upper: 6.0m, Lower: 7.6m)',
      insulators: 'High-Creepage Glass Suspension (Redundant Strings)',
      shieldWire: 'Continuous OPGW Apex with Dual Downconductors',
      earthing: '1.2 Ω Critical Grade Sub-Ohm Grounding Bed',
      windRating: '175 km/h Hurricane Resistance Rating',
    },
    {
      id: 'T4' as const,
      name: 'Tower 4 — Heavy Industrial Zone Pylon',
      shortName: 'T4 Industrial',
      isEnergized: t4Energized,
      isIsolated: isT4Iso,
      viaBypass: !isT4Iso && !mainReachT4 && isBypassClosed,
      swId: 'SW-T4',
      gpio: 14,
      txId: 'TX-04',
      txRating: '1000 kVA',
      facilityName: 'Titan Heavy Manufacturing & Assembly Plant',
      facilityType: 'Inductive Industrial Complex',
      demandKw: 685.0,
      voltageKv: 110.0,
      feederKv: 10.98,
      secondaryV: 415,
      currentA: t4Energized ? 96.1 : 0,
      powerFactor: 0.91,
      reactiveKvar: 198.3,
      height: '15.0 meters',
      structureClass: 'Industrial-Spec High-Tension Lattice Pylon',
      footprint: '4.6m × 4.6m Heavy Reinforced Concrete',
      crossarms: 'Heavy Gauge Double-Circuit Crossarms',
      insulators: 'Heavy-Pollution Composite Suspension Strings',
      shieldWire: 'Apex OPGW with Spark Gap Diverters',
      earthing: '1.5 Ω Driven Copper Earth Mat',
      windRating: '160 km/h Industrial Loading',
    },
    {
      id: 'T5' as const,
      name: 'Tower 5 — Renewable Microgrid & Terminal Pylon',
      shortName: 'T5 Solar & BESS',
      isEnergized: t5Energized,
      isIsolated: isT5Iso,
      viaBypass: !isT5Iso && !mainReachT5 && isBypassClosed,
      swId: 'SW-T5',
      gpio: 12,
      txId: 'TX-05',
      txRating: '400 kVA',
      facilityName: 'Helios Solar Photovoltaic Farm & 2MWh BESS Depot',
      facilityType: 'Renewable Generation & Storage',
      demandKw: 210.4,
      voltageKv: 110.0,
      feederKv: 11.03,
      secondaryV: 415,
      currentA: t5Energized ? 29.5 : 0,
      powerFactor: 0.99,
      reactiveKvar: 22.0,
      height: '14.0 meters',
      structureClass: 'Terminal Dead-End Lattice Structure',
      footprint: '4.2m × 4.2m Terminal Strain Anchor Pad',
      crossarms: 'Tension-Rated Cantilever Dead-End Assemblies',
      insulators: 'Polymer Strain Insulator Strings (120 kN Rating)',
      shieldWire: 'Substation Intertie Ground Ring OPGW',
      earthing: '1.4 Ω Copper Clad Earthing System',
      windRating: '160 km/h Terminal Span Stability',
    },
  ];

  const filteredTowers = selectedTower === 'ALL'
    ? towerData
    : towerData.filter((t) => t.id === selectedTower);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Header Card */}
      <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Transmission Tower Engineering & Telemetry Center
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  5 High-Voltage Pylons (T1–T5)
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Complete structural, electrical, and protection telemetry for all 5 lattice towers in the corridor
              </p>
            </div>
          </div>

          {/* Tower Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setSelectedTower('ALL')}
              className={`px-3 py-1 text-xs font-bold font-mono rounded-lg transition-all ${
                selectedTower === 'ALL'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All 5 Towers
            </button>
            {(['T1', 'T2', 'T3', 'T4', 'T5'] as const).map((tId) => (
              <button
                key={tId}
                onClick={() => setSelectedTower(tId)}
                className={`px-2.5 py-1 text-xs font-bold font-mono rounded-lg transition-all ${
                  selectedTower === tId
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tId}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Tower Detail Cards */}
      <div className={`grid gap-4 ${selectedTower === 'ALL' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
        {filteredTowers.map((tower) => {
          const swState = switchMap[tower.swId] || 'CLOSED';
          const isSwClosed = swState === 'CLOSED';

          return (
            <div
              key={tower.id}
              className={`bg-[#0b132b]/85 border rounded-2xl p-5 shadow-xl transition-all duration-300 relative overflow-hidden ${
                tower.isIsolated
                  ? 'border-rose-500/50 shadow-rose-950/20 ring-1 ring-rose-500/30'
                  : tower.viaBypass
                  ? 'border-emerald-500/50 shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Status Ribbon & Tower Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm font-mono border shadow-inner ${
                      tower.isIsolated
                        ? 'bg-rose-950/40 text-rose-300 border-rose-500/50'
                        : tower.isEnergized
                        ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/50'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    {tower.id}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-wide">{tower.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                        {tower.facilityType}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Height: {tower.height}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Status Badge */}
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                      tower.isIsolated
                        ? 'bg-rose-950/80 text-rose-300 border-rose-500/60'
                        : tower.viaBypass
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 animate-pulse'
                        : 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        tower.isIsolated ? 'bg-rose-400' : 'bg-emerald-400'
                      }`}
                    />
                    {tower.isIsolated
                      ? 'ISOLATED (0 A)'
                      : tower.viaBypass
                      ? 'BYPASS POWERED'
                      : 'MAIN GRID LIVE'}
                  </span>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    {tower.isIsolated ? 'Zero Current Flow' : `${tower.demandKw} kW ACTIVE`}
                  </div>
                </div>
              </div>

              {/* Electrical Parameters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Line Voltage</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {tower.isEnergized ? `${tower.voltageKv} kV` : '0.0 kV'}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 block mt-0.5">110kV Bus</span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Phase Current</span>
                  <span
                    className={`text-sm font-bold font-mono ${
                      tower.isIsolated ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {tower.currentA.toFixed(1)} A
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">3-Phase RMS</span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Active Power</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {tower.isEnergized ? `${tower.demandKw} kW` : '0.0 kW'}
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 block mt-0.5">
                    PF: {tower.powerFactor}
                  </span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Feeder Voltage</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {tower.isEnergized ? `${tower.feederKv} kV` : '0.0 kV'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">415V Secondary</span>
                </div>
              </div>

              {/* Physical Architecture & Engineering Specifications */}
              <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3 mb-4 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Structure Class:</span>
                  <span className="font-medium text-slate-200">{tower.structureClass}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Foundation Footprint:</span>
                  <span>{tower.footprint}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Crossarms:</span>
                  <span>{tower.crossarms}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Insulator String:</span>
                  <span>{tower.insulators}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Apex Shield (OPGW):</span>
                  <span>{tower.shieldWire}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Earthing & Wind Loading:</span>
                  <span className="text-cyan-400">{tower.earthing} | {tower.windRating}</span>
                </div>
              </div>

              {/* Connected Facility & Switching State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs font-mono">
                <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3 flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Connected Facility</span>
                    <span className="font-bold text-white block mt-0.5">{tower.facilityName}</span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Transformer: {tower.txId} ({tower.txRating})
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Power className={`w-4 h-4 shrink-0 mt-0.5 ${isSwClosed ? 'text-emerald-400' : 'text-rose-400'}`} />
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Circuit Recloser</span>
                      <span className="font-bold text-white block mt-0.5">
                        {tower.swId} (GPIO {tower.gpio})
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Status: <strong className={isSwClosed ? 'text-emerald-400' : 'text-rose-400'}>{swState}</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleSwitch(tower.swId)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all border ${
                      isSwClosed
                        ? 'bg-rose-950/60 text-rose-300 border-rose-500/40 hover:bg-rose-900'
                        : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900'
                    }`}
                  >
                    {isSwClosed ? 'Trip Breaker' : 'Close'}
                  </button>
                </div>
              </div>

              {/* Action Buttons for this Tower */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => isolateTower(tower.id)}
                    className={`px-3 py-1.5 text-xs font-bold font-mono rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
                      tower.isIsolated
                        ? 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-rose-600/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-rose-950 hover:text-rose-300 border border-slate-700'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{tower.isIsolated ? `✕ ${tower.id} Isolated (0 A)` : `Isolate ${tower.id}`}</span>
                  </button>

                  <button
                    onClick={() =>
                      setSelectedElement({
                        id: tower.id,
                        type: 'pole',
                        title: tower.name,
                        voltage_kv: tower.voltageKv,
                        status: tower.isEnergized ? 'ENERGIZED - NORMAL TRANSMISSION' : 'ISOLATED / DE-ENERGIZED',
                        current_a: tower.currentA,
                        power_kw: tower.isEnergized ? tower.demandKw : 0,
                        details: {
                          'Tower Class': tower.structureClass,
                          'Total Height': tower.height,
                          'Base Footprint': tower.footprint,
                          'Crossarms': tower.crossarms,
                          'Insulator Strings': tower.insulators,
                          'Shield Wire': tower.shieldWire,
                          'Earthing Resistance': tower.earthing,
                          'Wind Loading': tower.windRating,
                          'Connected Facility': tower.facilityName,
                          'Transformer': `${tower.txId} (${tower.txRating})`,
                          'Recloser Switch': `${tower.swId} (${swState})`,
                        },
                      })
                    }
                    className="px-3 py-1.5 text-xs font-mono font-medium rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 border border-slate-800 transition-all flex items-center gap-1.5"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Inspect Specs</span>
                  </button>
                </div>

                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <span>Front Bypass Riser:</span>
                  <span
                    className={`font-bold ${
                      isBypassClosed
                        ? tower.isIsolated
                          ? 'text-slate-500 line-through'
                          : 'text-emerald-400'
                        : 'text-slate-500'
                    }`}
                  >
                    SW-BP-{tower.id} ({isBypassClosed ? (tower.isIsolated ? '0 A' : 'ACTIVE') : 'STANDBY'})
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
