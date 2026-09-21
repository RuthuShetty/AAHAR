/**
 * AAHAR Mobile — Sync Store (Zustand)
 * Exposes sync state to the UI (Home sync chip, Screen 17 Sync Centre).
 */

import { create } from 'zustand';
import { SyncRunRecord } from '../db/repositories/syncRepository';
import { DataUsageStats, dataGuard } from '../sync/dataGuard';
import { networkMonitor, NetworkState } from '../sync/networkMonitor';

interface SyncState {
  queueStats: { pending: number; synced: number; failed: number };
  lastSyncRun: SyncRunRecord | null;
  isSyncing: boolean;
  dataUsage: DataUsageStats;
  networkState: NetworkState;

  setQueueStats: (stats: SyncState['queueStats']) => void;
  setLastSyncRun: (run: SyncRunRecord) => void;
  setSyncing: (isSyncing: boolean) => void;
  refreshDataUsage: () => void;
  setNetworkState: (state: NetworkState) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  queueStats: { pending: 0, synced: 0, failed: 0 },
  lastSyncRun: null,
  isSyncing: false,
  dataUsage: dataGuard.getStats(),
  networkState: networkMonitor.getState(),

  setQueueStats: (queueStats) => set({ queueStats }),
  setLastSyncRun: (lastSyncRun) => set({ lastSyncRun }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  refreshDataUsage: () => set({ dataUsage: dataGuard.getStats() }),
  setNetworkState: (networkState) => set({ networkState }),
}));
