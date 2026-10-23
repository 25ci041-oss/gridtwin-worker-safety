import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGridStore } from '../../store/useGridStore';

interface BypassSwitch3DProps {
  position: [number, number, number];
  switchId?: string;
  name?: string;
  towerId?: string;
}

export const BypassSwitch3D: React.FC<BypassSwitch3DProps> = ({
  position,
  switchId = 'SW-BYPASS',
  name = 'High-Voltage Alternate Route Bypass Switch',
  towerId = 'ALL'
}) => {
  const { bypassSwitchState, toggleBypassSwitch, setSelectedElement, showLabels } = useGridStore();
  const isClosed = bypassSwitchState === 'CLOSED';

  const beaconRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (beaconRef.current && isClosed) {
      beaconRef.current.intensity = 1.6 + Math.sin(clock.getElapsedTime() * 4) * 0.5;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedElement({
      id: switchId,
      type: 'switch',
      title: name,
      voltage_kv: 110,
      status: bypassSwitchState,
      current_a: isClosed ? 280.0 : 0,
      power_kw: isClosed ? 1760.9 : 0,
      details: {
        'Switch Identifier': switchId,
        'Associated Tower': towerId === 'ALL' ? 'Front Transmission Corridor' : `Tower ${towerId}`,
        'Function': 'Alternate Route Interlink Bypass',
        'Contingency State': isClosed ? 'CLOSED (Active Bypass)' : 'OPEN (Standby)',
        'Rated Voltage': '110 kV Vacuum Interrupter',
        'Rated Current': '800 A Continuous',
        'Automation': 'Fast Transfer Automation (< 60ms)',
        'Click Action': 'Double-click to toggle Bypass'
      }
    });
  };

  const handleDoubleClick = (e: any) => {
    e.stopPropagation();
    toggleBypassSwitch();
  };

  const statusColor = isClosed ? '#10b981' : '#ef4444'; // Green when closed (bypassing), Red when open

  return (
    <group position={position} onClick={handleClick} onDoubleClick={handleDoubleClick}>
      {/* Concrete Pad Foundation (Compact) */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[1.6, 0.2, 1.2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>

      {/* Small Metal Enclosure Cabinet (Compact Switchgear in Grid) */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.2, 0.7, 0.8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Access Door Panel with Cyber Accent */}
      <mesh position={[0, 0.55, 0.41]}>
        <planeGeometry args={[1.0, 0.55]} />
        <meshStandardMaterial color="#1e2430" />
      </mesh>

      {/* Center Knife Disconnect Blade / Vacuum Indicator */}
      <mesh position={[0, 0.55, 0.42]}>
        <boxGeometry args={[0.3, 0.1, 0.05]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={isClosed ? 1.5 : 0.5}
        />
      </mesh>

      {/* Top Status Pilot Light Indicator */}
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={1.8}
        />
      </mesh>
      <pointLight
        ref={beaconRef}
        position={[0, 1.1, 0]}
        color={statusColor}
        intensity={isClosed ? 2.0 : 0.8}
        distance={6}
      />

      {/* Two Terminal Bushings for incoming & outgoing bypass cable */}
      {[-0.45, 0.45].map((x, i) => (
        <group key={`term-${i}`} position={[x, 0.95, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.04, 0.06, 0.25, 8]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#38bdf8" />
          </mesh>
        </group>
      ))}

      {/* Holographic Text Label in Grid */}
      {showLabels && (
        <group position={[0, 1.7, 0]}>
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[2.8, 0.65]} />
            <meshBasicMaterial color="#0b1329" transparent opacity={0.88} />
          </mesh>
          <Text
            position={[0, 0.12, 0]}
            fontSize={0.22}
            color="#f8fafc"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            {towerId !== 'ALL' ? `BP-${towerId} Bypass` : 'Bypass Switch'}
          </Text>
          <Text
            position={[0, -0.15, 0]}
            fontSize={0.19}
            color={statusColor}
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            ({bypassSwitchState})
          </Text>
        </group>
      )}
    </group>
  );
};
