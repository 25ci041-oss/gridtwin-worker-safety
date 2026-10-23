import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGridStore } from '../../store/useGridStore';

interface Substation3DProps {
  position: [number, number, number];
}

export const Substation3D: React.FC<Substation3DProps> = ({ position }) => {
  const setSelectedElement = useGridStore((s) => s.setSelectedElement);
  const showLabels = useGridStore((s) => s.showLabels);
  const beaconRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (beaconRef.current) {
      beaconRef.current.intensity = 1.5 + Math.sin(clock.getElapsedTime() * 3) * 0.8;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedElement({
      id: 'SS-01',
      type: 'substation',
      title: 'Primary 33kV/11kV Distribution Substation',
      voltage_kv: 33,
      status: 'OPERATIONAL - NOMINAL',
      current_a: 114.2,
      power_kw: 2173.7,
      details: {
        'Capacity': '10 MVA ONAN',
        'Incomer': '33 kV Grid Feed from Regional Transmission',
        'Secondary Bus': '11 kV Switchgear Busbar A/B',
        'Protection': 'Differential, Overcurrent (50/51), Earth Fault (51N)',
        'Transformer Oil Temp': '48.2 °C (Safe)',
        'Tap Position': 'Step 7 / 16 (Auto-regulated)',
        'Breaker Status': 'Main CB Closed'
      }
    });
  };

  return (
    <group position={position} onClick={handleClick}>
      {/* Concrete Foundation Slab */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[14, 0.4, 12]} />
        <meshStandardMaterial color="#1e2430" roughness={0.8} />
      </mesh>

      {/* Gravel Substation Yard */}
      <mesh position={[0, 0.41, 0]} receiveShadow>
        <boxGeometry args={[13.6, 0.05, 11.6]} />
        <meshStandardMaterial color="#2d3748" roughness={0.9} />
      </mesh>

      {/* Control Room Building */}
      <group position={[-3.5, 2, -2.5]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4.5, 3.2, 5]} />
          <meshStandardMaterial color="#1f293d" metalness={0.2} roughness={0.6} />
        </mesh>
        {/* Control Room Flat Roof Parapet */}
        <mesh position={[0, 1.7, 0]}>
          <boxGeometry args={[4.7, 0.2, 5.2]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        {/* Glow Window */}
        <mesh position={[2.26, 0.2, 0]}>
          <planeGeometry args={[1.8, 1.2]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
        {/* Building Sign */}
        <Text
          position={[0, 1.2, 2.52]}
          fontSize={0.28}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
        >
          CONTROL ROOM
        </Text>
      </group>

      {/* Main Power Transformer (10 MVA) */}
      <group position={[2.8, 1.8, 1.5]}>
        {/* Main Oil Tank */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.2, 2.8, 2.6]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
        </mesh>
        
        {/* Cooling Radiator Fins Left */}
        {[-0.8, -0.4, 0, 0.4, 0.8].map((offset, i) => (
          <mesh key={`rad-l-${i}`} position={[-1.75, 0, offset]} castShadow>
            <boxGeometry args={[0.3, 2.2, 0.1]} />
            <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.3} />
          </mesh>
        ))}

        {/* Cooling Radiator Fins Right */}
        {[-0.8, -0.4, 0, 0.4, 0.8].map((offset, i) => (
          <mesh key={`rad-r-${i}`} position={[1.75, 0, offset]} castShadow>
            <boxGeometry args={[0.3, 2.2, 0.1]} />
            <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.3} />
          </mesh>
        ))}

        {/* Oil Conservator Drum (Top) */}
        <mesh position={[0, 1.9, -0.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 2.8, 16]} />
          <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} />
        </mesh>

        {/* 33kV Primary Bushings (High Voltage) */}
        {[-0.8, 0, 0.8].map((x, i) => (
          <group key={`hv-bushing-${i}`} position={[x, 1.8, 0.7]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.1, 0.18, 1.0, 12]} />
              <meshStandardMaterial color="#92400e" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.55, 0]}>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        ))}

        {/* 11kV Secondary Bushings */}
        {[-0.6, 0, 0.6].map((x, i) => (
          <group key={`lv-bushing-${i}`} position={[x, 1.6, -0.8]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.08, 0.14, 0.7, 12]} />
              <meshStandardMaterial color="#78350f" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.4, 0]}>
              <sphereGeometry args={[0.09, 12, 12]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        ))}

        {/* Substation Warning Beacon */}
        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <pointLight ref={beaconRef} position={[0, 2.5, 0]} color="#ef4444" distance={8} />
      </group>

      {/* Busbar Gantry Steel Lattice Structure */}
      <group position={[2.8, 0, -3.2]}>
        {/* Steel Columns */}
        <mesh position={[-2, 3, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 6, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[2, 3, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 6, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Horizontal Beam */}
        <mesh position={[0, 5.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 4.2, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Suspended Busbar Insulators */}
        {[-1.2, 0, 1.2].map((x, i) => (
          <group key={`bus-ins-${i}`} position={[x, 5.2, 0]}>
            <mesh>
              <cylinderGeometry args={[0.06, 0.09, 0.9, 8]} />
              <meshStandardMaterial color="#0284c7" roughness={0.2} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Perimeter Security Fence Posts */}
      {[-6.5, 6.5].map((x, i) => (
        <mesh key={`fence-x-${i}`} position={[x, 1.2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 2.4, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.7} />
        </mesh>
      ))}

      {/* Substation Title Label */}
      {showLabels && (
        <group position={[0, 6.5, 0]}>
          <mesh position={[0, 0, -0.05]}>
            <planeGeometry args={[7, 0.9]} />
            <meshBasicMaterial color="#0b1329" transparent opacity={0.8} />
          </mesh>
          <Text
            position={[0, 0.15, 0]}
            fontSize={0.38}
            color="#38bdf8"
            anchorX="center"
            anchorY="middle"
          >
            33/11kV PRIMARY SUBSTATION
          </Text>
          <Text
            position={[0, -0.22, 0]}
            fontSize={0.22}
            color="#10b981"
            anchorX="center"
            anchorY="middle"
          >
            GRID FEED ONLINE • 10 MVA
          </Text>
        </group>
      )}
    </group>
  );
};
