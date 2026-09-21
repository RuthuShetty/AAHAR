/**
 * AAHAR Mobile — Screen 2: Farm & Herd Setup
 * Configure farm profile, cattle counts, lactation stages, and daily yield.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { useFarmStore } from '../../store';

export default function FarmSetupScreen() {
  const router = useRouter();
  const { farmId, farm, herd, setFarm, setHerd } = useFarmStore();

  const [farmerName, setFarmerName] = useState(farm?.owner_name ?? 'Gurpreet Singh');
  const [farmName, setFarmName] = useState(farm?.name ?? 'Green Valley Dairy');
  const [phone, setPhone] = useState(farm?.owner_phone ?? '+919876543210');
  const [milkingCows, setMilkingCows] = useState(String(herd?.animals?.find((a) => a.lactation_stage.includes('LACT'))?.count ?? 8));
  const [dryCows, setDryCows] = useState(String(herd?.animals?.find((a) => a.lactation_stage.includes('DRY'))?.count ?? 2));
  const [avgYield, setAvgYield] = useState(String(herd?.animals?.[0]?.milk_yield_kg_day ?? 14.5));

  const handleSave = () => {
    const milking = parseInt(milkingCows, 10) || 0;
    const dry = parseInt(dryCows, 10) || 0;
    const total = milking + dry;
    const updatedFarm = {
      name: farmName,
      owner_name: farmerName,
      owner_phone: phone,
      location: farm?.location ?? {
        state: 'Punjab',
        district: 'Ludhiana',
        village: 'Samrala',
      },
      fields: {
        name: { device: 'mobile', counter: (farm?.fields?.name?.counter ?? 0) + 1 },
        owner_name: { device: 'mobile', counter: (farm?.fields?.owner_name?.counter ?? 0) + 1 },
      },
    };
    const updatedHerd = {
      farm_id: farmId,
      animals: [
        {
          id: 'group-01',
          breed: 'MURRAH',
          lactation_stage: 'MID_LACTATION',
          count: milking,
          milk_yield_kg_day: parseFloat(avgYield) || 12.0,
        },
        {
          id: 'group-02',
          breed: 'HF_CROSS',
          lactation_stage: 'DRY_PREGNANT',
          count: dry,
          milk_yield_kg_day: 0,
        },
      ],
      total_animals: total,
      feed_on_hand: herd?.feed_on_hand ?? [
        { feed_type: 'COTTONSEED_CAKE', quantity_kg: 500 },
        { feed_type: 'MAIZE_SILAGE', quantity_kg: 4000 },
      ],
      fields: {
        animals: { device: 'mobile', counter: (herd?.fields?.animals?.counter ?? 0) + 1 },
      },
    };

    setFarm(farmId, updatedFarm);
    setHerd(updatedHerd);
    router.replace('/(tabs)');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Farm & Herd Profile</Text>
      <Text style={styles.subtitle}>Configure animal count for precise ration balancing</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Farmer Name / किसान का नाम</Text>
        <TextInput
          style={styles.input}
          value={farmerName}
          onChangeText={setFarmerName}
          placeholder="e.g. Gurpreet Singh"
          placeholderTextColor={THEME.colors.textMuted}
        />

        <Text style={styles.label}>Farm Name / डेयरी फार्म का नाम</Text>
        <TextInput
          style={styles.input}
          value={farmName}
          onChangeText={setFarmName}
          placeholder="e.g. Green Valley Dairy"
          placeholderTextColor={THEME.colors.textMuted}
        />

        <Text style={styles.label}>Phone Number / मोबाइल नंबर</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholderTextColor={THEME.colors.textMuted}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Herd Composition</Text>
        <View style={styles.row}>
          <View style={styles.halfCol}>
            <Text style={styles.label}>Milking Cows</Text>
            <TextInput
              style={styles.input}
              value={milkingCows}
              onChangeText={setMilkingCows}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.halfCol}>
            <Text style={styles.label}>Dry / Pregnant</Text>
            <TextInput
              style={styles.input}
              value={dryCows}
              onChangeText={setDryCows}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Text style={styles.label}>Avg Daily Milk Yield (Litres / Cow)</Text>
        <TextInput
          style={styles.input}
          value={avgYield}
          onChangeText={setAvgYield}
          keyboardType="decimal-pad"
        />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save Profile & Go to Home</Text>
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
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
  },
  section: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    ...THEME.typography.h3,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.sm,
  },
  label: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
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
  saveBtn: {
    backgroundColor: THEME.colors.good,
    minHeight: THEME.touchTargetMin,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.md,
  },
  saveBtnText: {
    ...THEME.typography.h3,
    color: '#FFFFFF',
  },
});
