/**
 * AAHAR 3D — NIR Spectrum Fingerprint Scene
 *
 * A 3D waterfall/landscape of the NIR spectrum with:
 *  - Each of 228 bands rendered as a vertical bar coloured by absorption zone
 *  - Quality grade tint overlay (grade A=blue, C=amber, REJECT=red)
 *  - Key absorption band markers (protein 1500nm, moisture 1400nm, fat 1720nm, urea 1980nm)
 *  - Animated "scanning beam" effect
 *  - Adulterant spike highlights (elevated bands blink red)
 *  - OOD region (bands outside training manifold) rendered as wireframe
 *  - Confidence ribbon along top of the bars
 *
 * Accepts the raw preprocessed spectrum Float32Array from InferenceResult.
 */

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Billboard, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { nirBandColor, gradeToColor, GRADE_COLOURS } from '../materials';
import { useAdaptiveQuality, QUALITY } from '../perf/AdaptiveQuality';
import type { FeedGrade } from '../../types/contracts';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SpectrumSceneProps {
  /** Preprocessed NIR spectrum (228 floats, SNV + 1st derivative) */
  spectrum: Float32Array;
  /** Wavelengths array (228 values, 900–1700nm) */
  wavelengths_nm: number[];
  grade: FeedGrade;
  confidence: number;
  in_distribution: boolean;
  /** Bands flagged as adulterant peaks (index of band in 0–227 range) */
  adulterant_band_indices?: number[];
}

// ─── Key band markers ────────────────────────────────────────────────────────

const KEY_BANDS = [
  { nm: 1400, label: 'H₂O',      color: '#00838F' },
  { nm: 1500, label: 'N-H/CP',   color: '#1565C0' },
  { nm: 1720, label: 'C-H/Fat',  color: '#F9A825' },
  { nm: 980,  label: 'O-H',      color: '#26A69A' },
];

// ─── Scanning beam animation ─────────────────────────────────────────────────

function ScanBeam({ nBands, barW }: { nBands: number; barW: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta * 0.4;
    if (meshRef.current) {
      // Oscillate across the spectrum
      const x = ((timeRef.current % 1) * nBands - nBands / 2) * barW;
      meshRef.current.position.x = x;
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.4 + 0.3 * Math.sin(timeRef.current * 10);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 1.5, 0]} rotation={[0, 0, 0]}>
      <planeGeometry args={[barW * 3, 8]} />
      <meshStandardMaterial
        color="#64B5F6"
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        emissive={new THREE.Color('#1565C0')}
        emissiveIntensity={0.8}
      />
    </mesh>
  );
}

// ─── Confidence ribbon ───────────────────────────────────────────────────────

function ConfidenceRibbon({
  spectrum,
  barW,
  nBands,
  confidence,
}: {
  spectrum: Float32Array;
  barW: number;
  nBands: number;
  confidence: number;
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < nBands; i++) {
      const x = (i - nBands / 2) * barW;
      const val = spectrum[i] ?? 0;
      const y = Math.abs(val) * 3 + 0.2;
      pts.push(new THREE.Vector3(x, y, 0));
    }
    return pts;
  }, [spectrum, nBands, barW]);

  return (
    <Line
      points={points}
      color={new THREE.Color().lerpColors(
        new THREE.Color('#C62828'),
        new THREE.Color('#2E7D32'),
        confidence
      )}
      lineWidth={2}
      transparent
      opacity={0.85}
    />
  );
}

// ─── Main spectrum bar grid ──────────────────────────────────────────────────

