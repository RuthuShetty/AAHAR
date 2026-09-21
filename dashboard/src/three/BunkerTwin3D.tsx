import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useDashboardStore, BunkerProbeLance } from '../store/dashboardStore';
import { AlertTriangle } from 'lucide-react';

// ─── Single Probe Lance 3D Component ──────────────────────────────────────────

interface ProbeMeshProps {
  probe: BunkerProbeLance;
  isSelected: boolean;
  onSelect: (probe: BunkerProbeLance) => void;
}

function ProbeLanceMesh({ probe, isSelected, onSelect }: ProbeMeshProps) {
  const [hovered, setHovered] = useState(false);

  // Map 4 sensor depth nodes
  // Bunker coordinate system: (x, z) on floor, y is height above floor (0 to 3.2m).
  // Surface is at y = 3.2m; sensor depths are below surface.
  const surfaceY = 3.2;

  const getStatusColor = (status: 'optimal' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'optimal': return '#22c55e';
    }
  };

  return (
    <group position={[probe.x_m - 12, 0, probe.y_m - 3.5]}>
      {/* Probe Lance Stainless Shaft */}
      <mesh
        position={[0, surfaceY / 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(probe);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.06, 0.06, surfaceY + 0.5, 16]} />
        <meshStandardMaterial
          color={isSelected ? '#38bdf8' : hovered ? '#93c5fd' : '#cbd5e1'}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Top IoT Transmitter Enclosure (ESP32-C6 + LoRa Antenna) */}
      <mesh position={[0, surfaceY + 0.35, 0]}>
        <boxGeometry args={[0.25, 0.3, 0.2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>
      {/* Antenna */}
      <mesh position={[0.08, surfaceY + 0.6, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.25, 8]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* Depth Nodes (4 DS18B20 thermistors) */}
      {probe.readings.map((r, idx) => {
        const nodeY = surfaceY - r.depth_m;
        const color = getStatusColor(r.status);
        return (
          <group key={idx} position={[0, nodeY, 0]}>
            <mesh>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={r.status === 'critical' ? 0.8 : 0.3}
              />
            </mesh>
            {/* Glowing Sensor Ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.15, 0.22, 16]} />
              <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.6} />
            </mesh>
          </group>
        );
      })}

      {/* Lance Code Label */}
      <Text
        position={[0, surfaceY + 0.75, 0]}
        fontSize={0.28}
        color="#f8fafc"
        anchorX="center"
        anchorY="bottom"
      >
        {probe.lance_code.split(' ')[0]}
      </Text>

      {/* Interactive Telemetry Overlay Card */}
      {(hovered || isSelected) && (
        <Html position={[0, surfaceY + 1.1, 0]} center distanceFactor={15}>
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.2)'}`,
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#f8fafc',
              fontSize: '12px',
              fontFamily: 'sans-serif',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              minWidth: '170px',
              pointerEvents: 'none',
              transform: 'translateY(-20px)',
            }}
          >
            <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
              {probe.lance_code}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
              <span style={{ color: '#94a3b8' }}>pH (ISFET):</span>
              <span style={{ fontWeight: 600, color: probe.ph > 4.5 ? '#f87171' : '#4ade80' }}>
                {probe.ph.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
              <span style={{ color: '#94a3b8' }}>Moisture:</span>
              <span style={{ fontWeight: 600 }}>{probe.moisture_pct.toFixed(1)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
              <span style={{ color: '#94a3b8' }}>CO2 (NDIR):</span>
              <span style={{ fontWeight: 600 }}>{probe.co2_ppm.toLocaleString()} ppm</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '4px', paddingTop: '4px' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Temperatures:</div>
              {probe.readings.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span>{r.depth_m}m depth:</span>
                  <span style={{ color: getStatusColor(r.status), fontWeight: 600 }}>
                    {r.temp_c.toFixed(1)}°C
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Advancing Spoilage Front Plane ────────────────────────────────────────────

function SpoilageFrontPlane({ scrubDay, positions }: { scrubDay: number; positions: number[] }) {
  const dayIndex = Math.min(Math.max(0, scrubDay), 7);
  const frontX = (positions[dayIndex] || positions[0]) - 12;

  return (
    <group position={[frontX, 1.6, 0]}>
      {/* Front boundary curtain */}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[7.2, 3.2]} />
        <meshStandardMaterial
          color="#ef4444"
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
          roughness={0.8}
        />
      </mesh>

      {/* Front Line Glow */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.08, 0.08, 7.2]} />
        <meshBasicMaterial color="#f87171" />
      </mesh>

      <Text
        position={[0, 3.4, 0]}
        fontSize={0.28}
        color="#ef4444"
        anchorX="center"
        anchorY="bottom"
      >
        {`Day ${scrubDay} Spoilage Front (${(frontX + 12).toFixed(2)}m)`}
      </Text>
    </group>
  );
}

// ─── Bunker Structure (Walls, Concrete Floor, Silage Mass) ────────────────────

function BunkerGeometry() {
  return (
    <group>
      {/* Concrete Floor with Grid */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[26, 0.1, 9]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      <gridHelper args={[26, 26, '#334155', '#1e293b']} position={[0, 0.01, 0]} />

      {/* Left Concrete Wall */}
      <mesh position={[0, 1.6, -3.75]} castShadow receiveShadow>
        <boxGeometry args={[24.4, 3.2, 0.5]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>

      {/* Right Concrete Wall */}
      <mesh position={[0, 1.6, 3.75]} castShadow receiveShadow>
        <boxGeometry args={[24.4, 3.2, 0.5]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>

      {/* Back Closed End Wall */}
      <mesh position={[12.2, 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 3.2, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>

      {/* Silage Biomass Mass (Main Stack) */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[24, 3.0, 7.0]} />
        <meshStandardMaterial
          color="#3f6212"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* Exposed Face at Open Front (-12m) with Fermentation Layer */}
      <mesh position={[-12.01, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[7.0, 3.0]} />
        <meshStandardMaterial color="#854d0e" roughness={0.9} />
      </mesh>

      {/* Metric Rulers / Dimension Markers */}
      <Text position={[-12, 0.1, 4.5]} fontSize={0.3} color="#94a3b8">0m (Face)</Text>
      <Text position={[0, 0.1, 4.5]} fontSize={0.3} color="#94a3b8">12m</Text>
      <Text position={[12, 0.1, 4.5]} fontSize={0.3} color="#94a3b8">24m (Rear)</Text>
    </group>
  );
}

// ─── Main BunkerTwin3D Scene Component ────────────────────────────────────────

export function BunkerTwin3D() {
  const { bunker, bunkerScrubDay, setBunkerScrubDay } = useDashboardStore();
  const [selectedProbe, setSelectedProbe] = useState<BunkerProbeLance | null>(bunker.probes[0]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '520px', borderRadius: '16px', overflow: 'hidden', background: '#090d16' }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [-16, 12, 16], fov: 45 }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[-10, 20, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[0, 8, 0]} intensity={0.5} color="#38bdf8" />

        {/* Bunker & Silage Physical Model */}
        <BunkerGeometry />

        {/* Advancing Spoilage Front */}
        <SpoilageFrontPlane
          scrubDay={bunkerScrubDay}
          positions={bunker.spoilage_forecast.day_positions_m}
        />

        {/* IoT Probe Lances with Live Thermistors */}
        {bunker.probes.map((probe) => (
          <ProbeLanceMesh
            key={probe.id}
            probe={probe}
            isSelected={selectedProbe?.id === probe.id}
            onSelect={(p) => setSelectedProbe(p)}
          />
        ))}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={6}
          maxDistance={45}
        />
      </Canvas>

      {/* Floating Header Badge */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '10px',
          padding: '10px 16px',
          color: '#f8fafc',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
          {bunker.name}
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
          Dimensions: {bunker.length_m}m × {bunker.width_m}m × {bunker.height_m}m • {bunker.crop.replace('_', ' ')} • Density: {bunker.density_kg_dm_m3} kg DM/m³
        </div>
      </div>

      {/* 7-Day Spoilage Front Timeline Scrubber */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '680px',
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          padding: '12px 20px',
          color: '#f8fafc',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} color="#f87171" />
            <span>7-Day Spoilage Front Velocity: {bunker.spoilage_forecast.front_velocity_m_per_day} m/day</span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
            Day {bunkerScrubDay} Forecast: {bunker.spoilage_forecast.day_positions_m[bunkerScrubDay].toFixed(2)}m from face
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="7"
          step="1"
          value={bunkerScrubDay}
          onChange={(e) => setBunkerScrubDay(parseInt(e.target.value, 10))}
          style={{
            width: '100%',
            cursor: 'pointer',
            accentColor: '#ef4444',
            height: '6px',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
          <span>Day 0 (Now: 1.80m)</span>
          <span>Day 2 (+0.53m)</span>
          <span>Day 4 (+1.21m)</span>
          <span>Day 7 (+2.58m Critical)</span>
        </div>
      </div>
    </div>
  );
}
