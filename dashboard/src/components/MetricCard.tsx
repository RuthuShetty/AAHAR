import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: { value: string; isPositive: boolean };
  accent?: 'em' | 'bl' | 'am' | 're';
  icon?: React.ReactNode;
  badge?: { text: string; variant: 'em' | 'bl' | 'am' | 're' | 'gr' };
}

const ArrowUpIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', flexShrink: 0 }}>
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
);

const ArrowDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', flexShrink: 0 }}>
    <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
  </svg>
);

export function MetricCard({ title, value, subtitle, delta, accent = 'em', icon, badge }: MetricCardProps) {
  return (
    <div className={`kpi-card accent-${accent === 'em' ? 'emerald' : accent === 'bl' ? 'blue' : accent === 'am' ? 'amber' : 'red'}`}>
      <div className="kpi-top">
        <div className="kpi-label">{title}</div>
        {icon && (
          <div className={`kpi-icon-wrap ${accent}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-bottom">
        <div className="kpi-sub">{subtitle}</div>
        {delta && (
          <span className={`kpi-delta ${delta.isPositive ? 'up' : 'down'}`}>
            {delta.isPositive ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {delta.value}
          </span>
        )}
        {badge && !delta && (
          <span className={`chip ${badge.variant}`}>{badge.text}</span>
        )}
      </div>
    </div>
  );
}
