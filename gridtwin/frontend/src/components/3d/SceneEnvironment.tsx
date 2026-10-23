import React from 'react';
import { useGridStore } from '../../store/useGridStore';

export const SceneEnvironment: React.FC = () => {
  const isNightMode = useGridStore((s) => s.isNightMode);

  return (
    <>
      {/* Dynamic Lighting Setup */}
      <ambientLight intensity={isNightMode ? 0.3 : 0.8} />
      
      {/* Sun / Key Directional Light with Soft Shadows */}
      <directionalLight
        position={isNightMode ? [20, 35, 20] : [30, 45, 25]}
        intensity={isNightMode ? 0.45 : 1.4}
        color={isNightMode ? '#bae6fd' : '#fffbeb'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={140}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* Cyber Blue Fill Light */}
      <directionalLight
        position={[-35, 20, -25]}
        intensity={isNightMode ? 0.45 : 0.3}
        color="#0ea5e9"
      />

      {/* Ground Cyber Grid Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[190, 120]} />
        <meshStandardMaterial
          color={isNightMode ? '#070b14' : '#1e293b'}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* High-Contrast Grid Lines Helper */}
      <gridHelper
        args={[180, 90, isNightMode ? '#0ea5e9' : '#475569', isNightMode ? '#1e293b' : '#334155']}
        position={[0, 0.01, 0]}
      />

      {/* Alternate Bypass Route Corridor Highway (running along X in front of towers at Z = -9) */}
      <mesh position={[0, 0.02, -9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[150, 4.5]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>

      {/* Consumer City Boulevard (running along X at Z = 23.5) */}
      <mesh position={[0, 0.02, 23.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[150, 5.0]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>

      {/* 5 Perpendicular Section Feeder Avenues (connecting transmission line to consumer city) */}
      {[-32, -14, 4, 22, 40].map((x, i) => (
        <mesh key={`feeder-road-${i}`} position={[x, 0.02, 16]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[38, 3.6]} />
          <meshStandardMaterial color="#111827" roughness={0.85} />
        </mesh>
      ))}

      {/* Distant Atmospheric Fog */}
      <fog attach="fog" args={[isNightMode ? '#070b14' : '#0f172a', 60, 160]} />
    </>
  );
};
