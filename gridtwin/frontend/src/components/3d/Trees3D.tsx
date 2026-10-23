import React, { useMemo } from 'react';

interface TreeProps {
  position: [number, number, number];
  scale?: number;
  type?: 'pine' | 'leafy' | 'round';
  rotation?: number;
}

// Single Stylized Miniature Tree Subcomponent
const SingleTree: React.FC<TreeProps> = ({ position, scale = 1.0, type = 'pine', rotation = 0 }) => {
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      {/* Wooden Trunk */}
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.11, 0.18, 1.3, 7]} />
        <meshStandardMaterial color="#3e2312" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Foliage Canopy based on type */}
      {type === 'pine' ? (
        <group position={[0, 1.2, 0]}>
          {/* Lower tier */}
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <coneGeometry args={[1.05, 1.35, 7]} />
            <meshStandardMaterial color="#14532d" roughness={0.7} metalness={0.1} flatShading />
          </mesh>
          {/* Middle tier */}
          <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.82, 1.25, 7]} />
            <meshStandardMaterial color="#166534" roughness={0.65} metalness={0.1} flatShading />
          </mesh>
          {/* Top tier */}
          <mesh position={[0, 1.95, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.55, 1.15, 7]} />
            <meshStandardMaterial color="#22c55e" roughness={0.6} metalness={0.1} flatShading />
          </mesh>
        </group>
      ) : type === 'round' ? (
        <group position={[0, 1.3, 0]}>
          {/* Main Round Canopy */}
          <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
            <dodecahedronGeometry args={[1.1, 1]} />
            <meshStandardMaterial color="#15803d" roughness={0.7} metalness={0.05} flatShading />
          </mesh>
          <mesh position={[0.35, 1.4, 0.25]} castShadow>
            <dodecahedronGeometry args={[0.7, 1]} />
            <meshStandardMaterial color="#4ade80" roughness={0.65} metalness={0.05} flatShading />
          </mesh>
          <mesh position={[-0.3, 1.05, -0.25]} castShadow>
            <dodecahedronGeometry args={[0.62, 1]} />
            <meshStandardMaterial color="#16a34a" roughness={0.68} metalness={0.05} flatShading />
          </mesh>
        </group>
      ) : (
        <group position={[0, 1.2, 0]}>
          {/* Tiered Leafy Canopy */}
          <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.85, 1.05, 0.95, 8]} />
            <meshStandardMaterial color="#166534" roughness={0.7} flatShading />
          </mesh>
          <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.65, 0.9, 0.9, 8]} />
            <meshStandardMaterial color="#15803d" roughness={0.65} flatShading />
          </mesh>
          <mesh position={[0, 1.9, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.58, 0.85, 8]} />
            <meshStandardMaterial color="#22c55e" roughness={0.6} flatShading />
          </mesh>
        </group>
      )}

      {/* Root collar base */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.45, 7]} />
        <meshBasicMaterial color="#0f172a" opacity={0.4} transparent />
      </mesh>
    </group>
  );
};

