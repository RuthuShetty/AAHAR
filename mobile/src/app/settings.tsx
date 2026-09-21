/**
 * AAHAR Mobile — Screen 20: Settings & Accessibility
 * Configures language, high-contrast outdoor theme, 3D lite mode, and data limits.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../constants/theme';
import { SUPPORTED_LOCALES, SupportedLocaleCode } from '../i18n';
import { useSettingsStore } from '../store';

export default function SettingsScreen() {
  const router = useRouter();
  const { language, setLanguage, highContrast, setHighContrast, liteMode3D, setLiteMode3D, voiceAutoPlay, setVoiceAutoPlay } = useSettingsStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Preferences & Accessibility</Text>

      {/* Language Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>App Language / भाषा</Text>
        <View style={styles.langList}>
          {SUPPORTED_LOCALES.map((loc) => {
            const isSelected = language === loc.code;
            return (
              <TouchableOpacity
                key={loc.code}
                style={[styles.langRow, isSelected && styles.langRowSelected]}
                onPress={() => setLanguage(loc.code)}
              >
                <View style={[styles.langFlag, { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? THEME.colors.accent : THEME.colors.textSecondary }}>{loc.flag}</Text>
                </View>
                <View style={styles.langTexts}>
                  <Text style={[styles.nativeText, isSelected && styles.accentText]}>
                    {loc.nativeName}
                  </Text>
                  <Text style={styles.englishText}>{loc.name}</Text>
                </View>
                {isSelected && <Text style={[styles.checkmark, { color: THEME.colors.accent, fontWeight: '700' }]}>OK</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Accessibility & Visuals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Accessibility & Display</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingLabel}>High-Contrast Outdoor Theme</Text>
            <Text style={styles.settingSub}>Maximum contrast for readability in direct sunlight</Text>
          </View>
          <Switch
            value={highContrast}
            onValueChange={setHighContrast}
            trackColor={{ true: THEME.colors.accent, false: THEME.colors.card }}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingLabel}>3D Lite Mode</Text>
            <Text style={styles.settingSub}>Replaces 3D meshes with 2D charts on budget phones</Text>
          </View>
          <Switch
            value={liteMode3D}
            onValueChange={setLiteMode3D}
            trackColor={{ true: THEME.colors.accent, false: THEME.colors.card }}
          />
        </View>

        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingLabel}>Voice-First Audio Auto-Play</Text>
            <Text style={styles.settingSub}>Speaks advisory summary aloud when results load</Text>
          </View>
          <Switch
            value={voiceAutoPlay}
            onValueChange={setVoiceAutoPlay}
            trackColor={{ true: THEME.colors.accent, false: THEME.colors.card }}
          />
        </View>
      </View>

      {/* Farm & Scanner Setup Shortcuts */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hardware & Farm</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/device/pair')}>
          <Text style={styles.linkText}>Scanner Calibration & Status</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/onboarding/farm')}>
          <Text style={styles.linkText}>Edit Farm & Herd Profile</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/sync')}>
          <Text style={styles.linkText}>Sync Centre & Cellular Data Guard</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* App Info & DPDP Act 2023 */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>AAHAR v0.1.0-alpha</Text>
        <Text style={styles.infoSub}>
          Aligned with India Digital Personal Data Protection (DPDP) Act 2023. All records encrypted on-device. Cloud sync is farmer-consented.
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
    marginBottom: 10,
  },
  langList: {
    gap: 4,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: THEME.borderRadius.sm,
  },
  langRowSelected: {
    backgroundColor: THEME.colors.cardElevated,
  },
  langFlag: {
    fontSize: 20,
    marginRight: 10,
  },
  langTexts: {
    flex: 1,
  },
  nativeText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  englishText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  accentText: {
    color: THEME.colors.accent,
  },
  checkmark: {
    color: THEME.colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  settingTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  settingSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  linkText: {
    fontSize: 14,
    color: THEME.colors.textPrimary,
  },
  linkArrow: {
    fontSize: 18,
    color: THEME.colors.accent,
  },
  infoBox: {
    padding: 16,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  infoSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
