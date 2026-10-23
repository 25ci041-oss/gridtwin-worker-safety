import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGridStore } from '../../store/useGridStore';

interface TransmissionInterlink3DProps {
  towerA: [number, number, number];
  towerB: [number, number, number];
  isEnergized: boolean;
  heightA?: number;
  heightB?: number;
  scaleA?: number;
  scaleB?: number;
}

export const TransmissionInterlink3D: React.FC<TransmissionInterlink3DProps> = ({
  towerA,
  towerB,
  isEnergized,
  heightA = 14,
  heightB = 14,
  scaleA = 1.0,
  scaleB = 1.0,
}) => {
  const showPowerFlow = useGridStore((s) => s.showPowerFlow);

  // References for animated energy flow pulses on conductors
  const pulse1Ref = useRef<THREE.Mesh>(null);
  const pulse2Ref = useRef<THREE.Mesh>(null);
  const pulse3Ref = useRef<THREE.Mesh>(null);

  // Crossarm attach offsets:
  // Lower Left, Lower Right, Upper Left, Upper Right, Peak
  const conductorSpans = useMemo(() => {
    const pA = new THREE.Vector3(...towerA);
    const pB = new THREE.Vector3(...towerB);

    // Compute tower forward & right unit vectors
    const dir = new THREE.Vector3().subVectors(pB, pA).normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

    const lowH_A = heightA * 0.68 * scaleA - 0.85 * scaleA;
    const lowH_B = heightB * 0.68 * scaleB - 0.85 * scaleB;
    const upH_A = heightA * 0.82 * scaleA - 0.85 * scaleA;
    const upH_B = heightB * 0.82 * scaleB - 0.85 * scaleB;
    const peakH_A = heightA * scaleA;
    const peakH_B = heightB * scaleB;

    const lowSpanW_A = 3.4 * scaleA;
    const lowSpanW_B = 3.4 * scaleB;
    const upSpanW_A = 2.6 * scaleA;
    const upSpanW_B = 2.6 * scaleB;

    // Define 5 parallel transmission lines
    const lineDefinitions = [
      // Phase A (Lower Left)
      {
        start: new THREE.Vector3().copy(pA).addScaledVector(right, -lowSpanW_A).setY(pA.y + lowH_A),
        end: new THREE.Vector3().copy(pB).addScaledVector(right, -lowSpanW_B).setY(pB.y + lowH_B),
        sag: 0.9,
      },
      // Phase B (Upper Left)
      {
        start: new THREE.Vector3().copy(pA).addScaledVector(right, -upSpanW_A).setY(pA.y + upH_A),
        end: new THREE.Vector3().copy(pB).addScaledVector(right, -upSpanW_B).setY(pB.y + upH_B),
        sag: 0.85,
      },
      // Phase C (Lower Right)
      {
        start: new THREE.Vector3().copy(pA).addScaledVector(right, lowSpanW_A).setY(pA.y + lowH_A),
        end: new THREE.Vector3().copy(pB).addScaledVector(right, lowSpanW_B).setY(pB.y + lowH_B),
        sag: 0.9,
      },
      // Phase D (Upper Right)
      {
        start: new THREE.Vector3().copy(pA).addScaledVector(right, upSpanW_A).setY(pA.y + upH_A),
        end: new THREE.Vector3().copy(pB).addScaledVector(right, upSpanW_B).setY(pB.y + upH_B),
        sag: 0.85,
      },
      // Peak Shield / Ground Wire (OPGW - straight catenary at peak)
      {
        start: new THREE.Vector3(pA.x, pA.y + peakH_A, pA.z),
        end: new THREE.Vector3(pB.x, pB.y + peakH_B, pB.z),
        sag: 0.45,
        isGroundWire: true,
      },
    ];

    return lineDefinitions.map((def) => {
      const mid = new THREE.Vector3(
        (def.start.x + def.end.x) / 2,
        (def.start.y + def.end.y) / 2 - def.sag,
        (def.start.z + def.end.z) / 2
      );
      const curve = new THREE.QuadraticBezierCurve3(def.start, mid, def.end);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, def.isGroundWire ? 0.03 : 0.045, 8, false);
      return { curve, tubeGeo, isGroundWire: !!def.isGroundWire };
    });
  }, [towerA, towerB, heightA, heightB, scaleA, scaleB]);

  // Animate dynamic energy flow packets along the transmission lines
  useFrame(({ clock }) => {
    if (!isEnergized || !showPowerFlow) return;
    const t1 = (clock.getElapsedTime() * 0.5) % 1;
    const t2 = (clock.getElapsedTime() * 0.5 + 0.33) % 1;
    const t3 = (clock.getElapsedTime() * 0.5 + 0.66) % 1;

    if (pulse1Ref.current && conductorSpans[0]) {
      pulse1Ref.current.position.copy(conductorSpans[0].curve.getPoint(t1));
    }
    if (pulse2Ref.current && conductorSpans[1]) {
      pulse2Ref.current.position.copy(conductorSpans[1].curve.getPoint(t2));
    }
    if (pulse3Ref.current && conductorSpans[2]) {
      pulse3Ref.current.position.copy(conductorSpans[2].curve.getPoint(t3));
    }
  });

  const conductorColor = isEnergized ? '#38bdf8' : '#475569';
  const emissiveColor = isEnergized ? '#0284c7' : '#000000';

  return (
    <group>
      {/* 5 High-voltage parallel conductors spanning between towers */}
      {conductorSpans.map((span, idx) => (
        <mesh key={`span-${idx}`} geometry={span.tubeGeo}>
          <meshStandardMaterial
            color={span.isGroundWire ? '#94a3b8' : conductorColor}
            emissive={span.isGroundWire ? '#000000' : emissiveColor}
            emissiveIntensity={span.isGroundWire ? 0 : isEnergized ? 0.75 : 0}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* Dynamic Glowing Energy Flow Pulses */}
      {isEnergized && showPowerFlow && (
        <>
          <mesh ref={pulse1Ref}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshBasicMaterial color="#a5f3fc" />
          </mesh>
          <mesh ref={pulse2Ref}>
            <sphereGeometry args={[0.14, 12, 12]} />
            <meshBasicMaterial color="#67e8f9" />
          </mesh>
          <mesh ref={pulse3Ref}>
            <sphereGeometry args={[0.14, 12, 12]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        </>
      )}
    </group>
  );
};
