/**
 * AAHAR Mobile — Sync Queue & Sync Runs Repository
 */

import { IDatabaseClient } from '../client';
import { SyncEnvelope } from '../../types/contracts';

export interface SyncQueueItem {
  id: string;
  entity: string;
  record_id: string;
  schema_version: number;
  farm_id: string;
  device_id: string;
  captured_at: string;
  clock_counter: number;
  sync_state: 'pending' | 'in_flight' | 'synced' | 'conflict' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  payload_hash: string;
  payload: Record<string, unknown>;
  retry_count: number;
  last_attempt_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncRunRecord {
  id: string;
  started_at: string;
  ended_at?: string;
  bytes_uploaded: number;
  bytes_downloaded: number;
  records_pushed: number;
  records_pulled: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  error_message?: string;
}

export class SyncRepository {
  constructor(private db: IDatabaseClient) {}

  async enqueue(
    envelope: SyncEnvelope,
    priority: 'high' | 'medium' | 'low' = 'high',
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT OR REPLACE INTO sync_queue (
        id, entity, record_id, schema_version, farm_id, device_id,
        captured_at, clock_counter, sync_state, priority, payload_hash,
        payload, retry_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        envelope.id,
        envelope.entity,
        envelope.id,
        envelope.schema_version,
        envelope.farm_id,
        envelope.device_id,
        envelope.captured_at,
        envelope.clock?.counter ?? 1,
        'pending',
        priority,
        envelope.payload_hash,
        JSON.stringify(envelope.payload),
        0,
        now,
        now,
      ],
    );
  }

  async getPendingBatch(limit = 50): Promise<SyncEnvelope[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM sync_queue WHERE sync_state = ? ORDER BY captured_at ASC LIMIT ${limit}`,
      ['pending'],
    );

    return rows.map((r) => ({
      id: r.id,
      entity: r.entity,
      schema_version: r.schema_version,
      farm_id: r.farm_id,
      device_id: r.device_id,
      captured_at: r.captured_at,
      clock: {
        device: r.device_id,
        counter: r.clock_counter,
      },
      server_received_at: null,
      sync_state: r.sync_state,
      payload_hash: r.payload_hash,
      payload: JSON.parse(r.payload),
    }));
  }

  async markInFlight(ids: string[]): Promise<void> {
    const now = new Date().toISOString();
    for (const id of ids) {
      await this.db.runAsync(
        `UPDATE sync_queue SET sync_state = ?, updated_at = ? WHERE id = ?`,
        ['in_flight', now, id],
      );
    }
  }

  async markSynced(ids: string[]): Promise<void> {
    const now = new Date().toISOString();
    for (const id of ids) {
      await this.db.runAsync(
        `UPDATE sync_queue SET sync_state = ?, updated_at = ? WHERE id = ?`,
        ['synced', now, id],
      );
    }
  }

  async markFailed(id: string, reason: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE sync_queue SET sync_state = ?, error_message = ?, updated_at = ? WHERE id = ?`,
      ['pending', reason, now, id],
    );
  }

  async getQueueStats(): Promise<{ pending: number; synced: number; failed: number }> {
    const all = await this.db.getAllAsync<any>('SELECT sync_state FROM sync_queue');
    let pending = 0;
    let synced = 0;
    let failed = 0;
    for (const r of all) {
      if (r.sync_state === 'pending' || r.sync_state === 'in_flight') pending++;
      else if (r.sync_state === 'synced') synced++;
      else if (r.sync_state === 'conflict' || r.sync_state === 'rejected') failed++;
    }
    return { pending, synced, failed };
  }

  async logSyncRun(run: SyncRunRecord): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO sync_runs (
        id, started_at, ended_at, bytes_uploaded, bytes_downloaded,
        records_pushed, records_pulled, status, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        run.id,
        run.started_at,
        run.ended_at ?? null,
        run.bytes_uploaded,
        run.bytes_downloaded,
        run.records_pushed,
        run.records_pulled,
        run.status,
        run.error_message ?? null,
      ],
    );
  }

  async getLatestSyncRun(): Promise<SyncRunRecord | null> {
    const row = await this.db.getFirstAsync<any>(
      'SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT 1',
    );
    if (!row) return null;
    return {
      id: row.id,
      started_at: row.started_at,
      ended_at: row.ended_at ?? undefined,
      bytes_uploaded: row.bytes_uploaded,
      bytes_downloaded: row.bytes_downloaded,
      records_pushed: row.records_pushed,
      records_pulled: row.records_pulled,
      status: row.status,
      error_message: row.error_message ?? undefined,
    };
  }
}
