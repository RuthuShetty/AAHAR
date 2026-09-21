/**
 * AAHAR Mobile — Root Layout
 */

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../i18n'; // Initialize i18next
import { THEME } from '../constants/theme';
import { getDatabaseClient } from '../db/client';

export default function RootLayout() {
  useEffect(() => {
    // Proactively initialize DB client and tables on app mount
    getDatabaseClient().catch((err) => {
      // In mobile dev, log connection status
      console.warn('DB client initialization error:', err);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={THEME.colors.background} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: THEME.colors.background,
          },
          headerTintColor: THEME.colors.textPrimary,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: THEME.colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/language" options={{ title: 'Language / भाषा', headerBackVisible: false }} />
        <Stack.Screen name="onboarding/farm" options={{ title: 'Farm Profile' }} />
        <Stack.Screen name="device/pair" options={{ title: 'Pair Scanner' }} />
        <Stack.Screen name="scan/feed-type" options={{ title: 'Select Feed' }} />
        <Stack.Screen name="scan/tutorial" options={{ title: 'Sample Prep' }} />
        <Stack.Screen name="scan/active" options={{ title: 'Scanning Feed', headerBackVisible: false }} />
        <Stack.Screen name="results/nutrition" options={{ title: 'Nutrition Results' }} />
        <Stack.Screen name="results/safety" options={{ title: 'Safety & Adulterants' }} />
        <Stack.Screen name="results/advisory" options={{ title: 'Feed Advisory' }} />
        <Stack.Screen name="compare" options={{ title: 'Compare Feeds' }} />
        <Stack.Screen name="bunkers/[id]" options={{ title: 'Bunker Digital Twin' }} />
        <Stack.Screen name="bunkers/probes" options={{ title: 'Silage Probes' }} />
        <Stack.Screen name="qr/verify" options={{ title: 'Verify QR Code' }} />
        <Stack.Screen name="sync/index" options={{ title: 'Sync Centre' }} />
        <Stack.Screen name="lab-referral" options={{ title: 'NABL Lab Referral' }} />
        <Stack.Screen name="learn" options={{ title: 'Feed Knowledge' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
