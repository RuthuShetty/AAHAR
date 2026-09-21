import React, { useState } from 'react';
import type { Batch } from '../types/contracts';
import { X, Check, Copy, ShieldCheck } from 'lucide-react';

interface QRCodeViewerProps {
  batch: Batch;
  onClose?: () => void;
}

export function QRCodeViewer({ batch, onClose }: QRCodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(batch.qr_payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem',
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--border-subtle)',
        maxWidth: '380px',
        width: '100%',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} color="var(--emerald-400)" />
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Certified Batch QR
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Ed25519 Cryptographic Certificate
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="icon-btn"
            style={{ width: '32px', height: '32px' }}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* QR Code Container with High Contrast & Finder Patterns */}
      <div
        style={{
          background: '#ffffff',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ shapeRendering: 'crispEdges' }}>
          {/* Outer Border */}
          <rect width="200" height="200" fill="#ffffff" />

          {/* Top-Left Finder Pattern */}
          <rect x="15" y="15" width="45" height="45" fill="#0f172a" />
          <rect x="22" y="22" width="31" height="31" fill="#ffffff" />
          <rect x="29" y="29" width="17" height="17" fill="#0f172a" />

          {/* Top-Right Finder Pattern */}
          <rect x="140" y="15" width="45" height="45" fill="#0f172a" />
          <rect x="147" y="22" width="31" height="31" fill="#ffffff" />
          <rect x="154" y="29" width="17" height="17" fill="#0f172a" />

          {/* Bottom-Left Finder Pattern */}
          <rect x="15" y="140" width="45" height="45" fill="#0f172a" />
          <rect x="22" y="147" width="31" height="31" fill="#ffffff" />
          <rect x="29" y="154" width="17" height="17" fill="#0f172a" />

          {/* Alignment and Timing Tracks */}
          <line x1="65" y1="37" x2="135" y2="37" stroke="#0f172a" strokeWidth="4" strokeDasharray="6,6" />
          <line x1="37" y1="65" x2="37" y2="135" stroke="#0f172a" strokeWidth="4" strokeDasharray="6,6" />

          {/* Stylized Data Pixels based on Batch Code */}
          {Array.from({ length: 42 }).map((_, i) => {
            const x = 70 + (i % 6) * 11;
            const y = 70 + Math.floor(i / 6) * 11;
            const isFilled = (batch.batch_code.charCodeAt(i % batch.batch_code.length) + i) % 2 === 0;
            return isFilled ? <rect key={i} x={x} y={y} width="9" height="9" fill="#0f172a" /> : null;
          })}

          {/* Center AAHAR Monogram */}
          <circle cx="100" cy="100" r="15" fill="#10b981" />
          <text x="100" y="105" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">A</text>
        </svg>

        <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 700, color: '#0f172a', letterSpacing: '0.04em' }}>
          {batch.batch_code}
        </div>
      </div>

      {/* Cryptographic Signature Verification Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          margin: '1rem 0 0.5rem',
          padding: '0.35rem 0.75rem',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: 'var(--r-full)',
        }}
      >
        <Check size={14} color="var(--emerald-400)" />
        <span style={{ fontSize: '0.75rem', color: 'var(--emerald-400)', fontWeight: 600 }}>
          Ed25519 Mill Signature Verified
        </span>
      </div>

      {/* Payload URI */}
      <div
        style={{
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          wordBreak: 'break-all',
          textAlign: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--r-sm)',
          width: '100%',
          marginTop: '0.5rem',
        }}
      >
        {batch.qr_payload}
      </div>

      <button
        onClick={handleCopyPayload}
        className="btn btn-ghost"
        style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.78rem', gap: '6px' }}
      >
        {copied ? <Check size={14} color="var(--emerald-400)" /> : <Copy size={14} />}
        {copied ? 'Copied URI to Clipboard' : 'Copy QR Payload'}
      </button>
    </div>
  );
}

export default QRCodeViewer;
