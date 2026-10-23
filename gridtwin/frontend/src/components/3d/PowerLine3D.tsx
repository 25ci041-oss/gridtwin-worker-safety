import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGridStore } from '../../store/useGridStore';

interface PowerLine3DProps {
  start: [number, number, number];
  end: [number, number, number];
  isEnergized: boolean;
  sag?: number;
  voltageKv?: number;
}

export const PowerLine3D: React.FC<PowerLine3DProps> = ({
  start,
  end,
  isEnergized,
  sag = 0.5,
}) => {
  const showPowerFlow = useGridStore((s) => s.showPowerFlow);
  const pulseSphereRef = useRef<THREE.Mesh>(null);
  const pulseSphere2Ref = useRef<THREE.Mesh>(null);

  // Generate catenary sagging cable curve
  const curve = useMemo(() => {
    const p1 = new THREE.Vector3(...start);
    const p2 = new THREE.Vector3(...end);
    const mid = new THREE.Vector3(
      (p1.x + p2.x) / 2,
      (p1.y + p2.y) / 2 - sag,
      (p1.z + p2.z) / 2
    );
    return new THREE.QuadraticBezierCurve3(p1, mid, p2);
  }, [start, end, sag]);

  // Cable tube geometry
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 32, 0.04, 8, false);
  }, [curve]);

  // Animate glowing power flow energy pulse along cable
  useFrame(({ clock }) => {
    if (!isEnergized || !showPowerFlow) return;
    const t = (clock.getElapsedTime() * 0.45) % 1;
    const t2 = (clock.getElapsedTime() * 0.45 + 0.5) % 1;

    if (pulseSphereRef.current) {
      const pos = curve.getPoint(t);
      pulseSphereRef.current.position.copy(pos);
    }
    if (pulseSphere2Ref.current) {
      const pos2 = curve.getPoint(t2);
      pulseSphere2Ref.current.position.copy(pos2);
    }
  });

  const cableColor = isEnergized ? '#0284c7' : '#334155';
  const emissiveColor = isEnergized ? '#0369a1' : '#000000';

  return (
    <group>
      {/* Conductor Cable Tube */}
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color={cableColor}
          emissive={emissiveColor}
          emissiveIntensity={isEnergized ? 0.6 : 0}
          roughness={0.4}
          metalness={0.8}
        />
      </mesh>

      {/* Dynamic Glowing Energy Flow Particles */}
      {isEnergized && showPowerFlow && (
        <>
          <mesh ref={pulseSphereRef}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          <mesh ref={pulseSphere2Ref}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshBasicMaterial color="#7dd3fc" />
          </mesh>
        </>
      )}
    </group>
  );
};
