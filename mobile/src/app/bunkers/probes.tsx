/**
 * AAHAR Mobile — Screen 14: Silage Probe Setup
 * Configure ESP32-C6 in-silo IoT probes, depth placement, and LoRaWAN connectivity.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { useBunkerStore } from '../../store';

export default function ProbeSetupScreen() {
  const router = useRouter();
  const { bunkers } = useBunkerStore();
  const [probeId, setProbeId] = useState('probe-c6-04');
  const [depthM, setDepthM] = useState('1.5');
  const [distanceM, setDistanceM] = useState('6.0');
  const [registered, setRegistered] = useState(false);

  const handleRegister = () => {
    setRegistered(true);
    setTimeout(() => {
      router.back();
    }, 1200);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Register Silage Probe</Text>
      <Text style={styles.subtitle}>ESP32-C6 Multi-Sensor Lance Node</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Target Silage Bunker</Text>
        <Text style={styles.bunkerNameText}>{bunkers[0]?.name ?? 'North Silo Bunker'}</Text>

        <Text style={styles.label}>Probe Hardware ID / LoRa DevEUI</Text>
        <TextInput
          style={styles.input}
          value={probeId}
          onChangeText={setProbeId}
          placeholderTextColor={THEME.colors.textMuted}
        />

        <View style={styles.row}>
          <View style={styles.halfCol}>
            <Text style={styles.label}>Insertion Depth (m)</Text>
            <TextInput
              style={styles.input}
              value={depthM}
              onChangeText={setDepthM}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.halfCol}>
            <Text style={styles.label}>Dist from Face (m)</Text>
            <TextInput
              style={styles.input}
              value={distanceM}
              onChangeText={setDistanceM}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.sensorList}>
          <Text style={styles.sensorListTitle}>Active Lance Sensors:</Text>
          <Text style={styles.sensorItem}>• ISFET Food-Grade pH Probe (3.0–7.5)</Text>
          <Text style={styles.sensorItem}>• 4× DS18B20 Core Temperature Sensors</Text>
          <Text style={styles.sensorItem}>• Capacitive Dry Matter Lance Electrode</Text>
          <Text style={styles.sensorItem}>• MH-Z19C NDIR CO₂ + BME688 Gas Index</Text>
        </View>

        {registered && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>Probe registered & linked to 3D Bunker Twin!</Text>
          </View>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleRegister}>
          <Text style={styles.saveBtnText}>Pair & Save Probe Position</Text>
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
  card: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  label: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  bunkerNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: THEME.colors.card,
    borderColor: THEME.colors.borderLight,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.sm,
    color: THEME.colors.textPrimary,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  sensorList: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.sm,
    padding: 12,
    marginVertical: 14,
  },
  sensorListTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  sensorItem: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  successBanner: {
    backgroundColor: '#132B18',
    borderColor: THEME.colors.good,
    borderWidth: 1,
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: 12,
  },
  successText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: THEME.colors.good,
    minHeight: THEME.touchTargetMin,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 15,
  },
});
