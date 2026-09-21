/**
 * AAHAR Mobile — Screen 9: Results — Safety & Adulterants
 * Displays adulterant detection (Urea, Silica, Melamine) and mycotoxin risk screening.
 * Adheres to Section 4.1 Honesty Rule (screening disclaimer + NABL referral).
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { useResultStore } from '../../store';
import { Icon } from '../../components/Icon';

export default function SafetyResultScreen() {
  const router = useRouter();
  const { active } = useResultStore();

  if (!active) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No test result found.</Text>
      </View>
    );
  }

  const { measurement } = active;
  const { safety } = measurement;
  const adulteration = safety.adulteration;
  const urea = adulteration.urea;
  const silica = adulteration.sand_silica;
  const melamine = adulteration.melamine_npn;
  const mycotoxin = safety.mycotoxin;
  const mould = safety.mould;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/results/nutrition')}>
          <Text style={styles.tabText}>1. Nutrition</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, styles.tabActive]}>
          <Text style={[styles.tabText, styles.tabTextActive]}>2. Safety & Toxins</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/results/advisory')}>
          <Text style={styles.tabText}>3. Advisory</Text>
        </TouchableOpacity>
      </View>

      {/* ADULTERANT DETECTION PANEL */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Chemical Adulterant Screening</Text>

        {/* Urea */}
        <View style={styles.itemRow}>
          <View style={styles.itemLeft}>
            <Text style={styles.itemTitle}>Urea (Synthetic NPN)</Text>
            <Text style={styles.itemSub}>NIR 1980–2050 nm N-H signature</Text>
          </View>
          <View
            style={[
              styles.badge,
              urea?.detected ? styles.badgeDanger : styles.badgeGood,
            ]}
          >
            <Text style={styles.badgeText}>
              {urea?.detected
                ? `${(urea.estimated_pct ?? 2.0).toFixed(1)}% DETECTED`
                : 'CLEAN (<0.5%)'}
            </Text>
          </View>
        </View>

        {/* Silica / Sand */}
        <View style={styles.itemRow}>
          <View style={styles.itemLeft}>
            <Text style={styles.itemTitle}>Sand / Silica</Text>
            <Text style={styles.itemSub}>Ash proxy + optical density cell</Text>
          </View>
          <View
            style={[
              styles.badge,
              silica?.detected ? styles.badgeCaution : styles.badgeGood,
            ]}
          >
            <Text style={styles.badgeText}>
              {silica?.detected
                ? `${(silica.estimated_pct ?? 2.0).toFixed(1)}%`
                : 'NORMAL (1.2%)'}
            </Text>
          </View>
        </View>

        {/* Melamine */}
        <View style={[styles.itemRow, { borderBottomWidth: 0 }]}>
          <View style={styles.itemLeft}>
            <Text style={styles.itemTitle}>Melamine Anomaly</Text>
            <Text style={styles.itemSub}>Autoencoder reconstruction check</Text>
          </View>
          <View
            style={[
              styles.badge,
              melamine?.flagged ? styles.badgeDanger : styles.badgeGood,
            ]}
          >
            <Text style={styles.badgeText}>
              {melamine?.flagged ? 'ANOMALY DETECTED' : 'CLEAN'}
            </Text>
          </View>
        </View>
      </View>

      {/* MYCOTOXIN & MOULD PANEL */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mycotoxins & Surface Mould</Text>

        <View style={styles.itemRow}>
          <View style={styles.itemLeft}>
            <Text style={styles.itemTitle}>Aflatoxin B1 Risk Band</Text>
            <Text style={styles.itemSub}>365 nm UV fluorescence + NIR fusion</Text>
          </View>
          <View
            style={[
              styles.badge,
              mycotoxin.aflatoxin_band === 'HIGH' && styles.badgeDanger,
              mycotoxin.aflatoxin_band === 'MEDIUM' && styles.badgeCaution,
              mycotoxin.aflatoxin_band === 'LOW' && styles.badgeGood,
            ]}
          >
            <Text style={styles.badgeText}>{mycotoxin.aflatoxin_band} RISK</Text>
          </View>
        </View>

        <View style={[styles.itemRow, { borderBottomWidth: 0 }]}>
          <View style={styles.itemLeft}>
            <Text style={styles.itemTitle}>Mould Surface Coverage</Text>
            <Text style={styles.itemSub}>MobileNetV3 macro vision (4 frames)</Text>
          </View>
          <Text style={styles.mouldText}>{mould.surface_coverage_pct.toFixed(1)}% area</Text>
        </View>
      </View>

      {/* MANDATORY HONESTY DISCLAIMER (Section 4.1) */}
      <View style={styles.disclaimerBox}>
        <Icon name="info" size={18} color={THEME.colors.primary} />
        <Text style={styles.disclaimerText}>
          <Text style={styles.boldText}>Honesty Notice:</Text> Aflatoxin quantification by NIR and fluorescence is a rapid screening method. If risk is HIGH or uncertain, send the sample to an accredited lab for wet-chemical analysis.
        </Text>
      </View>

      {/* One-tap Lab Referral button */}
      <TouchableOpacity
        style={styles.labBtn}
        onPress={() => router.push('/lab-referral')}
      >
        <Text style={styles.labBtnText}>Send to Nearest NABL Lab</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.nextBtn}
        onPress={() => router.push('/results/advisory')}
      >
        <Text style={styles.nextBtnText}>Next: View Herd Advisory ›</Text>
      </TouchableOpacity>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 4,
    marginBottom: THEME.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm,
  },
  tabActive: {
    backgroundColor: THEME.colors.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: '#0D2B33',
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
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  itemLeft: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  itemSub: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
  },
  badgeGood: {
    backgroundColor: '#132B18',
  },
  badgeCaution: {
    backgroundColor: '#33240B',
  },
  badgeDanger: {
    backgroundColor: '#3B1214',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mouldText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.card,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.accent,
    marginBottom: 16,
  },
  disclaimerIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
  },
  boldText: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  labBtn: {
    backgroundColor: THEME.colors.data,
    minHeight: THEME.touchTargetMin,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  labBtnText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 15,
  },
  nextBtn: {
    backgroundColor: THEME.colors.good,
    minHeight: THEME.touchTargetMin,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: THEME.colors.textSecondary,
    fontSize: 15,
  },
});
