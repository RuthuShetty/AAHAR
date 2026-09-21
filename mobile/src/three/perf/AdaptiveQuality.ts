/**
 * AAHAR 3D — Performance & LOD Management
 * Adaptive quality based on device GPU tier.
 * Target: 60fps on mid-range, 30fps on low-end Android.
 */

import { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';

export type GPUTier = 'LOW' | 'MID' | 'HIGH';

export interface QualityProfile {
  shadowMapSize:  number;
  pixelRatio:     number;
  antialias:      boolean;
  maxParticles:   number;
  segmentCount:   number;   // geometry subdivision level
  postProcessing: boolean;
}

export const QUALITY: Record<GPUTier, QualityProfile> = {
  LOW:  { shadowMapSize: 512,  pixelRatio: 0.75, antialias: false, maxParticles: 50,   segmentCount: 8,  postProcessing: false },
  MID:  { shadowMapSize: 1024, pixelRatio: 1.0,  antialias: false, maxParticles: 200,  segmentCount: 16, postProcessing: false },
  HIGH: { shadowMapSize: 2048, pixelRatio: 1.5,  antialias: true,  maxParticles: 1000, segmentCount: 32, postProcessing: true  },
};

/**
 * Detect GPU tier from WebGL renderer.
 * On React Native (Expo) expo-gl returns a limited renderer string.
 */
export function detectGPUTier(): GPUTier {
  try {
    // In RN/Expo, jsdom won't have a real canvas; default to LOW
    if (typeof document === 'undefined') return 'LOW';
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (!gl) return 'LOW';
    const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (!ext) return 'MID';
    const renderer = (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL)?.toString() ?? '';
    if (/adreno 5|adreno 6|mali-g7|apple gpu|nvidia|radeon rx/i.test(renderer)) return 'HIGH';
    if (/adreno 4|mali-g5|mali-t/i.test(renderer)) return 'MID';
    return 'LOW';
  } catch {
    return 'LOW';
  }
}

/** React hook — reads the GPU tier once on mount */
export function useGPUTier(): GPUTier {
  const [tier, setTier] = useState<GPUTier>('LOW');
  useEffect(() => { setTier(detectGPUTier()); }, []);
  return tier;
}

/**
 * FPS adaptive quality hook.
 * Drops one tier down if sustained FPS < 28 for >2s.
 */
export function useAdaptiveQuality(initial: GPUTier = 'MID'): GPUTier {
  const [tier, setTier] = useState<GPUTier>(initial);
  const fpsHistory = useRef<number[]>([]);
  const lastFrameTime = useRef(performance.now());
  const droppedAt = useRef<number | null>(null);

  useFrame(() => {
    const now = performance.now();
    const dt = now - lastFrameTime.current;
    lastFrameTime.current = now;
    const fps = 1000 / Math.max(dt, 1);
    fpsHistory.current.push(fps);
    if (fpsHistory.current.length > 60) fpsHistory.current.shift();

    if (fpsHistory.current.length < 30) return;
    const avgFPS = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length;

    if (avgFPS < 28) {
      if (!droppedAt.current) droppedAt.current = now;
      else if (now - droppedAt.current > 2000) {
        setTier(t => t === 'HIGH' ? 'MID' : t === 'MID' ? 'LOW' : 'LOW');
        droppedAt.current = null;
        fpsHistory.current = [];
      }
    } else {
      droppedAt.current = null;
    }
  });

  return tier;
}
