/**
 * AAHAR Mobile — Database Unit Tests
 * Verifies local SQLite client, schemas, and typed repositories.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryDatabaseClient } from '../../src/db/client';
import { CREATE_TABLES_SQL } from '../../src/db/schema';
import { FarmRepository } from '../../src/db/repositories/farmRepository';
import { MeasurementRepository } from '../../src/db/repositories/measurementRepository';
import { BunkerRepository } from '../../src/db/repositories/bunkerRepository';
import { SyncRepository } from '../../src/db/repositories/syncRepository';
import { Measurement, Spectrum, Advisory, SyncEnvelope } from '../../src/types/contracts';

describe('AAHAR Mobile Database Layer', () => {
  let db: InMemoryDatabaseClient;
  let farmRepo: FarmRepository;
  let measurementRepo: MeasurementRepository;
  let bunkerRepo: BunkerRepository;
  let syncRepo: SyncRepository;

  beforeEach(async () => {
    db = new InMemoryDatabaseClient();
    await db.execAsync(CREATE_TABLES_SQL);
    farmRepo = new FarmRepository(db);
    measurementRepo = new MeasurementRepository(db);
    bunkerRepo = new BunkerRepository(db);
    syncRepo = new SyncRepository(db);
  });

  it('should upsert and retrieve a farm and herd profile with Lamport clocks', async () => {
    await farmRepo.upsertFarm('farm-test-01', {
      name: 'Majha Dairy',
      owner_name: 'Harpreet Singh',
      owner_phone: '+919812345678',
      location: { state: 'Punjab', district: 'Ludhiana' },
      fields: {
        name: { counter: 1, device: 'AAHAR-P-004821' },
      },
    });

    const farm = await farmRepo.getFarm('farm-test-01');
    expect(farm).not.toBeNull();
    expect(farm?.name).toBe('Majha Dairy');
    expect(farm?.fields.name.counter).toBe(1);

    await farmRepo.upsertHerd({
      farm_id: 'farm-test-01',
      total_animals: 15,
      animals: [
        {
          id: 'grp-01',
          breed: 'MURRAH',
          lactation_stage: 'MID_LACTATION',
          count: 15,
          milk_yield_kg_day: 16.5,
        },
      ],
      feed_on_hand: [
        { feed_type: 'COTTONSEED_CAKE', quantity_kg: 500 },
        { feed_type: 'MAIZE_SILAGE', quantity_kg: 3000 },
      ],
      fields: {
        animals: { counter: 1, device: 'AAHAR-P-004821' },
      },
    });

    const herd = await farmRepo.getHerd('farm-test-01');
    expect(herd).not.toBeNull();
    expect(herd?.total_animals).toBe(15);
    expect(herd?.animals[0].breed).toBe('MURRAH');
  });

  it('should save and retrieve full test result (measurement + 228-band spectrum + advisory)', async () => {
    const measurementId = 'meas-test-001';
    const measurement: Measurement = {
      feed_type: 'COTTONSEED_CAKE',
      device_sku: 'AAHAR_PRO',
      scan_duration_ms: 2200,
      confidence_overall: 0.94,
      in_distribution: true,
      proximates: {
        crude_protein_pct_dm: 24.5,
        moisture_pct: 11.2,
        adf_pct_dm: 26.5,
        ndf_pct_dm: 42.0,
        crude_fat_pct_dm: 7.1,
        ash_pct_dm: 5.4,
        me_mj_kg_dm: 11.8,
      },
      safety: {
        adulteration: {
          verdict: 'CLEAN',
          confidence: 0.96,
          urea: { detected: false, confidence: 0.96 },
        },
        mycotoxin: {
          aflatoxin_band: 'LOW',
          total_mycotoxin_band: 'LOW',
        },
        mould: {
          detected: false,
          surface_coverage_pct: 1.5,
        },
      },
      derived: {
        feed_grade: 'A',
      },
    };

    const wavelengths_nm = Array.from({ length: 228 }, (_, i) => 900 + i * 3.5);
    const intensities = Array.from({ length: 228 }, () => 0.65);
    const spectrum: Spectrum = {
      measurement_id: measurementId,
      device_sku: 'AAHAR_PRO',
      sensor_model: 'C12880MA',
      wavelengths_nm,
      intensities_raw: [intensities, intensities, intensities],
      intensities_corrected: [intensities],
      dark_reference: new Array(228).fill(100),
      white_reference: new Array(228).fill(60000),
      repeats: 3,
    };

    const advisory: Advisory = {
      measurement_id: measurementId,
      feed_grade: 'A',
      actions: [{ priority: 1, category: 'STORAGE', action_key: 'store_in_dry_place', severity: 'INFO' }],
      herd_impacts: [],
      ration_correction: null,
      text: {
        en: 'Excellent quality cottonseed cake.',
        hi: 'उत्तम गुणवत्ता कपास की खल।',
        pa: 'ਬਹੁਤ ਵਧੀਆ ਕੁਆਲਿਟੀ ਕਪਾਹ ਦੀ ਖ਼ਲ।',
      },
      computed_at: new Date().toISOString(),
    };

    await measurementRepo.saveTestResult(measurementId, 'farm-test-01', 'AAHAR-P-004821', new Date().toISOString(), measurement, spectrum, advisory);

    const retrieved = await measurementRepo.getMeasurement(measurementId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(measurementId);
    expect(retrieved?.measurement.proximates.crude_protein_pct_dm).toBe(24.5);
    expect(retrieved?.spectrum?.wavelengths_nm.length).toBe(228);
    expect(retrieved?.advisory?.text.en).toBe('Excellent quality cottonseed cake.');
  });

  it('should enqueue records in sync_queue and update sync state', async () => {
    const envelope: SyncEnvelope = {
      id: 'env-test-001',
      entity: 'measurement',
      schema_version: 3,
      farm_id: 'farm-test-01',
      device_id: 'AAHAR-P-004821',
      captured_at: new Date().toISOString(),
      clock: { device: 'AAHAR-P-004821', counter: 101 },
      server_received_at: null,
      sync_state: 'pending',
      payload_hash: 'sha256:abc123mock',
      payload: { id: 'meas-test-001' },
    };

    await syncRepo.enqueue(envelope, 'high');

    const statsBefore = await syncRepo.getQueueStats();
    expect(statsBefore.pending).toBe(1);
    expect(statsBefore.synced).toBe(0);

    const pending = await syncRepo.getPendingBatch(10);
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe('env-test-001');

    await syncRepo.markSynced(['env-test-001']);

    const statsAfter = await syncRepo.getQueueStats();
    expect(statsAfter.pending).toBe(0);
    expect(statsAfter.synced).toBe(1);
  });
});
