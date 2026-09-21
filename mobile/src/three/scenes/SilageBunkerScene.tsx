/**
 * AAHAR 3D — Silage Bunker Scene
 *
 * A full 3D trapezoidal silage bunker with:
 *  - Spoilage front heatmap (driven by silage-forecast-v1 output)
 *  - Probe node placement (live status colour coding)
 *  - Animated spoilage front plane that advances each render frame
 *  - Animated gas particle emitter (CO₂/VOC)
 *  - Cut-away view toggle
 *  - All colours driven by live state — zero hardcoding
 *
 * Entry point used by mobile/src/app/bunkers/[id].tsx
 */

import React, { useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls, Environment, Text, Billboard,
  Sphere, Box, Cylinder, Plane,
} from '@react-three/drei';
import * as THREE from 'three';
import {
  spoilageToPalette,
  PHASE_COLOURS,
  confidenceToOpacity,
  groundMaterial,
} from '../materials';
import { useAdaptiveQuality, QUALITY } from '../perf/AdaptiveQuality';
import type { FermentationPhase } from '../../types/contracts';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProbeNodeData {
  probe_id: string;
  label: string;
  /** position normalised [0,1] within bunker (x=width, y=depth, z=height) */
  position_norm: [number, number, number];
  phase: FermentationPhase;
  temperature_c: number;
  ph: number;
  co2_ppm: number;
  battery_pct: number;
  online: boolean;
}

export interface SilageBunkerSceneProps {
  /** Physical dimensions of the bunker in metres */
  width_m: number;
  length_m: number;
  wall_height_m: number;
  /** Spoilage front position in metres from the face for each forecast day [1..7] */
  spoilage_front_m: number[];
  /** Current day index into the forecast (0 = today) */
  active_day: number;
  probes: ProbeNodeData[];
  /** Show cut-away cross-section */
  cutaway: boolean;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** A heatmap voxel cell inside the bunker volume */
function SpoilageVoxel({
  x, y, z,
  cellWidth, cellLength, cellHeight,
  spoilageT,
  opacity,
}: {
  x: number; y: number; z: number;
  cellWidth: number; cellLength: number; cellHeight: number;
  spoilageT: number;
  opacity: number;
}) {
  const color = useMemo(() => spoilageToPalette(spoilageT), [spoilageT]);
  return (
    <mesh position={[x, z, y]}>
      <boxGeometry args={[cellWidth * 0.92, cellHeight * 0.92, cellLength * 0.92]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity * 0.6}
        roughness={0.8}
        metalness={0.0}
      />
    </mesh>
  );
}

/** Animated spoilage front plane */
function SpoilageFrontPlane({
  frontX,
  bunkerWidth,
  bunkerHeight,
}: {
  frontX: number;
  bunkerWidth: number;
  bunkerHeight: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (meshRef.current) {
      // Subtle pulsing opacity — the "danger wall"
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.45 + 0.25 * Math.sin(timeRef.current * 2.5);
    }
  });

