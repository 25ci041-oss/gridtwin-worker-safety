import React from 'react';
import { Text } from '@react-three/drei';
import { useGridStore } from '../../store/useGridStore';

interface DistributionPole3DProps {
  position: [number, number, number];
  poleId: string;
  name: string;
  isEnergized: boolean;
}

export const DistributionPole3D: React.FC<DistributionPole3DProps> = ({
  position,
  poleId,
  name,
  isEnergized,
}) => {
  const setSelectedElement = useGridStore((s) => s.setSelectedElement);
  const showLabels = useGridStore((s) => s.showLabels);

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedElement({
      id: poleId,
      type: 'pole',
      title: name,
      voltage_kv: 11,
      status: isEnergized ? 'ENERGIZED' : 'DE-ENERGIZED (ISOLATED)',
      current_a: isEnergized ? 45.8 : 0,
      power_kw: isEnergized ? 450 : 0,
      details: {
        'Pole Height': '11 meters (Spun Concrete)',
        'Class': 'Heavy Distribution Class 3',
        'Crossarm': 'Galvanized Steel Channel 2.4m',
        'Conductor Type': 'ACSR Dog 100mm²',
        'Insulator Type': '11kV Porcelain Pin Insulator',
        'Earthing': 'Continuous Copper Down-lead (Ground Resistance < 5Ω)',
        'State': isEnergized ? 'Active Circuit Flowing' : 'Dead / Line Isolated'
      }
    });
  };

  return (
    <group position={position} onClick={handleClick}>
      {/* Concrete Pole Foundation */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 0.5, 12]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>

      {/* Main Spun Concrete / Treated Utility Pole */}
      <mesh position={[0, 4.5, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 8.5, 16]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>

      {/* Top Crossarm (Galvanized Steel) */}
      <mesh position={[0, 8.0, 0]} castShadow>
        <boxGeometry args={[2.6, 0.12, 0.12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Lower Crossarm for LV or Secondary */}
      <mesh position={[0, 6.2, 0]} castShadow>
        <boxGeometry args={[1.8, 0.1, 0.1]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Top Pin Insulators (Three Phases: A, B, C) */}
      {[-1.1, 0, 1.1].map((x, i) => (
        <group key={`ins-${i}`} position={[x, 8.3, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.09, 0.35, 10]} />
            <meshStandardMaterial color="#78350f" roughness={0.3} />
          </mesh>
          {/* Conductor Attachment Clamp */}
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial
              color={isEnergized ? '#38bdf8' : '#64748b'}
              emissive={isEnergized ? '#0284c7' : '#000000'}
              emissiveIntensity={isEnergized ? 0.8 : 0}
            />
          </mesh>
        </group>
      ))}

      {/* Guy Wire Anchor (angled support line) */}
      <line>
        <bufferGeometry attach="geometry" />
        <lineBasicMaterial attach="material" color="#64748b" linewidth={1} />
      </line>

      {/* Pole Label */}
      {showLabels && (
        <group position={[0, 9.2, 0]}>
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[2.4, 0.5]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.75} />
          </mesh>
          <Text
            fontSize={0.22}
            color={isEnergized ? '#38bdf8' : '#94a3b8'}
            anchorX="center"
            anchorY="middle"
          >
            {poleId}
          </Text>
        </group>
      )}
    </group>
  );
};
