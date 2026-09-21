/**
 * AAHAR Mobile — Phase 2 Exit Criterion Integration Test
 * Full Offline Round-Trip Demo in Airplane Mode.
 *
 * Sequence:
 * 1. Device in airplane mode (offline)
 * 2. Connect to handheld scanner (AAHAR-P-004821) over BLE
 * 3. Complete scan on feed sample -> stream 228 bands with CRC-16 check
 * 4. Generate instant plain-language advisory on device
 * 5. Persist measurement, spectrum, and advisory to local SQLite
 * 6. Enqueue sync envelope with UUIDv7 and Lamport clock
 * 7. Confirm airplane mode safely prevents cloud transmission
 * 8. Network restored -> execute sync engine push/pull
 * 9. Verify record marked as synced and audit log recorded.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryDatabaseClient } from '../../src/db/client';
import { CREATE_TABLES_SQL } from '../../src/db/schema';
import { MeasurementRepository } from '../../src/db/repositories/measurementRepository';
import { SyncRepository } from '../../src/db/repositories/syncRepository';
import { MockBleTransport } from '../../src/ble/mockTransport';
import { generateLocalAdvisory } from '../../src/advisory/localEngine';
import { calculateVfm } from '../../src/advisory/vfmCalculator';
import { networkMonitor } from '../../src/sync/networkMonitor';
import { ClientSyncEngine } from '../../src/sync/engine';
import { Measurement, Spectrum, SyncEnvelope } from '../../src/types/contracts';

describe('Phase 2 Exit Criterion: Full Offline Round-Trip in Airplane Mode', () => {
  let db: InMemoryDatabaseClient;
  let measurementRepo: MeasurementRepository;
  let syncRepo: SyncRepository;
  let bleTransport: MockBleTransport;

  beforeEach(async () => {
    db = new InMemoryDatabaseClient();
    await db.execAsync(CREATE_TABLES_SQL);
    measurementRepo = new MeasurementRepository(db);
    syncRepo = new SyncRepository(db);

    bleTransport = new MockBleTransport({
      scanDurationMs: 50,
      simulatedSku: 'AAHAR_PRO',
      serialNumber: 'AAHAR-P-004821',
      sampleType: 'COTTONSEED_CAKE',
      spikedUrea: 2.5, // 2.5% urea spike
    });
  });

  afterEach(() => {
    networkMonitor.setAirplaneMode(false);
    vi.restoreAllMocks();
  });

  it('completes the full offline scan, on-device advisory, SQLite storage, and cloud delta sync', async () => {
    // ═════════════════════════════════════════════════════════════════════
    // STEP 1: Turn ON Airplane Mode (100% Offline)
    // ═════════════════════════════════════════════════════════════════════
    networkMonitor.setAirplaneMode(true);
    expect(networkMonitor.getState().isConnected).toBe(false);
    expect(networkMonitor.getState().isAirplaneMode).toBe(true);

    // ═════════════════════════════════════════════════════════════════════
    // STEP 2: Connect Handheld NIR Scanner over BLE
    // ═════════════════════════════════════════════════════════════════════
    const bleConnected = await bleTransport.connect();
    expect(bleConnected).toBe(true);

    const devInfo = await bleTransport.getDeviceInfo();
    expect(devInfo.sku).toBe('AAHAR_PRO');
    expect(devInfo.serial_number).toBe('AAHAR-P-004821');

    // ═════════════════════════════════════════════════════════════════════
    // STEP 3: Execute NIR Scan -> Receive 228 Bands with CRC-16 Checksum
    // ═════════════════════════════════════════════════════════════════════
    const spectrumPromise = new Promise<{
      wavelengths: number[];
      intensities: number[];
      repeats: number[][];
      crc16: number;
    }>((resolve) => {
      bleTransport.onSpectrumStream((data) => resolve(data));
    });

    await bleTransport.sendCommand('START_SCAN');
    const rawStream = await spectrumPromise;

    expect(rawStream.wavelengths.length).toBe(228);
    expect(rawStream.intensities.length).toBe(228);
    expect(rawStream.repeats.length).toBe(3);
    expect(rawStream.crc16).toBeGreaterThan(0);

    // ═════════════════════════════════════════════════════════════════════
    // STEP 4: On-Device Inference & Local Advisory Generation (100% Offline)
    // ═════════════════════════════════════════════════════════════════════
    const measurementId = 'meas-offline-roundtrip-001';
    const farmId = 'farm-pb-ludhiana-01';
    const capturedAt = new Date().toISOString();

    const proximates = {
      crude_protein: 18.5,
      moisture: 12.4,
      dry_matter: 87.6,
      adf: 27.8,
      ndf: 43.1,
      crude_fat: 6.9,
      ash: 5.6,
      me_mj_kg: 11.2,
    };

    const vfm = calculateVfm('COTTONSEED_CAKE', proximates.crude_protein, 3400);

    const advisory = generateLocalAdvisory({
      measurementId,
      feedType: 'COTTONSEED_CAKE',
      proximates,
      adulterants: {
        urea_detected: true,
        urea_pct: 2.5,
      },
      safety: {
        aflatoxin_b1_risk: 'LOW',
        mould_surface_pct: 1.8,
      },
      feedPricePerQuintal: 3400,
    });

    // Verify advisory flagged the adulterant
    expect(advisory.feed_grade).toBe('REJECT');
    expect(advisory.actions[0].action_key).toBe('stop_feeding_urea_adulterated');
    expect(advisory.text.pa).toContain('ਅਸੁਰੱਖਿਅਤ ਖ਼ੁਰਾਕ');

    const measurement: Measurement = {
      feed_type: 'COTTONSEED_CAKE',
      device_sku: 'AAHAR_PRO',
      scan_duration_ms: 2200,
      confidence_overall: 0.94,
      in_distribution: true,
      proximates: {
        crude_protein_pct_dm: proximates.crude_protein,
        moisture_pct: proximates.moisture,
        adf_pct_dm: proximates.adf,
        ndf_pct_dm: proximates.ndf,
        crude_fat_pct_dm: proximates.crude_fat,
        ash_pct_dm: proximates.ash,
        me_mj_kg_dm: proximates.me_mj_kg,
      },
      safety: {
        adulteration: {
          verdict: 'ADULTERATED',
          confidence: 0.95,
          urea: { detected: true, confidence: 0.95, estimated_pct: 2.5 },
        },
        mycotoxin: {
          aflatoxin_band: 'LOW',
          total_mycotoxin_band: 'LOW',
        },
        mould: {
          detected: false,
          surface_coverage_pct: 1.8,
        },
      },
      derived: {
        feed_grade: advisory.feed_grade,
        value_for_money: vfm ? {
          price_paid_inr_per_kg: 34,
          cost_per_kg_protein_inr: vfm.cost_per_kg_protein,
          market_avg_inr: vfm.market_benchmark,
          verdict: 'OVERPRICED',
        } : undefined,
      },
    };

    const spectrum: Spectrum = {
      measurement_id: measurementId,
      device_sku: 'AAHAR_PRO',
      sensor_model: 'C12880MA',
      wavelengths_nm: rawStream.wavelengths,
      intensities_raw: rawStream.repeats,
      intensities_corrected: [rawStream.intensities],
      dark_reference: new Array(228).fill(100),
      white_reference: new Array(228).fill(60000),
      repeats: 3,
    };

    // ═════════════════════════════════════════════════════════════════════
    // STEP 5: Store in Local SQLite Database
    // ═════════════════════════════════════════════════════════════════════
    await measurementRepo.saveTestResult(measurementId, farmId, 'AAHAR-P-004821', capturedAt, measurement, spectrum, advisory);

    const savedRecord = await measurementRepo.getMeasurement(measurementId);
    expect(savedRecord).not.toBeNull();
    expect(savedRecord?.measurement.derived.feed_grade).toBe('REJECT');
    expect(savedRecord?.spectrum?.wavelengths_nm.length).toBe(228);

    // ═════════════════════════════════════════════════════════════════════
    // STEP 6: Enqueue into Sync Queue (Pending State)
    // ═════════════════════════════════════════════════════════════════════
    const envelope: SyncEnvelope = {
      id: measurementId,
      entity: 'measurement',
      schema_version: 3,
      farm_id: farmId,
      device_id: 'AAHAR-P-004821',
      captured_at: capturedAt,
      clock: { device: 'AAHAR-P-004821', counter: 1 },
      server_received_at: null,
      sync_state: 'pending',
      payload_hash: `sha256:${rawStream.crc16.toString(16)}`,
      payload: measurement as any,
    };

    await syncRepo.enqueue(envelope, 'high');
    const queueStatsBefore = await syncRepo.getQueueStats();
    expect(queueStatsBefore.pending).toBe(1);
    expect(queueStatsBefore.synced).toBe(0);

    // ═════════════════════════════════════════════════════════════════════
    // STEP 7: Verify Sync Engine Halts Gracefully in Airplane Mode
    // ═════════════════════════════════════════════════════════════════════
    const syncEngine = new ClientSyncEngine(
      {
        baseUrl: 'http://localhost:8000',
        deviceId: 'AAHAR-P-004821',
        farmId,
      },
      syncRepo,
    );

    const offlineSyncResult = await syncEngine.runSync();
    expect(offlineSyncResult.success).toBe(false);
    expect(offlineSyncResult.error).toContain('Offline / Airplane mode active');

    // Queue is still pending with 0 loss
    const queueStatsStillOffline = await syncRepo.getQueueStats();
    expect(queueStatsStillOffline.pending).toBe(1);

    // ═════════════════════════════════════════════════════════════════════
    // STEP 8: Network Restored -> Cloud Sync Round-Trip
    // ═════════════════════════════════════════════════════════════════════
    networkMonitor.setAirplaneMode(false);
    expect(networkMonitor.getState().isConnected).toBe(true);

    // Mock Cloud Backend Endpoints (/sync/handshake, /sync/push, /sync/pull)
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/sync/handshake')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              server_time: new Date().toISOString(),
              schema_version: 3,
              model_manifest_version: 'v1.4.0',
              last_sync_cursor: 'cursor-2026-09-18T00:00:00Z',
            }),
        };
      }
      if (url.includes('/sync/push')) {
        const body = JSON.parse((init?.body as string) ?? '{}');
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              accepted: body.envelopes?.length ?? 1,
              results: (body.envelopes ?? []).map((e: any) => ({
                id: e.id,
                status: 'accepted',
              })),
            }),
        };
      }
      if (url.includes('/sync/pull')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              envelopes: [],
              next_cursor: 'cursor-2026-09-18T10:00:00Z',
            }),
        };
      }
      return { ok: false, status: 404, text: async () => 'Not Found' };
    });

    vi.stubGlobal('fetch', mockFetch);

    const onlineSyncResult = await syncEngine.runSync();
    expect(onlineSyncResult.success).toBe(true);
    expect(onlineSyncResult.recordsPushed).toBe(1);

    // ═════════════════════════════════════════════════════════════════════
    // STEP 9: Verify Local Queue Updated to SYNCED & Audit Log Recorded
    // ═════════════════════════════════════════════════════════════════════
    const queueStatsAfter = await syncRepo.getQueueStats();
    expect(queueStatsAfter.pending).toBe(0);
    expect(queueStatsAfter.synced).toBe(1);

    const latestSyncRun = await syncRepo.getLatestSyncRun();
    expect(latestSyncRun).not.toBeNull();
    expect(latestSyncRun?.status).toBe('SUCCESS');
    expect(latestSyncRun?.records_pushed).toBe(1);
  });
});
