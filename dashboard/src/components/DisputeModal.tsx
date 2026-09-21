import React, { useState } from 'react';
import { useDashboardStore, DisputeRecord } from '../store/dashboardStore';
import { X } from 'lucide-react';

interface DisputeModalProps {
  dispute: DisputeRecord;
  onClose: () => void;
}

export function DisputeModal({ dispute, onClose }: DisputeModalProps) {
  const { updateDisputeStatus } = useDashboardStore();
  const [fpoNote, setFpoNote] = useState(dispute.fpo_note || '');
  const [status, setStatus] = useState<DisputeRecord['status']>(dispute.status);

  const handleSave = () => {
    updateDisputeStatus(dispute.id, status, fpoNote);
    onClose();
  };

  const getStatusBadge = (s: DisputeRecord['status']) => {
    switch (s) {
      case 'OPEN': return <span className="chip re">OPEN DISPUTE</span>;
      case 'UNDER_REVIEW': return <span className="chip am">UNDER REVIEW</span>;
      case 'RESOLVED_VALID': return <span className="chip em">RESOLVED (CLAIM VALID)</span>;
      case 'RESOLVED_INVALID': return <span className="chip bl">RESOLVED (DISMISSED)</span>;
      case 'ESCALATED': return <span className="chip re">ESCALATED TO NABL</span>;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Dispute Case #{dispute.id.slice(-8).toUpperCase()}
              </h2>
              {getStatusBadge(dispute.status)}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Batch Code: <strong style={{ color: '#f8fafc' }}>{dispute.batch_code}</strong> • Filed on {new Date(dispute.created_at).toLocaleString()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
            style={{ width: '36px', height: '36px' }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Farm & Sample Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Complainant Farm</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', marginTop: '0.25rem' }}>{dispute.farm_name}</div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Farm ID: {dispute.farm_id.slice(0, 16)}...</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Feed Mill Supplier</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', marginTop: '0.25rem' }}>{dispute.mill_name}</div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Test Measurement: {dispute.measurement_id.slice(0, 16)}...</div>
          </div>
        </div>

        {/* Deviating Fields Comparison Table */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Nutritional Evidence & Tolerance Breach Audit
          </div>
          <table className="data-table" style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                <th>Nutrient Parameter</th>
                <th>Declared (Mill)</th>
                <th>Measured (Farmer)</th>
                <th>Deviation</th>
                <th>Tolerance Threshold</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {dispute.deviating_fields.map((field, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                    {field.field.replace(/_/g, ' ').toUpperCase()}
                  </td>
                  <td>{field.declared}</td>
                  <td style={{ color: 'var(--rose-400)', fontWeight: 700 }}>{field.measured}</td>
                  <td style={{ color: 'var(--rose-400)' }}>{field.deviation_pct > 0 ? `-${field.deviation_pct}%` : `${field.deviation_pct}%`}</td>
                  <td>±{field.tolerance_used}% allowed</td>
                  <td>
                    <span className="chip re">BREACH</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Status Update & FPO Arbitrator Notes */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Dispute Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}
          >
            <option value="OPEN">OPEN (Awaiting action)</option>
            <option value="UNDER_REVIEW">UNDER REVIEW (Mill sample requested)</option>
            <option value="RESOLVED_VALID">RESOLVED VALID (Credit / Replacement issued to Farmer)</option>
            <option value="RESOLVED_INVALID">RESOLVED INVALID (Measurement within tolerance / Dismissed)</option>
            <option value="ESCALATED">ESCALATED (Referred to NDDB / NABL Reference Laboratory)</option>
          </select>

          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            FPO Union Arbitrator Notes & Audit Log
          </label>
          <textarea
            rows={4}
            value={fpoNote}
            onChange={(e) => setFpoNote(e.target.value)}
            placeholder="Record arbitrator findings, mill communication, credit note numbers, or reference lab shipment IDs..."
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-sans)',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Save Status & Audit Notes
          </button>
        </div>
      </div>
    </div>
  );
}
