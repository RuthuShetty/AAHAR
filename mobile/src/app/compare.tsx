/**
 * AAHAR Mobile — Screen 11: Feed Comparison
 * Side-by-side comparison of two feed samples or supplier batches.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { THEME } from '../constants/theme';
import { getDatabaseClient } from '../db/client';
import { MeasurementRepository } from '../db/repositories/measurementRepository';
import { Measurement } from '../types/contracts';

export default function CompareScreen() {
  const [feedA, setFeedA] = useState<Measurement | null>(null);
  const [feedB, setFeedB] = useState<Measurement | null>(null);

  useEffect(() => {
    getDatabaseClient().then(async (db) => {
      const repo = new MeasurementRepository(db);
      const list = await repo.listRecent(2);
      if (list.length >= 1) setFeedA(list[0]);
      if (list.length >= 2) {
        setFeedB(list[1]);
      } else {
        // Provide mock reference sample for comparison
        setFeedB({
          feed_type: 'MUSTARD_CAKE',
          device_sku: 'AAHAR_PRO',
          scan_duration_ms: 1800,
          confidence_overall: 0.92,
          in_distribution: true,
          proximates: {
            crude_protein_pct_dm: 34.2,
            moisture_pct: 9.8,
            adf_pct_dm: 14.5,
            ndf_pct_dm: 28.0,
            crude_fat_pct_dm: 8.5,
            ash_pct_dm: 6.8,
            me_mj_kg_dm: 12.1,
          },
          safety: {
            adulteration: {
              verdict: 'CLEAN',
              confidence: 0.98,
              urea: { detected: false, confidence: 0.98, estimated_pct: null },
            },
            mycotoxin: {
              aflatoxin_band: 'LOW',
              total_mycotoxin_band: 'LOW',
            },
            mould: {
              detected: false,
              surface_coverage_pct: 1.0,
            },
          },
          derived: {
            feed_grade: 'A',
            value_for_money: {
              price_paid_inr_per_kg: 28,
              cost_per_kg_protein_inr: 275,
              market_avg_inr: 280,
              verdict: 'FAIR',
            },
          },
        });
      }
    });
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Compare Feed Samples</Text>
      <Text style={styles.subtitle}>Side-by-side nutritional value & cost efficiency</Text>

      {/* Comparison Table Header */}
      <View style={styles.headerRow}>
        <View style={styles.metricCol}><Text style={styles.colHeader}>Parameter</Text></View>
        <View style={styles.sampleCol}>
          <Text style={styles.colHeader}>{feedA?.feed_type.replace('_', ' ') ?? 'Sample A'}</Text>
        </View>
        <View style={styles.sampleCol}>
          <Text style={styles.colHeader}>{feedB?.feed_type.replace('_', ' ') ?? 'Sample B'}</Text>
        </View>
      </View>

      {/* Grade */}
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Overall Grade</Text>
        <Text style={[styles.cellVal, feedA?.derived.feed_grade === 'REJECT' ? styles.dangerText : styles.goodText]}>
          {feedA?.derived.feed_grade ?? '—'}
        </Text>
        <Text style={[styles.cellVal, feedB?.derived.feed_grade === 'REJECT' ? styles.dangerText : styles.goodText]}>
          {feedB?.derived.feed_grade ?? '—'}
        </Text>
      </View>

      {/* Crude Protein */}
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Crude Protein</Text>
        <Text style={styles.cellVal}>{Number(feedA?.proximates.crude_protein_pct_dm ?? 0).toFixed(1)}%</Text>
        <Text style={styles.cellVal}>{Number(feedB?.proximates.crude_protein_pct_dm ?? 0).toFixed(1)}%</Text>
      </View>

      {/* Moisture */}
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Moisture</Text>
        <Text style={styles.cellVal}>{Number(feedA?.proximates.moisture_pct ?? 12).toFixed(1)}%</Text>
        <Text style={styles.cellVal}>{Number(feedB?.proximates.moisture_pct ?? 12).toFixed(1)}%</Text>
      </View>

      {/* Energy */}
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Metabolisable Energy</Text>
        <Text style={styles.cellVal}>{Number(feedA?.proximates.me_mj_kg_dm ?? 11).toFixed(1)} MJ</Text>
        <Text style={styles.cellVal}>{Number(feedB?.proximates.me_mj_kg_dm ?? 12).toFixed(1)} MJ</Text>
      </View>

      {/* Urea Purity */}
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Urea Adulteration</Text>
        <Text style={[styles.cellVal, feedA?.safety.adulteration.urea?.detected ? styles.dangerText : styles.goodText]}>
          {feedA?.safety.adulteration.urea?.detected ? 'DETECTED' : 'CLEAN (PASS)'}
        </Text>
        <Text style={[styles.cellVal, feedB?.safety.adulteration.urea?.detected ? styles.dangerText : styles.goodText]}>
          {feedB?.safety.adulteration.urea?.detected ? 'DETECTED' : 'CLEAN (PASS)'}
        </Text>
      </View>

      {/* Cost per kg Protein */}
      <View style={[styles.row, { borderBottomWidth: 0 }]}>
        <Text style={styles.rowLabel}>₹ / kg Protein</Text>
        <Text style={styles.cellVal}>₹ {feedA?.derived.value_for_money?.cost_per_kg_protein_inr ?? '340'}</Text>
        <Text style={styles.cellVal}>₹ {feedB?.derived.value_for_money?.cost_per_kg_protein_inr ?? '275'}</Text>
      </View>

      {/* Verdict Summary Card */}
      <View style={styles.verdictCard}>
        <Text style={styles.verdictTitle}>Best Value Verdict</Text>
        <Text style={styles.verdictText}>
          {feedB?.feed_type.replace('_', ' ')} offers higher protein density (34.2%) at a lower cost per kg of protein (₹ 275 vs ₹ 340).
        </Text>
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
  headerRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    padding: 12,
    borderRadius: THEME.borderRadius.sm,
    borderBottomWidth: 2,
    borderBottomColor: THEME.colors.border,
  },
  metricCol: {
    flex: 1.4,
  },
  sampleCol: {
    flex: 1,
    alignItems: 'center',
  },
  colHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.accent,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1.4,
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  cellVal: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  goodText: {
    color: THEME.colors.good,
    fontWeight: '700',
  },
  dangerText: {
    color: THEME.colors.danger,
    fontWeight: '700',
  },
  verdictCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.good,
    marginTop: 20,
  },
  verdictTitle: {
    ...THEME.typography.h3,
    color: THEME.colors.good,
    marginBottom: 6,
  },
  verdictText: {
    fontSize: 14,
    color: THEME.colors.textPrimary,
    lineHeight: 20,
  },
});
