import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGridStore } from '../../store/useGridStore';
import { SceneEnvironment } from './SceneEnvironment';
import { CameraBookmarks } from './CameraBookmarks';
import { Substation3D } from './Substation3D';
import { TransmissionTower3D } from './TransmissionTower3D';
import { TransmissionInterlink3D } from './TransmissionInterlink3D';
import { SwitchGear3D } from './SwitchGear3D';
import { Transformer3D } from './Transformer3D';
import { ConsumerLoad3D } from './ConsumerLoad3D';
import { PowerLine3D } from './PowerLine3D';
import { BypassSwitch3D } from './BypassSwitch3D';
import { Trees3D } from './Trees3D';
import {
  Sun,
  Moon,
  Layers,
  Camera,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Zap,
  Box,
  Maximize2,
  Compass
} from 'lucide-react';

// Animated Bypass Power Line Component with Green Particles
const BypassPowerLine: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  isBypassActive: boolean;
}> = ({ start, end, isBypassActive }) => {
  const pulseRef = useRef<THREE.Mesh>(null);

  const curve = React.useMemo(() => {
    const p1 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const mid = new THREE.Vector3(
      (p1.x + p2.x) / 2,
      (p1.y + p2.y) / 2 - 0.15,
      (p1.z + p2.z) / 2
    );
    return new THREE.QuadraticBezierCurve3(p1, mid, p2);
  }, [start, end]);

  const tubeGeo = React.useMemo(() => {
    return new THREE.TubeGeometry(curve, 24, 0.05, 8, false);
  }, [curve]);

  useFrame(({ clock }) => {
    if (!isBypassActive) return;
    const t = (clock.getElapsedTime() * 0.55) % 1;
    if (pulseRef.current) {
      pulseRef.current.position.copy(curve.getPoint(t));
    }
  });

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshStandardMaterial
          color={isBypassActive ? '#10b981' : '#334155'}
          emissive={isBypassActive ? '#059669' : '#000000'}
          emissiveIntensity={isBypassActive ? 1.0 : 0}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      {isBypassActive && (
        <mesh ref={pulseRef}>
          <sphereGeometry args={[0.16, 12, 12]} />
          <meshBasicMaterial color="#34d399" />
        </mesh>
      )}
    </group>
  );
};

