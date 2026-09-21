/**
 * AAHAR Mobile — Screen 3: Home Screen
 * Large TEST FEED button, last test result, bunker health alert, sync status chip.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { THEME } from '../../constants/theme';
import { Icon } from '../../components/Icon';
import { useDeviceStore, useResultStore, useSyncStore, useBunkerStore, useSettingsStore } from '../../store';
import { speechSynthesizer, SPOKEN_PROMPTS } from '../../i18n/tts';
import { getDatabaseClient } from '../../db/client';
import { MeasurementRepository } from '../../db/repositories/measurementRepository';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isConnected, deviceInfo, connect } = useDeviceStore();
  const { active, setActiveResult } = useResultStore();
  const { queueStats, isSyncing } = useSyncStore();
  const { bunkers } = useBunkerStore();
  const { language } = useSettingsStore();

  useEffect(() => {
    // Load most recent test from local SQLite if active is null
    if (!active) {
      getDatabaseClient().then(async (db) => {
        const repo = new MeasurementRepository(db);
        const recent = await repo.listRecent(1);
        if (recent.length > 0) {
          const full = await repo.getMeasurement(recent[0].id);
          if (full) {
            setActiveResult(full);
          }
        }
      });
    }
  }, [active, setActiveResult]);

  const handleStartTest = () => {
    // Spoken prompt
    const greeting = language === 'pa' ? 'ਚਾਰੇ ਦੀ ਕਿਸਮ ਚੁਣੋ' : 'चारा का प्रकार चुनें';
    speechSynthesizer.speak(greeting, language);
    router.push('/scan/feed-type');
  };

  const handlePairDevice = async () => {
    if (!isConnected) {
      await connect();
    } else {
      router.push('/device/pair');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Status Banner */}
      <View style={styles.statusBar}>
        <TouchableOpacity
          style={[styles.chip, isConnected ? styles.chipSuccess : styles.chipNeutral, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
          onPress={handlePairDevice}
        >
          <Icon name="bluetooth" size={14} color={isConnected ? THEME.colors.good : THEME.colors.textMuted} />
          <Text style={styles.chipText}>
            {isConnected ? `${deviceInfo?.serial_number ?? 'Scanner Linked'}` : 'Link Scanner'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, queueStats.pending > 0 ? styles.chipCaution : styles.chipSuccess, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
          onPress={() => router.push('/sync')}
        >
          <Icon name="cloud" size={14} color={queueStats.pending > 0 ? THEME.colors.caution : THEME.colors.good} />
          <Text style={styles.chipText}>
            {queueStats.pending > 0
              ? `${queueStats.pending} pending sync`
              : 'Cloud Synced'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* HERO ACTION: Big TEST FEED Button (<= 1 tap to test) */}
      <TouchableOpacity
        style={styles.heroBtn}
        onPress={handleStartTest}
        activeOpacity={0.85}
      >
        <View style={styles.heroIconContainer}>
          <Icon name="scan" size={32} color="#ffffff" />
        </View>
        <Text style={styles.heroBtnText}>{t('home.test_feed_btn', 'TEST FEED')}</Text>
        <Text style={styles.heroBtnSub}>{t('home.test_feed_sub', 'Scan feed sample in 2 minutes')}</Text>
      </TouchableOpacity>

      {/* LAST TEST RESULT CARD */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.recent_tests', 'Latest Feed Test')}</Text>
          {active && (
            <TouchableOpacity onPress={() => router.push('/results/nutrition')}>
              <Text style={styles.seeAllText}>View Full Analysis ›</Text>
            </TouchableOpacity>
          )}
        </View>

        {active ? (
          <TouchableOpacity
            style={styles.resultCard}
            onPress={() => router.push('/results/nutrition')}
            activeOpacity={0.9}
          >
            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.feedType}>{active.measurement.feed_type.replace('_', ' ')}</Text>
                <Text style={styles.captureTime}>
                  {new Date().toLocaleDateString()} · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View
                style={[
                  styles.gradeBadge,
                  active.measurement.derived.feed_grade === 'A' && styles.gradeA,
                  active.measurement.derived.feed_grade === 'B' && styles.gradeB,
                  active.measurement.derived.feed_grade === 'REJECT' && styles.gradeReject,
                ]}
              >
                <Text style={styles.gradeText}>GRADE {active.measurement.derived.feed_grade}</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricVal}>
                  {Number(active.measurement.proximates.crude_protein_pct_dm ?? 0).toFixed(1)}%
                </Text>
                <Text style={styles.metricLabel}>Crude Protein</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricVal}>
                  {Number(active.measurement.proximates.moisture_pct ?? 12).toFixed(1)}%
                </Text>
                <Text style={styles.metricLabel}>Moisture</Text>
              </View>
              <View style={styles.metricBox}>
                <Text
                  style={[
                    styles.metricVal,
                    {
                      color: active.measurement.safety.adulteration.urea?.detected
                        ? THEME.colors.danger
                        : THEME.colors.good,
                      fontSize: 12,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {active.measurement.safety.adulteration.urea?.detected ? 'DETECTED' : 'PASS'}
                </Text>
                <Text style={styles.metricLabel}>Urea Screening</Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('home.no_recent_tests', 'No tests yet. Tap TEST FEED to scan.')}</Text>
          </View>
        )}
      </View>

      {/* BUNKER SPOILAGE ALERTS */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.bunker_alerts', 'Bunker Spoilage Watch')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/bunkers')}>
            <Text style={styles.seeAllText}>Bunkers Twin ›</Text>
          </TouchableOpacity>
        </View>

        {bunkers.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={styles.bunkerCard}
            onPress={() => router.push(`/bunkers/${b.id}`)}
          >
            <View style={styles.bunkerRow}>
              <Text style={styles.bunkerName}>{b.name}</Text>
              <Text style={styles.bunkerStatus}>Good Fermentation (pH 3.85)</Text>
            </View>
            <Text style={styles.bunkerSub}>
              {b.crop_type} · {b.capacity_tonnes ?? 350} tonnes · 3 Probes Active
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* QUICK SHORTCUTS */}
      <View style={styles.shortcutRow}>
        <TouchableOpacity style={styles.shortcutBtn} onPress={() => router.push('/qr/verify')}>
          <View style={{ marginBottom: 6 }}>
            <Icon name="camera" size={22} color={THEME.colors.accent} />
          </View>
          <Text style={styles.shortcutLabel}>Verify Batch QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shortcutBtn} onPress={() => router.push('/compare')}>
          <View style={{ marginBottom: 6 }}>
            <Icon name="compare" size={22} color={THEME.colors.caution} />
          </View>
          <Text style={styles.shortcutLabel}>Compare Feeds</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shortcutBtn} onPress={() => router.push('/learn')}>
          <View style={{ marginBottom: 6 }}>
            <Icon name="book" size={22} color={THEME.colors.info} />
          </View>
          <Text style={styles.shortcutLabel}>Feed Lessons</Text>
        </TouchableOpacity>
      </View>
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
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
  },
  chipSuccess: {
    backgroundColor: '#132B18',
    borderColor: THEME.colors.good,
  },
  chipCaution: {
    backgroundColor: '#33240B',
    borderColor: THEME.colors.caution,
  },
  chipNeutral: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
  },
  chipText: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  heroBtn: {
    backgroundColor: THEME.colors.accent,
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: THEME.spacing.sm,
    shadowColor: THEME.colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroIcon: {
    fontSize: 32,
  },
  heroBtnText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0D2B33',
    letterSpacing: 1.5,
  },
  heroBtnSub: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0D2B33',
    marginTop: 4,
  },
  section: {
    marginTop: THEME.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  sectionTitle: {
    ...THEME.typography.h3,
    color: THEME.colors.textPrimary,
  },
  seeAllText: {
    color: THEME.colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  feedType: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  captureTime: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.card,
  },
  gradeA: {
    backgroundColor: THEME.colors.good,
  },
  gradeB: {
    backgroundColor: THEME.colors.caution,
  },
  gradeReject: {
    backgroundColor: THEME.colors.danger,
  },
  gradeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  metricBox: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    borderColor: THEME.colors.border,
    borderWidth: 1,
  },
  emptyText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
  },
  bunkerCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 8,
  },
  bunkerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bunkerName: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  bunkerStatus: {
    fontSize: 12,
    color: THEME.colors.good,
    fontWeight: '600',
  },
  bunkerSub: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: THEME.spacing.lg,
  },
  shortcutBtn: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
});
