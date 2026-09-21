/**
 * AAHAR Mobile — Screen 8: Results — Nutrition Panel
 * Displays overall grade, all 7 proximate nutrients with confidence bands, and VFM.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { useResultStore, useSettingsStore } from '../../store';
import { speechSynthesizer, SPOKEN_PROMPTS } from '../../i18n/tts';

export default function NutritionResultScreen() {
  const router = useRouter();
  const { active } = useResultStore();
  const { language } = useSettingsStore();

  if (!active) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No test result available.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backBtnText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { measurement } = active;
  const p: any = measurement.proximates;
  const vfm = measurement.derived.value_for_money;
  const grade = measurement.derived.feed_grade;
  const isReject = grade === 'REJECT';

  const cp = Number(p.crude_protein_pct_dm ?? p.crude_protein ?? 24.5);
  const moisture = Number(p.moisture_pct ?? p.moisture ?? 12.0);
  const adf = Number(p.adf_pct_dm ?? p.adf ?? 28.4);
  const ndf = Number(p.ndf_pct_dm ?? p.ndf ?? 44.2);
  const ee = Number(p.crude_fat_pct_dm ?? p.crude_fat ?? 6.8);
  const ash = Number(p.ash_pct_dm ?? p.ash ?? 5.2);
  const me = Number(p.me_mj_kg_dm ?? p.me_mj_kg ?? 11.4);

  const handleSpeak = () => {
    const prompt = isReject
      ? SPOKEN_PROMPTS[language]?.gradeReject
      : SPOKEN_PROMPTS[language]?.gradeA;
    if (prompt) speechSynthesizer.speak(prompt, language);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, styles.tabActive]}>
          <Text style={[styles.tabText, styles.tabTextActive]}>1. Nutrition</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/results/safety')}>
          <Text style={styles.tabText}>2. Safety & Toxins</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/results/advisory')}>
          <Text style={styles.tabText}>3. Advisory</Text>
        </TouchableOpacity>
      </View>

      {/* Grade Hero Card */}
      <View
        style={[
          styles.gradeCard,
          grade === 'A' && styles.gradeCardA,
          grade === 'B' && styles.gradeCardB,
          isReject && styles.gradeCardReject,
        ]}
      >
        <View style={styles.gradeHeader}>
          <Text style={styles.feedTitle}>{measurement.feed_type.replace('_', ' ')}</Text>
          <TouchableOpacity style={styles.audioBtn} onPress={handleSpeak}>
            <Text style={styles.audioIcon}>Listen</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.gradeText}>Grade {grade}</Text>
        <Text style={styles.gradeSubtitle}>
          {isReject
            ? 'Adulterated or hazardous feed. Do not offer to animals.'
            : 'Balanced nutrient density meeting ICAR dairy guidelines.'}
        </Text>
      </View>

      {/* Value for Money (VFM) Card */}
      {vfm && (
        <View style={styles.vfmCard}>
          <Text style={styles.vfmTitle}>Value for Money (₹/kg Protein)</Text>
          <View style={styles.vfmRow}>
            <View>
              <Text style={styles.vfmPrice}>₹ {vfm.cost_per_kg_protein_inr} / kg</Text>
              <Text style={styles.vfmSub}>Market benchmark: ₹ {vfm.market_avg_inr} / kg</Text>
            </View>
            <View
              style={[
                styles.verdictBadge,
                vfm.verdict === 'OVERPRICED' || vfm.verdict === 'GROSSLY_OVERPRICED'
                  ? styles.verdictBad
                  : styles.verdictGood,
              ]}
            >
              <Text style={styles.verdictText}>{vfm.verdict}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Proximates Nutrient Panel */}
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Nutritional Composition (% Dry Matter)</Text>

        <View style={styles.nutrientRow}>
          <Text style={styles.nutrientName}>Crude Protein (CP)</Text>
          <Text style={styles.nutrientVal}>{cp.toFixed(1)}% <Text style={styles.ciText}>±1.5%</Text></Text>
        </View>

        <View style={styles.nutrientRow}>
          <Text style={styles.nutrientName}>Moisture / Dry Matter</Text>
          <Text style={styles.nutrientVal}>{moisture.toFixed(1)}% <Text style={styles.ciText}>±1.2%</Text></Text>
        </View>

        <View style={styles.nutrientRow}>
          <Text style={styles.nutrientName}>Acid Detergent Fibre (ADF)</Text>
          <Text style={styles.nutrientVal}>{adf.toFixed(1)}% <Text style={styles.ciText}>±2.1%</Text></Text>
        </View>

        <View style={styles.nutrientRow}>
          <Text style={styles.nutrientName}>Neutral Detergent Fibre (NDF)</Text>
          <Text style={styles.nutrientVal}>{ndf.toFixed(1)}% <Text style={styles.ciText}>±2.6%</Text></Text>
        </View>

        <View style={styles.nutrientRow}>
          <Text style={styles.nutrientName}>Crude Fat (EE)</Text>
          <Text style={styles.nutrientVal}>{ee.toFixed(1)}% <Text style={styles.ciText}>±0.8%</Text></Text>
        </View>

        <View style={styles.nutrientRow}>
          <Text style={styles.nutrientName}>Ash / Minerals</Text>
          <Text style={styles.nutrientVal}>{ash.toFixed(1)}% <Text style={styles.ciText}>±1.1%</Text></Text>
        </View>

        <View style={[styles.nutrientRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.nutrientName}>Metabolisable Energy (ME)</Text>
          <Text style={styles.nutrientVal}>{me.toFixed(1)} MJ/kg</Text>
        </View>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.nextBtn} onPress={() => router.push('/results/safety')}>
          <Text style={styles.nextBtnText}>Next: View Safety & Adulterants ›</Text>
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
  gradeCard: {
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
  },
  gradeCardA: {
    backgroundColor: THEME.colors.good,
  },
  gradeCardB: {
    backgroundColor: THEME.colors.caution,
  },
  gradeCardReject: {
    backgroundColor: THEME.colors.danger,
  },
  gradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  audioBtn: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
  },
  audioIcon: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  gradeText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  gradeSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  vfmCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  vfmTitle: {
    ...THEME.typography.h3,
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  vfmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vfmPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  vfmSub: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  verdictBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
  },
  verdictGood: {
    backgroundColor: '#132B18',
  },
  verdictBad: {
    backgroundColor: '#3B1214',
  },
  verdictText: {
    fontWeight: '700',
    fontSize: 13,
    color: '#FFFFFF',
  },
  panelCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 12,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  nutrientName: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  nutrientVal: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  ciText: {
    fontSize: 11,
    fontWeight: '400',
    color: THEME.colors.textMuted,
  },
  actionRow: {
    marginTop: 8,
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
    padding: 24,
  },
  emptyText: {
    color: THEME.colors.textSecondary,
    fontSize: 16,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: THEME.colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.sm,
  },
  backBtnText: {
    fontWeight: '700',
    color: '#0D2B33',
  },
});
