import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGridStore } from '../../store/useGridStore';

interface CameraTarget {
  pos: [number, number, number];
  target: [number, number, number];
}

const PRESETS: Record<string, CameraTarget> = {
  overview: { pos: [4, 34, 48], target: [4, 3, 12] },
  substation: { pos: [-36, 14, 22], target: [-50, 3, 0] },
  'feeder1-3': { pos: [-14, 20, 36], target: [-14, 4, 12] },
  'feeder4-5': { pos: [31, 20, 36], target: [31, 4, 12] },
  loads: { pos: [4, 22, 50], target: [4, 4, 28] },
  top: { pos: [4, 75, 12], target: [4, 0, 12] },
  side: { pos: [65, 12, 12], target: [0, 6, 12] },
};

export const CameraBookmarks: React.FC = () => {
  const { camera } = useThree();
  const cameraPreset = useGridStore((s) => s.cameraPreset);
  const targetPos = useRef(new THREE.Vector3(...PRESETS.overview.pos));
  const targetLook = useRef(new THREE.Vector3(...PRESETS.overview.target));
  const isTransitioning = useRef(false);
  const lastPreset = useRef(cameraPreset);

  useEffect(() => {
    // Only animate when the preset actually changes
    if (lastPreset.current !== cameraPreset) {
      lastPreset.current = cameraPreset;
      const config = PRESETS[cameraPreset] || PRESETS.overview;
      targetPos.current.set(...config.pos);
      targetLook.current.set(...config.target);
      isTransitioning.current = true;
    }
  }, [cameraPreset]);

  useFrame(() => {
    // Only interpolate camera when an explicit transition is requested
    if (isTransitioning.current) {
      camera.position.lerp(targetPos.current, 0.08);

      // Once the camera gets close to target, release control so user has free 360 deg orbit
      if (camera.position.distanceTo(targetPos.current) < 0.2) {
        camera.position.copy(targetPos.current);
        isTransitioning.current = false;
      }
    }
  });

  return null;
};
