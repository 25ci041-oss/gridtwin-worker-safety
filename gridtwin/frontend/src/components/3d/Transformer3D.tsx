import React from 'react';
import { Text } from '@react-three/drei';
import { useGridStore } from '../../store/useGridStore';

interface Transformer3DProps {
  position: [number, number, number];
  transformerId: string;
  name: string;
  isEnergized: boolean;
  sectionId: string;
}

export const Transformer3D: React.FC<Transformer3DProps> = ({
  position,
  transformerId,
  name,
  isEnergized,
  sectionId,
}) => {
  const setSelectedElement = useGridStore((s) => s.setSelectedElement);
  const showLabels = useGridStore((s) => s.showLabels);

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedElement({
      id: transformerId,
      type: 'transformer',
      title: name,
      voltage_kv: 0.415,
      status: isEnergized ? 'ENERGIZED - STEP DOWN ACTIVE' : 'COLD - DE-ENERGIZED',
      current_a: isEnergized ? 485.0 : 0,
      power_kw: isEnergized ? 320.0 : 0,
      details: {
        'Rating': '500 kVA Dyn11',
        'Primary Voltage': '11,000 V (11 kV Delta)',
        'Secondary Voltage': '415 V (400/230V Star with Neutral)',
        'Cooling': 'ONAN (Mineral Oil Immersed)',
        'Impedance (%Z)': '4.5%',
        'Winding Temp': isEnergized ? '52.4 °C' : '24.1 °C (Ambient)',
        'Section Fed': sectionId,
        'Downstream': '415V Distribution Pillar & Consumer Feeders'
      }
    });
  };

  const statusGlowColor = isEnergized ? '#10b981' : '#64748b';

  return (
    <group position={position} onClick={handleClick}>
      {/* Concrete Transformer Plinth Pad */}
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <boxGeometry args={[2.4, 0.4, 2.4]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>

      {/* Main Tank Enclosure */}
      <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 1.8, 1.4]} />
        <meshStandardMaterial color="#475569" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Radiator Cooling Fins Left & Right */}
      {[-0.4, 0, 0.4].map((z, i) => (
        <React.Fragment key={`fin-${i}`}>
          <mesh position={[-0.9, 1.3, z]} castShadow>
            <boxGeometry args={[0.2, 1.4, 0.08]} />
            <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0.9, 1.3, z]} castShadow>
            <boxGeometry args={[0.2, 1.4, 0.08]} />
            <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} />
          </mesh>
        </React.Fragment>
      ))}

      {/* 11kV Primary Bushings (Top) */}
      {[-0.4, 0, 0.4].map((x, i) => (
        <group key={`tx-bushing-${i}`} position={[x, 2.3, 0.3]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.05, 0.08, 0.4, 10]} />
            <meshStandardMaterial color="#b45309" roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* 415V Secondary LV Terminals (Front) */}
      {[-0.45, -0.15, 0.15, 0.45].map((x, i) => (
        <group key={`lv-term-${i}`} position={[x, 2.3, -0.3]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.03, 0.05, 0.3, 10]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Low Voltage Distribution Pillar Cabinet (Beside transformer) */}
      <mesh position={[1.4, 0.8, 0]} castShadow>
        <boxGeometry args={[0.7, 1.2, 0.6]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.6} />
      </mesh>

      {/* Status Pilot Light */}
      <mesh position={[1.4, 1.2, 0.31]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color={statusGlowColor} />
      </mesh>

      {/* Transformer Label */}
      {showLabels && (
        <group position={[0, 3.2, 0]}>
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[2.5, 0.6]} />
            <meshBasicMaterial color="#0b1329" transparent opacity={0.8} />
          </mesh>
          <Text
            position={[0, 0.1, 0]}
            fontSize={0.22}
            color="#38bdf8"
            anchorX="center"
            anchorY="middle"
          >
            {transformerId} (11k/415V)
          </Text>
          <Text
            position={[0, -0.14, 0]}
            fontSize={0.18}
            color={isEnergized ? '#10b981' : '#ef4444'}
            anchorX="center"
            anchorY="middle"
          >
            {isEnergized ? 'ENERGIZED' : 'DE-ENERGIZED'}
          </Text>
        </group>
      )}
    </group>
  );
};
