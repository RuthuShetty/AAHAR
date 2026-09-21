import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDashboardStore, DisputeRecord, DeviatingField } from '../store/dashboardStore';
import type { FeedType, Batch } from '../types/contracts';
import { MetricCard } from '../components/MetricCard';
import { QRCodeViewer } from '../components/QRCodeViewer';
import { DisputeModal } from '../components/DisputeModal';
import {
  Package,
  Smartphone,
  Scale,
  ShieldCheck,
  QrCode,
  Search,
  AlertTriangle,
  CheckCircle2,
  Check,
  Zap,
} from 'lucide-react';

export function BatchTraceabilityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    batches,
    selectedBatchId,
    setSelectedBatchId,
    disputes,
    registerBatch,
    evaluateTestAgainstBatch,
    createDispute,
  } = useDashboardStore();

  const currentTabParam = (searchParams.get('tab') as 'catalog' | 'register' | 'farmer_test' | 'disputes') || 'catalog';
  const [activeTab, setActiveTab] = useState<'catalog' | 'register' | 'farmer_test' | 'disputes'>(currentTabParam);
  const [qrModalBatch, setQrModalBatch] = useState<Batch | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<DisputeRecord | null>(null);

  // Sync state if URL query param changes
  useEffect(() => {
    const t = searchParams.get('tab') as any;
    if (t && ['catalog', 'register', 'farmer_test', 'disputes'].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'catalog' | 'register' | 'farmer_test' | 'disputes') => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'catalog') {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      return next;
    }, { replace: true });
  };

  // New Batch Form State
  const [newBatchCode, setNewBatchCode] = useState('AMUL-MS-2026-B109');
  const [newFeedType, setNewFeedType] = useState<FeedType>('MAIZE_SILAGE');
  const [newCp, setNewCp] = useState('8.8');
  const [newMoisture, setNewMoisture] = useState('66.0');
  const [newAdf, setNewAdf] = useState('24.0');
  const [newNdf, setNewNdf] = useState('44.0');
  const [newTonnes, setNewTonnes] = useState('50');

  // Farmer Test Simulator State
  const [simBatchId, setSimBatchId] = useState(batches[1]?.mill_id || batches[0]?.mill_id);
  const [simCp, setSimCp] = useState('20.4');
  const [simMoisture, setSimMoisture] = useState('8.5');
  const [simUrea, setSimUrea] = useState(false);
  const [simSilica, setSimSilica] = useState(false);
  const [simFarmerName, setSimFarmerName] = useState('Mukeshbhai Patel (Kheda)');
  const [evalResult, setEvalResult] = useState<{
    isBreach: boolean;
    deviatingFields: DeviatingField[];
    summary: string;
  } | null>(null);
  const [testDisputeCreated, setTestDisputeCreated] = useState<DisputeRecord | null>(null);

  // Handlers
  const handleRegisterBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const created = registerBatch({
      mill_id: '',
      mill_name: 'Amul Cattle Feed Plant',
      batch_code: newBatchCode,
      feed_type: newFeedType,
      production_date: new Date().toISOString().split('T')[0],
      quantity_tonnes: parseFloat(newTonnes) || 50,
      declared_profile: {
        crude_protein_pct_dm: parseFloat(newCp) || 8.8,
        moisture_pct: parseFloat(newMoisture) || 65.0,
        adf_pct_dm: parseFloat(newAdf) || 24.0,
        ndf_pct_dm: parseFloat(newNdf) || 44.0,
      },
    });
    setQrModalBatch(created);
    handleTabChange('catalog');
  };

  const handleSimulateFarmerTest = () => {
    const result = evaluateTestAgainstBatch(simBatchId, {
      crude_protein_pct_dm: parseFloat(simCp),
      moisture_pct: parseFloat(simMoisture),
      urea_detected: simUrea,
      silica_detected: simSilica,
    });
    setEvalResult(result);
    setTestDisputeCreated(null);
  };

  const handleFileDispute = () => {
    if (!evalResult || !evalResult.isBreach) return;
    const measurementId = '0191ebc2-7b64-7930-9092-' + Math.random().toString(16).substring(2, 14);
    const farmId = '0191ebc2-7b64-7930-9092-f00100000002';
    const dispute = createDispute(
      simBatchId,
      measurementId,
      farmId,
      simFarmerName,
      evalResult.deviatingFields,
      `Automatic dispute generated from farmer scan: ${evalResult.summary}`
    );
    setTestDisputeCreated(dispute);
    handleTabChange('disputes');
  };

  const selectedBatch = batches.find((b) => b.mill_id === selectedBatchId) || batches[0];

  return (
    <div className="page-wrapper">
      {/* Top Metrics Banner */}
      <div className="kpi-grid" style={{ marginBottom: '1.75rem' }}>
        <MetricCard
          title="Tracked Batches"
          value={batches.length}
          subtitle="Signed with Ed25519"
          icon={<Package size={18} />}
          badge={{ text: '100% Certified', variant: 'em' }}
        />
        <MetricCard
          title="Farmer Scan Verifications"
          value="41"
          subtitle="Tests across 18 villages"
          icon={<Smartphone size={18} />}
          delta={{ value: '+14% this week', isPositive: true }}
        />
        <MetricCard
          title="Open Dispute Claims"
          value={disputes.filter((d) => d.status === 'OPEN' || d.status === 'UNDER_REVIEW').length}
          subtitle="Tolerance violations"
          icon={<Scale size={18} />}
          badge={{ text: 'Action Required', variant: 're' }}
        />
        <MetricCard
          title="Settlement Rate"
          value="88.5%"
          subtitle="Avg resolution: 36 hrs"
          icon={<ShieldCheck size={18} />}
          badge={{ text: 'FPO Standard', variant: 'bl' }}
        />
      </div>

      {/* Sub-Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => handleTabChange('catalog')}
          className={`btn ${activeTab === 'catalog' ? 'btn-primary' : 'btn-ghost'}`}
        >
          Registered Batches Catalog ({batches.length})
        </button>
        <button
          onClick={() => handleTabChange('farmer_test')}
          className={`btn ${activeTab === 'farmer_test' ? 'btn-primary' : 'btn-ghost'}`}
        >
          Farmer Scan & Verification Simulator
        </button>
        <button
          onClick={() => handleTabChange('disputes')}
          className={`btn ${activeTab === 'disputes' ? 'btn-primary' : 'btn-ghost'}`}
        >
          Dispute Resolution Desk ({disputes.length})
        </button>
        <button
          onClick={() => handleTabChange('register')}
          className={`btn ${activeTab === 'register' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ marginLeft: 'auto' }}
        >
          + Register Batch
        </button>
      </div>

      {/* ─── TAB 1: BATCH CATALOG ─── */}
      {activeTab === 'catalog' && (
        <div className="content-grid cols-12-6">
          {/* Batch Table */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Certified Feed Mill Batches
            </h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Batch Code</th>
                  <th>Feed Type</th>
                  <th>Declared CP</th>
                  <th>Quantity</th>
                  <th>Disputes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => {
                  const isSelected = batch.mill_id === selectedBatchId;
                  const hasDisputes = (batch.disputes?.length ?? 0) > 0;
                  return (
                    <tr
                      key={batch.mill_id}
                      onClick={() => setSelectedBatchId(batch.mill_id)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(37, 99, 235, 0.08)' : undefined,
                      }}
                    >
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>{batch.batch_code}</strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{batch.production_date}</div>
                      </td>
                      <td>{batch.feed_type.replace(/_/g, ' ')}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--emerald-600)' }}>
                          {batch.declared_profile.crude_protein_pct_dm}%
                        </span>
                      </td>
                      <td>{batch.quantity_tonnes ? `${batch.quantity_tonnes} T` : '—'}</td>
                      <td>
                        {hasDisputes ? (
                          <span className="chip re">{batch.disputes?.length} Dispute(s)</span>
                        ) : (
                          <span className="chip em">0 Clean</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQrModalBatch(batch);
                          }}
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        >
                          Show QR
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Selected Batch Details & Declared Profile */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span className="chip bl" style={{ marginBottom: '0.4rem' }}>Certified Batch Spec</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedBatch.batch_code}
                </h3>
              </div>
              <button
                onClick={() => setQrModalBatch(selectedBatch)}
                className="btn btn-primary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center' }}
              >
                <QrCode size={15} style={{ marginRight: '6px' }} />
                View QR Certificate
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'var(--slate-50)', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Crude Protein (CP)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--emerald-600)' }}>
                  {selectedBatch.declared_profile.crude_protein_pct_dm}% DM
                </div>
              </div>
              <div style={{ background: 'var(--slate-50)', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Moisture</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--blue-600)' }}>
                  {selectedBatch.declared_profile.moisture_pct}%
                </div>
              </div>
              <div style={{ background: 'var(--slate-50)', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Acid Detergent Fiber (ADF)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedBatch.declared_profile.adf_pct_dm ?? '24.0'}% DM
                </div>
              </div>
              <div style={{ background: 'var(--slate-50)', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Neutral Detergent Fiber (NDF)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedBatch.declared_profile.ndf_pct_dm ?? '44.0'}% DM
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <strong>Farmer Validation Summary:</strong> Tested by <strong>{selectedBatch.aggregate_stats?.test_count ?? 0}</strong> farmers.
              Average measured CP is <strong>{selectedBatch.aggregate_stats?.avg_cp_measured ?? '—'}%</strong> (deviation {selectedBatch.aggregate_stats?.avg_deviation_cp ?? 0}%).
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: REGISTER BATCH ─── */}
      {activeTab === 'register' && (
        <div className="glass-panel" style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Register New Feed Mill Batch & Generate QR
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
            Mill declares certified proximate specs. Cryptographic Ed25519 signature is embedded into the QR payload for offline verification.
          </p>

          <form onSubmit={handleRegisterBatch} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
                  Batch / Lot Code
                </label>
                <input
                  type="text"
                  required
                  value={newBatchCode}
                  onChange={(e) => setNewBatchCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
                  Feed Type
                </label>
                <select
                  value={newFeedType}
                  onChange={(e) => setNewFeedType(e.target.value as FeedType)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="MAIZE_SILAGE">Maize Silage</option>
                  <option value="COTTONSEED_CAKE">Cottonseed Cake</option>
                  <option value="CONCENTRATE_MIX">Concentrate Mix</option>
                  <option value="MUSTARD_CAKE">Mustard Cake</option>
                  <option value="TMR">Total Mixed Ration</option>
                  <option value="WHEAT_STRAW">Wheat Straw</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
                  Declared CP (% DM)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newCp}
                  onChange={(e) => setNewCp(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
                  Moisture (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newMoisture}
                  onChange={(e) => setNewMoisture(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
                  ADF (% DM)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newAdf}
                  onChange={(e) => setNewAdf(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
                  Quantity (Tonnes)
                </label>
                <input
                  type="number"
                  value={newTonnes}
                  onChange={(e) => setNewTonnes(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => handleTabChange('catalog')} className="btn btn-ghost">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center' }}>
                <Zap size={15} style={{ marginRight: '6px' }} />
                Register Batch & Sign QR
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── TAB 3: FARMER TEST SIMULATOR ─── */}
      {activeTab === 'farmer_test' && (
        <div className="content-grid cols-2">
          {/* Simulation Input Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Farmer NIR Test Simulator
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Simulates a handheld scanner test performed by a farmer on a purchased feed batch. Compares against declared profile using tolerance rules from <code>thresholds.json</code>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Select Scanned Batch
                </label>
                <select
                  value={simBatchId}
                  onChange={(e) => setSimBatchId(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
                >
                  {batches.map((b) => (
                    <option key={b.mill_id} value={b.mill_id}>
                      {b.batch_code} ({b.feed_type}) — Declared CP: {b.declared_profile.crude_protein_pct_dm}%
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Farmer Name & Location
                </label>
                <input
                  type="text"
                  value={simFarmerName}
                  onChange={(e) => setSimFarmerName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Farmer Measured CP (% DM)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={simCp}
                    onChange={(e) => setSimCp(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Farmer Measured Moisture (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={simMoisture}
                    onChange={(e) => setSimMoisture(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', padding: '0.5rem 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={simUrea}
                    onChange={(e) => setSimUrea(e.target.checked)}
                    style={{ accentColor: 'var(--rose-600)' }}
                  />
                  Urea Adulterant Flag
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={simSilica}
                    onChange={(e) => setSimSilica(e.target.checked)}
                    style={{ accentColor: 'var(--rose-600)' }}
                  />
                  Silica Adulterant Flag
                </label>
              </div>

              <button
                onClick={handleSimulateFarmerTest}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Search size={15} style={{ marginRight: '6px' }} />
                Run Tolerance Evaluation
              </button>
            </div>
          </div>

          {/* Evaluation Result & Dispute Filing Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Comparison Result & Dispute Trigger
            </h3>

            {evalResult ? (
              <div>
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    backgroundColor: evalResult.isBreach ? '#fff1f2' : '#ecfdf5',
                    border: `1px solid ${evalResult.isBreach ? '#fecdd3' : '#a7f3d0'}`,
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    {evalResult.isBreach ? <AlertTriangle size={18} color="var(--rose-600)" /> : <CheckCircle2 size={18} color="var(--emerald-600)" />}
                    <strong style={{ color: evalResult.isBreach ? 'var(--rose-600)' : 'var(--emerald-600)' }}>
                      {evalResult.isBreach ? 'TOLERANCE BREACH CONFIRMED' : 'TEST VERIFIED PASS'}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {evalResult.summary}
                  </div>
                </div>

                {evalResult.isBreach && (
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      Breached Parameters:
                    </div>
                    {evalResult.deviatingFields.map((df, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          background: 'var(--slate-50)',
                          border: '1px solid var(--border-subtle)',
                          padding: '0.6rem 0.8rem',
                          borderRadius: '6px',
                          marginBottom: '0.5rem',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {df.field.replace(/_/g, ' ')}
                        </span>
                        <span style={{ color: 'var(--rose-600)', fontWeight: 600 }}>
                          Declared: {df.declared} | Measured: {df.measured} (Delta: -{df.deviation_pct}%, Allowed: ±{df.tolerance_used}%)
                        </span>
                      </div>
                    ))}

                    {testDisputeCreated ? (
                      <div
                        style={{
                          marginTop: '1.25rem',
                          padding: '0.85rem',
                          borderRadius: '8px',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: 'var(--blue-600)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center' }}>
                          <Check size={16} style={{ marginRight: '6px' }} />
                          Formal Dispute Filed with FPO Union!
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          Dispute ID: <code>{testDisputeCreated.id}</code><br />
                          Case status: <strong>{testDisputeCreated.status}</strong>. Added to FPO Dispute Desk queue.
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleFileDispute}
                        className="btn btn-danger"
                        style={{ width: '100%', marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Scale size={15} style={{ marginRight: '6px' }} />
                        File Formal Dispute with FPO Arbitrator
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '2rem 0', textAlign: 'center' }}>
                Run tolerance evaluation to inspect differences between mill declaration and farmer NIR test.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: DISPUTES DESK ─── */}
      {activeTab === 'disputes' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                FPO Cooperative Dispute Desk & Settlement Ledger
              </h3>
              <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                Full audit trail of tolerance breach claims between farmers and feed manufacturers.
              </div>
            </div>
            <span className="chip am">{disputes.length} Total Claims</span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Batch Code</th>
                <th>Farmer Complainant</th>
                <th>Breach Parameter</th>
                <th>Filed At</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((dispute) => {
                const primaryBreach = dispute.deviating_fields[0];
                return (
                  <tr key={dispute.id}>
                    <td>
                      <code style={{ color: '#38bdf8' }}>#{dispute.id.slice(-8).toUpperCase()}</code>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-primary)' }}>{dispute.batch_code}</strong>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{dispute.mill_name}</div>
                    </td>
                    <td>{dispute.farm_name}</td>
                    <td>
                      {primaryBreach ? (
                        <span style={{ color: '#f87171', fontWeight: 600 }}>
                          {primaryBreach.field.replace(/_/g, ' ')}: {primaryBreach.measured} vs {primaryBreach.declared} (-{primaryBreach.deviation_pct}%)
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{new Date(dispute.created_at).toLocaleDateString()}</td>
                    <td>
                      {dispute.status === 'OPEN' && <span className="chip re">OPEN</span>}
                      {dispute.status === 'UNDER_REVIEW' && <span className="chip am">REVIEW</span>}
                      {dispute.status === 'RESOLVED_VALID' && <span className="chip em">SETTLED (VALID)</span>}
                      {dispute.status === 'RESOLVED_INVALID' && <span className="chip bl">DISMISSED</span>}
                      {dispute.status === 'ESCALATED' && <span className="chip re">NABL ESCALATED</span>}
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedDispute(dispute)}
                        className="btn btn-ghost"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      >
                        Arbitrate Case
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalBatch && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setQrModalBatch(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <QRCodeViewer batch={qrModalBatch} onClose={() => setQrModalBatch(null)} />
          </div>
        </div>
      )}

      {/* Dispute Arbitration Modal */}
      {selectedDispute && (
        <DisputeModal
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
        />
      )}
    </div>
  );
}