export const Trees3D: React.FC = () => {
  // Carefully curated natural coordinates:
  // Strictly separated from all 5 buildings (buildings are at Z=22, X=-22, -9, 4, 17, 30)
  // Strictly separated from transformers (Z=12.5), switchgears (Z=6.5), towers (Z=0), and bypass bus (Z=-8)
  const treeData = useMemo(() => {
    const list: Array<{ pos: [number, number, number]; scale: number; type: 'pine' | 'leafy' | 'round'; rot: number }> = [];

    // Helper: stylish trees with enlarged, lush scale for realism and natural grandeur
    const addTree = (x: number, z: number, baseScale = 1.0, type: 'pine' | 'leafy' | 'round' = 'pine') => {
      const rot = (Math.sin(x * 12.3 + z * 7.1) * 0.5 + 0.5) * Math.PI * 2;
      const s = baseScale * 1.35 * (0.9 + (Math.cos(x * 3.7 + z * 5.9) * 0.5 + 0.5) * 0.25);
      list.push({ pos: [x, 0, z], scale: s, type, rot });
    };

    // ─────────────────────────────────────────────────────────────
    // 1. Far Western Landscape (Substation Yard Border, X = -60 to -56)
    // ─────────────────────────────────────────────────────────────
    addTree(-59, -6, 1.1, 'pine');
    addTree(-58, -9, 1.0, 'leafy');
    addTree(-57, -12, 1.15, 'pine');
    addTree(-59, 4, 1.05, 'round');
    addTree(-58, 9, 1.15, 'pine');
    addTree(-56, 14, 1.0, 'leafy');
    addTree(-57, 20, 1.1, 'pine');

    // ─────────────────────────────────────────────────────────────
    // 2. Far Front Landscape Border (Z = -14 to -16, well in front of bypass bus at Z = -9)
    // Neat roadside green belt that frames the scene
    // ─────────────────────────────────────────────────────────────
    addTree(-46, -14.5, 1.0, 'pine');
    addTree(-41, -15.0, 0.95, 'round');
    addTree(-36, -14.8, 1.05, 'leafy');
    addTree(-30, -15.2, 1.0, 'pine');
    addTree(-24, -14.5, 0.95, 'round');
    addTree(-18, -15.0, 1.05, 'pine');
    addTree(-12, -14.7, 1.0, 'leafy');
    addTree(-6, -15.2, 0.95, 'pine');
    addTree(0, -14.6, 1.05, 'round');
    addTree(6, -15.0, 1.0, 'pine');
    addTree(12, -14.5, 0.95, 'leafy');
    addTree(18, -15.2, 1.05, 'pine');
    addTree(24, -14.7, 1.0, 'round');
    addTree(30, -15.0, 1.05, 'pine');
    addTree(36, -14.5, 0.95, 'leafy');
    addTree(42, -15.0, 1.0, 'pine');
    addTree(47, -14.6, 1.05, 'round');

    // ─────────────────────────────────────────────────────────────
    // 3. Separate Walkway & Park Strips BETWEEN Buildings (NOT affecting buildings)
    // Placed in the wide empty spaces between building lots (clear of all entrances & helipads)
    // Buildings are at X = -32, -14, 4, 22, 40 and Z = 31.0
    // ─────────────────────────────────────────────────────────────
    // Alley between Section 1 (X=-32) and Section 2 (X=-14): center X = -23
    addTree(-23.0, 24, 1.0, 'leafy');
    addTree(-22.5, 29, 1.05, 'round');
    addTree(-23.5, 34, 1.1, 'pine');

    // Alley between Section 2 (X=-14) and Hospital (X=4): center X = -5
    addTree(-5.0, 24, 0.95, 'pine');
    addTree(-4.5, 29, 1.0, 'round');
    addTree(-5.5, 34, 1.05, 'leafy');

    // Alley between Hospital (X=4) and Industrial (X=22): center X = 13
    addTree(13.0, 24, 1.0, 'leafy');
    addTree(13.5, 29, 1.05, 'pine');
    addTree(12.5, 34, 1.1, 'round');

    // Alley between Industrial (X=22) and Solar Farm (X=40): center X = 31
    addTree(31.0, 24, 0.95, 'round');
    addTree(31.5, 29, 1.05, 'pine');
    addTree(30.5, 34, 1.0, 'leafy');

    // ─────────────────────────────────────────────────────────────
    // 4. Background Horizon Forest Line BEHIND All Buildings (Z = 38 to 41)
    // Completely behind all buildings, giving great natural depth without touching any structure
    // ─────────────────────────────────────────────────────────────
    addTree(-38, 38.5, 1.1, 'pine');
    addTree(-32, 39.0, 1.05, 'round');
    addTree(-26, 38.2, 1.15, 'leafy');
    addTree(-20, 39.2, 1.1, 'pine');
    addTree(-14, 38.5, 1.05, 'round');
    addTree(-8, 39.5, 1.15, 'pine');
    addTree(-2, 38.8, 1.1, 'leafy');
    addTree(4, 39.2, 1.15, 'pine');
    addTree(10, 38.5, 1.05, 'round');
    addTree(16, 39.0, 1.1, 'pine');
    addTree(22, 38.6, 1.05, 'leafy');
    addTree(28, 39.2, 1.15, 'pine');
    addTree(34, 38.5, 1.05, 'round');
    addTree(40, 39.0, 1.1, 'pine');
    addTree(46, 38.6, 1.05, 'leafy');

    // ─────────────────────────────────────────────────────────────
    // 5. Far Eastern Perimeter Landscape (Past Solar Farm, X = 48 to 52)
    // ─────────────────────────────────────────────────────────────
    addTree(48, -6, 1.1, 'pine');
    addTree(50, -1, 1.05, 'round');
    addTree(49, 6, 1.15, 'leafy');
    addTree(51, 13, 1.1, 'pine');
    addTree(49, 21, 1.05, 'round');
    addTree(50, 28, 1.15, 'pine');

    return list;
  }, []);

  return (
    <group name="surrounding_trees">
      {treeData.map((t, idx) => (
        <SingleTree
          key={`tree-${idx}`}
          position={t.pos}
          scale={t.scale}
          type={t.type}
          rotation={t.rot}
        />
      ))}
    </group>
  );
};
