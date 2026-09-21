import React from 'react';
import { NavLink } from 'react-router-dom';
import { useDashboardStore } from '../store/dashboardStore';
import {
  Navigation,
  FileCheck2,
  Layers,
  Building2,
  BrainCircuit,
  Bell,
  X,
  Radio,
  Cpu,
  User,
  Settings,
} from 'lucide-react';

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: { text: string; variant: 'em' | 'am' | 're' | 'bl' };
}

export function Sidebar() {
  const {
    disputes,
    alerts,
    shipments,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useDashboardStore();

  const openDisputesCount = disputes.filter(
    (d) => d.status === 'OPEN' || d.status === 'UNDER_REVIEW'
  ).length;
  const criticalCount = alerts.filter((a) => !a.acknowledged && a.severity === 'CRITICAL').length;
  const inTransitCount = shipments.filter((s) => s.status === 'IN_TRANSIT').length;

  const navItems: NavItem[] = [
    {
      id: 'fleet',
      path: '/fleet',
      label: 'Live Tracking Map',
      icon: <Navigation size={18} />,
      badge: { text: `${inTransitCount} Active`, variant: 'bl' },
    },
    {
      id: 'traceability',
      path: '/traceability',
      label: 'Batch Traceability',
      icon: <FileCheck2 size={18} />,
      badge: openDisputesCount > 0 ? { text: `${openDisputesCount} Disputes`, variant: 'am' } : { text: 'Verified', variant: 'em' },
    },
    {
      id: 'bunker',
      path: '/bunker',
      label: 'Silage Bunker Twin',
      icon: <Layers size={18} />,
      badge: { text: 'Live IoT', variant: 'em' },
    },
    {
      id: 'suppliers',
      path: '/suppliers',
      label: 'Supplier Quality',
      icon: <Building2 size={18} />,
    },
    {
      id: 'models',
      path: '/models',
      label: 'NIR Model Health',
      icon: <BrainCircuit size={18} />,
      badge: { text: '8 Models', variant: 'bl' },
    },
    {
      id: 'alerts',
      path: '/alerts',
      label: 'Alert Console',
      icon: <Bell size={18} />,
      badge: criticalCount > 0 ? { text: `${criticalCount} Critical`, variant: 're' } : undefined,
    },
  ];

  const systemNavItems: NavItem[] = [
    {
      id: 'profile',
      path: '/profile',
      label: 'Inspector Profile',
      icon: <User size={18} />,
      badge: { text: 'Auditor', variant: 'em' },
    },
    {
      id: 'settings',
      path: '/settings',
      label: 'System Settings',
      icon: <Settings size={18} />,
      badge: { text: 'Live', variant: 'bl' },
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={`mobile-backdrop${mobileMenuOpen ? ' active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside className={`sidebar${mobileMenuOpen ? ' mobile-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Radio size={22} color="var(--emerald-600)" />
          </div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">AAHAR</div>
            <div className="sidebar-brand-sub">FPO Intelligence</div>
          </div>
          {mobileMenuOpen && (
            <button
              className="icon-btn"
              style={{ marginLeft: 'auto' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">Fleet & Traceability</div>
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
              title={item.label}
            >
              <div className="nav-item-left">
                <span className="nav-item-icon">
                  {item.icon}
                </span>
                <span className="nav-item-label">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`chip chip-sm ${item.badge.variant}`} style={{ fontSize: '0.62rem', padding: '2px 7px' }}>
                  {item.badge.text}
                </span>
              )}
            </NavLink>
          ))}

          <div className="nav-section-label" style={{ marginTop: '16px' }}>System & Account</div>
          {systemNavItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
              title={item.label}
            >
              <div className="nav-item-left">
                <span className="nav-item-icon">
                  {item.icon}
                </span>
                <span className="nav-item-label">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`chip chip-sm ${item.badge.variant}`} style={{ fontSize: '0.62rem', padding: '2px 7px' }}>
                  {item.badge.text}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="status-dot-row">
            <div className="status-dot online" />
            <span className="status-label">Cloud Core Online</span>
            <span className="status-latency">14ms</span>
          </div>
          <div className="footer-org">
            <strong>Anand District Union</strong><br />
            Zone 4 - Charotar Milk Shed
          </div>
          <div className="footer-version">
            <span>Schema v3.0</span>
            <span>·</span>
            <span>NIR v1.2.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
