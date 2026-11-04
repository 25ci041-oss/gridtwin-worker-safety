import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGridStore } from '../../store/useGridStore';

interface TransmissionTower3DProps {
  position: [number, number, number];
  towerId: string;
  name: string;
  isEnergized: boolean;
  height?: number;
  scale?: number;
  rotation?: [number, number, number];
}

export const TransmissionTower3D: React.FC<TransmissionTower3DProps> = ({
  position,
  towerId,
  name,
  isEnergized,
  height = 14,
  scale = 1.0,
  rotation = [0, Math.PI / 2, 0],
}) => {
  const setSelectedElement = useGridStore((s) => s.setSelectedElement);
  const showLabels = useGridStore((s) => s.showLabels);
  const hardwareDevice = useGridStore((s) => s.hardwareDevice);
  const hardwareMode = useGridStore((s) => s.hardwareMode);
  const pendingTowers = useGridStore((s) => s.pendingTowers);
  const isolatedTowers = useGridStore((s) => s.isolatedTowers);
  const ina219Telemetry = useGridStore((s) => s.ina219Telemetry);

  const isPending = !!pendingTowers[towerId];
  const isOnline = hardwareDevice.status === 'ONLINE';
  const hwState = hardwareDevice.output_states[towerId] || 'UNKNOWN';
  // ONLY mark isolated if explicitly in isolatedTowers:
  const isIsolated = isolatedTowers.includes(towerId as any);

  // Determine effective display state:
  // Normal state is ENERGIZED (Vivid Cyan-Blue #38bdf8)
  let effectiveStatus = 'ENERGIZED';
  let statusText = '110kV TRANSMISSION';
  let statusColor = '#38bdf8';
  let glowColor = '#38bdf8';
  let emissiveColor = '#0284c7';

  if (isIsolated) {
    // Isolated: Power supply is completely stopped (0 A). All lights extinguished until user clicks ON.
    effectiveStatus = 'ISOLATED';
    statusText = 'ISOLATED - POWER SUPPLY STOPPED (0 A)';
    statusColor = '#ef4444';
    glowColor = '#475569';
    emissiveColor = '#000000';
  } else if (!isEnergized) {
    effectiveStatus = 'OFF';
    statusText = 'DE-ENERGIZED - POWER SUPPLY OFF (0 A)';
    statusColor = '#64748b';
    glowColor = '#334155';
    emissiveColor = '#000000';
  }

  const beaconRef = useRef<THREE.PointLight>(null);

  // Tower apex light: Glows ONLY when energized. Completely dark (0 intensity) when isolated / OFF!
  useFrame(({ clock }) => {
    if (beaconRef.current) {
      if (effectiveStatus === 'ISOLATED' || effectiveStatus === 'OFF') {
        beaconRef.current.intensity = 0;
      } else {
        const t = clock.getElapsedTime() * (isPending ? 6 : 2);
        beaconRef.current.intensity = (Math.sin(t * 3) > 0.3) ? 2.5 : 0.4;
      }
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    const gpioPin = hardwareDevice.relay_pins?.[towerId] || {'T1': 13, 'T2': 14, 'T3': 25, 'T4': 26, 'T5': 27}[towerId];
    setSelectedElement({
      id: towerId,
      type: 'pole',
      title: `Distribution Tower ${towerId}`,
      voltage_kv: 110,
      status: isPending ? 'SWITCHING PENDING ACK' : isIsolated ? 'ISOLATED (0 A - RELAY DE-ENERGIZED)' : isEnergized ? 'ENERGIZED - NORMAL TRANSMISSION' : 'DE-ENERGIZED / OFF',
      current_a: isEnergized && !isIsolated ? 320.5 : 0,
      power_kw: isEnergized && !isIsolated ? 430.0 : 0,
      details: {
        'Physical Relay Pin': `ESP32 GPIO ${gpioPin} -> Relay IN${towerId.replace('T', '')}`,
        'Hardware State': hwState,
        'Controller Connection': isOnline ? `Online (${hardwareDevice.roundtrip_latency_ms || 18}ms ACK)` : 'Offline / Unreachable',
        'Physical Load Current': `${ina219Telemetry.current_ma.toFixed(1)} mA (Total INA219 Bus)`,
        'Operating Mode': hardwareMode === 'PHYSICAL' ? 'Physical Hardware Synchronized' : 'Virtual Simulation Mode',
        'Tower Class': 'Double-Circuit Galvanized Steel Lattice (Waisted)',
        'Total Height': `${height} meters`,
        'Base Footprint': '4.2m x 4.2m Foundation Pad',
        'Safety Disclaimer': 'Low-Voltage Educational Laboratory Model Only'
      }
    });
  };

  // Build lattice geometry lines for the transmission pylon
  const latticeLines = useMemo(() => {
    const points: THREE.Vector3[] = [];
    
    // Tower Dimensions
    const baseW = 1.8 * scale;
    const waistW = 0.65 * scale;
    const topW = 0.5 * scale;
    const h = height * scale;
    const waistH = h * 0.55;
    const cageTopH = h * 0.88;

    // 4 Corner Legs (Base to Waist)
    const corners = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];

    // Corner Leg Vertices at 4 elevation levels
    const lvl0 = corners.map(([cx, cz]) => new THREE.Vector3(cx * baseW, 0, cz * baseW));
    const lvl1 = corners.map(([cx, cz]) => new THREE.Vector3(cx * (baseW * 0.6 + waistW * 0.4), waistH * 0.5, cz * (baseW * 0.6 + waistW * 0.4)));
    const lvl2 = corners.map(([cx, cz]) => new THREE.Vector3(cx * waistW, waistH, cz * waistW));
    const lvl3 = corners.map(([cx, cz]) => new THREE.Vector3(cx * topW, cageTopH, cz * topW));
    const peak = new THREE.Vector3(0, h, 0);

    // Add main 4 corner posts
    for (let i = 0; i < 4; i++) {
      points.push(lvl0[i], lvl1[i]);
      points.push(lvl1[i], lvl2[i]);
      points.push(lvl2[i], lvl3[i]);
      points.push(lvl3[i], peak);
    }

    // Horizontal Ring Bracings & X-Bracing for Tier 0 -> Tier 1
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      // Ring
      points.push(lvl0[i], lvl0[next]);
      points.push(lvl1[i], lvl1[next]);
      // X-Braces
      points.push(lvl0[i], lvl1[next]);
      points.push(lvl0[next], lvl1[i]);
    }

    // Horizontal Ring Bracings & X-Bracing for Tier 1 -> Tier 2 (Waist)
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      points.push(lvl2[i], lvl2[next]);
      points.push(lvl1[i], lvl2[next]);
      points.push(lvl1[next], lvl2[i]);
    }

    // Horizontal Ring Bracings & X-Bracing for Tier 2 -> Tier 3 (Cage)
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      points.push(lvl3[i], lvl3[next]);
      points.push(lvl2[i], lvl3[next]);
      points.push(lvl2[next], lvl3[i]);
    }

    // Peak Pyramid Lines
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      points.push(lvl3[i], peak);
      points.push(lvl3[i], lvl3[next]);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [height, scale]);

  const h = height * scale;
  const pylonColor =
    effectiveStatus === 'ISOLATED'
      ? '#ef4444' // Vivid Crimson Red when isolated
      : effectiveStatus === 'OFF'
      ? '#64748b' // Slate grey when turned off
      : '#38bdf8'; // Normal Vivid Cyan/Electric Blue
  const steelMatColor =
    effectiveStatus === 'ISOLATED'
      ? '#991b1b' // Deep Red steel frame
      : effectiveStatus === 'OFF'
      ? '#334155'
      : '#0284c7'; // Deep Blue steel frame

  return (
    <group position={position} rotation={rotation} onClick={handleClick}>
      {/* 4 Concrete Foundation Stubs */}
      {[
        [-1.8 * scale, -1.8 * scale],
        [1.8 * scale, -1.8 * scale],
        [1.8 * scale, 1.8 * scale],
        [-1.8 * scale, 1.8 * scale],
      ].map(([fx, fz], idx) => (
        <mesh key={`foot-${idx}`} position={[fx, 0.3 * scale, fz]}>
          <cylinderGeometry args={[0.35 * scale, 0.45 * scale, 0.6 * scale, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>
      ))}

      {/* Main Structural Lattice Lines */}
      <lineSegments geometry={latticeLines}>
        <lineBasicMaterial
          color={pylonColor}
          linewidth={2}
          transparent
          opacity={effectiveStatus === 'ENERGIZED' ? 0.95 : 0.65}
        />
      </lineSegments>

      {/* Solid Steel Chords / Posts (Subtle solid core for rich shading) */}
      <mesh position={[0, h * 0.45, 0]}>
        <cylinderGeometry
          args={[0.35 * scale, 1.4 * scale, h * 0.9, 4, 1, true]}
        />
        <meshStandardMaterial
          color={steelMatColor}
          wireframe
          transparent
          opacity={effectiveStatus === 'ENERGIZED' ? 0.4 : 0.25}
          metalness={0.8}
        />
      </mesh>

      {/* Lower Cantilever Crossarms (Wide, Level 1) */}
      <group position={[0, h * 0.68, 0]}>
        {/* Main Crossarm Beam */}
        <mesh castShadow>
          <boxGeometry args={[7.2 * scale, 0.25 * scale, 0.5 * scale]} />
          <meshStandardMaterial color={steelMatColor} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Diagonal support struts */}
        <mesh position={[-2.2 * scale, -0.6 * scale, 0]} rotation={[0, 0, 0.4]}>
          <cylinderGeometry args={[0.06, 0.06, 1.6 * scale, 8]} />
          <meshStandardMaterial color={steelMatColor} metalness={0.7} />
        </mesh>
        <mesh position={[2.2 * scale, -0.6 * scale, 0]} rotation={[0, 0, -0.4]}>
          <cylinderGeometry args={[0.06, 0.06, 1.6 * scale, 8]} />
          <meshStandardMaterial color={steelMatColor} metalness={0.7} />
        </mesh>
        {/* Hanging Insulator Strings at Tips (Phase A & C) */}
        {[-3.4 * scale, 3.4 * scale].map((x, i) => (
          <group key={`ins-low-${i}`} position={[x, -0.7 * scale, 0]}>
            {/* 6 Insulator Discs */}
            {[0, -0.15, -0.3, -0.45, -0.6, -0.75].map((dy, dIdx) => (
              <mesh key={`disc-${dIdx}`} position={[0, dy * scale, 0]}>
                <cylinderGeometry args={[0.16 * scale, 0.08 * scale, 0.08 * scale, 10]} />
                <meshStandardMaterial
                  color={
                    effectiveStatus === 'ENERGIZED'
                      ? '#38bdf8'
                      : effectiveStatus === 'ISOLATED'
                      ? '#ef4444'
                      : effectiveStatus === 'PENDING'
                      ? '#f59e0b'
                      : '#64748b'
                  }
                  roughness={0.2}
                  metalness={0.3}
                />
              </mesh>
            ))}
            {/* Bottom Conductor Clamp */}
            <mesh position={[0, -0.85 * scale, 0]}>
              <sphereGeometry args={[0.1 * scale, 8, 8]} />
              <meshStandardMaterial
                color={glowColor}
                emissive={emissiveColor}
                emissiveIntensity={effectiveStatus === 'OFF' || effectiveStatus === 'OFFLINE' ? 0.1 : 1.2}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Upper Cantilever Crossarms (Level 2) */}
      <group position={[0, h * 0.82, 0]}>
        <mesh castShadow>
          <boxGeometry args={[5.6 * scale, 0.22 * scale, 0.45 * scale]} />
          <meshStandardMaterial color={steelMatColor} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Upper Insulator Strings (Phase B) */}
        {[-2.6 * scale, 2.6 * scale].map((x, i) => (
          <group key={`ins-up-${i}`} position={[x, -0.7 * scale, 0]}>
            {[0, -0.15, -0.3, -0.45, -0.6, -0.75].map((dy, dIdx) => (
              <mesh key={`disc-up-${dIdx}`} position={[0, dy * scale, 0]}>
                <cylinderGeometry args={[0.16 * scale, 0.08 * scale, 0.08 * scale, 10]} />
                <meshStandardMaterial
                  color={
                    effectiveStatus === 'ENERGIZED'
                      ? '#38bdf8'
                      : effectiveStatus === 'ISOLATED'
                      ? '#ef4444'
                      : effectiveStatus === 'PENDING'
                      ? '#f59e0b'
                      : '#64748b'
                  }
                  roughness={0.2}
                  metalness={0.3}
                />
              </mesh>
            ))}
            <mesh position={[0, -0.85 * scale, 0]}>
              <sphereGeometry args={[0.1 * scale, 8, 8]} />
              <meshStandardMaterial
                color={glowColor}
                emissive={emissiveColor}
                emissiveIntensity={effectiveStatus === 'OFF' || effectiveStatus === 'OFFLINE' ? 0.1 : 1.2}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Tower Peak Apex Spire with Aviation Warning Beacon */}
      <group position={[0, h, 0]}>
        <mesh position={[0, 0.25 * scale, 0]}>
          <cylinderGeometry args={[0.04 * scale, 0.1 * scale, 0.6 * scale, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} />
        </mesh>
        {/* Tower Spire Beacon: Glows only when LIVE. Completely dark when isolated / OFF */}
        <mesh position={[0, 0.6 * scale, 0]}>
          <sphereGeometry args={[0.14 * scale, 16, 16]} />
          <meshStandardMaterial
            color={effectiveStatus === 'ISOLATED' || effectiveStatus === 'OFF' ? '#334155' : isPending ? '#fbbf24' : '#38bdf8'}
            emissive={effectiveStatus === 'ISOLATED' || effectiveStatus === 'OFF' ? '#000000' : isPending ? '#d97706' : '#0284c7'}
            emissiveIntensity={effectiveStatus === 'ISOLATED' || effectiveStatus === 'OFF' ? 0 : 2.0}
            roughness={effectiveStatus === 'ISOLATED' || effectiveStatus === 'OFF' ? 0.9 : 0.1}
          />
        </mesh>
        <pointLight
          ref={beaconRef}
          position={[0, 0.6 * scale, 0]}
          color={isPending ? '#fbbf24' : '#38bdf8'}
          distance={12 * scale}
          intensity={effectiveStatus === 'ISOLATED' || effectiveStatus === 'OFF' ? 0 : 2}
        />
      </group>

      {/* Cyber Technical Ground Marker Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[2.5 * scale, 2.7 * scale, 32]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={effectiveStatus === 'OFF' || effectiveStatus === 'OFFLINE' ? 0.15 : 0.6}
        />
      </mesh>
    </group>
  );
};