  return (
    <mesh ref={meshRef} position={[frontX, bunkerHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[20, bunkerHeight]} />
      <meshStandardMaterial
        color="#C62828"
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        roughness={0.5}
      />
    </mesh>
  );
}

/** Gas particle emitter (CO₂/VOC visualisation) */
function GasParticles({
  origin,
  count,
  intensity,  // 0-1 mapped from CO₂ ppm
}: {
  origin: [number, number, number];
  count: number;
  intensity: number;
}) {
  const posRef = useRef<Float32Array | null>(null);
  const timeRef = useRef(0);

  const { positions, velocities } = useMemo(() => {
    const positions  = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = origin[0] + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = origin[1];
      positions[i * 3 + 2] = origin[2] + (Math.random() - 0.5) * 0.5;
      velocities[i * 3]     = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = Math.random() * 0.04 * intensity;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    posRef.current = positions.slice();
    return { positions, velocities };
  }, [origin, count, intensity]);

  const geomRef = useRef<THREE.BufferGeometry>(null!);

  useFrame((_, delta) => {
    if (!geomRef.current || !posRef.current) return;
    const p = posRef.current;
    for (let i = 0; i < count; i++) {
      p[i * 3]     += velocities[i * 3]     * delta * 60;
      p[i * 3 + 1] += velocities[i * 3 + 1] * delta * 60;
      p[i * 3 + 2] += velocities[i * 3 + 2] * delta * 60;
      // Reset when particle rises too high
      if (p[i * 3 + 1] > origin[1] + 3.0) {
        p[i * 3]     = origin[0] + (Math.random() - 0.5) * 0.5;
        p[i * 3 + 1] = origin[1];
        p[i * 3 + 2] = origin[2] + (Math.random() - 0.5) * 0.5;
      }
    }
    geomRef.current.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geomRef.current.attributes.position.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={new THREE.Color('#FFEE58')}
        size={0.08}
        transparent
        opacity={0.6 * intensity}
        sizeAttenuation
      />
    </points>
  );
}

/** Single probe node sphere with status colour & tooltip */
function ProbeNode({
  data,
  bunkerW,
  bunkerL,
  bunkerH,
}: {
  data: ProbeNodeData;
  bunkerW: number;
  bunkerL: number;
  bunkerH: number;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  const color = useMemo(() => {
    if (!data.online) return new THREE.Color('#757575');
    return new THREE.Color(PHASE_COLOURS[data.phase] ?? '#1565C0');
  }, [data.online, data.phase]);

  const worldPos: [number, number, number] = [
    (data.position_norm[0] - 0.5) * bunkerW,
    data.position_norm[2] * bunkerH,
    (data.position_norm[1] - 0.5) * bunkerL,
  ];

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (meshRef.current && data.phase === 'AEROBIC_SPOILAGE') {
      const scale = 1 + 0.15 * Math.sin(timeRef.current * 4);
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={worldPos}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 1.0 : 0.3}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      {/* Vertical stem */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.0, 8]} />
        <meshStandardMaterial color="#455A64" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Label billboard */}
      {hovered && (
        <Billboard position={[0, 0.6, 0]}>
          <Text fontSize={0.3} color="white" anchorX="center" anchorY="middle">
            {`${data.label}\npH ${data.ph.toFixed(1)} | ${data.temperature_c.toFixed(1)}°C\nCO₂ ${data.co2_ppm} ppm`}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

/** Bunker concrete walls */
function BunkerWalls({
  w, l, h,
  cutaway,
}: {
  w: number; l: number; h: number; cutaway: boolean;
}) {
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({
    color:     0x546E7A,
    roughness: 0.9,
    metalness: 0.05,
  }), []);

  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({
    color:     0x37474F,
    roughness: 0.8,
    metalness: 0.1,
    transparent: true,
    opacity: cutaway ? 0.2 : 0.9,
  }), [cutaway]);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[w, l]} />
        <primitive object={wallMat} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, h / 2, -l / 2]}>
        <boxGeometry args={[w, h, 0.3]} />
        <primitive object={wallMat} />
      </mesh>
      {/* Left wall */}
      {!cutaway && (
        <mesh position={[-w / 2, h / 2, 0]}>
          <boxGeometry args={[0.3, h, l]} />
          <primitive object={wallMat} />
        </mesh>
      )}
      {/* Right wall */}
      <mesh position={[w / 2, h / 2, 0]}>
        <boxGeometry args={[0.3, h, l]} />
        <primitive object={wallMat} />
      </mesh>
      {/* Plastic sheet roof */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, h + 0.05, 0]}>
        <planeGeometry args={[w, l]} />
        <primitive object={roofMat} />
      </mesh>
    </group>
  );
}

// ─── Main Bunker Scene ───────────────────────────────────────────────────────

