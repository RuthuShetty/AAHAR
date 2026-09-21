import React, { useState } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Smartphone,
  KeyRound,
  Clock,
  Building2,
  MapPin,
  Save,
  Radio,
  Activity,
  Layers,
  FileCheck2,
  AlertTriangle,
  Award,
} from 'lucide-react';

export function ProfilePage() {
  const {
    userProfile,
    updateUserProfile,
    batches,
    disputes,
    alerts,
    scanners,
  } = useDashboardStore();

  const [formData, setFormData] = useState({
    fullName: userProfile.fullName,
    designation: userProfile.designation,
    department: userProfile.department,
    email: userProfile.email,
    phone: userProfile.phone,
    organization: userProfile.organization,
    fpoCode: userProfile.fpoCode,
    district: userProfile.district,
    zone: userProfile.zone,
  });

  const [savedTime, setSavedTime] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(formData);
    const nowStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setSavedTime(nowStr);
    setTimeout(() => setSavedTime(null), 4000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
  };

  const activeScannersCount = scanners.filter((s) => s.is_online).length;
  const openDisputesCount = disputes.filter((d) => d.status === 'OPEN' || d.status === 'UNDER_REVIEW').length;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div className="eyebrow">Account & Security</div>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Inspector Profile & Scanner Tokens</h1>
            <p className="page-subtitle">
              Verified FPO Quality Auditor credentials, assigned AAHAR Micro-NIR hardware units, and live cryptographic session state.
            </p>
          </div>
          <div className="page-actions">
            <span className="chip em">
              <ShieldCheck size={13} />
              NDDB & NABL Accredited
            </span>
            <span className="chip bl">Role: Senior Auditor</span>
          </div>
        </div>
      </div>

      {/* Hero Card */}
      <div className="profile-hero">
        <div className="profile-hero-left">
          <div className="profile-avatar-lg">
            {getInitials(formData.fullName || userProfile.fullName)}
          </div>
          <div>
            <div className="profile-hero-title">
              <span>{userProfile.fullName}</span>
              <span className="chip chip-sm em" style={{ padding: '2px 7px' }}>
                <CheckCircle2 size={11} />
                Active Officer
              </span>
            </div>
            <div className="profile-hero-subtitle">
              {userProfile.designation} · {userProfile.department}
            </div>
            <div className="profile-meta-chips">
              <span className="chip chip-sm sl">
                <Building2 size={11} />
                {userProfile.organization}
              </span>
              <span className="chip chip-sm sl">
                <MapPin size={11} />
                {userProfile.district}, {userProfile.zone}
              </span>
              <span className="chip chip-sm bl">
                ID: {userProfile.fpoCode}
              </span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
            Active Cryptographic Session
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
            {userProfile.sessionId}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--emerald-600)', marginTop: '3px' }}>
            Ed25519 Token Verified
          </div>
        </div>
      </div>

      {/* Real-time Activity KPIs (Live from active store state) */}
      <div className="kpi-grid mb-5">
        <div className="diag-card">
          <div className="diag-card-header">
            <span className="diag-card-title">Audited Batches</span>
            <FileCheck2 size={15} color="var(--blue-600)" />
          </div>
          <div className="diag-card-val">{batches.length}</div>
          <div className="diag-card-foot">
            <span className="chip-dot" />
            Live verified ledger items
          </div>
        </div>

        <div className="diag-card">
          <div className="diag-card-header">
            <span className="diag-card-title">Active Disputes</span>
            <AlertTriangle size={15} color={openDisputesCount > 0 ? 'var(--amber-600)' : 'var(--emerald-600)'} />
          </div>
          <div className="diag-card-val">{openDisputesCount}</div>
          <div className="diag-card-foot">
            {openDisputesCount > 0 ? `${openDisputesCount} require FPO arbitration` : 'No open arbitration cases'}
          </div>
        </div>

        <div className="diag-card">
          <div className="diag-card-header">
            <span className="diag-card-title">Paired Scanners</span>
            <Smartphone size={15} color="var(--emerald-600)" />
          </div>
          <div className="diag-card-val">{userProfile.assignedScanners.length}</div>
          <div className="diag-card-foot">
            {activeScannersCount} hardware units online
          </div>
        </div>

        <div className="diag-card">
          <div className="diag-card-header">
            <span className="diag-card-title">Processed Alerts</span>
            <Activity size={15} color="var(--slate-600)" />
          </div>
          <div className="diag-card-val">{alerts.length}</div>
          <div className="diag-card-foot">
            {alerts.filter((a) => !a.acknowledged).length} unacknowledged
          </div>
        </div>
      </div>

      {/* Form & Hardware Section */}
      <div className="content-grid cols-2 mb-5">
        {/* Officer Information Form */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-header-left">
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} color="var(--blue-600)" />
                Officer Identification & Contact
              </div>
              <div className="panel-subtitle">Official personnel record registered with the milk union federation</div>
            </div>
            {savedTime && (
              <div className="panel-header-right">
                <span className="chip em" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  <CheckCircle2 size={12} />
                  Saved at {savedTime}
                </span>
              </div>
            )}
          </div>
          <div className="panel-body">
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Designation</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Official Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Co-operative Organization</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">FPO Code</label>
                  <input
                    type="text"
                    className="form-input form-input-mono"
                    value={formData.fpoCode}
                    onChange={(e) => setFormData({ ...formData, fpoCode: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">District</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Zone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="submit" className="btn-primary">
                  <Save size={14} />
                  <span>Update Profile Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Assigned NIR Scanners & Hardware Units */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-header-left">
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={16} color="var(--emerald-600)" />
                Assigned NIR Hardware Scanners
              </div>
              <div className="panel-subtitle">Physical spectrometers paired with inspector keycard</div>
            </div>
            <div className="panel-header-right">
              <span className="chip bl">{userProfile.assignedScanners.length} Assigned</span>
            </div>
          </div>
          <div className="panel-body no-pad">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Device ID</th>
                  <th>Hardware Model</th>
                  <th>Calibration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {scanners
                  .filter((s) => userProfile.assignedScanners.includes(s.device_id))
                  .map((scanner) => (
                    <tr key={scanner.device_id}>
                      <td className="td-strong">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Smartphone size={14} color="var(--text-muted)" />
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{scanner.device_id}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{scanner.operator_name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          FW: v{scanner.firmware_version} · {scanner.village}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                          {scanner.last_calibrated_at}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--emerald-600)' }}>
                          Batt: {scanner.battery_pct}% · {scanner.scans_today} scans today
                        </div>
                      </td>
                      <td>
                        <span
                          className={`chip chip-sm ${
                            scanner.is_online ? 'em' : 'sl'
                          }`}
                        >
                          <span className="chip-dot" />
                          {scanner.is_online ? 'ONLINE' : 'STANDBY'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cryptographic Session & RBAC Permissions */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-header-left">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={16} color="var(--slate-700)" />
              Role-Based Access Control (RBAC) & Security Scopes
            </div>
            <div className="panel-subtitle">
              Cryptographically verified capabilities bound to Officer ID {userProfile.id}
            </div>
          </div>
          <div className="panel-header-right">
            <span className="chip em">
              <CheckCircle2 size={12} />
              Session Verified
            </span>
          </div>
        </div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {userProfile.permissions.map((perm) => (
              <div
                key={perm}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--r-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="var(--emerald-600)" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--text-primary)' }}>
                    {perm}
                  </span>
                </div>
                <span className="code-pill">GRANTED</span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              background: 'var(--slate-50)',
              border: '1px solid var(--slate-200)',
              borderRadius: 'var(--r-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <Clock size={14} color="var(--text-muted)" />
              <span>Current Session Started: <strong>{new Date(userProfile.lastLogin).toUTCString()}</strong></span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Token Protocol: Ed25519-SHA512 · FIPS 186-5
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
