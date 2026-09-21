/**
 * AAHAR Mobile — Screen 1: Language & Voice Onboarding
 * Pick language from 8 Indian languages, hear audio sample, grant voice permissions.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { SUPPORTED_LOCALES, SupportedLocaleCode } from '../../i18n';
import { useSettingsStore } from '../../store';
import { speechSynthesizer, SPOKEN_PROMPTS } from '../../i18n/tts';

export default function LanguageOnboardingScreen() {
  const router = useRouter();
  const { language, setLanguage } = useSettingsStore();

  const handleSelectLanguage = async (code: SupportedLocaleCode) => {
    await setLanguage(code);
    // Play voice greeting in selected language
    const sample = SPOKEN_PROMPTS[code]?.gradeA ?? 'Welcome to AAHAR';
    speechSynthesizer.speak(sample, code);
  };

  const handleContinue = () => {
    router.push('/onboarding/farm');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.logo}>AAHAR</Text>
        <Text style={styles.title}>Select Your Language</Text>
        <Text style={styles.subtitle}>अपनी भाषा चुनें / ਆਪਣੀ ਬੋਲੀ ਚੁਣੋ</Text>
      </View>

      <View style={styles.grid}>
        {SUPPORTED_LOCALES.map((loc) => {
          const isSelected = language === loc.code;
          return (
            <TouchableOpacity
              key={loc.code}
              style={[styles.langCard, isSelected && styles.langCardSelected]}
              onPress={() => handleSelectLanguage(loc.code)}
              activeOpacity={0.8}
            >
              <View style={styles.langHeader}>
                <Text style={styles.flag}>{loc.flag}</Text>
                <TouchableOpacity
                  style={styles.speakerBtn}
                  onPress={() => {
                    speechSynthesizer.speak(SPOKEN_PROMPTS[loc.code]?.gradeA ?? loc.name, loc.code);
                  }}
                >
                  <Text style={styles.speakerIcon}>AUDIO</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.nativeName, isSelected && styles.textSelected]}>
                {loc.nativeName}
              </Text>
              <Text style={styles.langName}>{loc.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
        <Text style={styles.continueText}>Continue / आगे बढ़ें</Text>
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
  header: {
    alignItems: 'center',
    marginVertical: THEME.spacing.lg,
  },
  logo: {
    fontSize: 24,
    color: THEME.colors.accent,
    fontWeight: '700',
    marginBottom: THEME.spacing.xs,
  },
  title: {
    ...THEME.typography.h1,
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    ...THEME.typography.body,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.xl,
  },
  langCard: {
    width: '48%',
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1.5,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  langCardSelected: {
    borderColor: THEME.colors.accent,
    backgroundColor: THEME.colors.cardElevated,
  },
  langHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flag: {
    fontSize: 24,
  },
  speakerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerIcon: {
    fontSize: 16,
  },
  nativeName: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 8,
  },
  textSelected: {
    color: THEME.colors.accent,
  },
  langName: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  continueBtn: {
    backgroundColor: THEME.colors.good,
    minHeight: THEME.touchTargetMin,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.good,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  continueText: {
    ...THEME.typography.h3,
    color: '#FFFFFF',
  },
});
