/**
 * AAHAR Mobile — Screen 5: Feed Type Picker
 * Visual grid / carousel of 15 standardised feed types with icons and vernacular labels.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { FeedType, FeedTypeMeta } from '../../types/contracts';
import { useScanStore, useSettingsStore } from '../../store';
import { speechSynthesizer } from '../../i18n/tts';

const FEED_TYPES: FeedType[] = [
  'COTTONSEED_CAKE',
  'MUSTARD_CAKE',
  'MAIZE_SILAGE',
  'WHEAT_STRAW',
  'TMR',
  'GREEN_FODDER',
  'CONCENTRATE_MIX',
  'BERSEEM',
  'NAPIER',
  'SORGHUM_SILAGE',
  'GROUNDNUT_CAKE',
  'RICE_STRAW',
  'SOYBEAN_MEAL',
  'MAIZE_GRAIN',
];

export default function FeedTypePickerScreen() {
  const router = useRouter();
  const { selectedFeedType, setSelectedFeedType } = useScanStore();
  const { language } = useSettingsStore();

  const handleSelect = (feed: FeedType) => {
    setSelectedFeedType(feed);
    const meta = FeedTypeMeta[feed];
    const label = language === 'pa' ? meta.label_pa : language === 'hi' ? meta.label_hi : meta.label_en;
    speechSynthesizer.speak(label, language);
    router.push('/scan/tutorial');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Select Feed Type</Text>
      <Text style={styles.subtitle}>Choose the sample you are about to test</Text>

      <View style={styles.grid}>
        {FEED_TYPES.map((feed) => {
          const meta = FeedTypeMeta[feed];
          const isSelected = selectedFeedType === feed;
          const displayLabel = language === 'pa' ? meta.label_pa : language === 'hi' ? meta.label_hi : meta.label_en;

          return (
            <TouchableOpacity
              key={feed}
              style={[styles.feedCard, isSelected && styles.cardSelected]}
              onPress={() => handleSelect(feed)}
              activeOpacity={0.8}
            >
              <Text style={styles.feedIcon}>{meta.icon}</Text>
              <Text style={[styles.feedLabel, isSelected && styles.labelSelected]}>
                {displayLabel}
              </Text>
              <Text style={styles.groupBadge}>{meta.model_group.toUpperCase()}</Text>
            </TouchableOpacity>
          );
        })}
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
  title: {
    ...THEME.typography.h1,
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    ...THEME.typography.body,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  feedCard: {
    width: '48%',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    alignItems: 'center',
    minHeight: 125,
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: THEME.colors.accent,
    backgroundColor: THEME.colors.cardElevated,
  },
  feedIcon: {
    fontSize: 36,
    marginBottom: 6,
  },
  feedLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  labelSelected: {
    color: THEME.colors.accent,
  },
  groupBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
});
