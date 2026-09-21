/**
 * AAHAR Mobile — Screen 15: QR Batch Verification & Traceability
 * Diffs declared feed mill profile vs on-farm NIR scan. Logs dispute on mismatch.
 * Section 3 Journey C.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { THEME } from '../../constants/theme';
import { useResultStore } from '../../store';

export default function QRVerifyScreen() {
  const { active } = useResultStore();
  const [qrCode, setQrCode] = useState('BATCH-2026-MIL-8841');
  const [declaredSupplier, setDeclaredSupplier] = useState('Punjab Agro Feeds Ltd.');
  const [declaredCP, setDeclaredCP] = useState('28.0');
  const [disputeLogged, setDisputeLogged] = useState(false);

  const measuredCP = Number(active?.measurement.proximates.crude_protein_pct_dm ?? 21.4);
  const declaredNum = parseFloat(declaredCP) || 28.0;
  const shortfall = declaredNum - measuredCP;
  const hasMismatch = shortfall > 2.0;

  const handleLogDispute = () => {
    setDisputeLogged(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Verify Feed Bag QR</Text>
      <Text style={styles.subtitle}>Traceability Diff: Mill Declared vs Farmer Tested</Text>

      {/* QR Input Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Scanned Bag QR Code / Lot Number</Text>
        <TextInput
          style={styles.input}
          value={qrCode}
          onChangeText={setQrCode}
        />
        <Text style={styles.supplierText}>Certified Mill: {declaredSupplier}</Text>
      </View>

      {/* Comparison Diff Table */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Specification Comparison</Text>

        <View style={styles.diffRow}>
          <Text style={styles.diffLabel}>Parameter</Text>
          <Text style={styles.diffColHeader}>Mill Label</Text>
          <Text style={styles.diffColHeader}>Your Test</Text>
        </View>

        <View style={styles.diffRow}>
          <Text style={styles.diffMetric}>Crude Protein</Text>
          <Text style={styles.diffVal}>{declaredNum.toFixed(1)}%</Text>
          <Text style={[styles.diffVal, hasMismatch ? styles.dangerText : styles.goodText]}>
            {measuredCP.toFixed(1)}%
          </Text>
        </View>

        <View style={styles.diffRow}>
          <Text style={styles.diffMetric}>Urea Adulteration</Text>
          <Text style={styles.diffVal}>0.0% (Clean)</Text>
          <Text style={[styles.diffVal, active?.measurement.safety.adulteration.urea?.detected ? styles.dangerText : styles.goodText]}>
            {active?.measurement.safety.adulteration.urea?.detected ? 'ALERT: DETECTED' : 'PASSED 0.0%'}
          </Text>
        </View>

        <View style={[styles.diffRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.diffMetric}>Moisture</Text>
          <Text style={styles.diffVal}>10.0%</Text>
          <Text style={styles.diffVal}>{Number(active?.measurement.proximates.moisture_pct ?? 12.8).toFixed(1)}%</Text>
        </View>
      </View>

      {/* Alert Banner on Mismatch */}
      {hasMismatch && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertTitle}>ALERT: Substandard Feed Mismatch Flagged</Text>
          <Text style={styles.alertBody}>
            Crude protein is {shortfall.toFixed(1)}% below the declared mill label. This exceeds the legal BIS tolerance (± 1.5%).
          </Text>
        </View>
      )}

      {disputeLogged ? (
        <View style={styles.loggedBanner}>
          <Text style={styles.loggedText}>Dispute #DISP-9921 logged to FPO & Dairy Board Dashboard.</Text>
        </View>
      ) : (
        hasMismatch && (
          <TouchableOpacity style={styles.disputeBtn} onPress={handleLogDispute}>
            <Text style={styles.disputeBtnText}>Log Formal Dispute & Report to FPO</Text>
          </TouchableOpacity>
        )
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
    color: THEME.colors.accent,
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
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
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
    fontWeight: '700',
  },
  supplierText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 8,
  },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    alignItems: 'center',
  },
  diffLabel: {
    flex: 1.5,
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  diffColHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.accent,
    textAlign: 'center',
  },
  diffMetric: {
    flex: 1.5,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  diffVal: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  goodText: {
    color: THEME.colors.good,
  },
  dangerText: {
    color: THEME.colors.danger,
  },
  alertBanner: {
    backgroundColor: '#3B1214',
    borderColor: THEME.colors.danger,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: 16,
  },
  alertTitle: {
    ...THEME.typography.h3,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  alertBody: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  disputeBtn: {
    backgroundColor: THEME.colors.danger,
    minHeight: THEME.touchTargetMin,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disputeBtnText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 15,
  },
  loggedBanner: {
    backgroundColor: '#132B18',
    borderColor: THEME.colors.good,
    borderWidth: 1,
    padding: 14,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  loggedText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
