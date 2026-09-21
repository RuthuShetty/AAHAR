import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardStore } from '../src/store/dashboardStore';

describe('AAHAR Phase 7 — Batch Traceability & Dispute Resolution Engine', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useDashboardStore.getState();
    store.resetStore();
  });

  it('1. Feed mill registers batch with declared nutritional profile and Ed25519 signed QR', () => {
    const store = useDashboardStore.getState();
    const initialBatchCount = store.batches.length;

    const newBatch = store.registerBatch({
      mill_id: '',
      mill_name: 'Amul Kanjari Plant',
      batch_code: 'AMUL-MS-2026-TEST',
      feed_type: 'MAIZE_SILAGE',
      production_date: '2026-09-18',
      quantity_tonnes: 120,
      declared_profile: {
        crude_protein_pct_dm: 9.2,
        moisture_pct: 65.0,
        adf_pct_dm: 23.5,
        ndf_pct_dm: 43.0,
      },
    });

    const updatedStore = useDashboardStore.getState();
    expect(updatedStore.batches.length).toBe(initialBatchCount + 1);
    expect(newBatch.batch_code).toBe('AMUL-MS-2026-TEST');
    expect(newBatch.qr_payload).toMatch(/^aahar:\/\/batch\/0191ebc2/);
    expect(newBatch.qr_signed).toBeNull();
    expect(newBatch.declared_profile.crude_protein_pct_dm).toBe(9.2);
    expect(newBatch.disputes).toEqual([]);
  });

  it('2. Farmer scan comparison passes when NIR measurements are within tolerance', () => {
    const store = useDashboardStore.getState();
    const testBatch = store.batches.find((b) => b.batch_code === 'AMUL-MS-2026-B108')!;
    expect(testBatch).toBeDefined();

    // Declared CP = 8.8%, Measured 8.7% CP (only 1.1% deficit, within 5.0% tolerance)
    const result = store.evaluateTestAgainstBatch(testBatch.mill_id, {
      crude_protein_pct_dm: 8.7,
      moisture_pct: 66.8,
      urea_detected: false,
      silica_detected: false,
    });

    expect(result.isBreach).toBe(false);
    expect(result.deviatingFields.length).toBe(0);
    expect(result.summary).toContain('Test passed within tolerances');
  });

  it('3. Farmer scan detects tolerance breach when CP falls below allowable margin', () => {
    const store = useDashboardStore.getState();
    const testBatch = store.batches.find((b) => b.batch_code === 'GAC-CSC-2026-09')!;
    expect(testBatch).toBeDefined();

    // Declared CP = 24.5%, Measured 20.8% CP (15.1% relative deficit > 5.0% tolerance)
    const result = store.evaluateTestAgainstBatch(testBatch.mill_id, {
      crude_protein_pct_dm: 20.8,
      moisture_pct: 8.2,
      urea_detected: false,
      silica_detected: false,
    });

    expect(result.isBreach).toBe(true);
    expect(result.deviatingFields.length).toBe(1);
    expect(result.deviatingFields[0].field).toBe('crude_protein_pct_dm');
    expect(result.deviatingFields[0].declared).toBe(24.5);
    expect(result.deviatingFields[0].measured).toBe(20.8);
    expect(result.deviatingFields[0].deviation_pct).toBe(15.1);
    expect(result.deviatingFields[0].tolerance_used).toBe(5.0);
  });

  it('4. Adulteration flag triggers immediate breach regardless of proximate values', () => {
    const store = useDashboardStore.getState();
    const testBatch = store.batches[0];

    const result = store.evaluateTestAgainstBatch(testBatch.mill_id, {
      crude_protein_pct_dm: 8.8,
      moisture_pct: 66.5,
      urea_detected: true,
      silica_detected: false,
    });

    expect(result.isBreach).toBe(true);
    expect(result.deviatingFields.some((f) => f.field === 'adulterant_urea')).toBe(true);
  });

  it('5. End-to-End: Tolerance breach generates formal dispute record and updates FPO dashboard', () => {
    const store = useDashboardStore.getState();
    const testBatch = store.batches.find((b) => b.batch_code === 'GAC-CSC-2026-09')!;
    expect(testBatch).toBeDefined();
    const initialDisputeCount = store.disputes.length;
    const initialAlertCount = store.alerts.length;

    // Evaluate breach
    const evalResult = store.evaluateTestAgainstBatch(testBatch.mill_id, {
      crude_protein_pct_dm: 20.2,
      moisture_pct: 8.5,
      urea_detected: false,
      silica_detected: false,
    });
    expect(evalResult.isBreach).toBe(true);

    // Create dispute
    const measurementId = '0191ebc2-7b64-7930-9092-mtest0000001';
    const farmId = '0191ebc2-7b64-7930-9092-ftest0000001';
    const farmName = 'Chikhodra Dairy Cooperative Unit #7';

    const dispute = store.createDispute(
      testBatch.mill_id,
      measurementId,
      farmId,
      farmName,
      evalResult.deviatingFields,
      'Automated NIR tolerance breach on Cottonseed Cake protein deficit.'
    );

    const updatedStore = useDashboardStore.getState();

    // Check dispute is recorded
    expect(updatedStore.disputes.length).toBe(initialDisputeCount + 1);
    expect(dispute.status).toBe('OPEN');
    expect(dispute.batch_id).toBe(testBatch.mill_id);
    expect(dispute.farm_name).toBe(farmName);
    expect(dispute.deviating_fields.length).toBeGreaterThan(0);

    // Check batch dispute stats updated
    const updatedBatch = updatedStore.batches.find((b) => b.mill_id === testBatch.mill_id);
    expect(updatedBatch?.disputes?.some((d) => d.id === dispute.id)).toBe(true);
    expect(updatedBatch?.aggregate_stats?.dispute_count).toBeGreaterThan(0);

    // Check real-time alert created
    expect(updatedStore.alerts.length).toBe(initialAlertCount + 1);
    const disputeAlert = updatedStore.alerts.find((a) => a.entity_id === testBatch.mill_id);
    expect(disputeAlert?.severity).toBe('CRITICAL');
    expect(disputeAlert?.title).toContain('New Dispute Opened');

    // Arbitrate and resolve dispute
    store.updateDisputeStatus(
      dispute.id,
      'RESOLVED_VALID',
      'Mill conceded protein loss during storage; credit note #CN-9921 issued.'
    );

    const settledStore = useDashboardStore.getState();
    const resolvedDispute = settledStore.disputes.find((d) => d.id === dispute.id);
    expect(resolvedDispute?.status).toBe('RESOLVED_VALID');
    expect(resolvedDispute?.resolved_at).not.toBeNull();
    expect(resolvedDispute?.fpo_note).toContain('credit note #CN-9921 issued');
  });

  it('6. Bunker 3D digital twin maintains 4-depth thermistors and 7-day front timeline', () => {
    const store = useDashboardStore.getState();
    const bunker = store.bunker;

    expect(bunker.length_m).toBe(24.0);
    expect(bunker.width_m).toBe(7.0);
    expect(bunker.height_m).toBe(3.2);
    expect(bunker.probes.length).toBe(4);

    // Verify 4 depth sensors on each probe
    for (const probe of bunker.probes) {
      expect(probe.readings.length).toBe(4);
      expect(probe.readings.map((r) => r.depth_m)).toEqual([0.2, 0.6, 1.0, 1.5]);
      expect(probe.ph).toBeGreaterThan(3.0);
      expect(probe.ph).toBeLessThan(7.0);
    }

    // Verify 7-day front positions
    const positions = bunker.spoilage_forecast.day_positions_m;
    expect(positions.length).toBe(8); // Day 0 through Day 7
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]); // Front advances monotonically
    }

    // Test scrubber
    store.setBunkerScrubDay(4);
    expect(useDashboardStore.getState().bunkerScrubDay).toBe(4);
  });
});
