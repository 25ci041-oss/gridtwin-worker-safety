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
  const beaconRef = useRef<THREE.PointLight>(null);

  // Night aircraft obstruction beacon blink on top spire
  useFrame(({ clock }) => {
    if (beaconRef.current) {
      const t = clock.getElapsedTime() * 2;
      beaconRef.current.intensity = (Math.sin(t * 3) > 0.3) ? 2.5 : 0.2;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedElement({
      id: towerId,
      type: 'pole',
      title: `High-Voltage Lattice Transmission Tower ${towerId}`,
      voltage_kv: 110,
      status: isEnergized ? 'ENERGIZED - NORMAL TRANSMISSION' : 'ISOLATED / DE-ENERGIZED',
      current_a: isEnergized ? 320.5 : 0,
      power_kw: isEnergized ? 2173.7 : 0,
      details: {
        'Tower Class': 'Double-Circuit Galvanized Steel Lattice (Waisted)',
        'Total Height': `${height} meters`,
        'Base Footprint': '4.2m x 4.2m Foundation Pad',
        'Crossarms': 'Dual-Tier Cantilever Trusses (Upper: 5.6m, Lower: 7.2m)',
        'Insulator Strings': 'Toughened Glass Disc Suspension (9 Discs per String)',
        'Shield Wire': 'Optical Ground Wire (OPGW) at Apex',
        'Phase Arrangement': 'Vertical Double-Circuit (3-Phase AC Transposition)',
        'Grounding': '4-Leg Driven Copper Rods (Earthing < 2.5Ω)',
        'Wind Loading': 'Engineered to 160 km/h Gust Velocity'
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
  const pylonColor = isEnergized ? '#67e8f9' : '#94a3b8'; // Glowing cyan when energized, silver-grey when isolated
  const steelMatColor = isEnergized ? '#0891b2' : '#334155';

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
          opacity={isEnergized ? 0.95 : 0.6}
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
          opacity={isEnergized ? 0.4 : 0.25}
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
                  color={isEnergized ? '#38bdf8' : '#78350f'}
                  roughness={0.2}
                  metalness={0.3}
                />
              </mesh>
            ))}
            {/* Bottom Conductor Clamp */}
            <mesh position={[0, -0.85 * scale, 0]}>
              <sphereGeometry args={[0.1 * scale, 8, 8]} />
              <meshStandardMaterial
                color={isEnergized ? '#38bdf8' : '#64748b'}
                emissive={isEnergized ? '#0284c7' : '#000000'}
                emissiveIntensity={isEnergized ? 1.0 : 0}
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
                  color={isEnergized ? '#38bdf8' : '#78350f'}
                  roughness={0.2}
                  metalness={0.3}
                />
              </mesh>
            ))}
            <mesh position={[0, -0.85 * scale, 0]}>
              <sphereGeometry args={[0.1 * scale, 8, 8]} />
              <meshStandardMaterial
                color={isEnergized ? '#38bdf8' : '#64748b'}
                emissive={isEnergized ? '#0284c7' : '#000000'}
                emissiveIntensity={isEnergized ? 1.0 : 0}
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
        {/* Flashing Red Aviation Obstruction Beacon */}
        <mesh position={[0, 0.6 * scale, 0]}>
          <sphereGeometry args={[0.14 * scale, 16, 16]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <pointLight ref={beaconRef} position={[0, 0.6 * scale, 0]} color="#ef4444" distance={12 * scale} intensity={2} />
      </group>

      {/* Cyber Technical Ground Marker Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[2.5 * scale, 2.7 * scale, 32]} />
        <meshBasicMaterial
          color={isEnergized ? '#06b6d4' : '#475569'}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Tower Identifier Label in 3D */}
      {showLabels && (
        <group position={[0, h + 1.8 * scale, 0]}>
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[2.6, 0.65]} />
            <meshBasicMaterial color="#0b1329" transparent opacity={0.85} />
          </mesh>
          <Text
            position={[0, 0.1, 0]}
            fontSize={0.24}
            color={isEnergized ? '#38bdf8' : '#94a3b8'}
            anchorX="center"
            anchorY="middle"
          >
            {towerId}
          </Text>
          <Text
            position={[0, -0.15, 0]}
            fontSize={0.18}
            color={isEnergized ? '#10b981' : '#ef4444'}
            anchorX="center"
            anchorY="middle"
          >
            {isEnergized ? '110kV TRANSMISSION' : 'ISOLATED'}
          </Text>
        </group>
      )}
    </group>
  );
};
