/**
 * AAHAR 3D — Cow Anatomy Scene
 *
 * A 3D side-view dairy cow model with organ overlays coloured by nutritional impact:
 *  - Rumen: NDF-driven (blue=healthy, red=acidosis risk)
 *  - Liver: protein/energy-driven
 *  - Udder: ME/milk yield impact
 *  - Bone: mineral/ash proxy
 *  - Animated pulse on AT_RISK or CRITICAL organs
 *  - Particle rain showing nutrient flow (feed → gut → blood → organs)
 *
 * Driven entirely by live InferenceResult.proximates — zero hardcoding.
 */

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Billboard, Text, Sphere, Cylinder, Torus, Box } from '@react-three/drei';
import * as THREE from 'three';
import {
  ORGAN_COLOURS,
  proximatesToOrganImpacts,
  type OrganImpact,
  type ProximateSnapshot,
} from '../materials';
import { useAdaptiveQuality, QUALITY } from '../perf/AdaptiveQuality';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CowAnatomySceneProps {
  proximates: ProximateSnapshot;
  /** Any detected adulterants affect liver  */
  adulterant_detected: boolean;
  /** Toxin band affects liver overlay */
  toxin_band: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
}

// ─── Organ sub-component ─────────────────────────────────────────────────────

function Organ({
  name,
  position,
  scale,
  impact,
  shape,
}: {
  name: string;
  position: [number, number, number];
  scale: [number, number, number];
  impact: OrganImpact;
  shape: 'sphere' | 'box' | 'torus';
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);
  const [hovered, setHovered] = React.useState(false);
  const colours = ORGAN_COLOURS[impact];

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (meshRef.current && colours.pulse) {
      const s = 1 + 0.08 * Math.sin(timeRef.current * 3.5);
      meshRef.current.scale.set(...scale.map(v => v * s) as [number, number, number]);
    }
  });

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color:            colours.base,
    emissive:         new THREE.Color(colours.emissive),
    emissiveIntensity: colours.pulse ? 0.6 : 0.2,
    roughness:        0.7,
    metalness:        0.0,
    transparent:      true,
    opacity:          0.85,
  }), [colours]);

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        scale={scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {shape === 'sphere' && <sphereGeometry args={[0.5, 24, 24]} />}
        {shape === 'box'    && <boxGeometry args={[1, 1, 1]} />}
        {shape === 'torus'  && <torusGeometry args={[0.5, 0.25, 12, 24]} />}
        <primitive object={mat} />
      </mesh>
      {hovered && (
        <Billboard position={[0, Math.max(...scale) * 0.7, 0]}>
          <Text fontSize={0.22} color="white" anchorX="center">
            {`${name}\n${impact}`}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

/** Simplified low-poly dairy cow body (procedural geometry) */
function CowBody() {
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color:     0xEEEEEE,
    roughness: 0.9,
    metalness: 0.0,
  }), []);
  const blackMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.9 }), []);

  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0, 0]} scale={[2.2, 1.0, 1.1]}>
        <sphereGeometry args={[1, 24, 16]} />
        <primitive object={bodyMat} />
      </mesh>
      {/* Neck */}
      <mesh position={[1.5, 0.3, 0]} rotation={[0, 0, -0.4]}>
        <cylinderGeometry args={[0.3, 0.4, 0.9, 12]} />
        <primitive object={bodyMat} />
      </mesh>
      {/* Head */}
      <mesh position={[2.1, 0.7, 0]} scale={[0.9, 0.75, 0.8]}>
        <sphereGeometry args={[0.55, 20, 16]} />
        <primitive object={bodyMat} />
      </mesh>
      {/* Muzzle */}
      <mesh position={[2.55, 0.55, 0]} scale={[0.5, 0.35, 0.55]}>
        <sphereGeometry args={[0.5, 16, 12]} />
        <primitive object={bodyMat} />
      </mesh>
      {/* Tail */}
      <mesh position={[-2.0, 0.1, 0]} rotation={[0, 0, 0.6]}>
        <cylinderGeometry args={[0.05, 0.15, 1.2, 8]} />
        <primitive object={bodyMat} />
      </mesh>
      {/* Legs */}
      {[
        [0.8, -1.3, 0.5], [0.8, -1.3, -0.5],
        [-0.8, -1.3, 0.5], [-0.8, -1.3, -0.5],
      ].map(([lx, ly, lz], i) => (
        <mesh key={i} position={[lx, ly, lz] as [number, number, number]}>
          <cylinderGeometry args={[0.18, 0.14, 1.2, 10]} />
          <primitive object={i < 2 ? bodyMat : bodyMat} />
        </mesh>
      ))}
      {/* HF black patches */}
      {[
        { p: [0.5, 0.3, 0.56] as [number, number, number], s: [0.7, 0.6, 0.05] as [number, number, number] },
        { p: [-0.8, 0.1, 0.56] as [number, number, number], s: [0.9, 0.5, 0.05] as [number, number, number] },
      ].map((patch, i) => (
        <mesh key={i} position={patch.p} scale={patch.s}>
          <sphereGeometry args={[0.8, 16, 12]} />
          <primitive object={blackMat} />
        </mesh>
      ))}
    </group>
  );
}