export const GridCanvas: React.FC = () => {
  const {
    switches,
    connectivity,
    cameraPreset,
    setCameraPreset,
    isNightMode,
    toggleNightMode,
    showPowerFlow,
    togglePowerFlow,
    showLabels,
    toggleLabels,
    recomputeConnectivity,
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

  // Transmission Corridor Reachability along Z = 0
  const isT1Iso = isoList.includes('T1');
  const isT2Iso = isoList.includes('T2');
  const isT3Iso = isoList.includes('T3');
  const isT4Iso = isoList.includes('T4');
  const isT5Iso = isoList.includes('T5');

  // Main unbroken route reachability from Substation -> T1 -> T2 -> T3 -> T4 -> T5
  const mainReachT1 = !isT1Iso;
  const mainReachT2 = mainReachT1 && !isT2Iso;
  const mainReachT3 = mainReachT2 && !isT3Iso;
  const mainReachT4 = mainReachT3 && !isT4Iso;
  const mainReachT5 = mainReachT4 && !isT5Iso;

  // Tower Energization:
  // - Isolated towers NEVER receive current (0 A).
  // - Non-isolated towers are energized if:
  //   (a) Bypass is ON (isBypassClosed): alternate bypass bus feeds all healthy towers!
  //   (b) Unbroken main route reaches the tower.
  const isTower1Energized = !isT1Iso && (mainReachT1 || isBypassClosed);
  const isTower2Energized = !isT2Iso && (mainReachT2 || isBypassClosed);
  const isTower3Energized = !isT3Iso && (mainReachT3 || isBypassClosed);
  const isTower4Energized = !isT4Iso && (mainReachT4 || isBypassClosed);
  const isTower5Energized = !isT5Iso && (mainReachT5 || isBypassClosed);

  const towerEnergizedMap = [isTower1Energized, isTower2Energized, isTower3Energized, isTower4Energized, isTower5Energized];

  // Main transmission route interlink conductors between towers along Z = 0
  const isSpanSubToT1Live = !isT1Iso;
  const isSpanT1ToT2Live = !isT1Iso && !isT2Iso && isTower1Energized;
  const isSpanT2ToT3Live = !isT2Iso && !isT3Iso && isTower2Energized;
  const isSpanT3ToT4Live = !isT3Iso && !isT4Iso && isTower3Energized;
  const isSpanT4ToT5Live = !isT4Iso && !isT5Iso && isTower4Energized;

  // Perfectly aligned Transmission Corridor along Z = 0
  const sections = [
    {
      id: 'T1' as const,
      swId: 'SW-T1',
      name: 'Tower 1 (Residential Sector)',
      towerPos: [-32, 0, 0] as [number, number, number],
      switchPos: [-32, 0, 8.5] as [number, number, number],
      txPos: [-32, 0, 18.0] as [number, number, number],
      loadPos: [-32, 0, 31.0] as [number, number, number],
      category: 'residential' as const,
      loadName: 'Maple Crest Residential Quarter',
      demandKw: 345.5,
      gpio: 25,
      height: 14,
    },
    {
      id: 'T2' as const,
      swId: 'SW-T2',
      name: 'Tower 2 (Commercial Corridor)',
      towerPos: [-14, 0, 0] as [number, number, number],
      switchPos: [-14, 0, 8.5] as [number, number, number],
      txPos: [-14, 0, 18.0] as [number, number, number],
      loadPos: [-14, 0, 31.0] as [number, number, number],
      category: 'commercial' as const,
      loadName: 'Metropolis Commercial Center',
      demandKw: 520.0,
      gpio: 26,
      height: 15,
    },
    {
      id: 'T3' as const,
      swId: 'SW-T3',
      name: 'Tower 3 (Metropolitan Spine)',
      towerPos: [4, 0, 0] as [number, number, number],
      switchPos: [4, 0, 8.5] as [number, number, number],
      txPos: [4, 0, 18.0] as [number, number, number],
      loadPos: [4, 0, 31.0] as [number, number, number],
      category: 'critical' as const,
      loadName: 'Regional Trauma Hospital & ER',
      demandKw: 412.8,
      gpio: 27,
      height: 16.5,
    },
    {
      id: 'T4' as const,
      swId: 'SW-T4',
      name: 'Tower 4 (Industrial Zone)',
      towerPos: [22, 0, 0] as [number, number, number],
      switchPos: [22, 0, 8.5] as [number, number, number],
      txPos: [22, 0, 18.0] as [number, number, number],
      loadPos: [22, 0, 31.0] as [number, number, number],
      category: 'industrial' as const,
      loadName: 'Titan Heavy Manufacturing Complex',
      demandKw: 685.0,
      gpio: 14,
      height: 15,
    },
    {
      id: 'T5' as const,
      swId: 'SW-T5',
      name: 'Tower 5 (Renewable Grid Terminal)',
      towerPos: [40, 0, 0] as [number, number, number],
      switchPos: [40, 0, 8.5] as [number, number, number],
      txPos: [40, 0, 18.0] as [number, number, number],
      loadPos: [40, 0, 31.0] as [number, number, number],
      category: 'renewable' as const,
      loadName: 'Helios Solar Farm & BESS Depot',
      demandKw: 210.4,
      gpio: 12,
      height: 14,
    },
  ];

  const switchMap = switches.reduce((acc, s) => ({ ...acc, [s.switch_id]: s.state }), {} as Record<string, string>);

  const towerScale = 1.45;
  const buildingScale = 1.45;

  return (
    <div className="relative w-full h-full min-h-[580px] bg-slate-950 overflow-hidden select-none">
      {/* 3D WebGL Canvas */}
      <Canvas
        shadows
        camera={{ position: [4, 34, 48], fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <SceneEnvironment />
          <CameraBookmarks />

          {/* Scaled 3D Digital Twin Model Group */}
          <group scale={[1.12, 1.12, 1.12]} position={[0, -0.3, 0]}>
            {/* 33/11kV Primary Substation (Source) */}
            <Substation3D position={[-52, 0, 0]} />

            {/* Substation High-Voltage Incomer to Tower 1 */}
            <TransmissionInterlink3D
              towerA={[-48, 0, 0]}
              towerB={sections[0].towerPos}
              isEnergized={isSpanSubToT1Live}
              heightA={8}
              heightB={sections[0].height}
              scaleB={towerScale}
            />

            {/* ─────────────────────────────────────────────────────────── */}
            {/* MAIN TRANSMISSION ROUTE BETWEEN TOWERS                      */}
            {/* T1 -> T2 -> T3 -> T4 -> T5 (along Z = 0)                   */}
            {/* ─────────────────────────────────────────────────────────── */}
            {/* T1 -> T2 */}
            <TransmissionInterlink3D
              towerA={sections[0].towerPos}
              towerB={sections[1].towerPos}
              isEnergized={isSpanT1ToT2Live}
              heightA={sections[0].height}
              heightB={sections[1].height}
              scaleA={towerScale}
              scaleB={towerScale}
            />

            {/* T2 -> T3 */}
            <TransmissionInterlink3D
              towerA={sections[1].towerPos}
              towerB={sections[2].towerPos}
              isEnergized={isSpanT2ToT3Live}
              heightA={sections[1].height}
              heightB={sections[2].height}
              scaleA={towerScale}
              scaleB={towerScale}
            />

            {/* T3 -> T4 */}
            <TransmissionInterlink3D
              towerA={sections[2].towerPos}
              towerB={sections[3].towerPos}
              isEnergized={isSpanT3ToT4Live}
              heightA={sections[2].height}
              heightB={sections[3].height}
              scaleA={towerScale}
              scaleB={towerScale}
            />

            {/* T4 -> T5 */}
            <TransmissionInterlink3D
              towerA={sections[3].towerPos}
              towerB={sections[4].towerPos}
              isEnergized={isSpanT4ToT5Live}
              heightA={sections[3].height}
              heightB={sections[4].height}
              scaleA={towerScale}
              scaleB={towerScale}
            />

          {/* ─────────────────────────────────────────────────────────── */}
          {/* RED DISCONNECTION MARKERS (✕ - - ✕) AROUND ISOLATED TOWERS  */}
          {/* ─────────────────────────────────────────────────────────── */}
          {isoList.includes('T1') && (
            <group>
              {[-43, -41, -39].map((x, i) => (
                <Text key={`iso-sub-t1-${i}`} position={[x, 13.0, 0]} fontSize={1.4} color="#ef4444" anchorX="center" anchorY="middle" fontWeight="bold">✕</Text>
              ))}
              {[-25, -23, -21].map((x, i) => (
                <Text key={`iso-t1-t2-${i}`} position={[x, 13.0, 0]} fontSize={1.4} color="#ef4444" anchorX="center" anchorY="middle" fontWeight="bold">✕</Text>
              ))}
            </group>
          )}

          {isoList.includes('T2') && (
            <group>
              {[-25, -23, -21].map((x, i) => (
                <Text key={`iso-t1-t2-${i}`} position={[x, 13.0, 0]} fontSize={1.4} color="#ef4444" anchorX="center" anchorY="middle" fontWeight="bold">✕</Text>
              ))}
              {[-7, -5, -3].map((x, i) => (
                <Text key={`iso-t2-t3-${i}`} position={[x, 13.0, 0]} fontSize={1.4} color="#ef4444" anchorX="center" anchorY="middle" fontWeight="bold">✕</Text>
              ))}
            </group>
          )}

          {isoList.includes('T3') && (
            <group>
              {[-7, -5, -3].map((x, i) => (
                <Text key={`iso-t2-t3-${i}`} position={[x, 13.0, 0]} fontSize={1.4} color="#ef4444" anchorX="center" anchorY="middle" fontWeight="bold">✕</Text>
              ))}
              {[11, 13, 15].map((x, i) => (
                <Text key={`iso-t3-t4-${i}`} position={[x, 13.0, 0]} fontSize={1.4} color="#ef4444" anchorX="center" anchorY="middle" fontWeight="bold">✕</Text>
              ))}
            </group>
          )}

          {isoList.includes('T4') && (
            <group>
              {[11, 13, 15].map((x, i) => (
                <Text key={`iso-t3-t4-${i}`} position={[x, 13.0, 0]} fontSize={1.4} color="#ef4444" anchorX="center" anchorY="middle" fontWeight="bold">✕</Text>
              ))}
              {[29, 31, 33].map((x, i) => (
                <Text key={`iso-t4-t5-${i}`} position={[x, 13.0, 0]} fontSize={1.4} color="#ef4444" anchorX="center" anchorY="middle" fontWeight="bold">✕</Text>
              ))}
            </group>
          )}

          {isoList.includes('T5') && (
            <group>
              {[29, 31, 33].map((x, i) => (
                <Text key={`iso-t4-t5-${i}`} position={[x, 13.0, 0]} fontSize={1.4} color="#ef4444" anchorX="center" anchorY="middle" fontWeight="bold">✕</Text>
              ))}
            </group>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* ALTERNATE / BYPASS ROUTE (IN FRONT OF ALL TOWERS AT Z = -9) */}
          {/* Continuous bus line connecting in front of all 5 towers     */}
          {/* ─────────────────────────────────────────────────────────── */}
          {/* Source/Substation drop to Bypass Bus */}
          <BypassPowerLine
            start={[-48, 1.2, 0]}
            end={[-48, 0.4, -9]}
            isBypassActive={isBypassClosed}
          />
          {/* Span from Substation to Tower 1 Bypass Switch */}
          <BypassPowerLine
            start={[-48, 0.4, -9]}
            end={[-32, 0.4, -9]}
            isBypassActive={isBypassClosed}
          />

          {/* Span T1 Bypass to T2 Bypass */}
          <BypassPowerLine
            start={[-32, 0.4, -9]}
            end={[-14, 0.4, -9]}
            isBypassActive={isBypassClosed}
          />

          {/* Span T2 Bypass to T3 Bypass */}
          <BypassPowerLine
            start={[-14, 0.4, -9]}
            end={[4, 0.4, -9]}
            isBypassActive={isBypassClosed}
          />

          {/* Span T3 Bypass to T4 Bypass */}
          <BypassPowerLine
            start={[4, 0.4, -9]}
            end={[22, 0.4, -9]}
            isBypassActive={isBypassClosed}
          />

          {/* Span T4 Bypass to T5 Bypass */}
          <BypassPowerLine
            start={[22, 0.4, -9]}
            end={[40, 0.4, -9]}
            isBypassActive={isBypassClosed}
          />

          {/* ─────────────────────────────────────────────────────────── */}
          {/* 5 COMPACT BYPASS SWITCHES — IN FRONT OF EVERY TOWER         */}
          {/* ─────────────────────────────────────────────────────────── */}
          <BypassSwitch3D position={[-32, 0, -9]} switchId="SW-BP-T1" towerId="T1" name="Tower 1 Front Bypass Switch" />
          <BypassSwitch3D position={[-14, 0, -9]} switchId="SW-BP-T2" towerId="T2" name="Tower 2 Front Bypass Switch" />
          <BypassSwitch3D position={[4, 0, -9]} switchId="SW-BP-T3" towerId="T3" name="Tower 3 Front Bypass Switch" />
          <BypassSwitch3D position={[22, 0, -9]} switchId="SW-BP-T4" towerId="T4" name="Tower 4 Front Bypass Switch" />
          <BypassSwitch3D position={[40, 0, -9]} switchId="SW-BP-T5" towerId="T5" name="Tower 5 Front Bypass Switch" />

          {/* ─────────────────────────────────────────────────────────── */}
          {/* BYPASS RISER TAPS FROM BUS (Z = -9) INTO EACH TOWER (Z = 0) */}
          {/* When a tower is isolated, its riser is INACTIVE (0 current) */}
          {/* ─────────────────────────────────────────────────────────── */}
          <BypassPowerLine
            start={[-32, 0.4, -9]}
            end={[-32, 1.2, 0]}
            isBypassActive={isBypassClosed && !isoList.includes('T1')}
          />
          <BypassPowerLine
            start={[-14, 0.4, -9]}
            end={[-14, 1.2, 0]}
            isBypassActive={isBypassClosed && !isoList.includes('T2')}
          />
          <BypassPowerLine
            start={[4, 0.4, -9]}
            end={[4, 1.2, 0]}
            isBypassActive={isBypassClosed && !isoList.includes('T3')}
          />
          <BypassPowerLine
            start={[22, 0.4, -9]}
            end={[22, 1.2, 0]}
            isBypassActive={isBypassClosed && !isoList.includes('T4')}
          />
          <BypassPowerLine
            start={[40, 0.4, -9]}
            end={[40, 1.2, 0]}
            isBypassActive={isBypassClosed && !isoList.includes('T5')}
          />

          {/* ─────────────────────────────────────────────────────────── */}
          {/* 5 Towers and their perpendicular branch connections         */}
          {/* ─────────────────────────────────────────────────────────── */}
          {sections.map((sec, idx) => {
            const isTowerEnergized = towerEnergizedMap[idx];
            const isThisIsolated = isoList.includes(sec.id);
            const isSwitchClosed = switchMap[sec.swId] === 'CLOSED';
            const isLoadEnergized = isTowerEnergized && isSwitchClosed;

            return (
              <React.Fragment key={sec.id}>
                {/* Tower Label Badge */}
                {showLabels && (
                  <group position={[sec.towerPos[0], sec.height * towerScale + 2.5, sec.towerPos[2]]}>
                    <mesh position={[0, 0, 0]}>
                      <planeGeometry args={[isThisIsolated ? 5.6 : 4.4, 1.4]} />
                      <meshBasicMaterial color="#0f172a" transparent opacity={0.88} />
                    </mesh>
                    <Text
                      position={[0, 0.25, 0.05]}
                      fontSize={0.6}
                      color={isThisIsolated ? '#ef4444' : '#38bdf8'}
                      anchorX="center"
                      anchorY="middle"
                      fontWeight="bold"
                    >
                      {sec.id} {isThisIsolated ? '• ISOLATED' : '• LIVE'}
                    </Text>
                    <Text
                      position={[0, -0.3, 0.05]}
                      fontSize={0.38}
                      color={isThisIsolated ? '#f87171' : '#4ade80'}
                      anchorX="center"
                      anchorY="middle"
                    >
                      {isThisIsolated ? 'NO CURRENT FLOW (0 A)' : `${sec.demandKw} kW ACTIVE`}
                    </Text>
                  </group>
                )}

                {/* High-Voltage Steel Lattice Transmission Tower (Pylon) */}
                <TransmissionTower3D
                  position={sec.towerPos}
                  towerId={sec.id}
                  name={sec.name}
                  isEnergized={isTowerEnergized}
                  height={sec.height}
                  scale={towerScale}
                  rotation={[0, Math.PI / 2, 0]}
                />

                {/* Perpendicular Drop from Tower Crossarm to Switchgear */}
                <PowerLine3D
                  start={[sec.towerPos[0], (sec.height * 0.68 - 0.85) * towerScale, sec.towerPos[2] + 2.0 * towerScale]}
                  end={[sec.switchPos[0], 6.5, sec.switchPos[2]]}
                  isEnergized={isTowerEnergized}
                  sag={0.3}
                />

                {/* Section Circuit Breaker / Switchgear */}
                <SwitchGear3D
                  position={sec.switchPos}
                  switchId={sec.swId}
                  name={sec.name}
                  state={(switchMap[sec.swId] || 'CLOSED') as any}
                  sectionId={sec.id}
                  gpioPin={sec.gpio}
                />

                {/* Line from Switchgear to Step-down Distribution Transformer */}
                <PowerLine3D
                  start={[sec.switchPos[0], 5.0, sec.switchPos[2]]}
                  end={[sec.txPos[0], 2.4, sec.txPos[2]]}
                  isEnergized={isLoadEnergized}
                  sag={0.25}
                />

                {/* 11kV to 415V Step-down Distribution Transformer */}
                <Transformer3D
                  position={sec.txPos}
                  transformerId={`TX-${sec.id}`}
                  name={`Step-Down Transformer TX-${sec.id}`}
                  isEnergized={isLoadEnergized}
                  sectionId={sec.id}
                />

                {/* Low Voltage (415V) Feeder Cable into Consumer Facility */}
                <PowerLine3D
                  start={[sec.txPos[0], 1.2, sec.txPos[2] + 1.2]}
                  end={[sec.loadPos[0], 1.4, sec.loadPos[2] - 4.5]}
                  isEnergized={isLoadEnergized}
                  sag={0.2}
                />

                {/* Architectural Consumer Building */}
                <ConsumerLoad3D
                  position={sec.loadPos}
                  loadId={`LOAD-${sec.id}`}
                  name={sec.loadName}
                  isEnergized={isLoadEnergized}
                  category={sec.category}
                  demandKw={sec.demandKw}
                  sectionId={sec.id}
                  scale={buildingScale}
                />
              </React.Fragment>
            );
          })}

          {/* Surrounding Natural 3D Trees and Green Spaces */}
          <Trees3D />
        </group>

        {/* Full Free 360-Degree Orbit Controls */}
          <OrbitControls
            enableDamping
            dampingFactor={0.06}
            minDistance={6}
            maxDistance={150}
            maxPolarAngle={Math.PI / 2.05}
          />
        </Suspense>
      </Canvas>

      {/* Floating System Status & Universal Multi-Tower Contingency Console */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-2xl">
        {/* Main Model Title */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-xl px-3.5 py-2 shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-xs font-bold text-white tracking-wide">
              GridTwin — Five-Tower Transmission & Universal Front Bypass Grid
            </h2>
          </div>
          <p className="text-[11px] text-slate-300 font-mono mt-0.5">
            {isBypassClosed && isoList.length > 0
              ? `Bypass ON: Isolation connection active around [${isoList.join(', ')}] (0 A) | Remaining towers powered via alternate bypass route`
              : !isBypassClosed && isoList.length > 0
              ? `ALERT: Bypass is OPEN while Tower(s) [${isoList.join(', ')}] Isolated! Turn Bypass ON to restore downstream power.`
              : isBypassClosed
              ? 'Bypass ON: Alternate bypass bus energized in parallel (standby ready) | All 5 towers energized'
              : 'Normal Connection: All 5 towers energized via main transmission route | Bypass standby'}
          </p>
        </div>

        {/* Universal Multi-Tower Contingency Action Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-xl p-2 shadow-2xl">
          <span className="text-[11px] font-bold text-slate-300 font-mono flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Isolate Tower:</span>
          </span>

          {(['T1', 'T2', 'T3', 'T4', 'T5'] as const).map((tId) => {
            const isThisIsolated = isoList.includes(tId);
            return (
              <button
                key={tId}
                onClick={() => isolateTower(tId)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all shadow-sm ${
                  isThisIsolated
                    ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-rose-950/80 hover:text-rose-300 border border-slate-700'
                }`}
                title={`Click to isolate ${tId} with bypass`}
              >
                {isThisIsolated ? `✕ ${tId} Isolated` : tId}
              </button>
            );
          })}

          <div className="h-4 w-[1px] bg-slate-700 mx-1" />

          {/* Restore Normal All Towers */}
          <button
            onClick={restoreNormalOperation}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
              !isBypassClosed && isoList.length === 0
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Normal Connection</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-700 mx-1" />

          {/* Bypass Bus State Toggle */}
          <button
            onClick={toggleBypassSwitch}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 border ${
              isBypassClosed
                ? 'bg-emerald-950 text-emerald-400 border-emerald-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle Front Bypass Bus State"
          >
            <span className="text-slate-400">Bypass Bus:</span>
            <span className={isBypassClosed ? 'text-emerald-300 font-black' : 'text-slate-400'}>
              {bypassSwitchState}
            </span>
          </button>
        </div>
      </div>

      {/* Stability Badge (Top Right) */}
      <div className="absolute top-4 right-16 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-xl px-3 py-1.5 shadow-2xl">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <div className="text-left font-mono">
          <span className="text-[11px] font-bold text-emerald-400 block">
            {isoList.length > 0
              ? (isBypassClosed ? 'Bypass Isolation Active' : 'Downstream Unserved')
              : (isBypassClosed ? 'Bypass Standby Ready' : 'Normal Grid Operation')}
          </span>
          <span className="text-[10px] text-slate-300">
            {isoList.length > 0
              ? (isBypassClosed
                  ? `Towers [${isoList.join(', ')}] Isolated (0 A) | Remaining Supplied via Bypass`
                  : `Towers [${isoList.join(', ')}] Isolated (0 A) | Turn Bypass ON to Supply Downstream`)
              : 'T1–T5 All Supplied via Main Transmission Route'}
          </span>
        </div>
      </div>

      {/* Floating HUD Viewport Controls (Top Far Right) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl p-1.5 shadow-2xl">
        <button
          onClick={toggleNightMode}
          title={isNightMode ? 'Switch to Day Light' : 'Switch to Night Glow'}
          className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
        >
          {isNightMode ? <Moon className="w-4 h-4 text-cyan-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        <button
          onClick={togglePowerFlow}
          title={showPowerFlow ? 'Hide Power Flow Particles' : 'Show Power Flow Particles'}
          className={`p-1.5 rounded-lg transition-colors ${
            showPowerFlow ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <button
          onClick={toggleLabels}
          title={showLabels ? 'Hide 3D World Labels' : 'Show 3D World Labels'}
          className={`p-1.5 rounded-lg transition-colors ${
            showLabels ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          onClick={recomputeConnectivity}
          title="Recalculate Power Flow"
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Compass & Viewport Tooling matching Reference Screenshot */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col items-start gap-3 select-none">
        {/* Circular Nav Compass */}
        <div className="relative w-16 h-16 rounded-full bg-slate-900/80 border border-slate-700/70 backdrop-blur-md flex items-center justify-center shadow-xl">
          <span className="absolute top-1 text-[9px] font-bold text-cyan-400 font-mono">N</span>
          <span className="absolute bottom-1 text-[9px] font-bold text-slate-500 font-mono">S</span>
          <span className="absolute left-1.5 text-[9px] font-bold text-slate-500 font-mono">W</span>
          <span className="absolute right-1.5 text-[9px] font-bold text-slate-500 font-mono">E</span>
          <div className="w-10 h-10 rounded-full border border-slate-700/40 flex items-center justify-center">
            <Compass className="w-6 h-6 text-cyan-400/80 transform rotate-45" />
          </div>
        </div>

        {/* View Mode Toolbar */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-2xl p-1.5 shadow-2xl">
          <button
            onClick={() => setCameraPreset('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              cameraPreset === 'overview'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D View</span>
          </button>

          <button
            onClick={() => setCameraPreset('top')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              cameraPreset === 'top'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Top View</span>
          </button>

          <button
            onClick={() => setCameraPreset('side')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              cameraPreset === 'side'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Side View</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-700 mx-0.5" />

          <button
            onClick={() => {
              const elem = document.documentElement;
              if (!document.fullscreenElement) {
                elem.requestFullscreen?.().catch(() => {});
              } else {
                document.exitFullscreen?.().catch(() => {});
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Full Screen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
