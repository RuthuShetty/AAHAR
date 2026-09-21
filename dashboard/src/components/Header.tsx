import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDashboardStore } from '../store/dashboardStore';
import {
  Search,
  Bell,
  Settings,
  Menu,
  X,
  Truck,
  ShieldCheck,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';

const PAGE_META: Record<string, { title: string; eyebrow: string; subtitle: string }> = {
  fleet: {
    eyebrow: 'Live Telemetry',
    title: 'Fleet & Consignment Tracking Center',
    subtitle: 'Real-time GPS route corridors, animated transit pulses, sensor telemetry, and waypoint steppers.',
  },
  traceability: {
    eyebrow: 'Phase 7',
    title: 'Batch Traceability & Dispute Desk',
    subtitle: 'NIR-verified feed mill batch registry with Ed25519-signed QR certificates and FPO arbitration.',
  },
  bunker: {
    eyebrow: 'Phase 6',
    title: '3D Silage Bunker Digital Twin',
    subtitle: 'Real-time aerobic spoilage forecast with ESP32-C6 LoRaWAN probe telemetry and 4-depth thermistor heatmap.',
  },
  suppliers: {
    eyebrow: 'Analytics',
    title: 'Supplier Quality Scorecards',
    subtitle: 'Feed mill and forage supplier rankings by CP accuracy, adulteration incidents, and dispute outcomes.',
  },
  models: {
    eyebrow: 'ML Platform',
    title: 'NIR Chemometric Model Health',
    subtitle: 'AAHAR ONNX model RMSEP targets, validation R2, Mahalanobis OOD rates - NABL wet-chemistry benchmarked.',
  },
  alerts: {
    eyebrow: 'Monitoring',
    title: 'Real-time Alert Console',
    subtitle: 'WebSocket-streamed quality and telemetry alerts from the cloud core with triage and acknowledge controls.',
  },
  profile: {
    eyebrow: 'Account & Security',
    title: 'Inspector Profile & Hardware Tokens',
    subtitle: 'FPO Quality Officer credentials, assigned AAHAR NIR field spectrometers, cryptographic session telemetry.',
  },
  settings: {
    eyebrow: 'System Configuration',
    title: 'Platform Settings & Diagnostics',
    subtitle: 'Cloud Core connection status, real-time latency ping, alert thresholds, and runtime browser telemetry.',
  },
};

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    alerts,
    searchQuery,
    setSearchQuery,
    mobileMenuOpen,
    setMobileMenuOpen,
    shipments,
    userProfile,
  } = useDashboardStore();

  const currentTab = location.pathname.replace(/^\//, '').split('/')[0] || 'fleet';
  const unread = alerts.filter((a) => !a.acknowledged);
  const criticalCount = unread.filter((a) => a.severity === 'CRITICAL').length;
  const inTransitCount = shipments.filter((s) => s.status === 'IN_TRANSIT').length;

  const meta = PAGE_META[currentTab] ?? PAGE_META['fleet'];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
  };

  return (
    <header className="top-header">
      <div className="header-left">
        {/* Mobile Hamburger Menu */}
        <button
          className="mobile-menu-trigger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
          title="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div>
          <div className="header-breadcrumb">
            <span
              onClick={() => navigate('/fleet')}
              style={{ cursor: 'pointer' }}
              title="Return to Fleet Tracking"
            >
              AAHAR Cloud
            </span>
            <span className="header-breadcrumb-sep">/</span>
            <span
              onClick={() => navigate('/' + currentTab)}
              style={{ cursor: 'pointer' }}
              title={`View ${meta.eyebrow}`}
            >
              {meta.eyebrow}
            </span>
            <span className="header-breadcrumb-sep">/</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {meta.title.split(' ')[0]} {meta.title.split(' ')[1]}
            </span>
          </div>
          <div className="header-title">{meta.title}</div>
        </div>
      </div>

      <div className="header-right">
        {/* Active Fleet Indicator Pill */}
        <div
          className="map-glass-badge header-tracking-badge"
          style={{ cursor: 'pointer', padding: '5px 12px' }}
          onClick={() => navigate('/fleet')}
          title="Live Fleet Status"
        >
          <span className="status-dot online" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
            {inTransitCount} IN-TRANSIT
          </span>
          <span className="header-sla-sep" style={{ color: 'var(--text-muted)' }}>|</span>
          <span className="header-sla-text" style={{ color: 'var(--emerald-600)', fontSize: '0.72rem' }}>99.2% SLA</span>
        </div>

        {/* Search */}
        <div className="header-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Track TRK-9021, batch, or plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                const q = searchQuery.trim().toUpperCase();
                if (q.startsWith('TRK') || q.startsWith('GJ')) {
                  navigate(`/fleet?shipment=${q}`);
                } else if (q.startsWith('AMUL') || q.startsWith('GAC')) {
                  navigate(`/traceability?tab=catalog`);
                }
              }
            }}
          />
        </div>

        {/* Notifications Bell */}
        <button
          className={`icon-btn${currentTab === 'alerts' ? ' active' : ''}`}
          title={`${unread.length} unread alerts`}
          onClick={() => navigate('/alerts')}
        >
          <Bell size={18} />
          {criticalCount > 0 && (
            <span className="badge-dot">{criticalCount}</span>
          )}
        </button>

        {/* Settings Quick Action Button */}
        <button
          className={`icon-btn${currentTab === 'settings' ? ' active' : ''}`}
          title="System Settings & Diagnostics"
          onClick={() => navigate('/settings')}
        >
          <Settings size={18} />
        </button>

        {/* FPO Org Badge */}
        <div className="header-fpo-badge" title="Anand District Union · Zone 4">
          <ShieldCheck size={16} color="var(--emerald-600)" />
          <span>Amul FPO #04</span>
        </div>

        {/* Avatar -> Profile Link */}
        <div
          className={`avatar${currentTab === 'profile' ? ' active' : ''}`}
          title={`Inspector Profile (${userProfile?.fullName || 'Auditor'})`}
          onClick={() => navigate('/profile')}
          style={{ cursor: 'pointer' }}
        >
          {getInitials(userProfile?.fullName || 'Rajesh Patel')}
        </div>
      </div>
    </header>
  );
}

export default Header;
