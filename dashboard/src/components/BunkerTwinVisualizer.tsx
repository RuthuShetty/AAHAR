import React, { useState } from 'react';
import { BunkerTwinData, BunkerProbeLance } from '../store/dashboardStore';
import {
  Thermometer,
  Layers,
  Activity,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Radio,
  Maximize2,
  Cpu,
  Info,
} from 'lucide-react';

interface BunkerTwinVisualizerProps {
  bunker: BunkerTwinData;
  scrubDay: number;
}

function parseProbeLabel(lanceCode: string) {
  // Parses "LANCE-01-A (Face)" -> letter: "A", zone: "Face", num: "01"
  const match = lanceCode.match(/LANCE-(\d+)-([A-Z])\s*\(([^)]+)\)/i);
  if (match) {
    return { num: match[1], letter: match[2], zone: match[3] };
  }
  // Fallback if not matched
  const simpleMatch = lanceCode.match(/([A-Z])/);
  return {
    num: '01',
    letter: simpleMatch ? simpleMatch[1] : lanceCode.slice(0, 2),
    zone: lanceCode.includes('(') ? lanceCode.split('(')[1].replace(')', '') : 'Probe',
  };
}

export function BunkerTwinVisualizer({ bunker, scrubDay }: BunkerTwinVisualizerProps) {
  const [selectedProbeId, setSelectedProbeId] = useState<string>(bunker.probes[0]?.id || '');
  const [viewMode, setViewMode] = useState<'profile' | 'topdown'>('profile');

  const selectedProbe = bunker.probes.find((p) => p.id === selectedProbeId) || bunker.probes[0];

  const bunkerLength = bunker.length_m || 24.0;
  const bunkerHeight = bunker.height_m || 3.2;

  // Current spoilage front penetration in meters based on scrubDay
  const frontPosM = bunker.spoilage_forecast.day_positions_m[scrubDay] ??
    (bunker.spoilage_forecast.current_front_pos_m + scrubDay * bunker.spoilage_forecast.front_velocity_m_per_day);

  // SVG coordinate dimensions with generous breathing room
  const svgWidth = 860;
  const svgHeight = 350;
  const margin = { top: 60, right: 65, bottom: 50, left: 80 };
  const innerWidth = svgWidth - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;

  // Scale: bunkerLength in meters, bunkerHeight in meters
  const scaleX = (m: number) => margin.left + (Math.min(m, bunkerLength) / bunkerLength) * innerWidth;
  const scaleY = (depthM: number) => margin.top + (Math.min(depthM, bunkerHeight) / bunkerHeight) * innerHeight;

  const frontPixelX = scaleX(frontPosM);

  // Dynamic X axis ticks
  const xTicks = [0, 4, 8, 12, 16, 20, Math.round(bunkerLength)];
  const depthTicks = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

  return (
    <div className="bunker-visualizer-card">
      {/* Top Bar with Mode Switch & Telemetry summary */}
      <div className="bunker-vis-header">
        <div className="bunker-vis-title-group">
          <div className="bunker-vis-title">
            <Layers size={16} color="var(--emerald-600)" />
            <span>Volumetric Silage Cross-Section Digital Twin</span>
          </div>
          <span className="bunker-vis-sub">
            Silage Pack: {bunkerLength}m × {bunker.width_m}m × {bunkerHeight}m · Density: {bunker.density_kg_dm_m3} kg DM/m³
          </span>
        </div>

        <div className="bunker-vis-actions">
          <div className="bunker-vis-mode-pills">
            <button
              className={`vis-mode-btn ${viewMode === 'profile' ? 'active' : ''}`}
              onClick={() => setViewMode('profile')}
            >
              Side Profile (Z-Depth)
            </button>
            <button
              className={`vis-mode-btn ${viewMode === 'topdown' ? 'active' : ''}`}
              onClick={() => setViewMode('topdown')}
            >
              Top-Down Grid (X-Y)
            </button>
          </div>
          <div className="badge-pill-live">
            <span className="live-dot-green" />
            <span>4 ESP32-C6 Probes</span>
          </div>
        </div>
      </div>

      {/* Visual Legend Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          fontSize: '0.68rem',
          color: 'var(--text-secondary)',
          background: 'var(--slate-50)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--r-sm)',
          padding: '6px 12px',
          marginBottom: '10px',
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Thermal Zones:
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
          <span>Optimal (&lt;32°C)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d97706' }} />
          <span>Warm Warning (32–38°C)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e11d48' }} />
          <span>Critical Spoilage (&gt;38°C)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
          <span style={{ width: '16px', height: '2px', background: '#d97706', borderTop: '2px dashed #d97706' }} />
          <span>Aerobic Front: {frontPosM.toFixed(2)}m</span>
        </div>
      </div>

      {/* SVG Canvas Twin */}
      <div className="bunker-canvas-wrapper">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="bunker-svg-twin"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Aerobic Spoilage Heatmap Gradient */}
            <linearGradient id="spoilageGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.32" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>

            {/* Stable Anaerobic Core Gradient */}
            <linearGradient id="anaerobicGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ecfdf5" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.65" />
            </linearGradient>

            {/* Cross-hatch pattern for concrete retaining wall */}
            <pattern id="concreteHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#cbd5e1" strokeWidth="1" />
            </pattern>
          </defs>

          {viewMode === 'profile' ? (
            /* ──────────────── SIDE PROFILE VIEW ──────────────── */
            <g>
              {/* Background Bunker Silage Basin */}
              <rect
                x={margin.left}
                y={margin.top}
                width={innerWidth}
                height={innerHeight}
                fill="url(#anaerobicGradient)"
                rx="2"
              />

              {/* Spoilage Penetration Front Area */}
              <rect
                x={margin.left}
                y={margin.top}
                width={Math.max(0, frontPixelX - margin.left)}
                height={innerHeight}
                fill="url(#spoilageGradient)"
              />

              {/* Concrete Push-wall (Back Retaining Wall) */}
              <rect
                x={margin.left + innerWidth}
                y={margin.top - 8}
                width="16"
                height={innerHeight + 16}
                fill="url(#concreteHatch)"
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
              <text
                x={margin.left + innerWidth + 8}
                y={margin.top + innerHeight / 2}
                fill="#64748b"
                fontSize="8.5"
                fontWeight="700"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
                transform={`rotate(90, ${margin.left + innerWidth + 8}, ${margin.top + innerHeight / 2})`}
              >
                RETAINING WALL ({bunkerLength}m)
              </text>

              {/* Concrete Floor Base */}
              <rect
                x={margin.left - 6}
                y={margin.top + innerHeight}
                width={innerWidth + 22}
                height="8"
                fill="url(#concreteHatch)"
                stroke="#94a3b8"
                strokeWidth="1.2"
              />

              {/* Y-Axis Label: Depth */}
              <text
                x={22}
                y={margin.top + innerHeight / 2}
                fill="#64748b"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
                transform={`rotate(-90, 22, ${margin.top + innerHeight / 2})`}
              >
                DEPTH (METERS)
              </text>

              {/* Depth Contour Horizontal Guide Lines */}
              {depthTicks.map((d) => {
                const y = scaleY(d);
                return (
                  <g key={d}>
                    <line
                      x1={margin.left}
                      y1={y}
                      x2={margin.left + innerWidth}
                      y2={y}
                      stroke="#94a3b8"
                      strokeWidth="0.8"
                      strokeDasharray="4 4"
                      opacity="0.4"
                    />
                    <text
                      x={margin.left - 8}
                      y={y + 3}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="var(--font-mono)"
                      textAnchor="end"
                    >
                      {d.toFixed(1)}m
                    </text>
                  </g>
                );
              })}

              {/* Open Face Boundary on Left (0.0m) */}
              <line
                x1={margin.left}
                y1={margin.top - 14}
                x2={margin.left}
                y2={margin.top + innerHeight + 6}
                stroke="#e11d48"
                strokeWidth="2"
                strokeDasharray="5 3"
              />
              <text
                x={margin.left}
                y={margin.top - 18}
                fill="#e11d48"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="var(--font-mono)"
                textAnchor="start"
              >
                Face (0m)
              </text>

              {/* Dynamic Spoilage Front Vertical Line & Non-Colliding Pill */}
              <g>
                <line
                  x1={frontPixelX}
                  y1={margin.top}
                  x2={frontPixelX}
                  y2={margin.top + innerHeight}
                  stroke="#d97706"
                  strokeWidth="2"
                  strokeDasharray="5 3"
                />
                <circle cx={frontPixelX} cy={margin.top + 4} r="3.5" fill="#d97706" />

                {/* Floating Front Indicator Pill Inside Silage Upper Zone (Never collides with probe heads) */}
                <g transform={`translate(${Math.max(margin.left + 36, frontPixelX)}, ${margin.top + 18})`}>
                  <rect
                    x="-34"
                    y="-9"
                    width="68"
                    height="18"
                    rx="4"
                    fill="#ffffff"
                    stroke="#d97706"
                    strokeWidth="1.2"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))' }}
                  />
                  <text
                    x="0"
                    y="3.5"
                    fill="#b45309"
                    fontSize="8.5"
                    fontWeight="800"
                    fontFamily="var(--font-mono)"
                    textAnchor="middle"
                  >
                    FRONT {frontPosM.toFixed(2)}m
                  </text>
                </g>
              </g>

              {/* Probe Lances (Generously Spaced) */}
              {bunker.probes.map((probe) => {
                const px = scaleX(probe.x_m);
                const isSelected = probe.id === selectedProbeId;
                const { letter, zone } = parseProbeLabel(probe.lance_code);

                return (
                  <g
                    key={probe.id}
                    onClick={() => setSelectedProbeId(probe.id)}
                    style={{ cursor: 'pointer' }}
                    className="probe-svg-group"
                  >
                    {/* Lance Vertical Shaft */}
                    <line
                      x1={px}
                      y1={margin.top - 8}
                      x2={px}
                      y2={scaleY(1.75)}
                      stroke={isSelected ? 'var(--blue-600)' : '#475569'}
                      strokeWidth={isSelected ? '3' : '2'}
                    />

                    {/* Dedicated ESP32-C6 Lance Head Badge in Top Margin */}
                    <g transform={`translate(${px}, ${margin.top - 24})`}>
                      <rect
                        x="-30"
                        y="-16"
                        width="60"
                        height="30"
                        rx="4"
                        fill={isSelected ? '#eff6ff' : '#ffffff'}
                        stroke={isSelected ? 'var(--blue-600)' : '#94a3b8'}
                        strokeWidth={isSelected ? '2' : '1.2'}
                        style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.08))' }}
                      />
                      {/* Downward pointer triangle */}
                      <polygon
                        points="-4,14 4,14 0,18"
                        fill={isSelected ? 'var(--blue-600)' : '#94a3b8'}
                      />
                      <text
                        x="0"
                        y="-3"
                        fill={isSelected ? '#1e40af' : '#0f172a'}
                        fontSize="8.5"
                        fontWeight="800"
                        fontFamily="var(--font-mono)"
                        textAnchor="middle"
                      >
                        LANCE {letter}
                      </text>
                      <text
                        x="0"
                        y="9"
                        fill={isSelected ? '#3b82f6' : '#64748b'}
                        fontSize="7"
                        fontWeight="600"
                        fontFamily="var(--font-sans)"
                        textAnchor="middle"
                      >
                        {zone}
                      </text>
                    </g>

                    {/* 4-Depth DS18B20 Thermistor Array on the Lance */}
                    {probe.readings.map((reading) => {
                      const py = scaleY(reading.depth_m);
                      const isCritical = reading.temp_c > 38.0;
                      const isWarning = reading.temp_c >= 32.0 && reading.temp_c <= 38.0;
                      const nodeColor = isCritical ? '#e11d48' : isWarning ? '#d97706' : '#059669';

                      return (
                        <g key={reading.depth_m}>
                          {/* Outer pulse circle if critical */}
                          {isCritical && (
                            <circle
                              cx={px}
                              cy={py}
                              r="7"
                              fill="#fee2e2"
                              stroke="#fca5a5"
                              strokeWidth="1"
                            />
                          )}

                          {/* Node circle */}
                          <circle
                            cx={px}
                            cy={py}
                            r={isSelected ? '4.5' : '3.5'}
                            fill={nodeColor}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />

                          {/* Temperature Callout Pill for Selected Probe (Clear spacing) */}
                          {isSelected && (
                            <g transform={`translate(${px + 8}, ${py})`}>
                              <rect
                                x="0"
                                y="-8"
                                width="44"
                                height="16"
                                rx="3"
                                fill="#ffffff"
                                stroke={nodeColor}
                                strokeWidth="1.2"
                                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))' }}
                              />
                              <text
                                x="22"
                                y="3.5"
                                fill="#0f172a"
                                fontSize="8.5"
                                fontWeight="800"
                                fontFamily="var(--font-mono)"
                                textAnchor="middle"
                              >
                                {reading.temp_c.toFixed(1)}°C
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* Horizontal Distance Axis (Bottom) */}
              <line
                x1={margin.left}
                y1={margin.top + innerHeight}
                x2={margin.left + innerWidth}
                y2={margin.top + innerHeight}
                stroke="#64748b"
                strokeWidth="1"
              />
              {xTicks.map((m) => {
                const x = scaleX(m);
                return (
                  <g key={m}>
                    <line x1={x} y1={margin.top + innerHeight} x2={x} y2={margin.top + innerHeight + 5} stroke="#64748b" />
                    <text
                      x={x}
                      y={margin.top + innerHeight + 16}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="var(--font-mono)"
                      textAnchor="middle"
                    >
                      {m}m
                    </text>
                  </g>
                );
              })}
              <text
                x={margin.left + innerWidth / 2}
                y={svgHeight - 10}
                fill="#64748b"
                fontSize="9.5"
                fontFamily="var(--font-sans)"
                textAnchor="middle"
                fontWeight="600"
              >
                Silage Stack Length from Open Face (Meters)
              </text>
            </g>
          ) : (
            /* ──────────────── TOP-DOWN GRID VIEW ──────────────── */
            <g>
              <rect
                x={margin.left}
                y={margin.top}
                width={innerWidth}
                height={innerHeight}
                fill="#f8fafc"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                rx="4"
              />

              {/* Grid lines */}
              {xTicks.map((m) => {
                const x = scaleX(m);
                return (
                  <line
                    key={m}
                    x1={x}
                    y1={margin.top}
                    x2={x}
                    y2={margin.top + innerHeight}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                );
              })}

              {/* Aerobic Spoilage Front Top-Down Band */}
              <rect
                x={margin.left}
                y={margin.top}
                width={Math.max(0, frontPixelX - margin.left)}
                height={innerHeight}
                fill="url(#spoilageGradient)"
              />

              {/* Front line */}
              <line
                x1={frontPixelX}
                y1={margin.top}
                x2={frontPixelX}
                y2={margin.top + innerHeight}
                stroke="#d97706"
                strokeWidth="2"
                strokeDasharray="4 3"
              />

              {/* Probes on Grid */}
              {bunker.probes.map((probe) => {
                const px = scaleX(probe.x_m);
                // Map y_m (0 to bunker.width_m) to innerHeight
                const py = margin.top + (probe.y_m / (bunker.width_m || 7)) * innerHeight;
                const isSelected = probe.id === selectedProbeId;
                const maxTemp = Math.max(...probe.readings.map((r) => r.temp_c));
                const isCrit = maxTemp > 38;
                const { letter, zone } = parseProbeLabel(probe.lance_code);

                return (
                  <g
                    key={probe.id}
                    onClick={() => setSelectedProbeId(probe.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={px}
                      cy={py}
                      r={isSelected ? '14' : '10'}
                      fill={isSelected ? '#dbeafe' : '#ffffff'}
                      stroke={isCrit ? '#e11d48' : isSelected ? 'var(--blue-600)' : '#64748b'}
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                    />
                    <circle
                      cx={px}
                      cy={py}
                      r="4"
                      fill={isCrit ? '#e11d48' : '#059669'}
                    />

                    {/* Non-colliding probe tag pill */}
                    <g transform={`translate(${px}, ${py - 18})`}>
                      <rect
                        x="-24"
                        y="-9"
                        width="48"
                        height="16"
                        rx="3"
                        fill="#ffffff"
                        stroke={isSelected ? 'var(--blue-600)' : '#cbd5e1'}
                        strokeWidth="1"
                        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))' }}
                      />
                      <text
                        x="0"
                        y="3"
                        fill="#0f172a"
                        fontSize="8"
                        fontWeight="700"
                        fontFamily="var(--font-mono)"
                        textAnchor="middle"
                      >
                        P-{letter} ({probe.x_m}m)
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Selected Probe Telemetry Inspector */}
      {selectedProbe && (
        <div className="bunker-probe-inspector">
          <div className="probe-inspector-header">
            <div className="probe-code-badge">
              <Radio size={14} color="var(--emerald-600)" />
              <span className="probe-title">{selectedProbe.lance_code}</span>
              <span className="probe-coords">
                Position: X={selectedProbe.x_m}m, Y={selectedProbe.y_m}m · ESP32-C6 LoRaWAN
              </span>
            </div>

            <div className="probe-header-status">
              <span className="chip em">ISFET pH {selectedProbe.ph.toFixed(2)}</span>
              <span className="chip bl">LoRa RSSI -84 dBm</span>
            </div>
          </div>

          <div className="probe-telemetry-grid">
            {/* Primary Chemical & Gas Sensors */}
            <div className="telemetry-box">
              <span className="telemetry-label">ISFET pH (Lactic Acid)</span>
              <span
                className="telemetry-val"
                style={{ color: selectedProbe.ph <= 4.2 ? 'var(--emerald-600)' : 'var(--rose-600)' }}
              >
                {selectedProbe.ph.toFixed(2)}
              </span>
              <span className="telemetry-hint">{selectedProbe.ph <= 4.2 ? 'Safe Anaerobic Fermentation' : 'pH Rising (Spoilage Risk)'}</span>
            </div>

            <div className="telemetry-box">
              <span className="telemetry-label">Capacitive Moisture</span>
              <span className="telemetry-val">{selectedProbe.moisture_pct.toFixed(1)}%</span>
              <span className="telemetry-hint">Optimal Range: 62% - 68%</span>
            </div>

            <div className="telemetry-box">
              <span className="telemetry-label">NDIR CO₂ Concentration</span>
              <span className="telemetry-val">{selectedProbe.co2_ppm.toLocaleString()} <span style={{ fontSize: '0.7rem' }}>ppm</span></span>
              <span className="telemetry-hint">Anaerobic Gas Cap Active</span>
            </div>

            <div className="telemetry-box">
              <span className="telemetry-label">VOC Fermentation Marker</span>
              <span className="telemetry-val">{selectedProbe.voc_ppb} <span style={{ fontSize: '0.7rem' }}>ppb</span></span>
              <span className="telemetry-hint">Ethanol & Acetic Traces</span>
            </div>
          </div>

          {/* 4-Depth Thermistor Breakdown */}
          <div className="probe-depth-breakdown">
            <div className="depth-title-row">
              <span className="depth-section-title">DS18B20 4-Depth Thermistor Array</span>
              <span className="depth-threshold-note">Aerobic critical threshold: 38.0°C</span>
            </div>

            <div className="depth-cards-row">
              {selectedProbe.readings.map((reading) => {
                const isCrit = reading.temp_c > 38.0;
                const isWarn = reading.temp_c >= 32.0 && reading.temp_c <= 38.0;
                const colorClass = isCrit ? 'crit' : isWarn ? 'warn' : 'ok';

                return (
                  <div key={reading.depth_m} className={`depth-pill-card ${colorClass}`}>
                    <div className="depth-card-top">
                      <span className="depth-marker">{reading.depth_m.toFixed(1)}m Depth</span>
                      {isCrit ? (
                        <Flame size={13} color="var(--rose-600)" />
                      ) : isWarn ? (
                        <AlertTriangle size={13} color="var(--amber-600)" />
                      ) : (
                        <ShieldCheck size={13} color="var(--emerald-600)" />
                      )}
                    </div>
                    <div className="depth-temp-val">{reading.temp_c.toFixed(1)}°C</div>
                    <div className="depth-status-text">
                      {isCrit ? 'Aerobic Heat Front' : isWarn ? 'Elevated Heat' : 'Cool / Anaerobic'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BunkerTwinVisualizer;
