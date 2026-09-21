/**
 * AAHAR Mobile — Screen 6: Sample Prep Tutorial
 * Guided sample chamber preparation. Low-literacy visuals with voice prompts.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { useScanStore, useSettingsStore } from '../../store';
import { speechSynthesizer } from '../../i18n/tts';

export default function SamplePrepTutorialScreen() {
  const router = useRouter();
  const { selectedFeedType } = useScanStore();
  const { language } = useSettingsStore();

  const handleStartScan = () => {
    const prompt = language === 'pa' ? 'ਸਕੈਨਿੰਗ ਸ਼ੁਰੂ ਹੋ ਰਹੀ ਹੈ' : 'जांच शुरू हो रही है';
    speechSynthesizer.speak(prompt, language);
    router.replace('/scan/active');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Sample Chamber Prep</Text>
      <Text style={styles.subtitle}>Preparing {selectedFeedType.replace('_', ' ')}</Text>

      {/* Visual Steps */}
      <View style={styles.stepCard}>
        <View style={styles.stepNumber}>
          <Text style={styles.numberText}>1</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Twist Open Chamber</Text>
          <Text style={styles.stepDesc}>
            Twist the quartz-window chamber 45° counter-clockwise to unlock the optical port.
          </Text>
          <Text style={styles.visualEmoji}>[STEP 1: OPEN CHAMBER]</Text>
        </View>
      </View>

      <View style={styles.stepCard}>
        <View style={styles.stepNumber}>
          <Text style={styles.numberText}>2</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Fill Sample Level</Text>
          <Text style={styles.stepDesc}>
            Fill 30 ml of feed sample level with the rim. Lightly tamp down to eliminate air voids.
          </Text>
          <Text style={styles.visualEmoji}>[STEP 2: LOAD SAMPLE]</Text>
        </View>
      </View>

      <View style={styles.stepCard}>
        <View style={styles.stepNumber}>
          <Text style={styles.numberText}>3</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Lock Chamber Tightly</Text>
          <Text style={styles.stepDesc}>
            Re-seat the chamber and twist clockwise until the green interlock LED clicks on.
          </Text>
          <Text style={styles.visualEmoji}>[STEP 3: CLOSE & SECURE]</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.startBtn} onPress={handleStartScan}>
        <Text style={styles.startBtnText}>Ready — Start Scan</Text>
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
  title: {
    ...THEME.typography.h1,
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    ...THEME.typography.body,
    color: THEME.colors.accent,
    marginBottom: THEME.spacing.md,
  },
  stepCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  numberText: {
    color: '#0D2B33',
    fontWeight: '800',
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  visualEmoji: {
    fontSize: 24,
    marginTop: 8,
  },
  startBtn: {
    backgroundColor: THEME.colors.good,
    minHeight: THEME.touchTargetMin,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.lg,
    shadowColor: THEME.colors.good,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startBtnText: {
    ...THEME.typography.h3,
    color: '#FFFFFF',
  },
});
