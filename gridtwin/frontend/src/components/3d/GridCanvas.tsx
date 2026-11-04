import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Billboard } from '@react-three/drei';
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
  Minimize2,
  Compass,
  Power,
  CheckCircle2,
  FileText,
  ArrowLeftRight,
  Radio,
  Circle,
  Cpu
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

// Glowing Air-Gap Current Blocking Indicator with Clean 'XX' Side by Side
const IsolationBarrier3D: React.FC<{
  position: [number, number, number];
  label: string;
}> = ({ position, label }) => {
  return (
    <group position={position}>
      {/* Billboard ensures clean XX always faces camera directly */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        {/* Crisp Bold Red 'XX' Side by Side */}
        <Text
          position={[0, 0.4, 0]}
          fontSize={3.4}
          color="#ef4444"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          letterSpacing={0.12}
        >
          XX
        </Text>

        {/* Clear Subtext */}
        <Text
          position={[0, -1.3, 0]}
          fontSize={0.7}
          color="#f87171"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          BLOCKED (0 A)
        </Text>

        <Text
          position={[0, -1.9, 0]}
          fontSize={0.46}
          color="#fca5a5"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      </Billboard>
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
    turnTowerOn,
    turnTowerOff,
    turnAllTowersOn,
    turnAllTowersOff,
    restoreNormalOperation,
    toggleHardwareLogic,
  } = useGridStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
      setIsFullscreen(isFs);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    try {
      const isCurrentlyFs = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
      if (!isCurrentlyFs) {
        // Enter True Laptop Fullscreen
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          (elem as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        // Exit to Normal Screen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Native fullscreen toggle exception:', err);
      // Fallback toggle for full-window mode
      setIsFullscreen((prev) => !prev);
    }
  };

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
      gpio: 13,
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
      gpio: 14,
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
      gpio: 25,
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
      gpio: 26,
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
      gpio: 27,
      height: 14,
    },
  ];

  const switchMap = switches.reduce((acc, s) => ({ ...acc, [s.switch_id]: s.state }), {} as Record<string, string>);

  const towerScale = 1.45;
  const buildingScale = 1.45;

  return (
    <div
      ref={containerRef}
      className={`select-none transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] w-screen h-screen bg-[#050b18] p-2 flex flex-col gap-2 overflow-hidden'
          : 'w-full h-full flex flex-col gap-2'
      }`}
    >
      {/* 1. 3D Grid Screen Viewport */}
      <div className="relative w-full flex-1 min-h-0 rounded-xl overflow-hidden border border-slate-800/90 shadow-2xl bg-slate-950">
        {/* 3D WebGL Canvas */}
        <Canvas
          shadows
          camera={{ position: [4, 24, 48], fov: 46 }}
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
          {/* VISUAL CURRENT BLOCKING BARRIERS AROUND ISOLATED TOWERS      */}
          {/* Blocks power flow into and out of isolated towers           */}
          {/* ─────────────────────────────────────────────────────────── */}
          {isoList.includes('T1') && (
            <group>
              <IsolationBarrier3D position={[-41, 10.5, 0]} label="T1 IN-FLOW BLOCKED" />
              <IsolationBarrier3D position={[-23, 10.5, 0]} label="T1 OUT-FLOW BLOCKED" />
            </group>
          )}

          {isoList.includes('T2') && (
            <group>
              <IsolationBarrier3D position={[-23, 10.5, 0]} label="T2 IN-FLOW BLOCKED" />
              <IsolationBarrier3D position={[-5, 10.5, 0]} label="T2 OUT-FLOW BLOCKED" />
            </group>
          )}

          {isoList.includes('T3') && (
            <group>
              <IsolationBarrier3D position={[-5, 10.5, 0]} label="T3 IN-FLOW BLOCKED" />
              <IsolationBarrier3D position={[13, 10.5, 0]} label="T3 OUT-FLOW BLOCKED" />
            </group>
          )}

          {isoList.includes('T4') && (
            <group>
              <IsolationBarrier3D position={[13, 10.5, 0]} label="T4 IN-FLOW BLOCKED" />
              <IsolationBarrier3D position={[31, 10.5, 0]} label="T4 OUT-FLOW BLOCKED" />
            </group>
          )}

          {isoList.includes('T5') && (
            <group>
              <IsolationBarrier3D position={[31, 10.5, 0]} label="T5 IN-FLOW BLOCKED" />
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
                {/* Modern Sleek Tower Badge matching reference design */}
                {showLabels && (
                  <Billboard
                    position={[sec.towerPos[0], sec.height * towerScale + 3.2, sec.towerPos[2]]}
                    follow
                    lockX={false}
                    lockY={false}
                    lockZ={false}
                  >
                    <mesh position={[0, 0, -0.05]}>
                      <planeGeometry args={[isThisIsolated ? 4.2 : 3.4, 1.6]} />
                      <meshBasicMaterial color="#071126" transparent opacity={0.88} />
                    </mesh>
                    <lineSegments>
                      <edgesGeometry args={[new THREE.PlaneGeometry(isThisIsolated ? 4.2 : 3.4, 1.6)]} />
                      <lineBasicMaterial color={isThisIsolated ? '#ef4444' : '#0284c7'} linewidth={1.5} />
                    </lineSegments>
                    <Text
                      position={[0, 0.28, 0.05]}
                      fontSize={0.48}
                      color="#ffffff"
                      anchorX="center"
                      anchorY="middle"
                      fontWeight="bold"
                    >
                      {sec.name.split(' (')[0]}
                    </Text>
                    <Text
                      position={[0, -0.28, 0.05]}
                      fontSize={0.4}
                      color={isThisIsolated ? '#ef4444' : '#10b981'}
                      anchorX="center"
                      anchorY="middle"
                      fontWeight="bold"
                    >
                      {isThisIsolated ? '● ISOLATED' : '● ON'}
                    </Text>
                  </Billboard>
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

      {/* Floating HUD Viewport Controls (Top Right - Minimal Icons Only) */}
      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 flex flex-col gap-1 sm:gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl p-1 sm:p-1.5 shadow-2xl">
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

        {/* Navigation Compass & View Mode Toolbar (Bottom Left inside 3D screen) */}
        <div className="absolute bottom-2.5 sm:bottom-4 left-2.5 sm:left-4 z-10 flex items-center gap-2 select-none">
          {/* Circular Nav Compass */}
          <div className="hidden xs:flex relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-900/90 border border-slate-700/70 backdrop-blur-md items-center justify-center shadow-xl shrink-0">
            <span className="absolute top-0.5 text-[8px] font-bold text-cyan-400 font-mono">N</span>
            <Compass className="w-5 h-5 text-cyan-400/80 transform rotate-45" />
          </div>

          {/* View Mode Toolbar */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-xl p-1.5 sm:p-2 shadow-2xl">
            <button
              onClick={() => setCameraPreset('overview')}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                cameraPreset === 'overview'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>3D</span>
            </button>

            <button
              onClick={() => setCameraPreset('top')}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                cameraPreset === 'top'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Top</span>
            </button>

            <button
              onClick={() => setCameraPreset('side')}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                cameraPreset === 'side'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Side</span>
            </button>

            <div className="h-5 w-[1px] bg-slate-700 mx-0.5" />

            <button
              onClick={toggleFullscreen}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 ${
                isFullscreen
                  ? 'bg-cyan-600 text-white shadow-cyan-600/30 ring-1 ring-cyan-400'
                  : 'text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700'
              }`}
              title={isFullscreen ? 'Exit Full Screen Mode' : 'Expand 3D Grid to Full Screen'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-cyan-200" />
                  <span>Exit</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-cyan-400" />
                  <span>Full</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. MODERN THREE-PANEL CONTROL CONSOLE (COMPACT TO MAXIMIZE 3D GRID SCREEN) */}
      <div className="bg-[#071126]/95 border border-slate-800/90 rounded-xl p-2 sm:p-2.5 shadow-2xl flex flex-col gap-2 shrink-0 select-none">
        {/* Row 1: 3 Modular Command Cards */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-2.5 items-stretch">

          {/* Panel 1: Grid Master */}
          <div className="md:col-span-4 bg-slate-900/75 border border-slate-800/90 rounded-lg px-3.5 py-2 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-md bg-blue-600/25 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-sm">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wide truncate">Grid Master</h3>
                <p className="text-[11px] text-slate-400 truncate">Control all towers together</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={turnAllTowersOn}
                className="px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-emerald-500/25 transition-all active:scale-95"
                title="Energize ALL 5 towers (Powers relays and turns ON all tower LEDs)"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ALL ON</span>
              </button>

              <button
                onClick={turnAllTowersOff}
                className="px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-black bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                title="Isolate / Turn OFF ALL 5 towers"
              >
                <Power className="w-4 h-4 text-slate-400" />
                <span>ALL OFF</span>
              </button>
            </div>
          </div>

          {/* Panel 2: Bypass Bus */}
          <div className="md:col-span-3 bg-slate-900/75 border border-slate-800/90 rounded-lg px-3.5 py-2 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-md bg-cyan-600/25 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wide truncate">Bypass Bus</h3>
                <p className="text-[11px] text-slate-400 truncate">Open / Close bypass line</p>
              </div>
            </div>

            <button
              onClick={toggleBypassSwitch}
              className={`px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-mono font-bold flex items-center gap-2 border transition-all active:scale-95 shrink-0 ${
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
          <div className="md:col-span-5 bg-slate-900/75 border border-slate-800/90 rounded-lg px-3.5 py-2 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5 shrink-0 min-w-0">
              <div className="w-8 h-8 rounded-md bg-indigo-600/25 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
                <Radio className="w-4 h-4" />
              </div>
              <div className="min-w-0 hidden xl:block">
                <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wide truncate">Individual Towers</h3>
                <p className="text-[11px] text-slate-400 truncate">Control each tower separately</p>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto justify-end flex-1">
              {sections.map((sec) => {
                const tId = sec.id;
                const isThisIsolated = isoList.includes(tId);
                return (
                  <div
                    key={tId}
                    className="flex flex-col items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 min-w-[50px]"
                  >
                    <span className="text-[11px] font-mono font-black text-slate-300">{tId}</span>
                    <button
                      onClick={() => isolateTower(tId)}
                      className={`px-3 py-1 rounded-full text-xs font-black font-mono tracking-wider transition-all active:scale-95 ${
                        !isThisIsolated
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/30'
                          : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-500/30 ring-1 ring-rose-400'
                      }`}
                      title={isThisIsolated ? `Tower ${tId} is ISOLATED. Click to restore.` : `Tower ${tId} is ON. Click to isolate.`}
                    >
                      {isThisIsolated ? 'OFF' : 'ON'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: Bottom Status Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/70">
          {/* Left Pill & Hardware Polarity Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono font-semibold">
              <span className={`w-1.5 h-1.5 rounded-full ${isoList.length > 0 ? (isBypassClosed ? 'bg-amber-400 animate-pulse' : 'bg-rose-500 animate-pulse') : 'bg-emerald-400 animate-pulse'}`} />
              <span className={isoList.length > 0 ? (isBypassClosed ? 'text-amber-300' : 'text-rose-300') : 'text-emerald-300'}>
                {isoList.length > 0
                  ? (isBypassClosed ? `Bypass Active (Isolated: ${isoList.join(', ')})` : `Alert: Isolated ${isoList.join(', ')} (Unserved)`)
                  : 'Normal Grid Operation'}
              </span>
            </div>

            <button
              onClick={() => toggleHardwareLogic('INVERT')}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[10px] font-mono font-bold text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-all active:scale-95"
              title="Click to toggle GPIO Polarity (Direct Breadboard LEDs vs Active-LOW Relays) on the physical ESP32 prototype"
            >
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span>Invert Hardware LED/Relay Logic</span>
            </button>
          </div>

          {/* Right Tower Status Indicators */}
          <div className="flex items-center gap-3 text-[11px] font-mono">
            {sections.map((sec) => {
              const tId = sec.id;
              const isThisIsolated = isoList.includes(tId);
              return (
                <div key={`status-${tId}`} className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold">{tId}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isThisIsolated ? 'bg-rose-500' : 'bg-cyan-400'}`} />
                  <span className={`text-[10px] font-bold ${isThisIsolated ? 'text-rose-400' : 'text-cyan-300'}`}>
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
