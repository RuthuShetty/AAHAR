/**
 * AAHAR Mobile — Screen 17: Sync Centre
 * Monitors offline sync queue, 20 MB/month cellular data guard, and manual cloud push/pull.
 * Section 8.4 Sync engine algorithm.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { THEME } from '../../constants/theme';
import { useSyncStore, useFarmStore } from '../../store';
import { getDatabaseClient } from '../../db/client';
import { SyncRepository } from '../../db/repositories/syncRepository';
import { ClientSyncEngine } from '../../sync/engine';
import { networkMonitor } from '../../sync/networkMonitor';
import { Icon } from '../../components/Icon';

export default function SyncCentreScreen() {
  const { queueStats, setQueueStats, lastSyncRun, setLastSyncRun, isSyncing, setSyncing, dataUsage, refreshDataUsage } = useSyncStore();
  const { farmId } = useFarmStore();
  const [airplaneMode, setAirplaneMode] = useState(networkMonitor.getState().isAirplaneMode);

  const loadStats = async () => {
    const db = await getDatabaseClient();
    const repo = new SyncRepository(db);
    const stats = await repo.getQueueStats();
    setQueueStats(stats);
    const lastRun = await repo.getLatestSyncRun();
    if (lastRun) setLastSyncRun(lastRun);
    refreshDataUsage();
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleToggleAirplaneMode = () => {
    const next = !airplaneMode;
    setAirplaneMode(next);
    networkMonitor.setAirplaneMode(next);
  };

  const handleManualSync = async () => {
    if (airplaneMode) {
      alert('Cannot sync while Airplane Mode is active. Disable airplane mode first.');
      return;
    }

    setSyncing(true);
    try {
      const db = await getDatabaseClient();
      const repo = new SyncRepository(db);
      const engine = new ClientSyncEngine(
        {
          baseUrl: 'http://localhost:8000',
          deviceId: 'AAHAR-P-004821',
          farmId: farmId ?? 'farm-def-001',
        },
        repo,
      );

      await engine.runSync();
      await loadStats();
    } catch (err: any) {
      console.warn('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  const remainingMb = (dataUsage.remainingBytes / (1024 * 1024)).toFixed(1);
  const usedMb = (dataUsage.usedBytesThisMonth / (1024 * 1024)).toFixed(1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Sync Centre</Text>
      <Text style={styles.subtitle}>Offline-First Cloud Synchronization</Text>

      {/* Connectivity Banner */}
      <View style={[styles.networkCard, airplaneMode ? styles.netOffline : styles.netOnline]}>
        <View style={styles.netHeader}>
          <Text style={styles.netIcon}>{airplaneMode ? 'OFFLINE' : 'ONLINE'}</Text>
          <View>
            <Text style={styles.netTitle}>
              {airplaneMode ? 'Airplane Mode Enabled (Offline)' : 'Connected to Network'}
            </Text>
            <Text style={styles.netSub}>
              {airplaneMode
                ? 'Scans saved locally to SQLite. Zero cellular data usage.'
                : 'Ready to synchronize delta updates with cloud.'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.airplaneToggle} onPress={handleToggleAirplaneMode}>
          <Text style={styles.toggleText}>
            {airplaneMode ? 'Turn Off Airplane Mode' : 'Simulate Airplane Mode'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sync Queue Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Offline Sync Queue</Text>
        <View style={styles.queueGrid}>
          <View style={styles.queueBox}>
            <Text style={styles.queueNum}>{queueStats.pending}</Text>
            <Text style={styles.queueLabel}>Pending</Text>
          </View>
          <View style={styles.queueBox}>
            <Text style={[styles.queueNum, { color: THEME.colors.good }]}>{queueStats.synced}</Text>
            <Text style={styles.queueLabel}>Synced</Text>
          </View>
          <View style={styles.queueBox}>
            <Text style={[styles.queueNum, { color: THEME.colors.danger }]}>{queueStats.failed}</Text>
            <Text style={styles.queueLabel}>Conflicts</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.syncBtn, isSyncing && styles.btnDisabled]}
          onPress={handleManualSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.syncBtnText}>Sync Now with Cloud</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Cellular Data Guard Card (Section 8.4) */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Icon name="shield" size={18} color={THEME.colors.primary} />
          <Text style={styles.cardTitle}>Cellular 20 MB / Month Data Guard</Text>
        </View>
        <Text style={styles.cardDesc}>
          Strict monthly data budget prevents unexpected mobile plan charges. Raw spectra upload only on Wi-Fi.
        </Text>

        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>Monthly Used:</Text>
          <Text style={styles.budgetVal}>{usedMb} MB / 20.0 MB</Text>
        </View>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>Remaining Allowance:</Text>
          <Text style={[styles.budgetVal, { color: THEME.colors.accent }]}>{remainingMb} MB</Text>
        </View>
      </View>

      {/* Last Sync History */}
      {lastSyncRun && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last Sync Execution</Text>
          <Text style={styles.historyText}>Status: {lastSyncRun.status}</Text>
          <Text style={styles.historyText}>Time: {new Date(lastSyncRun.started_at).toLocaleString()}</Text>
          <Text style={styles.historyText}>Pushed: {lastSyncRun.records_pushed} records ({lastSyncRun.bytes_uploaded} bytes)</Text>
          <Text style={styles.historyText}>Pulled: {lastSyncRun.records_pulled} records</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: THEME.spacing.md,
    paddingBottom: 40,
  },
  title: {
    ...THEME.typography.h1,
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    ...THEME.typography.body,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
  },
  networkCard: {
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    marginBottom: THEME.spacing.md,
  },
  netOnline: {
    backgroundColor: '#132B18',
    borderColor: THEME.colors.good,
  },
  netOffline: {
    backgroundColor: '#33240B',
    borderColor: THEME.colors.caution,
  },
  netHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  netIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  netTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  netSub: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.85,
    marginTop: 2,
    paddingRight: 24,
  },
  airplaneToggle: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center',
    marginTop: 6,
  },
  toggleText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  cardTitle: {
    ...THEME.typography.h3,
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  queueGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  queueBox: {
    flex: 1,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.sm,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  queueNum: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  queueLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  syncBtn: {
    backgroundColor: THEME.colors.accent,
    minHeight: THEME.touchTargetMin,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  syncBtnText: {
    fontWeight: '700',
    color: '#0D2B33',
    fontSize: 15,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  budgetLabel: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  budgetVal: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  historyText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
});
