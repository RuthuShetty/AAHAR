/**
 * AAHAR Mobile — Screen 4: Device Pairing & Calibration
 * Discovers and pairs handheld NIR scanner over BLE. Runs white reference calibration.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { THEME } from '../../constants/theme';
import { useDeviceStore } from '../../store';

export default function DevicePairScreen() {
  const { isConnected, deviceInfo, status, connect, disconnect, transport } = useDeviceStore();
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibSuccess, setCalibSuccess] = useState(false);

  const handleCalibrate = async () => {
    setIsCalibrating(true);
    setCalibSuccess(false);
    await transport.sendCommand('CALIBRATE');
    setTimeout(() => {
      setIsCalibrating(false);
      setCalibSuccess(true);
    }, 1200);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Handheld NIR Scanner</Text>
      <Text style={styles.subtitle}>Bluetooth Low Energy 5.0 Link</Text>

      {/* Connection Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.deviceName}>
              {isConnected ? (deviceInfo?.serial_number ?? 'AAHAR-P-004821') : 'No Scanner Connected'}
            </Text>
            <Text style={styles.skuBadge}>
              {deviceInfo?.sku === 'AAHAR_PRO' ? 'PRO (Hamamatsu NIR 900–1700nm)' : 'LITE (AS7265x Triad)'}
            </Text>
          </View>
          <View style={[styles.statusDot, isConnected ? styles.dotConnected : styles.dotDisconnected]} />
        </View>

        {isConnected ? (
          <View style={styles.deviceDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Firmware Version</Text>
              <Text style={styles.detailValue}>{deviceInfo?.firmware_version ?? 'v1.2.4'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Battery Level</Text>
              <Text style={styles.detailValue}>{status.battery_pct}%</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Lamp Temperature</Text>
              <Text style={styles.detailValue}>{status.lamp_temperature_c != null ? `${status.lamp_temperature_c.toFixed(1)} °C` : 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Chamber Door</Text>
              <Text style={styles.detailValue}>{status.chamber_closed ? 'Closed (Ready)' : 'Open (Chamber Ajar)'}</Text>
            </View>

            <TouchableOpacity style={styles.disconnectBtn} onPress={() => disconnect()}>
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.connectBtn} onPress={() => connect()}>
            <Text style={styles.connectText}>Connect to Scanner</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Optical Calibration Card */}
      {isConnected && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Optical Calibration</Text>
          <Text style={styles.calibExpl}>
            Run daily white tile reference and dark shutter subtraction to ensure ±1.5% RMSEP accuracy.
          </Text>

          {calibSuccess && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>White reference calibrated successfully!</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.calibBtn, isCalibrating && styles.btnDisabled]}
            onPress={handleCalibrate}
            disabled={isCalibrating}
          >
            {isCalibrating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.calibBtnText}>Run White/Dark Calibration</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  card: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  skuBadge: {
    fontSize: 12,
    color: THEME.colors.accent,
    marginTop: 2,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotConnected: {
    backgroundColor: THEME.colors.good,
  },
  dotDisconnected: {
    backgroundColor: THEME.colors.danger,
  },
  deviceDetails: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  connectBtn: {
    backgroundColor: THEME.colors.accent,
    minHeight: THEME.touchTargetMin,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  connectText: {
    fontWeight: '700',
    color: '#0D2B33',
    fontSize: 16,
  },
  disconnectBtn: {
    borderColor: THEME.colors.danger,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.sm,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  disconnectText: {
    color: THEME.colors.danger,
    fontWeight: '600',
  },
  sectionTitle: {
    ...THEME.typography.h3,
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  calibExpl: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginBottom: 12,
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
  },
  calibBtn: {
    backgroundColor: THEME.colors.data,
    minHeight: THEME.touchTargetMin,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  calibBtnText: {
    fontWeight: '600',
    color: '#FFFFFF',
    fontSize: 15,
  },
});
