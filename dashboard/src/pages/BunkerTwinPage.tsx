import React from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { MetricCard } from '../components/MetricCard';
import { BunkerTwinVisualizer } from '../components/BunkerTwinVisualizer';
import {
  Gauge,
  Timer,
  Tractor,
  TrendingDown,
  Activity,
  Layers,
  Radio,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export function BunkerTwinPage() {
  const { bunker, bunkerScrubDay, setBunkerScrubDay } = useDashboardStore();

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-eyebrow">Phase 6 — Silage Stack IoT</div>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">3D Silage Bunker Digital Twin</h1>
            <p className="page-subtitle">
              Aerobic spoilage forecast powered by ESP32-C6 LoRaWAN probe telemetry · 4-depth DS18B20 thermistors · ISFET pH
            </p>
          </div>
          <div className="page-actions">
            <span className="chip em">
              <span className="chip-dot" />
              4 Probes Active
            </span>
            <span className="chip bl">SX1262 LoRa 865 MHz</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid mb-6">
        <MetricCard
          accent="re"
          title="Spoilage Front Velocity"
          value={`${bunker.spoilage_forecast.front_velocity_m_per_day} m/day`}
          subtitle="Aerobic degradation zone"
          icon={<Gauge size={16} />}
          badge={{ text: bunker.spoilage_forecast.risk_level, variant: 're' }}
        />
        <MetricCard
          accent="am"
          title="Hours to Critical Spoilage"
          value={`${bunker.spoilage_forecast.hours_to_critical}h`}
          subtitle="At current feedout rate"
          icon={<Timer size={16} />}
          delta={{ value: 'Accelerating', isPositive: false }}
        />
        <MetricCard
          accent="em"
          title="Recommended Feedout"
          value={`${bunker.spoilage_forecast.recommended_feedout_rate_tonnes_per_day} T/day`}
          subtitle="Min 30 cm/day face removal"
          icon={<Tractor size={16} />}
          badge={{ text: 'Action Needed', variant: 'am' }}
        />
        <MetricCard
          accent="re"
          title="Projected DMI Loss"
          value={`${bunker.spoilage_forecast.dmi_loss_pct_forecast}%`}
          subtitle="Dry matter intake deficit"
          icon={<TrendingDown size={16} />}
          delta={{ value: '3.4% above norm', isPositive: false }}
        />
      </div>

      {/* Interactive Volumetric Digital Twin */}
      <div className="glass-panel mb-5">
        <div className="panel-header">
          <div className="panel-header-left">
            <div className="panel-title">Silage Stack Volumetric Model & Spoilage Front</div>
            <div className="panel-subtitle">
              Interactive longitudinal cross-section and top-down grid. Drag timeline to simulate 7-day front penetration.
            </div>
          </div>
          <div className="panel-header-right">
            <span className="chip em">
              <span className="chip-dot" />
              Live IoT Ingest
            </span>
          </div>
        </div>
        <div className="panel-body">
          {/* Rich Digital Twin Visualizer */}
          <BunkerTwinVisualizer bunker={bunker} scrubDay={bunkerScrubDay} />

          {/* 7-Day Spoilage Front Timeline Scrubber */}
          <div className="bunker-timeline-scrubber">
            <div className="timeline-scrubber-header">
              <div className="timeline-title-group">
                <Calendar size={14} color="var(--emerald-600)" />
                <span className="timeline-title">Spoilage Front Predictive Timeline</span>
              </div>
              <span className="timeline-badge-day">
                Day {bunkerScrubDay} Forecast (+{(bunkerScrubDay * bunker.spoilage_forecast.front_velocity_m_per_day).toFixed(2)}m penetration)
              </span>
            </div>

            <div className="scrubber-range-container">
              <input
                type="range"
                min={0}
                max={7}
                value={bunkerScrubDay}
                onChange={(e) => setBunkerScrubDay(Number(e.target.value))}
                className="styled-slider"
                aria-label="Silage Spoilage Timeline Scrubber"
              />
              <div className="scrubber-ticks-row">
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className={`scrubber-tick-col ${bunkerScrubDay === i ? 'active' : ''}`}
                    onClick={() => setBunkerScrubDay(i)}
                  >
                    <span className="tick-label">Day {i}</span>
                    <span className="tick-val">
                      {bunker.spoilage_forecast.day_positions_m[i]?.toFixed(1) ?? (0.8 + i * 0.14).toFixed(1)}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Probe Telemetry Table */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-header-left">
            <div className="panel-title">IoT Probe Telemetry — Real-time Multi-Depth Sensors</div>
            <div className="panel-subtitle">Hourly LoRa transmission of ISFET pH, Capacitive Moisture, NDIR CO₂ & 4-depth DS18B20 temperatures</div>
          </div>
          <div className="panel-header-right">
            <span className="chip vi">ESP32-C6 SX1262</span>
          </div>
        </div>
        <div className="panel-body no-pad">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Probe</th>
                  <th>Position</th>
                  <th>ISFET pH</th>
                  <th>Moisture</th>
                  <th>NDIR CO₂</th>
                  <th>VOC</th>
                  <th>0.2m Depth</th>
                  <th>0.6m Depth</th>
                  <th>1.0m Depth</th>
                  <th>1.5m Depth</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bunker.probes.map((probe) => {
                  const [t0, t1, t2, t3] = probe.readings;
                  const isWarming = t0.temp_c > 35.0;
                  const phOk = probe.ph <= 4.5;
                  return (
                    <tr key={probe.id}>
                      <td>
                        <span className="td-strong td-mono">{probe.lance_code}</span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        X: {probe.x_m}m, Y: {probe.y_m}m
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: phOk ? 'var(--emerald-600)' : 'var(--rose-600)', fontFamily: 'var(--font-mono)' }}>
                          {probe.ph.toFixed(2)}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{probe.moisture_pct.toFixed(1)}%</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{probe.co2_ppm.toLocaleString()} ppm</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{probe.voc_ppb} ppb</td>
                      {[t0, t1, t2, t3].map((t, i) => (
                        <td key={i}>
                          <span style={{
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: t.status === 'critical' ? 'var(--rose-600)' : t.status === 'warning' ? 'var(--amber-600)' : 'var(--emerald-600)',
                          }}>
                            {t.temp_c.toFixed(1)}°C
                          </span>
                        </td>
                      ))}
                      <td>
                        <span className={`chip ${isWarming ? 're' : 'em'}`}>
                          {isWarming ? 'Aerobic Heat' : 'Stable Ferment'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BunkerTwinPage;
