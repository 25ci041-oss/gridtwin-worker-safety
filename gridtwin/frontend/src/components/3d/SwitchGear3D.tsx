import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGridStore } from '../../store/useGridStore';
import { SwitchState } from '../../types';

interface SwitchGear3DProps {
  position: [number, number, number];
  switchId: string;
  name: string;
  state: SwitchState;
  sectionId: string;
  gpioPin?: number;
}

export const SwitchGear3D: React.FC<SwitchGear3DProps> = ({
  position,
  switchId,
  name,
  state,
  sectionId,
  gpioPin,
}) => {
  const toggleSwitch = useGridStore((s) => s.toggleSwitch);
  const setSelectedElement = useGridStore((s) => s.setSelectedElement);
  const showLabels = useGridStore((s) => s.showLabels);

  const isClosed = state === 'CLOSED';
  const bladeRef = useRef<THREE.Group>(null);
  const glowLightRef = useRef<THREE.PointLight>(null);

  // Smooth mechanical animation of the disconnect arm
  useFrame(() => {
    if (bladeRef.current) {
      const targetAngle = isClosed ? 0 : -Math.PI / 3;
      bladeRef.current.rotation.z = THREE.MathUtils.lerp(
        bladeRef.current.rotation.z,
        targetAngle,
        0.12
      );
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedElement({
      id: switchId,
      type: 'switch',
      title: name,
      voltage_kv: 11,
      status: state,
      current_a: isClosed ? 52.4 : 0,
      power_kw: isClosed ? 480 : 0,
      details: {
        'Switch Identifier': switchId,
        'Controlled Section': sectionId,
        'Physical GPIO (ESP32)': `GPIO ${gpioPin || 'N/A'} (Relay Trigger)`,
        'Operating Mechanism': 'Motorized Vacuum Disconnect Switch',
        'Rated Voltage': '12 kV RMS',
        'Rated Current': '630 A Continuous',
        'Breaking Capacity': '16 kA Symmetrical',
        'Safety Lockout': 'Interlock Ready (SCADA Armed)',
        'Click Action': 'Click Switch in 3D to Toggle State'
      }
    });
  };

  const handleDoubleClick = (e: any) => {
    e.stopPropagation();
    toggleSwitch(switchId);
  };

  const statusColor = isClosed ? '#10b981' : '#ef4444'; // Green = closed/energized, Red = open/isolated

  return (
    <group position={position} onClick={handleClick} onDoubleClick={handleDoubleClick}>
      {/* Switch Control Enclosure Box */}
      <mesh position={[0, 5.0, 0]} castShadow>
        <boxGeometry args={[0.9, 1.4, 0.7]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Control Box Door & Nameplate */}
      <mesh position={[0, 5.0, 0.36]}>
        <planeGeometry args={[0.8, 1.2]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Switch Status Indicator Lamp (3D LED) */}
      <mesh position={[0, 5.3, 0.37]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.05, 16]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={1.8}
        />
      </mesh>
      <pointLight
        ref={glowLightRef}
        position={[0, 5.3, 0.5]}
        color={statusColor}
        intensity={2.2}
        distance={4}
      />

      {/* Vacuum Interrupter Bottles (3 phases) */}
      {[-0.28, 0, 0.28].map((x, i) => (
        <group key={`bottle-${i}`} position={[x, 6.2, 0]}>
          {/* Ceramic Insulator Body */}
          <mesh castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.9, 12]} />
            <meshStandardMaterial color="#b45309" roughness={0.4} />
          </mesh>
          {/* Top Terminal */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.08, 0.1, 0.08]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      ))}

      {/* Mechanical Disconnect Blades (Rotatable) */}
      <group ref={bladeRef} position={[0, 6.7, 0]}>
        {[-0.28, 0, 0.28].map((x, i) => (
          <mesh key={`blade-${i}`} position={[x, 0.3, 0]} castShadow>
            <boxGeometry args={[0.03, 0.6, 0.04]} />
            <meshStandardMaterial
              color={isClosed ? '#f59e0b' : '#94a3b8'}
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
        ))}
      </group>

      {/* Interactive Switch Title Label */}
      {showLabels && (
        <group position={[0, 7.5, 0]}>
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[2.6, 0.7]} />
            <meshBasicMaterial color="#0b1329" transparent opacity={0.85} />
          </mesh>
          <Text
            position={[0, 0.12, 0]}
            fontSize={0.24}
            color="#f8fafc"
            anchorX="center"
            anchorY="middle"
          >
            {switchId} • {sectionId}
          </Text>
          <Text
            position={[0, -0.16, 0]}
            fontSize={0.2}
            color={statusColor}
            anchorX="center"
            anchorY="middle"
          >
            {state} {gpioPin ? `(GPIO ${gpioPin})` : ''}
          </Text>
        </group>
      )}
    </group>
  );
};