/** Nutrient particle flow (feed → rumen → blood → organs) */
function NutrientFlow({
  count,
  grade,
}: {
  count: number;
  grade: 'A' | 'B' | 'C' | 'REJECT';
}) {
  const colors: Record<string, THREE.Color> = {
    A: new THREE.Color('#2E7D32'),
    B: new THREE.Color('#1565C0'),
    C: new THREE.Color('#F9A825'),
    REJECT: new THREE.Color('#C62828'),
  };
  const particleColor = colors[grade] ?? colors.C;

  const posRef = useRef<Float32Array | null>(null);
  const geomRef = useRef<THREE.BufferGeometry>(null!);

  const { positions, velocities, phases } = useMemo(() => {
    const positions  = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const phases     = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Start particles at mouth/rumen and move towards organs
      positions[i * 3]     = 2.1 + Math.random() * 0.4;
      positions[i * 3 + 1] = Math.random() * 0.4 - 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
      velocities[i * 3]     = -(Math.random() * 0.03 + 0.01);
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
      phases[i] = Math.random() * Math.PI * 2;
    }
    posRef.current = positions.slice();
    return { positions, velocities, phases };
  }, [count]);

  useFrame((state, delta) => {
    if (!geomRef.current || !posRef.current) return;
    const p = posRef.current;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      p[i * 3]     += velocities[i * 3]     * delta * 60;
      p[i * 3 + 1] += velocities[i * 3 + 1] * delta * 60 + Math.sin(t * 2 + phases[i]) * 0.001;
      p[i * 3 + 2] += velocities[i * 3 + 2] * delta * 60;
      // Reset at back of body
      if (p[i * 3] < -2.5) {
        p[i * 3]     = 2.1 + Math.random() * 0.4;
        p[i * 3 + 1] = Math.random() * 0.4 - 0.2;
        p[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
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
      <pointsMaterial color={particleColor} size={0.05} transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

// ─── Scene ──────────────────────────────────────────────────────────────────

function AnatomyScene({ proximates, adulterant_detected, toxin_band }: CowAnatomySceneProps) {
  const quality = useAdaptiveQuality('MID');
  const profile = QUALITY[quality];

  // Compute organ impacts from live proximate data
  const impacts = useMemo(() => {
    const base = proximatesToOrganImpacts(proximates);
    // Adulterant and toxin escalate liver
    if (adulterant_detected || toxin_band === 'HIGH') {
      return { ...base, liver: 'CRITICAL' as OrganImpact };
    }
    if (toxin_band === 'MEDIUM') {
      return { ...base, liver: base.liver === 'HEALTHY' ? 'AT_RISK' as OrganImpact : base.liver };
    }
    return base;
  }, [proximates, adulterant_detected, toxin_band]);

  // Derive feed grade approximation for particle colour
  const grade = useMemo<'A' | 'B' | 'C' | 'REJECT'>(() => {
    if (adulterant_detected) return 'REJECT';
    if (proximates.crude_protein_pct_dm >= 18 && proximates.me_mj_kg_dm >= 11) return 'A';
    if (proximates.crude_protein_pct_dm >= 12 && proximates.me_mj_kg_dm >= 9.5) return 'B';
    if (proximates.crude_protein_pct_dm >= 8) return 'C';
    return 'REJECT';
  }, [proximates, adulterant_detected]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.0} castShadow />
      <pointLight position={[0, 3, 3]} intensity={0.8} color="#FFF8E1" />
      <fog attach="fog" args={['#0d1117', 20, 60]} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color={0x1a1a2e} roughness={0.9} />
      </mesh>

      {/* Cow body */}
      <group position={[0, 0.3, 0]}>
        <CowBody />

        {/* Organ overlays */}
        {/* Rumen: large fermentation chamber, left flank */}
        <Organ name="Rumen" position={[-0.4, -0.1, 0.5]} scale={[0.9, 0.7, 0.8]}
          impact={impacts.rumen} shape="sphere" />

        {/* Reticulum (honeycomb stomach) — smaller, forward of rumen */}
        <Organ name="Reticulum" position={[0.4, -0.2, 0.4]} scale={[0.4, 0.35, 0.4]}
          impact={impacts.rumen} shape="sphere" />

        {/* Liver: right side, near ribs */}
        <Organ name="Liver" position={[0.6, 0.2, -0.4]} scale={[0.7, 0.5, 0.55]}
          impact={impacts.liver} shape="box" />

        {/* Udder: beneath rear of body */}
        <Organ name="Udder" position={[-0.5, -1.1, 0]} scale={[0.6, 0.4, 0.7]}
          impact={impacts.udder} shape="torus" />

        {/* Bone/skeleton: hip area */}
        <Organ name="Bones" position={[-1.2, 0.0, 0]} scale={[0.3, 0.3, 0.3]}
          impact={impacts.bone} shape="sphere" />
      </group>

      {/* Nutrient flow particles */}
      <NutrientFlow count={profile.maxParticles > 100 ? 150 : 40} grade={grade} />

      {/* Impact legend labels */}
      <Billboard position={[-3.5, 3.0, 0]}>
        <Text fontSize={0.28} color="white" maxWidth={3} textAlign="left" anchorX="left">
          {[
            `Rumen: ${impacts.rumen}`,
            `Liver:  ${impacts.liver}`,
            `Udder:  ${impacts.udder}`,
            `Bones:  ${impacts.bone}`,
          ].join('\n')}
        </Text>
      </Billboard>

      <OrbitControls enablePan={false} minDistance={4} maxDistance={20} maxPolarAngle={Math.PI / 2} />
    </>
  );
}

export default function CowAnatomyCanvas(props: CowAnatomySceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 2, 8], fov: 50 }}
      shadows
      gl={{ antialias: false, powerPreference: 'low-power' }}
      style={{ width: '100%', height: '100%', background: '#0d1117' }}
      dpr={[0.75, 1.5]}
    >
      <AnatomyScene {...props} />
    </Canvas>
  );
}
