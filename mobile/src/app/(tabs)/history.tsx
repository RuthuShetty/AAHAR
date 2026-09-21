/**
 * AAHAR Mobile — Screen 16: History & Timeline
 * Offline-available history of all past tests with grade filters and sync status badges.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { getDatabaseClient } from '../../db/client';
import { MeasurementRepository } from '../../db/repositories/measurementRepository';
import { Measurement, FeedGrade } from '../../types/contracts';
import { useResultStore } from '../../store';

type HistoryItem = Measurement & { id: string; captured_at: string };

export default function HistoryScreen() {
  const router = useRouter();
  const { setActiveResult } = useResultStore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filterGrade, setFilterGrade] = useState<'ALL' | 'A' | 'B' | 'C' | 'REJECT'>('ALL');

  useEffect(() => {
    getDatabaseClient().then(async (db) => {
      const repo = new MeasurementRepository(db);
      const list = await repo.listRecent(50);
      setHistory(list);
    });
  }, []);

  const filtered = history.filter(
    (item) => filterGrade === 'ALL' || item.derived.feed_grade === filterGrade,
  );

  const handleOpenDetail = async (item: HistoryItem) => {
    const db = await getDatabaseClient();
    const repo = new MeasurementRepository(db);
    const full = await repo.getMeasurement(item.id);
    if (full) {
      setActiveResult(full);
      router.push('/results/nutrition');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Test History</Text>
      <Text style={styles.subtitle}>All on-farm tests saved in local SQLite</Text>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'A', 'B', 'C', 'REJECT'] as const).map((grade) => (
          <TouchableOpacity
            key={grade}
            style={[styles.filterChip, filterGrade === grade && styles.filterChipActive]}
            onPress={() => setFilterGrade(grade)}
          >
            <Text
              style={[
                styles.filterText,
                filterGrade === grade && styles.filterTextActive,
              ]}
            >
              {grade === 'ALL' ? 'ALL' : `GRADE ${grade}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Test List */}
      {filtered.length > 0 ? (
        filtered.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={styles.card}
            onPress={() => handleOpenDetail(m)}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.feedType}>{m.feed_type.replace('_', ' ')}</Text>
                <Text style={styles.dateText}>
                  {new Date(m.captured_at).toLocaleDateString()} · {new Date(m.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View
                style={[
                  styles.gradeBadge,
                  m.derived.feed_grade === 'A' && styles.badgeA,
                  m.derived.feed_grade === 'B' && styles.badgeB,
                  m.derived.feed_grade === 'REJECT' && styles.badgeReject,
                ]}
              >
                <Text style={styles.gradeText}>GRADE {m.derived.feed_grade}</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <Text style={styles.metricItem}>Protein: <Text style={styles.metricBold}>{Number(m.proximates.crude_protein_pct_dm ?? 0).toFixed(1)}%</Text></Text>
              <Text style={styles.metricItem}>Moisture: <Text style={styles.metricBold}>{Number(m.proximates.moisture_pct ?? 12).toFixed(1)}%</Text></Text>
              <Text style={[styles.metricItem, { color: m.safety.adulteration.urea?.detected ? THEME.colors.danger : THEME.colors.good, fontWeight: '600' }]}>
                {m.safety.adulteration.urea?.detected ? 'Urea Detected' : 'Pure (Passed)'}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No tests match the selected filter.</Text>
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: THEME.spacing.md,
  },
  filterChip: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
  },
  filterChipActive: {
    borderColor: THEME.colors.accent,
    backgroundColor: THEME.colors.cardElevated,
  },
  filterText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: THEME.colors.accent,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  feedType: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  dateText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
  },
  badgeA: {
    backgroundColor: THEME.colors.good,
  },
  badgeB: {
    backgroundColor: THEME.colors.caution,
  },
  badgeReject: {
    backgroundColor: THEME.colors.danger,
  },
  gradeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  metricItem: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  metricBold: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
  },
});
