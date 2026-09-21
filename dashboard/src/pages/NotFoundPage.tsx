import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  ArrowLeft,
  Navigation,
  FileCheck2,
  Settings,
  ShieldAlert,
} from 'lucide-react';

export function NotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '65vh' }}>
      <div
        className="glass-panel"
        style={{
          maxWidth: '540px',
          width: '100%',
          padding: '32px 28px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--slate-100)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Compass size={28} color="var(--blue-600)" />
        </div>

        <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: '6px' }}>
          Navigation Error
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
          404 — Route Not Found
        </h1>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '18px' }}>
          The path <code className="code-pill">{location.pathname}</code> does not correspond to an active module in the AAHAR FPO Intelligence portal.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '24px',
          }}
        >
          <button className="btn-primary" onClick={() => navigate('/fleet')}>
            <Navigation size={14} />
            <span>Tracking Center</span>
          </button>
          <button className="btn-secondary" onClick={() => navigate('/traceability')}>
            <FileCheck2 size={14} />
            <span>Batch Ledger</span>
          </button>
          <button className="btn-secondary" onClick={() => navigate('/settings')}>
            <Settings size={14} />
            <span>System Settings</span>
          </button>
        </div>

        <div
          style={{
            padding: '10px 14px',
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--r-sm)',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <ShieldAlert size={14} color="var(--amber-600)" />
          <span>FPO Security Protocol: Unregistered URIs are audited and logged in Cloud Core</span>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
