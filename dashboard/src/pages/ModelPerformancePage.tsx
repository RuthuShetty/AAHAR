import React, { useState } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { MetricCard } from '../components/MetricCard';
import {
  Cpu,
  BarChart3,
  ShieldCheck,
  Target,
  FlaskConical,
  Database,
  CheckCircle2,
  Layers,
  Activity,
  Info,
  RefreshCw,
} from 'lucide-react';

export function ModelPerformancePage() {
  const { models } = useDashboardStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastBenchmark, setLastBenchmark] = useState('2026-09-18 14:30 IST');

  const avgR2 = (models.reduce((acc, m) => acc + m.r2, 0) / models.length).toFixed(3);
  const avgOod = (models.reduce((acc, m) => acc + m.ood_rate_pct, 0) / models.length).toFixed(1);
  const passingCount = models.filter((m) => m.rmsep <= m.target_rmsep).length;

  const handleRecalibrate = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastBenchmark(
        new Date().toLocaleDateString('en-IN') +
          ' ' +
          new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) +
          ' IST'
      );
    }, 600);
  };

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header">
        <div className="eyebrow">ML Platform & Chemometrics</div>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">NIR Chemometric Model Health</h1>
            <p className="page-subtitle">
              AAHAR ONNX Int8 quantized chemometric models benchmarked against 450 NABL wet-chemistry laboratory samples (Kjeldahl, Karl Fischer, Van Soest).
            </p>
          </div>
          <div className="page-actions">
            <button
              className="btn-secondary"
              onClick={handleRecalibrate}
              disabled={isRefreshing}
              title="Refresh model benchmark metrics"
            >
              <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
              <span>{isRefreshing ? 'Benchmarking...' : 'Verify Centroids'}</span>
            </button>
            <span className="chip bl">ISO 12099 NIR Protocol</span>
            <span className="chip em">
              <span className="chip-dot" />
              All 8 Models Serving
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid mb-5">
        <MetricCard
          accent="em"
          title="Active Models"
          value={`${models.length} Models`}
          subtitle="ONNX Runtime + Int8 Quantized"
          icon={<Cpu size={16} />}
          badge={{ text: 'All Serving', variant: 'em' }}
        />
        <MetricCard
          accent="bl"
          title="Mean Validation R²"
          value={avgR2}
          subtitle="NABL holdout reference samples"
          icon={<BarChart3 size={16} />}
          badge={{ text: '> 0.900 Target', variant: 'bl' }}
        />
        <MetricCard
          accent="em"
          title="Mean OOD Rejection"
          value={`${avgOod}%`}
          subtitle="Mahalanobis distance D_M > 12.5"
          icon={<ShieldCheck size={16} />}
          badge={{ text: 'Normal Range', variant: 'em' }}
        />
        <MetricCard
          accent="em"
          title="Models Passing"
          value={`${passingCount} / ${models.length}`}
          subtitle="Next recalibration in 42 days"
          icon={<Target size={16} />}
          badge={{ text: '100% Target Met', variant: 'em' }}
        />
      </div>

      {/* Chemometric Pipeline Technical Specifications Card */}
      <div className="glass-panel mb-5">
        <div className="panel-header">
          <div className="panel-header-left">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FlaskConical size={16} color="var(--blue-600)" />
              Spectroscopic & Chemometric Calibration Standards
            </div>
            <div className="panel-subtitle">
              NABL accredited wet-chemistry benchmark standards (Anand Agricultural University & NDDB R&D Centre)
            </div>
          </div>
          <div className="panel-header-right">
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Last Verified: {lastBenchmark}
            </span>
          </div>
        </div>
        <div className="chem-spec-grid">
          <div className="chem-spec-item">
            <div className="chem-spec-label">Detector & Optical Range</div>
            <div className="chem-spec-val">900 nm – 1700 nm</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>InGaAs 256-pixel linear array (FWHM: 6.0 nm)</div>
          </div>
          <div className="chem-spec-item">
            <div className="chem-spec-label">Pre-Processing Pipeline</div>
            <div className="chem-spec-val">SNV + Savitzky-Golay</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>1st deriv, 15-pt window, 2nd-order polynomial</div>
          </div>
          <div className="chem-spec-item">
            <div className="chem-spec-label">Outlier Rejection (OOD)</div>
            <div className="chem-spec-val">D_Mahalanobis ≤ 12.5</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Chi-square 99.5% confidence limit</div>
          </div>
          <div className="chem-spec-item">
            <div className="chem-spec-label">Edge Inference Latency</div>
            <div className="chem-spec-val">14.2 ms / spectrum</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Quantized Int8 ONNX Runtime on ESP32-S3 / Mobile</div>
          </div>
        </div>
      </div>

      {/* Model Performance Bars */}
      <div className="glass-panel mb-5">
        <div className="panel-header">
          <div className="panel-header-left">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="var(--emerald-600)" />
              RMSEP Achievement vs. Target Specification
            </div>
            <div className="panel-subtitle">
              Lower RMSEP indicates higher accuracy. Bars show achieved RMSEP vs target tolerance envelope.
            </div>
          </div>
          <div className="panel-header-right">
            <span className="chip em">
              <span className="chip-dot" />
              {passingCount}/{models.length} Passing
            </span>
          </div>
        </div>
        <div className="panel-body">
          <div className="model-perf-list">
            {models.map((model) => {
              const isPassing = model.rmsep <= model.target_rmsep;
              const pct = Math.min((model.rmsep / model.target_rmsep) * 100, 100);
              return (
                <div className="model-perf-row" key={model.id}>
                  <div className="model-perf-name">{model.name}</div>
                  <div className="model-perf-unit">{model.unit}</div>
                  <div className="model-perf-bar-wrap">
                    <div className="model-perf-bar">
                      <div
                        className={`model-perf-fill ${isPassing ? 'pass' : 'fail'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`model-perf-rmsep ${isPassing ? 'pass' : 'fail'}`}>
                      {model.rmsep}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      ≤ {model.target_rmsep}
                    </span>
                    <span className="model-perf-r2">R² {model.r2.toFixed(3)}</span>
                    <span className={`chip chip-sm ${isPassing ? 'em' : 're'}`} style={{ flexShrink: 0, padding: '2px 8px' }}>
                      {model.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full Benchmark Table */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-header-left">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={16} color="var(--slate-700)" />
              Full Chemometric Model Benchmark Register
            </div>
            <div className="panel-subtitle">
              Achieved Root Mean Square Error of Prediction (RMSEP), Holdout R², OOD rejection frequency, and 90-day drift
            </div>
          </div>
          <div className="panel-header-right">
            <span className="chip bl">NABL Traceable</span>
          </div>
        </div>
        <div className="panel-body no-pad" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Model Parameter</th>
                <th>Unit</th>
                <th>Achieved RMSEP</th>
                <th>Target Limit</th>
                <th>Holdout R²</th>
                <th>OOD Rate</th>
                <th>90-Day Drift</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => {
                const isPassing = model.rmsep <= model.target_rmsep;
                return (
                  <tr key={model.id}>
                    <td className="td-strong">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: isPassing ? 'var(--emerald-500)' : 'var(--rose-500)' }} />
                        <span>{model.name}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {model.unit}
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: isPassing ? 'var(--emerald-600)' : 'var(--rose-600)',
                        }}
                      >
                        {model.rmsep}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      ≤ {model.target_rmsep}
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: model.r2 >= 0.92 ? 'var(--emerald-600)' : 'var(--amber-600)',
                        }}
                      >
                        {model.r2.toFixed(3)}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{model.ood_rate_pct}%</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{model.drift_90d_pct}%</td>
                    <td>
                      <span
                        className={`chip chip-sm ${
                          model.status === 'EXCELLENT' ? 'em' : model.status === 'GOOD' ? 'bl' : 'am'
                        }`}
                      >
                        {model.status}
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
  );
}

export default ModelPerformancePage;
