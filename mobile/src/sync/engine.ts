/**
 * AAHAR Mobile — Client Sync Engine
 * Implements Section 8.4 Sync Engine Algorithm.
 */

import { SyncRepository, SyncRunRecord } from '../db/repositories/syncRepository';
import { FarmRepository } from '../db/repositories/farmRepository';
import { BunkerRepository } from '../db/repositories/bunkerRepository';
import { MeasurementRepository } from '../db/repositories/measurementRepository';
import { SyncEnvelope, Farm, Bunker } from '../types/contracts';
import { networkMonitor } from './networkMonitor';
import { dataGuard } from './dataGuard';
import { mergeFieldLevel } from './conflict';

export interface SyncEngineConfig {
  baseUrl: string;
  authToken?: string;
  deviceId: string;
  farmId: string;
  batchSize?: number;
}

export interface SyncResult {
  success: boolean;
  recordsPushed: number;
  recordsPulled: number;
  bytesUploaded: number;
  bytesDownloaded: number;
  error?: string;
}

export class ClientSyncEngine {
  private backoffMs = 2000;
  private maxBackoffMs = 15 * 60 * 1000; // 15 mins
  private lastCursor: string | null = null;
  private isSyncing = false;

  constructor(
    private config: SyncEngineConfig,
    private syncRepo: SyncRepository,
    private farmRepo?: FarmRepository,
    private bunkerRepo?: BunkerRepository,
    private measurementRepo?: MeasurementRepository,
  ) {}

  setAuthToken(token: string): void {
    this.config.authToken = token;
  }

  getCursor(): string | null {
    return this.lastCursor;
  }

  setCursor(cursor: string | null): void {
    this.lastCursor = cursor;
  }

