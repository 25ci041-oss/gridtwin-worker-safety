import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGridStore } from '../../store/useGridStore';

interface ConsumerLoad3DProps {
  position: [number, number, number];
  loadId: string;
  name: string;
  isEnergized: boolean;
  category: 'residential' | 'commercial' | 'critical' | 'industrial' | 'renewable';
  demandKw: number;
  sectionId: string;
  scale?: number;
}

export const ConsumerLoad3D: React.FC<ConsumerLoad3DProps> = ({
  position,
  loadId,
  name,
  isEnergized,
  category,
  demandKw,
  sectionId,
  scale = 1.42,
}) => {
  const setSelectedElement = useGridStore((s) => s.setSelectedElement);
  const showLabels = useGridStore((s) => s.showLabels);

  const beaconRef = useRef<THREE.PointLight>(null);
  const helipadLightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (beaconRef.current) {
      beaconRef.current.intensity = Math.sin(t * 4) > 0.4 ? 2.5 : 0.2;
    }
    if (helipadLightRef.current && isEnergized) {
      helipadLightRef.current.intensity = 1.6 + Math.sin(t * 3) * 0.5;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedElement({
      id: loadId,
      type: 'load',
      title: name,
      voltage_kv: 0.415,
      status: isEnergized ? 'SUPPLIED - NOMINAL VOLTAGE' : 'BLACKOUT / GRID ISOLATED',
      current_a: isEnergized ? Math.round((demandKw / (Math.sqrt(3) * 0.415 * 0.95)) * 10) / 10 : 0,
      power_kw: isEnergized ? demandKw : 0,
      details: {
        'Section Feeder': sectionId,
        'Consumer Category': category.toUpperCase(),
        'Nominal Active Demand': `${demandKw} kW`,
        'Power Factor': category === 'critical' ? '0.98' : category === 'industrial' ? '0.88' : '0.95',
        'Service Entrance': '415V Three-Phase 4-Wire (Step-down from 11kV)',
        'Building Automation': isEnergized ? 'BMS Active / HVAC Online' : 'Emergency Mode',
        'Backup Generation': category === 'critical' ? '2x 1.2 MVA Caterpillar Diesel Gensets' : 'Solar UPS Reserve'
      }
    });
  };

  // Illumination colors based on energized state
  const windowWarmGlow = isEnergized ? '#fef08a' : '#1e293b';
  const commercialGlass = isEnergized ? '#0284c7' : '#0f172a';
  const hospitalClinicalBlue = isEnergized ? '#38bdf8' : '#1e293b';

  return (
    <group position={position} scale={scale} onClick={handleClick}>
      {/* ─────────────────────────────────────────────────────────── */}
      {/* 1. RESIDENTIAL: Luxury Villa Community & Landscaped Gardens */}
      {/* ─────────────────────────────────────────────────────────── */}
      {category === 'residential' && (
        <group>
          {/* Landscaped Perimeter Base */}
          <mesh position={[0, 0.08, 0]} receiveShadow>
            <boxGeometry args={[7.5, 0.16, 6.5]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>

          {/* Villa 1: Modern Multi-Tier Architectural Residence */}
          <group position={[-1.8, 0, 0]}>
            {/* Ground Level Slab & Walls */}
            <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
              <boxGeometry args={[3.2, 2.2, 3.4]} />
              <meshStandardMaterial color="#334155" roughness={0.5} />
            </mesh>
            {/* Upper Cantilevered Floor */}
            <mesh position={[0.4, 2.8, 0.2]} castShadow receiveShadow>
              <boxGeometry args={[3.4, 1.6, 3.2]} />
              <meshStandardMaterial color="#475569" roughness={0.4} />
            </mesh>
            {/* Flat Concrete Roof with Parapet */}
            <mesh position={[0.4, 3.7, 0.2]}>
              <boxGeometry args={[3.6, 0.2, 3.4]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Ground Panoramic Glass Bay Window */}
            <mesh position={[0, 1.1, 1.72]}>
              <planeGeometry args={[2.4, 1.4]} />
              <meshBasicMaterial color={windowWarmGlow} />
            </mesh>
            {/* Upper Balcony Glass Railing */}
            <mesh position={[0.4, 2.5, 1.82]}>
              <boxGeometry args={[3.2, 0.5, 0.06]} />
              <meshStandardMaterial color="#38bdf8" transparent opacity={0.6} />
            </mesh>
            {/* Upper Bedroom Windows */}
            <mesh position={[0.4, 2.9, 1.81]}>
              <planeGeometry args={[2.2, 0.9]} />
              <meshBasicMaterial color={windowWarmGlow} />
            </mesh>
          </group>

          {/* Villa 2: Contemporary Townhome with Sloped Roof */}
          <group position={[2.0, 0, -0.2]}>
            <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.6, 2.8, 3.0]} />
              <meshStandardMaterial color="#1e293b" roughness={0.6} />
            </mesh>
            {/* Sloped Zinc Roof */}
            <mesh position={[0, 3.3, 0]} rotation={[0, 0, -0.2]} castShadow>
              <boxGeometry args={[3.0, 0.25, 3.2]} />
              <meshStandardMaterial color="#991b1b" metalness={0.5} />
            </mesh>
            {/* Warm Living Room Windows */}
            <mesh position={[0, 1.2, 1.52]}>
              <planeGeometry args={[1.8, 1.6]} />
              <meshBasicMaterial color={windowWarmGlow} />
            </mesh>
            {/* Attic Window */}
            <mesh position={[0, 2.4, 1.52]}>
              <planeGeometry args={[1.2, 0.7]} />
              <meshBasicMaterial color={windowWarmGlow} />
            </mesh>
          </group>

          {/* Streetlights in the community */}
          {[-3.2, 3.2].map((x, i) => (
            <group key={`lamp-${i}`} position={[x, 0, 2.6]}>
              <mesh position={[0, 1.2, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 2.4, 8]} />
                <meshStandardMaterial color="#94a3b8" />
              </mesh>
              <mesh position={[0, 2.4, 0]}>
                <sphereGeometry args={[0.12, 12, 12]} />
                <meshBasicMaterial color={isEnergized ? '#fef08a' : '#475569'} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 2. COMMERCIAL: 14-Story Corporate Glass Skyscraper */}
      {/* ─────────────────────────────────────────────────────────── */}
      {category === 'commercial' && (
        <group>
          {/* Plaza Foundation Podium */}
          <mesh position={[0, 0.3, 0]} receiveShadow>
            <boxGeometry args={[6.8, 0.6, 6.8]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>

          {/* Tower Glass Curtain-Wall Core */}
          <mesh position={[0, 6.0, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.4, 11.4, 4.4]} />
            <meshStandardMaterial
              color="#0f172a"
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>

          {/* 10 Floor-to-Floor Illuminated Horizontal Bands */}
          {[1.8, 2.8, 3.8, 4.8, 5.8, 6.8, 7.8, 8.8, 9.8, 10.8].map((y, idx) => (
            <mesh key={`floor-${idx}`} position={[0, y, 0]}>
              <boxGeometry args={[4.48, 0.6, 4.48]} />
              <meshBasicMaterial color={commercialGlass} />
            </mesh>
          ))}

          {/* Ground Floor Double-Height Atrium / Lobby Entrance */}
          <mesh position={[0, 1.1, 2.25]}>
            <planeGeometry args={[3.2, 1.6]} />
            <meshBasicMaterial color={isEnergized ? '#38bdf8' : '#0f172a'} />
          </mesh>

          {/* Rooftop Plant & Chiller Enclosure */}
          <mesh position={[0, 12.1, 0]} castShadow>
            <boxGeometry args={[2.8, 1.4, 2.8]} />
            <meshStandardMaterial color="#334155" />
          </mesh>

          {/* Rooftop Communications Spire with Flashing Aviation Beacon */}
          <group position={[0, 12.8, 0]}>
            <mesh position={[0, 1.5, 0]}>
              <cylinderGeometry args={[0.04, 0.12, 3.0, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} />
            </mesh>
            <mesh position={[0, 3.1, 0]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
            <pointLight ref={beaconRef} position={[0, 3.1, 0]} color="#ef4444" distance={15} intensity={2} />
          </group>
        </group>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 3. CRITICAL: Regional Hospital & Emergency Helipad */}
      {/* ─────────────────────────────────────────────────────────── */}
      {category === 'critical' && (
        <group>
          {/* Hospital Campus Ground Slab */}
          <mesh position={[0, 0.15, 0]} receiveShadow>
            <boxGeometry args={[7.8, 0.3, 6.8]} />
            <meshStandardMaterial color="#1e2430" />
          </mesh>

          {/* Main 5-Story Clinical Center */}
          <mesh position={[0, 3.2, -0.6]} castShadow receiveShadow>
            <boxGeometry args={[5.8, 6.0, 4.6]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>

          {/* Clinical Ward Windows Bands */}
          {[1.8, 3.0, 4.2, 5.4].map((y, i) => (
            <mesh key={`hosp-band-${i}`} position={[0, y, 1.72]}>
              <planeGeometry args={[4.8, 0.7]} />
              <meshBasicMaterial color={hospitalClinicalBlue} />
            </mesh>
          ))}

          {/* Large Illuminated Emergency Red Cross Logo */}
          <group position={[0, 5.0, 1.74]}>
            <mesh>
              <boxGeometry args={[1.4, 0.42, 0.08]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
            <mesh>
              <boxGeometry args={[0.42, 1.4, 0.08]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          </group>

          {/* Ground Ambulance ER Reception Canopy */}
          <group position={[0, 0, 2.2]}>
            {/* Canopy Pillars */}
            <mesh position={[-2.2, 1.0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 2.0, 8]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
            <mesh position={[2.2, 1.0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 2.0, 8]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
            {/* Cantilevered Emergency Canopy Roof */}
            <mesh position={[0, 2.0, 0]} castShadow>
              <boxGeometry args={[5.0, 0.2, 2.6]} />
              <meshStandardMaterial color="#0284c7" />
            </mesh>
            {/* Ambulance Vehicle in the bay */}
            <group position={[-0.8, 0.6, 0]}>
              <mesh castShadow>
                <boxGeometry args={[1.2, 1.0, 2.2]} />
                <meshStandardMaterial color="#f8fafc" />
              </mesh>
              {/* Emergency Blue Light Bar */}
              <mesh position={[0, 0.55, 0]}>
                <boxGeometry args={[0.5, 0.1, 0.2]} />
                <meshBasicMaterial color={isEnergized ? '#0284c7' : '#334155'} />
              </mesh>
            </group>
          </group>

          {/* Rooftop Illuminated Helipad */}
          <group position={[0, 6.3, -0.6]}>
            {/* Helipad Octagonal Concrete Deck */}
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[2.2, 2.2, 0.2, 8]} />
              <meshStandardMaterial color="#334155" roughness={0.8} />
            </mesh>
            {/* Yellow Touchdown Landing Circle */}
            <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.6, 1.75, 32]} />
              <meshBasicMaterial color="#fbbf24" />
            </mesh>
            {/* Giant 'H' Heliport Marker */}
            <Text
              position={[0, 0.23, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={1.5}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              H
            </Text>
            {/* Helipad Perimeter Floodlights */}
            <pointLight ref={helipadLightRef} position={[0, 0.8, 0]} color="#38bdf8" distance={10} intensity={isEnergized ? 1.8 : 0} />
          </group>
        </group>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 4. INDUSTRIAL: Heavy Manufacturing & Chemical Silos */}
      {/* ─────────────────────────────────────────────────────────── */}
      {category === 'industrial' && (
        <group>
          {/* Heavy Concrete Logistics Apron */}
          <mesh position={[0, 0.12, 0]} receiveShadow>
            <boxGeometry args={[8.2, 0.24, 7.2]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>

          {/* Primary Factory Shed with Double-Span Industrial Corrugated Roof */}
          <mesh position={[-1.2, 2.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.8, 4.2, 5.4]} />
            <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* High-Bay Factory Windows */}
          {[-1.2, 0.4, 2.0].map((z, i) => (
            <mesh key={`fact-win-${i}`} position={[-1.2, 3.4, z]}>
              <boxGeometry args={[4.85, 0.6, 0.8]} />
              <meshBasicMaterial color={isEnergized ? '#f59e0b' : '#0f172a'} />
            </mesh>
          ))}

          {/* 3 Heavy Cylindrical Chemical & Fuel Storage Silos */}
          {[1.8, 3.0].map((x, idx) => (
            <group key={`silo-${idx}`} position={[x, 0, -1.2 + idx * 2.2]}>
              <mesh position={[0, 2.6, 0]} castShadow>
                <cylinderGeometry args={[0.9, 0.9, 5.2, 16]} />
                <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
              </mesh>
              {/* Silo Dome Cap */}
              <mesh position={[0, 5.2, 0]}>
                <sphereGeometry args={[0.9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.8} />
              </mesh>
              {/* Pipe connection */}
              <mesh position={[-0.8, 4.0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.1, 0.1, 1.6, 8]} />
                <meshStandardMaterial color="#0284c7" metalness={0.7} />
              </mesh>
            </group>
          ))}

          {/* Dual Factory Industrial Chimneys */}
          <mesh position={[-3.0, 4.6, -1.8]} castShadow>
            <cylinderGeometry args={[0.25, 0.4, 4.8, 12]} />
            <meshStandardMaterial color="#475569" metalness={0.5} />
          </mesh>
          <mesh position={[-2.2, 5.0, -1.8]} castShadow>
            <cylinderGeometry args={[0.2, 0.35, 5.6, 12]} />
            <meshStandardMaterial color="#475569" metalness={0.5} />
          </mesh>
        </group>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 5. RENEWABLE: Clean Solar Farm & Tesla BESS Battery Depot */}
      {/* ─────────────────────────────────────────────────────────── */}
      {category === 'renewable' && (
        <group>
          {/* Gravel Solar Field Foundation */}
          <mesh position={[0, 0.08, 0]} receiveShadow>
            <boxGeometry args={[7.8, 0.16, 7.2]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>

          {/* 6 Dual-Axis Tracking Solar PV Panel Arrays */}
          {[-2.4, 0, 2.4].map((x, row) => (
            <React.Fragment key={`pv-row-${row}`}>
              {[-1.6, 0.6].map((z, col) => (
                <group key={`pv-${row}-${col}`} position={[x, 1.2, z]} rotation={[0.45, 0, 0]}>
                  {/* High-Efficiency Blue Silicon Panel */}
                  <mesh castShadow>
                    <boxGeometry args={[1.8, 1.4, 0.08]} />
                    <meshStandardMaterial
                      color="#1e3a8a"
                      metalness={0.9}
                      roughness={0.1}
                    />
                  </mesh>
                  {/* Metal Grid Pattern on Solar Cell */}
                  <mesh position={[0, 0, 0.05]}>
                    <planeGeometry args={[1.7, 1.3]} />
                    <meshBasicMaterial color="#0284c7" wireframe />
                  </mesh>
                  {/* Torque Tube & Ground Leg */}
                  <mesh position={[0, -0.6, -0.5]} rotation={[-0.45, 0, 0]}>
                    <cylinderGeometry args={[0.06, 0.06, 1.4, 8]} />
                    <meshStandardMaterial color="#94a3b8" metalness={0.8} />
                  </mesh>
                </group>
              ))}
            </React.Fragment>
          ))}

          {/* 2 Utility-Scale BESS Battery Storage Enclosures (Megapacks) */}
          {[-1.6, 1.6].map((x, idx) => (
            <group key={`bess-${idx}`} position={[x, 0.9, 2.5]}>
              <mesh castShadow>
                <boxGeometry args={[2.2, 1.6, 1.2]} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.3} metalness={0.3} />
              </mesh>
              {/* Active Green Operational LED Strip */}
              <mesh position={[0, 0.5, 0.61]}>
                <boxGeometry args={[1.8, 0.08, 0.02]} />
                <meshBasicMaterial color={isEnergized ? '#10b981' : '#64748b'} />
              </mesh>
              <Text
                position={[0, 0.1, 0.61]}
                fontSize={0.22}
                color="#0f172a"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
              >
                BESS 1.5 MWh
              </Text>
            </group>
          ))}
        </group>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* Overhead 3D Holographic Status Label */}
      {/* ─────────────────────────────────────────────────────────── */}
      {showLabels && (
        <group
          position={[
            0,
            category === 'commercial' ? 13.5 : category === 'critical' ? 7.6 : category === 'industrial' ? 6.4 : 4.6,
            0,
          ]}
        >
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[3.6, 0.75]} />
            <meshBasicMaterial color="#0b1329" transparent opacity={0.85} />
          </mesh>
          <Text
            position={[0, 0.14, 0]}
            fontSize={0.25}
            color="#f8fafc"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            {name}
          </Text>
          <Text
            position={[0, -0.16, 0]}
            fontSize={0.2}
            color={isEnergized ? '#10b981' : '#ef4444'}
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            {isEnergized ? `${demandKw} kW (SUPPLIED)` : '0 kW (BLACKOUT)'}
          </Text>
        </group>
      )}
    </group>
  );
};
