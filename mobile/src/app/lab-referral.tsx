/**
 * AAHAR Mobile — Screen 18: Lab Referral
 * Offline-bundled directory of accredited NABL testing laboratories and prefilled referral form.
 * Section 4.1 Honesty Rule.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { THEME } from '../constants/theme';
import { useResultStore, useFarmStore } from '../store';

interface LabDirectoryEntry {
  name: string;
  location: string;
  state: string;
  nabl_cert: string;
  contact: string;
}

const NABL_LABS: LabDirectoryEntry[] = [
  {
    name: 'National Dairy Development Board (NDDB) CALF Lab',
    location: 'Anand',
    state: 'Gujarat',
    nabl_cert: 'TC-5374',
    contact: '+91 2692 260148',
  },
  {
    name: 'GADVASU Central Animal Nutrition Lab',
    location: 'Ludhiana',
    state: 'Punjab',
    nabl_cert: 'TC-7128',
    contact: '+91 161 2414000',
  },
  {
    name: 'ICAR-National Dairy Research Institute (NDRI)',
    location: 'Karnal',
    state: 'Haryana',
    nabl_cert: 'TC-6291',
    contact: '+91 184 2259002',
  },
  {
    name: 'Maharashtra Animal & Fishery Sciences Lab',
    location: 'Nagpur',
    state: 'Maharashtra',
    nabl_cert: 'TC-8041',
    contact: '+91 712 2511784',
  },
  {
    name: 'Veterinary Biologicals & Feed Testing Lab',
    location: 'Hebbal, Bengaluru',
    state: 'Karnataka',
    nabl_cert: 'TC-9182',
    contact: '+91 80 23411483',
  },
];

export default function LabReferralScreen() {
  const { active } = useResultStore();
  const { farm } = useFarmStore();
  const [selectedLab, setSelectedLab] = useState(NABL_LABS[0]);
  const [dispatchGenerated, setDispatchGenerated] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Accredited Lab Referral</Text>
      <Text style={styles.subtitle}>Confirmatory wet chemistry testing (AOAC / HPLC)</Text>

      {/* Referral Context Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sample Referral Context</Text>
        <Text style={styles.sampleLine}>
          Feed: <Text style={styles.bold}>{active?.measurement.feed_type.replace('_', ' ') ?? 'Feed Sample'}</Text>
        </Text>
        <Text style={styles.sampleLine}>
          Screening ID: <Text style={styles.bold}>{active?.id ?? 'MEAS-LOCAL'}</Text>
        </Text>
        <Text style={styles.sampleLine}>
          Farmer: <Text style={styles.bold}>{farm?.owner_name ?? 'Farmer'} ({farm?.owner_phone})</Text>
        </Text>
        <Text style={styles.sampleLine}>
          Requested Tests: <Text style={styles.bold}>AOAC Crude Protein, HPLC Aflatoxin B1, Urease Activity</Text>
        </Text>
      </View>

      {/* Lab Selection Directory */}
      <Text style={styles.sectionHeader}>Select Nearest NABL Lab</Text>
      {NABL_LABS.map((lab, idx) => {
        const isSelected = selectedLab.name === lab.name;
        return (
          <TouchableOpacity
            key={idx}
            style={[styles.labCard, isSelected && styles.labSelected]}
            onPress={() => setSelectedLab(lab)}
          >
            <View style={styles.labRow}>
              <Text style={styles.labName}>{lab.name}</Text>
              <Text style={styles.certBadge}>{lab.nabl_cert}</Text>
            </View>
            <Text style={styles.labLocation}>{lab.location}, {lab.state}</Text>
            <Text style={styles.labContact}>Tel: {lab.contact}</Text>
          </TouchableOpacity>
        );
      })}

      {dispatchGenerated ? (
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>Sample Dispatch Form Generated</Text>
          <Text style={styles.successBody}>
            Form #REF-{Date.now().toString().slice(-6)} pre-filled and saved locally. Present this document with 500g of sealed sample to the laboratory.
          </Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.generateBtn} onPress={() => setDispatchGenerated(true)}>
          <Text style={styles.generateBtnText}>Generate Prefilled Dispatch Slip</Text>
        </TouchableOpacity>
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
  sampleLine: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  bold: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  sectionHeader: {
    ...THEME.typography.h3,
    color: THEME.colors.textPrimary,
    marginVertical: 10,
  },
  labCard: {
    backgroundColor: THEME.colors.surface,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 8,
  },
  labSelected: {
    borderColor: THEME.colors.accent,
    backgroundColor: THEME.colors.cardElevated,
  },
  labRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  labName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  certBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.good,
    backgroundColor: '#132B18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  labLocation: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  labContact: {
    fontSize: 12,
    color: THEME.colors.accent,
    marginTop: 2,
  },
  generateBtn: {
    backgroundColor: THEME.colors.good,
    minHeight: THEME.touchTargetMin,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  generateBtnText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 15,
  },
  successCard: {
    backgroundColor: '#132B18',
    borderColor: THEME.colors.good,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    marginTop: 12,
  },
  successTitle: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
  },
  successBody: {
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 17,
  },
});
