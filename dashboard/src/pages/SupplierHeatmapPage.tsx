import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDashboardStore } from '../store/dashboardStore';
import { MetricCard } from '../components/MetricCard';
import {
  Building2,
  Scale,
  TrendingDown,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Search,
  Award,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

/* High-contrast Score ring SVG tailored for Light/White theme */
function ScoreRing({ score }: { score: number }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? '#059669' : score >= 70 ? '#d97706' : '#e11d48';

  return (
    <div style={{ position: 'relative', width: '58px', height: '58px', flexShrink: 0 }}>
      <svg width="58" height="58" viewBox="0 0 58 58" style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track: slate-200 */}
        <circle cx="29" cy="29" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4.5" />
        <circle
          cx="29"
          cy="29"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4.5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.82rem',
          fontWeight: 700,
          color,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {score}
      </div>
    </div>
  );
}

export function SupplierHeatmapPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { suppliers } = useDashboardStore();

  const urlTier = (searchParams.get('tier') as 'ALL' | 'TIER_1' | 'TIER_2' | 'FLAGGED') || 'ALL';
  const [filterRating, setFilterRating] = useState<'ALL' | 'TIER_1' | 'TIER_2' | 'FLAGGED'>(urlTier);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'volume' | 'cp' | 'disputes'>('score');

  // Sync state if URL tier param changes
  useEffect(() => {
    const t = searchParams.get('tier') as any;
    if (t && ['ALL', 'TIER_1', 'TIER_2', 'FLAGGED'].includes(t)) {
      setFilterRating(t);
    }
  }, [searchParams]);

  const handleRatingFilter = (tier: 'ALL' | 'TIER_1' | 'TIER_2' | 'FLAGGED') => {
    setFilterRating(tier);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tier === 'ALL') {
        next.delete('tier');
      } else {
        next.set('tier', tier);
      }
      return next;
    }, { replace: true });
  };

  const flaggedCount = suppliers.filter((s) => s.rating === 'FLAGGED').length;
  const tier1Count = suppliers.filter((s) => s.rating === 'TIER_1').length;
  const tier2Count = suppliers.filter((s) => s.rating === 'TIER_2').length;
  const avgScore = (suppliers.reduce((a, s) => a + s.quality_score, 0) / suppliers.length).toFixed(0);
  const totalTonnes = suppliers.reduce((a, s) => a + s.tonnes_supplied, 0);

  const tierChip = (rating: string) => {
    if (rating === 'TIER_1') {
      return (
        <span className="chip em" style={{ fontSize: '0.66rem', padding: '2px 8px' }}>
          <span className="chip-dot" />
          TIER 1 EXEMPLARY
        </span>
      );
    }
    if (rating === 'TIER_2') {
      return (
        <span className="chip am" style={{ fontSize: '0.66rem', padding: '2px 8px' }}>
          <span className="chip-dot" />
          TIER 2 MONITORED
        </span>
      );
    }
    if (rating === 'FLAGGED') {
      return (
        <span className="chip re" style={{ fontSize: '0.66rem', padding: '2px 8px' }}>
          <span className="chip-dot" />
          FLAGGED RISK
        </span>
      );
    }
    return <span className="chip sl">{rating}</span>;
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter((s) => {
        if (filterRating !== 'ALL' && s.rating !== filterRating) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            s.name.toLowerCase().includes(q) ||
            s.district.toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'score') return b.quality_score - a.quality_score;
        if (sortBy === 'volume') return b.tonnes_supplied - a.tonnes_supplied;
        if (sortBy === 'cp') return b.avg_cp_deviation_pct - a.avg_cp_deviation_pct;
        if (sortBy === 'disputes') return b.disputes_lost - a.disputes_lost;
        return 0;
      });
  }, [suppliers, filterRating, searchQuery, sortBy]);

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header">
        <div className="eyebrow">Analytics & Procurement Assurance</div>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Supplier Quality Scorecards</h1>
            <p className="page-subtitle">
              Cross-district mill benchmark by farmer NIR test verification, CP accuracy, adulteration incident rate, and FPO dispute arbitration.
            </p>
          </div>
          <div className="page-actions">
            <span className="chip bl">ISO/IEC 17025 Standards</span>
            <span className="chip em">
              <span className="chip-dot" />
              Amul Union Audited
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid mb-5">
        <MetricCard
          accent="bl"
          title="Monitored Mills"
          value={`${suppliers.length} Feed Mills`}
          subtitle="Active suppliers across Gujarat"
          icon={<Building2 size={16} />}
          badge={{ text: 'Active Audit', variant: 'bl' }}
        />
        <MetricCard
          accent="em"
          title="Verified Volume"
          value={`${totalTonnes.toLocaleString()} T`}
          subtitle="Feed & concentrate lots"
          icon={<Scale size={16} />}
          delta={{ value: '+420 T this month', isPositive: true }}
        />
        <MetricCard
          accent="em"
          title="Mean CP Deviation"
          value="-1.6%"
          subtitle="Measured vs mill declaration"
          icon={<TrendingDown size={16} />}
          delta={{ value: 'Within 5% tolerance', isPositive: true }}
        />
        <MetricCard
          accent="re"
          title="Flagged High-Risk Mills"
          value={`${flaggedCount} Mill`}
          subtitle="Adulteration / Dispute rate"
          icon={<AlertTriangle size={16} />}
          badge={{
            text: flaggedCount > 0 ? `${flaggedCount} Under Sanction` : 'All Clear',
            variant: flaggedCount > 0 ? 're' : 'em',
          }}
        />
      </div>

      {/* Filter & Search Bar */}
      <div
        className="glass-panel mb-5"
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Tier Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            className={`btn-secondary ${filterRating === 'ALL' ? 'active' : ''}`}
            style={{
              padding: '5px 12px',
              fontSize: '0.74rem',
              background: filterRating === 'ALL' ? 'var(--blue-50)' : undefined,
              borderColor: filterRating === 'ALL' ? 'var(--blue-400)' : undefined,
              color: filterRating === 'ALL' ? 'var(--blue-600)' : undefined,
            }}
            onClick={() => handleRatingFilter('ALL')}
          >
            All Mills ({suppliers.length})
          </button>
          <button
            className={`btn-secondary ${filterRating === 'TIER_1' ? 'active' : ''}`}
            style={{
              padding: '5px 12px',
              fontSize: '0.74rem',
              background: filterRating === 'TIER_1' ? 'var(--emerald-50)' : undefined,
              borderColor: filterRating === 'TIER_1' ? 'var(--emerald-400)' : undefined,
              color: filterRating === 'TIER_1' ? 'var(--emerald-700)' : undefined,
            }}
            onClick={() => handleRatingFilter('TIER_1')}
          >
            Tier 1 Exemplary ({tier1Count})
          </button>
          <button
            className={`btn-secondary ${filterRating === 'TIER_2' ? 'active' : ''}`}
            style={{
              padding: '5px 12px',
              fontSize: '0.74rem',
              background: filterRating === 'TIER_2' ? 'var(--amber-50)' : undefined,
              borderColor: filterRating === 'TIER_2' ? 'var(--amber-400)' : undefined,
              color: filterRating === 'TIER_2' ? 'var(--amber-700)' : undefined,
            }}
            onClick={() => handleRatingFilter('TIER_2')}
          >
            Tier 2 Monitored ({tier2Count})
          </button>
          <button
            className={`btn-secondary ${filterRating === 'FLAGGED' ? 'active' : ''}`}
            style={{
              padding: '5px 12px',
              fontSize: '0.74rem',
              background: filterRating === 'FLAGGED' ? 'var(--rose-50)' : undefined,
              borderColor: filterRating === 'FLAGGED' ? 'var(--rose-400)' : undefined,
              color: filterRating === 'FLAGGED' ? 'var(--rose-700)' : undefined,
            }}
            onClick={() => handleRatingFilter('FLAGGED')}
          >
            Flagged Risk ({flaggedCount})
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '30px', fontSize: '0.74rem', paddingBlock: '5px' }}
              placeholder="Filter by mill or district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="form-input"
            style={{ width: 'auto', paddingBlock: '5px', fontSize: '0.74rem' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="score">Sort: Quality Score</option>
            <option value="volume">Sort: Volume Supplied</option>
            <option value="cp">Sort: CP Accuracy</option>
            <option value="disputes">Sort: Disputes Lost</option>
          </select>
        </div>
      </div>

      {/* Supplier Scorecards Grid */}
      <div className="glass-panel mb-5">
        <div className="panel-header">
          <div className="panel-header-left">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={16} color="var(--blue-600)" />
              Supplier Quality Matrix & Scorecards
            </div>
            <div className="panel-subtitle">
              Ranked by composite quality score · Mean score: {avgScore}/100 across federation
            </div>
          </div>
          <div className="panel-header-right">
            <span className="chip bl">{filteredSuppliers.length} Shown</span>
          </div>
        </div>
        <div className="panel-body">
          <div className="supplier-grid">
            {filteredSuppliers.map((supp) => {
              const cpColor =
                supp.avg_cp_deviation_pct >= 0
                  ? 'var(--emerald-600)'
                  : supp.avg_cp_deviation_pct > -5
                  ? 'var(--amber-600)'
                  : 'var(--rose-600)';
              const adulColor =
                supp.adulteration_rate_pct === 0 ? 'var(--emerald-600)' : 'var(--rose-600)';

              return (
                <div key={supp.id} className="supplier-card">
                  <div>
                    {/* Top row with ScoreRing and Meta */}
                    <div className="supplier-card-header">
                      <ScoreRing score={supp.quality_score} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="supplier-card-name">{supp.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <MapPin size={12} />
                          <span>{supp.district}, Gujarat</span>
                          <span>·</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{supp.id}</span>
                        </div>
                        <div style={{ marginTop: '6px' }}>{tierChip(supp.rating)}</div>
                      </div>
                    </div>

                    {/* Stats 2x2 Grid */}
                    <div className="supplier-stat-grid">
                      <div className="supplier-stat-item">
                        <span className="supplier-stat-label">Volume Supplied</span>
                        <span className="supplier-stat-val">{supp.tonnes_supplied.toLocaleString()} Tonnes</span>
                      </div>
                      <div className="supplier-stat-item">
                        <span className="supplier-stat-label">NIR Tests Run</span>
                        <span className="supplier-stat-val">{supp.tests_performed} Tests</span>
                      </div>
                      <div className="supplier-stat-item">
                        <span className="supplier-stat-label">Mean CP Deviation</span>
                        <span className="supplier-stat-val" style={{ color: cpColor }}>
                          {supp.avg_cp_deviation_pct > 0
                            ? `+${supp.avg_cp_deviation_pct}%`
                            : `${supp.avg_cp_deviation_pct}%`}
                        </span>
                      </div>
                      <div className="supplier-stat-item">
                        <span className="supplier-stat-label">Adulteration Rate</span>
                        <span className="supplier-stat-val" style={{ color: adulColor }}>
                          {supp.adulteration_rate_pct}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Dispute & Status Row */}
                  <div>
                    <div className="supplier-dispute-row">
                      <span>FPO Disputes</span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          color: supp.disputes_lost > 0 ? 'var(--rose-600)' : 'var(--emerald-600)',
                        }}
                      >
                        {supp.disputes_lost} lost / {supp.dispute_count} filed
                      </span>
                    </div>

                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Batches: <strong>{supp.batches_count}</strong>
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          color:
                            supp.rating === 'TIER_1'
                              ? 'var(--emerald-600)'
                              : supp.rating === 'TIER_2'
                              ? 'var(--amber-600)'
                              : 'var(--rose-600)',
                        }}
                      >
                        {supp.rating === 'TIER_1'
                          ? 'Fast-Track Clearance'
                          : supp.rating === 'TIER_2'
                          ? '20% Lot Sampling'
                          : 'Quarantine Mandatory'}
                      </span>
                    </div>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', marginTop: '10px', fontSize: '0.72rem', padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      onClick={() => navigate('/traceability')}
                      title={`Inspect feed batches from ${supp.name}`}
                    >
                      <span>Inspect Audited Batches</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full Benchmark Table */}
      <div className="glass-panel mb-5">
        <div className="panel-header">
          <div className="panel-header-left">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="var(--slate-700)" />
              Full Supplier Quality Audit Register
            </div>
            <div className="panel-subtitle">
              Comprehensive audit metrics across all feed mills delivering concentrate to the Anand milk shed
            </div>
          </div>
          <div className="panel-header-right">
            <span className="chip bl">Audited Batches</span>
          </div>
        </div>
        <div className="panel-body no-pad" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Manufacturer / Mill</th>
                <th>District</th>
                <th>Volume</th>
                <th>Batches</th>
                <th>NIR Tests</th>
                <th>Avg CP Δ</th>
                <th>Adulteration</th>
                <th>Disputes Lost</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supp) => {
                const cpColor =
                  supp.avg_cp_deviation_pct >= 0
                    ? 'var(--emerald-600)'
                    : supp.avg_cp_deviation_pct > -5
                    ? 'var(--amber-600)'
                    : 'var(--rose-600)';
                const adulColor =
                  supp.adulteration_rate_pct === 0 ? 'var(--emerald-600)' : 'var(--rose-600)';

                return (
                  <tr key={supp.id}>
                    <td className="td-strong">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={15} color="var(--text-muted)" />
                        <div>
                          <div>{supp.name}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {supp.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{supp.district}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{supp.tonnes_supplied}T</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{supp.batches_count}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{supp.tests_performed}</td>
                    <td>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: cpColor }}>
                        {supp.avg_cp_deviation_pct > 0
                          ? `+${supp.avg_cp_deviation_pct}%`
                          : `${supp.avg_cp_deviation_pct}%`}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: adulColor }}>
                        {supp.adulteration_rate_pct}%
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          color: supp.disputes_lost > 0 ? 'var(--rose-600)' : 'var(--emerald-600)',
                        }}
                      >
                        {supp.disputes_lost}/{supp.dispute_count}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.9rem',
                            color:
                              supp.quality_score >= 85
                                ? 'var(--emerald-600)'
                                : supp.quality_score >= 70
                                ? 'var(--amber-600)'
                                : 'var(--rose-600)',
                          }}
                        >
                          {supp.quality_score}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>/100</span>
                      </div>
                    </td>
                    <td>{tierChip(supp.rating)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Procurement Quality Policy Guidelines */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-header-left">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="var(--emerald-600)" />
              FPO Quality Tier Procurement Regulations
            </div>
            <div className="panel-subtitle">Mandatory quality protocol rules established by the Milk Union Committee</div>
          </div>
        </div>
        <div className="supplier-policy-grid">
          <div className="supplier-policy-card">
            <div className="supplier-policy-title">
              <span className="chip-dot" style={{ background: 'var(--emerald-500)' }} />
              Tier 1: Exemplary Status (Score 85–100)
            </div>
            <div className="supplier-policy-desc">
              Automatic fast-track weighbridge entry, priority dispatch schedule, zero dispute deductions, and quarterly quality bonus clearance.
            </div>
          </div>

          <div className="supplier-policy-card">
            <div className="supplier-policy-title">
              <span className="chip-dot" style={{ background: 'var(--amber-500)' }} />
              Tier 2: Monitored Status (Score 70–84)
            </div>
            <div className="supplier-policy-desc">
              Mandatory random 20% lot sampling with handheld Micro-NIR scanner, 10-day payment escrow hold pending NIR verification.
            </div>
          </div>

          <div className="supplier-policy-card">
            <div className="supplier-policy-title">
              <span className="chip-dot" style={{ background: 'var(--rose-500)' }} />
              Flagged Risk: Sanction Status (Score &lt; 70)
            </div>
            <div className="supplier-policy-desc">
              100% consignment quarantine, mandatory wet-chemistry NABL laboratory audit for urea/melamine, FPO blacklist review proceedings.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupplierHeatmapPage;
