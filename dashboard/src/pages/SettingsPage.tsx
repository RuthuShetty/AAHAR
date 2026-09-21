import React, { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { checkBackendHealth, BackendHealthTelemetry, getBaseUrl } from '../api/client';
import {
  Settings,
  Server,
  Activity,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  KeyRound,
  Copy,
  RotateCcw,
  Download,
  Trash2,
  Clock,
  Laptop,
  Database,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';

export function SettingsPage() {
  const {
    systemSettings,
    updateSystemSettings,
    generateApiKey,
    resetSettingsToDefault,
  } = useDashboardStore();

  // Backend Health Ping Telemetry
  const [healthData, setHealthData] = useState<BackendHealthTelemetry | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [pingHistory, setPingHistory] = useState<number[]>([]);
  const [autoPingInterval, setAutoPingInterval] = useState<number>(10); // seconds, 0 = off

  // Connection Test Console
  const [testUrl, setTestUrl] = useState(systemSettings.apiBaseUrl);
  const [testResult, setTestResult] = useState<{
    status: number;
    latency: number;
    payload: string;
    timestamp: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // API Key Visibility & Copy
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Storage Stats
  const [storageBytes, setStorageBytes] = useState<number>(0);
  const [storageKeysCount, setStorageKeysCount] = useState<number>(0);

  // Browser Telemetry
  const [clientTelemetry, setClientTelemetry] = useState<{
    cores: number;
    memory: string;
    screen: string;
    viewport: string;
    online: boolean;
    networkType: string;
    timezone: string;
    language: string;
  }>({
    cores: 4,
    memory: 'N/A',
    screen: '',
    viewport: '',
    online: true,
    networkType: 'Broadband',
    timezone: '',
    language: '',
  });

  // Calculate local storage size
  const updateStorageStats = () => {
    if (typeof window === 'undefined') return;
    try {
      let total = 0;
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          total += key.length + val.length;
          count++;
        }
      }
      setStorageBytes(total);
      setStorageKeysCount(count);
    } catch {
      setStorageBytes(0);
    }
  };

  // Inspect real client environment
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const nav = window.navigator as any;
      const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
      setClientTelemetry({
        cores: nav.hardwareConcurrency || 4,
        memory: nav.deviceMemory ? `${nav.deviceMemory} GB` : 'Standard (~8 GB)',
        screen: `${window.screen.width} × ${window.screen.height} (${window.devicePixelRatio}x DPR)`,
        viewport: `${window.innerWidth} × ${window.innerHeight}`,
        online: nav.onLine,
        networkType: conn?.effectiveType ? `${conn.effectiveType.toUpperCase()} (${conn.downlink || '—'} Mbps)` : 'Direct Ethernet / Localhost',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        language: nav.language || 'en-IN',
      });
      updateStorageStats();
    }
  }, []);

  // Ping backend
  const handlePing = async () => {
    setIsPinging(true);
    try {
      const result = await checkBackendHealth();
      setHealthData(result);
      if (result.latencyMs > 0) {
        setPingHistory((prev) => [...prev.slice(-9), result.latencyMs]);
      }
    } finally {
      setIsPinging(false);
    }
  };

  // Initial ping
  useEffect(() => {
    handlePing();
  }, []);

  // Auto-ping timer
  useEffect(() => {
    if (autoPingInterval <= 0) return;
    const interval = setInterval(() => {
      handlePing();
    }, autoPingInterval * 1000);
    return () => clearInterval(interval);
  }, [autoPingInterval]);

  // Test custom connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    const start = performance.now();
    try {
      const cleanUrl = testUrl.trim().replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/health`);
      const latency = Math.round(performance.now() - start);
      const json = await res.json();
      setTestResult({
        status: res.status,
        latency,
        payload: JSON.stringify(json, null, 2),
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      setTestResult({
        status: 0,
        latency,
        payload: JSON.stringify({ error: err?.message || 'Connection failed' }, null, 2),
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveApiUrl = () => {
    updateSystemSettings({ apiBaseUrl: testUrl });
    handlePing();
    updateStorageStats();
  };

  const handleCopyKey = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(systemSettings.apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleExportConfig = () => {
    const config = {
      systemSettings,
      clientTelemetry,
      exportedAt: new Date().toISOString(),
      storageInfo: { bytes: storageBytes, keys: storageKeysCount },
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aahar-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearCache = () => {
    if (typeof window !== 'undefined') {
      const profile = localStorage.getItem('aahar_user_profile');
      const settings = localStorage.getItem('aahar_system_settings');
      localStorage.clear();
      if (profile) localStorage.setItem('aahar_user_profile', profile);
      if (settings) localStorage.setItem('aahar_system_settings', settings);
      updateStorageStats();
    }
  };

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header">
        <div className="eyebrow">System Configuration</div>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Platform Settings & Diagnostics</h1>
            <p className="page-subtitle">
              Live FastAPI Cloud Core health telemetry, operational quality thresholds, cryptographic device pairing, and client hardware diagnostics.
            </p>
          </div>
          <div className="page-actions">
            <button
              className="btn-secondary"
              onClick={handlePing}
              disabled={isPinging}
              title="Ping backend now"
            >
              <RefreshCw size={14} className={isPinging ? 'spin' : ''} />
              <span>{isPinging ? 'Pinging Core...' : 'Ping Core Now'}</span>
            </button>
            <span className={`chip ${healthData?.online ? 'em' : 're'}`}>
              <span className="chip-dot" />
              {healthData?.online ? `Cloud Core Online · ${healthData.latencyMs}ms` : 'Cloud Core Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Health Diagnostics Cards */}
      <div className="kpi-grid mb-5">
        <div className="diag-card">
          <div className="diag-card-header">
            <span className="diag-card-title">Backend Status</span>
            <Server size={15} color={healthData?.online ? 'var(--emerald-600)' : 'var(--rose-600)'} />
          </div>
          <div className="diag-card-val" style={{ color: healthData?.online ? 'var(--emerald-600)' : 'var(--rose-600)' }}>
            {healthData?.online ? 'HEALTHY 200' : 'UNREACHABLE'}
          </div>
          <div className="diag-card-foot">
            <span>Service: <strong>{healthData?.service || 'aahar-cloud'}</strong> (v{healthData?.version || '0.1.0'})</span>
          </div>
        </div>

        <div className="diag-card">
          <div className="diag-card-header">
            <span className="diag-card-title">Measured Ping Latency</span>
            <Activity size={15} color="var(--blue-600)" />
          </div>
          <div className="diag-card-val">
            {healthData?.latencyMs ?? 0} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>ms RTT</span>
          </div>
          <div className="diag-card-foot">
            <span>Recent: {pingHistory.length > 0 ? pingHistory.map((p) => `${p}ms`).join(' · ') : 'First probe'}</span>
          </div>
        </div>

        <div className="diag-card">
          <div className="diag-card-header">
            <span className="diag-card-title">Database Engine</span>
            <Database size={15} color="var(--emerald-600)" />
          </div>
          <div className="diag-card-val" style={{ textTransform: 'uppercase' }}>
            {healthData?.database || 'OK'}
          </div>
          <div className="diag-card-foot">
            <span>Schema Version: <strong>v{healthData?.schemaVersion || 3}</strong> (Alembic)</span>
          </div>
        </div>

        <div className="diag-card">
          <div className="diag-card-header">
            <span className="diag-card-title">Client Network</span>
            <Wifi size={15} color="var(--emerald-600)" />
          </div>
          <div className="diag-card-val" style={{ fontSize: '0.95rem' }}>
            {clientTelemetry.online ? 'ONLINE' : 'OFFLINE'}
          </div>
          <div className="diag-card-foot">
            <span>{clientTelemetry.networkType}</span>
          </div>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="settings-grid mb-5">
        {/* Backend API Configuration */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-header-left">
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={16} color="var(--blue-600)" />
                Cloud Core Connection Gateway
              </div>
              <div className="panel-subtitle">API endpoint routing and WebSocket telemetry socket</div>
            </div>
            <div className="panel-header-right">
              <select
                className="form-input"
                style={{ width: 'auto', padding: '3px 8px', fontSize: '0.72rem' }}
                value={autoPingInterval}
                onChange={(e) => setAutoPingInterval(Number(e.target.value))}
              >
                <option value={5}>Auto-Ping: 5s</option>
                <option value={10}>Auto-Ping: 10s</option>
                <option value={30}>Auto-Ping: 30s</option>
                <option value={0}>Auto-Ping: Off</option>
              </select>
            </div>
          </div>
          <div className="panel-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">API Gateway Base URL</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input form-input-mono"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder="/api or http://localhost:8000"
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                  >
                    {isTesting ? 'Testing...' : 'Test'}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSaveApiUrl}
                  >
                    Save
                  </button>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Default is <code className="code-pill">/api</code> which Vite dev server proxies to <code className="code-pill">http://localhost:8000</code>.
                </div>
              </div>

              {testResult && (
                <div
                  style={{
                    padding: '10px 12px',
                    background: testResult.status === 200 ? 'var(--emerald-50)' : 'var(--rose-50)',
                    border: `1px solid ${testResult.status === 200 ? 'var(--emerald-200)' : 'var(--rose-200)'}`,
                    borderRadius: 'var(--r-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: testResult.status === 200 ? 'var(--emerald-700)' : 'var(--rose-600)' }}>
                      Response: {testResult.status > 0 ? `HTTP ${testResult.status}` : 'Network Error'} ({testResult.latency}ms)
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{testResult.timestamp}</span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      color: 'var(--slate-800)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {testResult.payload}
                  </pre>
                </div>
              )}

              <div>
                <label className="form-label">WebSocket Alerts Endpoint</label>
                <input
                  type="text"
                  className="form-input form-input-mono"
                  value={systemSettings.wsAlertsUrl}
                  disabled
                />
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Streams real-time probe spikes and threshold excursions from <code className="code-pill">ws://localhost:8000/ws/alerts</code>.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Tolerances & Inspection Parameters */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-header-left">
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={16} color="var(--emerald-600)" />
                Operational Quality Inspection Tolerances
              </div>
              <div className="panel-subtitle">Arbitration thresholds actively enforced across the portal</div>
            </div>
            <div className="panel-header-right">
              <button
                className="btn-secondary"
                style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                onClick={resetSettingsToDefault}
                title="Reset to factory standards"
              >
                <RotateCcw size={12} />
                <span>Defaults</span>
              </button>
            </div>
          </div>
          <div className="panel-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Crude Protein Tolerance (±%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="10.0"
                    className="form-input form-input-mono"
                    value={systemSettings.cpTolerancePct}
                    onChange={(e) => updateSystemSettings({ cpTolerancePct: Number(e.target.value) })}
                  />
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Triggers dispute flag if measured CP falls below declared CP by this margin.
                  </div>
                </div>

                <div>
                  <label className="form-label">Max Moisture Limit (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="5.0"
                    max="25.0"
                    className="form-input form-input-mono"
                    value={systemSettings.moistureWarningPct}
                    onChange={(e) => updateSystemSettings({ moistureWarningPct: Number(e.target.value) })}
                  />
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Warning limit for concentrate feed storage mold risk.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Silage Critical Temp (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="20.0"
                    max="60.0"
                    className="form-input form-input-mono"
                    value={systemSettings.tempThresholdC}
                    onChange={(e) => updateSystemSettings({ tempThresholdC: Number(e.target.value) })}
                  />
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Bunker probe reading above this threshold flags aerobic spoilage front.
                  </div>
                </div>

                <div>
                  <label className="form-label">Mahalanobis Outlier Limit (D_M)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="5.0"
                    max="30.0"
                    className="form-input form-input-mono"
                    value={systemSettings.oodMahalanobisThreshold}
                    onChange={(e) => updateSystemSettings({ oodMahalanobisThreshold: Number(e.target.value) })}
                  />
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Spectra beyond this distance are rejected as out-of-distribution (OOD).
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Client Telemetry Grid */}
      <div className="settings-grid mb-5">
        {/* Device Security & API Key Generator */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-header-left">
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={16} color="var(--slate-700)" />
                Device Security & Cryptographic Access Key
              </div>
              <div className="panel-subtitle">Used to authenticate field micro-spectrometers with cloud core</div>
            </div>
            <div className="panel-header-right">
              <button
                className="btn-secondary"
                style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                onClick={() => generateApiKey()}
                title="Generate new cryptographic key"
              >
                <RefreshCw size={12} />
                <span>Generate Key</span>
              </button>
            </div>
          </div>
          <div className="panel-body">
            <div>
              <label className="form-label">Active Device Key Token (CSPRNG 128-bit)</label>
              <div className="token-box">
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {showApiKey
                    ? systemSettings.apiKey
                    : systemSettings.apiKey.substring(0, 14) + '••••••••••••••••'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ padding: '4px' }}
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? 'Hide Token' : 'Show Token'}
                  >
                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ padding: '4px' }}
                    onClick={handleCopyKey}
                    title="Copy token to clipboard"
                  >
                    {copiedKey ? <Check size={14} color="var(--emerald-600)" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Key generated via <code className="code-pill">window.crypto.getRandomValues</code>. Valid for AAHAR firmware OTA & offline certificate signing.
              </div>
            </div>
          </div>
        </div>

        {/* Real Client & Hardware Telemetry */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-header-left">
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Laptop size={16} color="var(--slate-700)" />
                Client Runtime & Hardware Diagnostics
              </div>
              <div className="panel-subtitle">Real-time browser engine and local device execution telemetry</div>
            </div>
            <div className="panel-header-right">
              <span className="chip em">Verified Runtime</span>
            </div>
          </div>
          <div className="panel-body no-pad">
            <table className="data-table">
              <tbody>
                <tr>
                  <td className="td-strong" style={{ width: '40%' }}>Logical CPU Cores</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{clientTelemetry.cores} Threads</td>
                </tr>
                <tr>
                  <td className="td-strong">Device Memory</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{clientTelemetry.memory}</td>
                </tr>
                <tr>
                  <td className="td-strong">Display Resolution & DPR</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{clientTelemetry.screen}</td>
                </tr>
                <tr>
                  <td className="td-strong">Active Viewport</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{clientTelemetry.viewport}</td>
                </tr>
                <tr>
                  <td className="td-strong">System Timezone</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{clientTelemetry.timezone}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Storage & State Management */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-header-left">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={16} color="var(--slate-700)" />
              Client State & Offline Storage Management
            </div>
            <div className="panel-subtitle">Local storage utilization and platform configuration persistence</div>
          </div>
          <div className="panel-header-right">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Storage Used: {(storageBytes / 1024).toFixed(2)} KB ({storageKeysCount} items)
            </span>
          </div>
        </div>
        <div className="panel-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Export or Reset Platform Configuration
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Download JSON backup of threshold settings, or purge client cache to re-synchronize from Cloud Core.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="btn-secondary" onClick={handleExportConfig}>
                <Download size={14} />
                <span>Export Config JSON</span>
              </button>
              <button className="btn-secondary" onClick={handleClearCache}>
                <Trash2 size={14} />
                <span>Purge Temp Cache</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