  async runSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        recordsPushed: 0,
        recordsPulled: 0,
        bytesUploaded: 0,
        bytesDownloaded: 0,
        error: 'Sync already in progress',
      };
    }

    const netState = networkMonitor.getState();
    if (!netState.isConnected) {
      return {
        success: false,
        recordsPushed: 0,
        recordsPulled: 0,
        bytesUploaded: 0,
        bytesDownloaded: 0,
        error: 'Offline / Airplane mode active',
      };
    }

    this.isSyncing = true;
    const runId = `sync-run-${Date.now()}`;
    const startedAt = new Date().toISOString();
    let bytesUploaded = 0;
    let bytesDownloaded = 0;
    let recordsPushed = 0;
    let recordsPulled = 0;

    try {
      // 1. Handshake
      const handshake = await this.performHandshake();
      bytesDownloaded += handshake.bytes;

      if (handshake.schemaVersion > 3) {
        throw new Error(`App update required: server schema version ${handshake.schemaVersion} > local version 3`);
      }

      // 2. PUSH Batch
      const pendingBatch = await this.syncRepo.getPendingBatch(this.config.batchSize ?? 50);
      if (pendingBatch.length > 0) {
        const payloadJson = JSON.stringify(pendingBatch);
        const uploadSize = payloadJson.length;

        const isCellular = netState.connectionType === 'cellular';
        if (!dataGuard.canTransmit(uploadSize, isCellular)) {
          throw new Error('Cellular data guard monthly limit reached (20 MB cap)');
        }

        const pushRes = await this.performPush(pendingBatch);
        bytesUploaded += pushRes.bytes;
        recordsPushed += pushRes.acceptedCount;
        dataGuard.recordUsage(pushRes.bytes, isCellular);

        // Mark synced
        const syncedIds = pendingBatch
          .filter((_, idx) => pushRes.statuses[idx]?.status === 'accepted' || pushRes.statuses[idx]?.status === 'duplicate')
          .map((env) => env.id);

        await this.syncRepo.markSynced(syncedIds);
      }

      // 3. PULL Deltas
      const pullRes = await this.performPull(this.lastCursor ?? handshake.cursor);
      bytesDownloaded += pullRes.bytes;
      recordsPulled += pullRes.records.length;
      if (pullRes.nextCursor) {
        this.lastCursor = pullRes.nextCursor;
      }

      // 4. Apply Deltas locally with Conflict Resolution
      await this.applyPulledDeltas(pullRes.records);

      // Reset backoff on success
      this.backoffMs = 2000;

      const runLog: SyncRunRecord = {
        id: runId,
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        bytes_uploaded: bytesUploaded,
        bytes_downloaded: bytesDownloaded,
        records_pushed: recordsPushed,
        records_pulled: recordsPulled,
        status: 'SUCCESS',
      };
      await this.syncRepo.logSyncRun(runLog);

      this.isSyncing = false;
      return {
        success: true,
        recordsPushed,
        recordsPulled,
        bytesUploaded,
        bytesDownloaded,
      };
    } catch (err: any) {
      this.isSyncing = false;
      // Exponential backoff with jitter
      this.backoffMs = Math.min(this.maxBackoffMs, this.backoffMs * 2 + Math.floor(Math.random() * 500));

      const runLog: SyncRunRecord = {
        id: runId,
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        bytes_uploaded: bytesUploaded,
        bytes_downloaded: bytesDownloaded,
        records_pushed: recordsPushed,
        records_pulled: recordsPulled,
        status: 'FAILED',
        error_message: err.message,
      };
      await this.syncRepo.logSyncRun(runLog);

      return {
        success: false,
        recordsPushed,
        recordsPulled,
        bytesUploaded,
        bytesDownloaded,
        error: err.message,
      };
    }
  }

  private async performHandshake(): Promise<{
    serverTime: string;
    schemaVersion: number;
    modelVersion: string;
    cursor: string | null;
    bytes: number;
  }> {
    const url = `${this.config.baseUrl}/sync/handshake`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
      },
    });

    if (!res.ok) {
      throw new Error(`Handshake failed: HTTP ${res.status}`);
    }

    const text = await res.text();
    const data = JSON.parse(text);
    return {
      serverTime: data.server_time,
      schemaVersion: data.schema_version,
      modelVersion: data.model_manifest_version,
      cursor: data.last_sync_cursor ?? null,
      bytes: text.length,
    };
  }

  private async performPush(envelopes: SyncEnvelope[]): Promise<{
    acceptedCount: number;
    statuses: Array<{ id: string; status: string; reason?: string }>;
    bytes: number;
  }> {
    const url = `${this.config.baseUrl}/sync/push`;
    const bodyStr = JSON.stringify({
      device_id: this.config.deviceId,
      farm_id: this.config.farmId,
      envelopes,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `batch-${Date.now()}-${envelopes.length}`,
        ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
      },
      body: bodyStr,
    });

    if (!res.ok) {
      throw new Error(`Push failed: HTTP ${res.status}`);
    }

    const text = await res.text();
    const data = JSON.parse(text);
    return {
      acceptedCount: data.accepted ?? envelopes.length,
      statuses: data.results ?? envelopes.map((e) => ({ id: e.id, status: 'accepted' })),
      bytes: bodyStr.length + text.length,
    };
  }

  private async performPull(cursor: string | null): Promise<{
    records: SyncEnvelope[];
    nextCursor: string | null;
    bytes: number;
  }> {
    const url = new URL(`${this.config.baseUrl}/sync/pull`);
    if (cursor) url.searchParams.set('cursor', cursor);
    url.searchParams.set('limit', '200');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
      },
    });

    if (!res.ok) {
      throw new Error(`Pull failed: HTTP ${res.status}`);
    }

    const text = await res.text();
    const data = JSON.parse(text);
    return {
      records: data.envelopes ?? [],
      nextCursor: data.next_cursor ?? null,
      bytes: text.length,
    };
  }

  private async applyPulledDeltas(records: SyncEnvelope[]): Promise<void> {
    for (const rec of records) {
      if (rec.entity === 'farm' && this.farmRepo) {
        const local = await this.farmRepo.getFarm(rec.farm_id);
        if (!local) {
          await this.farmRepo.upsertFarm(rec.farm_id, rec.payload as unknown as Farm);
        } else {
          const remote = rec.payload as unknown as Farm;
          const { merged } = mergeFieldLevel(
            local,
            (local as any).fields ?? {},
            remote,
            remote.fields ?? {},
          );
          await this.farmRepo.upsertFarm(rec.farm_id, merged);
        }
      } else if (rec.entity === 'bunker' && this.bunkerRepo) {
        const local = await this.bunkerRepo.getBunker(rec.id);
        if (!local) {
          await this.bunkerRepo.upsertBunker(rec.id, rec.payload as unknown as Bunker);
        } else {
          const remote = rec.payload as unknown as Bunker;
          const { merged } = mergeFieldLevel(
            local,
            (local as any).fields ?? {},
            remote,
            remote.fields ?? {},
          );
          await this.bunkerRepo.upsertBunker(rec.id, merged);
        }
      }
    }
  }
}
