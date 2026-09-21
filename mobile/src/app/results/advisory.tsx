/**
 * AAHAR Mobile — Screen 10: Plain-Language Advisory & Ration Balance
 * Displays vernacular recommendations, audio playback, herd impact analysis, and WhatsApp sharing.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { useResultStore, useSettingsStore } from '../../store';
import { speechSynthesizer } from '../../i18n/tts';

export default function AdvisoryResultScreen() {
  const router = useRouter();
  const { active } = useResultStore();
  const { language } = useSettingsStore();

  if (!active || !active.advisory) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No advisory available.</Text>
      </View>
    );
  }

  const { advisory, measurement } = active;

  // Select summary based on farmer's chosen language
  const summary = (advisory.text as any)[language] ?? advisory.text.en;

  const handleSpeak = () => {
    speechSynthesizer.speak(summary, language);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `*AAHAR Feed Test Result*\nFeed: ${measurement.feed_type.replace('_', ' ')}\nGrade: ${measurement.derived.feed_grade}\nProtein: ${Number(measurement.proximates.crude_protein_pct_dm ?? 0).toFixed(1)}%\nAdulteration: ${measurement.safety.adulteration.urea?.detected ? 'ALERT UREA DETECTED' : 'PASS CLEAN'}\n\n*Advisory:*\n${summary}`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/results/nutrition')}>
          <Text style={styles.tabText}>1. Nutrition</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/results/safety')}>
          <Text style={styles.tabText}>2. Safety & Toxins</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, styles.tabActive]}>
          <Text style={[styles.tabText, styles.tabTextActive]}>3. Advisory</Text>
        </TouchableOpacity>
      </View>

      {/* Voice Playback Hero Banner */}
      <View style={styles.voiceCard}>
        <View style={styles.voiceHeader}>
          <Text style={styles.voiceTitle}>Plain-Language Advisory</Text>
          <TouchableOpacity style={styles.speakerBtn} onPress={handleSpeak}>
            <Text style={styles.speakerIcon}>Listen</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.summaryText}>{summary}</Text>
      </View>

      {/* Immediate Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Immediate Actions</Text>
        {advisory.actions.map((act, idx) => (
          <View key={idx} style={styles.actionItem}>
            <Text style={styles.actionBullet}>•</Text>
            <View style={styles.actionTextCol}>
              <Text style={styles.actionText}>{act.action_key.replace(/_/g, ' ').toUpperCase()}</Text>
              <Text style={styles.actionTiming}>Priority: {act.priority} | Severity: {act.severity}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Ration Adjustments */}
      {advisory.ration_correction?.adjustments && advisory.ration_correction.adjustments.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ration Correction</Text>
          {advisory.ration_correction.adjustments.map((adj, idx) => (
            <View key={idx} style={styles.rationRow}>
              <Text style={styles.rationItem}>{adj.feed_type.replace('_', ' ')}</Text>
              <Text style={styles.rationQty}>
                {adj.change_kg_per_animal_per_day > 0 ? `+${adj.change_kg_per_animal_per_day}` : adj.change_kg_per_animal_per_day} kg / cow / day
              </Text>
              <Text style={styles.rationReason}>{adj.rationale_key?.replace(/_/g, ' ') ?? 'Nutritional balance'}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 3D Cow Herd Impact Highlights */}
      {advisory.herd_impacts.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Herd Health Impacts</Text>
          {advisory.herd_impacts.map((imp, idx) => (
            <View key={idx} style={styles.impactCard}>
              <View style={styles.impactHeader}>
                <Text style={styles.impactOrgan}>System: {imp.body_system}</Text>
                <Text style={styles.impactSeverity}>{imp.severity}</Text>
              </View>
              <Text style={styles.impactFinding}>{imp.explanation_key.replace(/_/g, ' ')}</Text>
              {imp.fix_key && <Text style={styles.impactFix}>Fix: {imp.fix_key.replace(/_/g, ' ')}</Text>}
            </View>
          ))}
        </View>
      )}

      {/* Three Actions (Section 3 Journey A Beat 10): SAVE / COMPARE / SHARE VIA WHATSAPP */}
      <View style={styles.actionBtnGroup}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Share via WhatsApp</Text>
        </TouchableOpacity>

        <View style={styles.dualBtns}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/compare')}>
            <Text style={styles.secondaryBtnText}>Compare</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.primaryBtnText}>Done (Saved)</Text>
          </TouchableOpacity>
        </View>
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
  voiceCard: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.accent,
    borderWidth: 1.5,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  voiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  voiceTitle: {
    ...THEME.typography.h3,
    color: THEME.colors.textPrimary,
  },
  speakerBtn: {
    backgroundColor: THEME.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
  },
  speakerIcon: {
    color: '#0D2B33',
    fontWeight: '700',
    fontSize: 13,
  },
  summaryText: {
    fontSize: 16,
    color: THEME.colors.textPrimary,
    lineHeight: 24,
    fontWeight: '500',
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
  actionItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  actionBullet: {
    color: THEME.colors.accent,
    fontSize: 18,
    marginRight: 8,
    marginTop: -2,
  },
  actionTextCol: {
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    lineHeight: 20,
  },
  actionTiming: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  rationRow: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingVertical: 8,
  },
  rationItem: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  rationQty: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.accent,
    marginTop: 2,
  },
  rationReason: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  impactCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.sm,
    padding: 10,
    marginBottom: 8,
  },
  impactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  impactOrgan: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.accent,
  },
  impactSeverity: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.danger,
  },
  impactFinding: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  impactFix: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  actionBtnGroup: {
    gap: 10,
    marginTop: 8,
  },
  shareBtn: {
    backgroundColor: '#25D366', // WhatsApp Green
    minHeight: THEME.touchTargetMin,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 16,
  },
  dualBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    minHeight: THEME.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surface,
  },
  secondaryBtnText: {
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    fontSize: 14,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: THEME.colors.good,
    borderRadius: THEME.borderRadius.md,
    minHeight: THEME.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 14,
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