function SpectrumBars({
  spectrum,
  wavelengths_nm,
  grade,
  in_distribution,
  adulterant_band_indices,
}: Omit<SpectrumSceneProps, 'confidence'>) {
  const nBands = spectrum.length;
  const BAR_W = 0.18;
  const quality = useAdaptiveQuality('MID');

  // Pre-compute geometry attributes for all bars as a single InstancedMesh
  const { dummy, colors, heights } = useMemo(() => {
    const dummy   = new THREE.Object3D();
    const colors  = new Float32Array(nBands * 3);
    const heights = new Float32Array(nBands);
    const adulterantSet = new Set(adulterant_band_indices ?? []);

    for (let i = 0; i < nBands; i++) {
      const val  = spectrum[i] ?? 0;
      const absV = Math.abs(val);
      const h    = absV * 3.0 + 0.05;
      heights[i] = h;

      const wl  = wavelengths_nm[i] ?? (900 + i * 3.5);
      let color: THREE.Color;

      if (adulterantSet.has(i)) {
        color = new THREE.Color('#FF1744');
      } else if (!in_distribution) {
        color = new THREE.Color('#9E9E9E');
      } else {
        color = nirBandColor(wl, absV, grade);
      }
      colors[i * 3]     = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return { dummy, colors, heights };
  }, [spectrum, wavelengths_nm, grade, in_distribution, adulterant_band_indices, nBands]);

  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const adulterantSet = useMemo(() => new Set(adulterant_band_indices ?? []), [adulterant_band_indices]);

  // Set instance transforms
  useMemo(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < nBands; i++) {
      const h = heights[i];
      const x = (i - nBands / 2) * BAR_W;
      dummy.position.set(x, h / 2, 0);
      dummy.scale.set(BAR_W * 0.85, h, 0.12);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, new THREE.Color(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]));
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [dummy, heights, colors, nBands, BAR_W]);

  // Blink adulterant peaks
  const blinkRef = useRef(0);
  useFrame((_, delta) => {
    blinkRef.current += delta;
    if (!meshRef.current) return;
    adulterantSet.forEach(i => {
      const blink = Math.sin(blinkRef.current * 6) > 0;
      meshRef.current.setColorAt(i, blink ? new THREE.Color('#FF1744') : new THREE.Color('#FF8A65'));
    });
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, nBands]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial vertexColors roughness={0.4} metalness={0.1} />
    </instancedMesh>
  );
}

// ─── Scene ──────────────────────────────────────────────────────────────────

function SpectrumScene(props: SpectrumSceneProps) {
  const nBands = props.spectrum.length;
  const BAR_W  = 0.18;

  // Key band marker x positions
  const bandMarkers = useMemo(() =>
    KEY_BANDS.map(kb => {
      const idx = props.wavelengths_nm.findIndex(wl => wl >= kb.nm);
      const x = (idx - nBands / 2) * BAR_W;
      return { ...kb, x, idx };
    }).filter(kb => kb.idx >= 0),
    [props.wavelengths_nm, nBands, BAR_W]
  );

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 15, 10]} intensity={1.0} />
      <pointLight position={[0, 10, 3]} intensity={0.6} color="#E3F2FD" />
      <fog attach="fog" args={['#0d1117', 30, 80]} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[60, 10]} />
        <meshStandardMaterial color={0x1a1a2e} roughness={0.9} />
      </mesh>

      {/* Spectrum bars */}
      <SpectrumBars {...props} />

      {/* Scanning beam */}
      <ScanBeam nBands={nBands} barW={BAR_W} />

      {/* Confidence ribbon */}
      <ConfidenceRibbon
        spectrum={props.spectrum}
        barW={BAR_W}
        nBands={nBands}
        confidence={props.confidence}
      />

      {/* Key band markers */}
      {bandMarkers.map(kb => (
        <group key={kb.nm}>
          <Line
            points={[
              new THREE.Vector3(kb.x, 0, 0),
              new THREE.Vector3(kb.x, 5.5, 0),
            ]}
            color={kb.color}
            lineWidth={1.5}
            transparent
            opacity={0.7}
            dashed
            dashSize={0.2}
            gapSize={0.1}
          />
          <Billboard position={[kb.x, 5.8, 0]}>
            <Text fontSize={0.22} color={kb.color} anchorX="center">
              {`${kb.label}\n${kb.nm}nm`}
            </Text>
          </Billboard>
        </group>
      ))}

      {/* Grade badge */}
      <Billboard position={[0, 7.2, 0]}>
        <Text
          fontSize={0.55}
          color={GRADE_COLOURS[props.grade]?.getStyle() ?? '#fff'}
          anchorX="center"
          fontWeight="bold"
        >
          {`Grade ${props.grade} | Confidence ${(props.confidence * 100).toFixed(0)}%${!props.in_distribution ? ' [OOD]' : ''}`}
        </Text>
      </Billboard>

      {/* OOD overlay strip */}
      {!props.in_distribution && (
        <mesh position={[0, 3, 0.15]}>
          <planeGeometry args={[nBands * BAR_W, 6]} />
          <meshStandardMaterial
            color="#FF1744"
            transparent
            opacity={0.07}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <OrbitControls
        enablePan
        minDistance={5}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2 + 0.2}
      />
    </>
  );
}

export default function SpectrumFingerprintCanvas(props: SpectrumSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 6, 22], fov: 50 }}
      shadows
      gl={{ antialias: false, powerPreference: 'low-power' }}
      style={{ width: '100%', height: '100%', background: '#0d1117' }}
      dpr={[0.75, 1.5]}
    >
      <SpectrumScene {...props} />
    </Canvas>
  );
}