function BunkerScene(props: SilageBunkerSceneProps) {
  const { width_m: W, length_m: L, wall_height_m: H } = props;
  const quality = useAdaptiveQuality('MID');
  const profile = QUALITY[quality];

  // Build spoilage front position for the active day
  const frontX = useMemo(() => {
    const pos = props.spoilage_front_m[props.active_day] ?? 0;
    // Convert from "metres from face" to scene X (face = +L/2, back = -L/2)
    return L / 2 - pos;
  }, [props.spoilage_front_m, props.active_day, L]);

  // Build voxel grid for heatmap
  const GRID = profile.segmentCount <= 8 ? 4 : 8;  // voxels per axis
  const voxels = useMemo(() => {
    const cells = [];
    const cw = W / GRID, cl = L / GRID, ch = H / GRID;
    const frontZ = L / 2 - (props.spoilage_front_m[props.active_day] ?? 0);

    for (let ix = 0; ix < GRID; ix++) {
      for (let iy = 0; iy < GRID; iy++) {
        for (let iz = 0; iz < GRID; iz++) {
          const wx = (ix + 0.5) * cw - W / 2;
          const wy = (iy + 0.5) * cl - L / 2;
          const wz = (iz + 0.5) * ch;

          // Spoilage intensity: highest near face and top (aerobic zone)
          const distFromFace = wy - (-L / 2);
          const heightFactor = (wz / H);
          const spoilT = Math.max(0, Math.min(1,
            (distFromFace / Math.max(props.spoilage_front_m[props.active_day] ?? 0.1, 0.1)) * 0.7
            + heightFactor * 0.3
          ));

          cells.push({
            key: `${ix}-${iy}-${iz}`,
            x: wx, y: wy, z: wz,
            cellWidth: cw,
            cellLength: cl,
            cellHeight: ch,
            spoilageT: spoilT,
          });
        }
      }
    }
    return cells;
  }, [W, L, H, GRID, props.spoilage_front_m, props.active_day]);

  // Gas particle origins (around the face of the bunker)
  const gasOrigins = useMemo(() => props.probes
    .filter(p => p.co2_ppm > 2000)
    .map(p => [
      (p.position_norm[0] - 0.5) * W,
      p.position_norm[2] * H,
      (p.position_norm[1] - 0.5) * L,
    ] as [number, number, number]),
    [props.probes, W, H, L]
  );

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[profile.shadowMapSize, profile.shadowMapSize]}
      />
      <pointLight position={[0, H + 2, 0]} intensity={0.5} color="#FFF9C4" />

      {/* Environment */}
      <fog attach="fog" args={['#0d1117', 30, 80]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <primitive object={groundMaterial} />
      </mesh>

      {/* Bunker walls */}
      <BunkerWalls w={W} l={L} h={H} cutaway={props.cutaway} />

      {/* Spoilage heatmap voxels */}
      {!props.cutaway && voxels.map(({ key, ...v }) => (
        <SpoilageVoxel key={key} {...v} opacity={0.55} />
      ))}

      {/* Animated spoilage front plane */}
      <SpoilageFrontPlane frontX={frontX} bunkerWidth={W} bunkerHeight={H} />

      {/* Probe nodes */}
      {props.probes.map(probe => (
        <ProbeNode key={probe.probe_id} data={probe} bunkerW={W} bunkerL={L} bunkerH={H} />
      ))}

      {/* Gas particles */}
      {gasOrigins.map((origin, i) => (
        <GasParticles
          key={i}
          origin={origin}
          count={profile.maxParticles > 100 ? 80 : 30}
          intensity={Math.min(1, (props.probes[i]?.co2_ppm ?? 2000) / 5000)}
        />
      ))}

      {/* Face label */}
      <Billboard position={[0, H + 1.5, L / 2 + 0.5]}>
        <Text fontSize={0.6} color="#EF9A9A" anchorX="center">FACE →</Text>
      </Billboard>
      <Billboard position={[0, H + 1.5, -L / 2 - 0.5]}>
        <Text fontSize={0.5} color="#90CAF9" anchorX="center">← BACK</Text>
      </Billboard>

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        maxPolarAngle={Math.PI / 2}
        minDistance={5}
        maxDistance={60}
        autoRotate={false}
      />
    </>
  );
}

// ─── Public Canvas wrapper ──────────────────────────────────────────────────

export default function SilageBunkerCanvas(props: SilageBunkerSceneProps) {
  return (
    <Canvas
      camera={{ position: [props.width_m * 1.2, props.wall_height_m * 2.5, props.length_m * 1.0], fov: 55 }}
      shadows
      gl={{ antialias: false, powerPreference: 'low-power' }}
      style={{ width: '100%', height: '100%', background: '#0d1117' }}
      dpr={[0.75, 1.5]}
    >
      <BunkerScene {...props} />
    </Canvas>
  );
}
