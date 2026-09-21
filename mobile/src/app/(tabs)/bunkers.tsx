/**
 * AAHAR Mobile — Screen 12: Silage Bunker List
 * Displays registered silage bunkers, ensiling progress, and fermentation health.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { useBunkerStore } from '../../store';

export default function BunkerListScreen() {
  const router = useRouter();
  const { bunkers, selectBunker } = useBunkerStore();

  const handleOpenBunker = (id: string) => {
    selectBunker(id);
    router.push(`/bunkers/${id}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Silage Bunkers & Bags</Text>
        <Text style={styles.subtitle}>IoT Probes & Fermentation Monitoring</Text>
      </View>

      {bunkers.map((b) => (
        <TouchableOpacity
          key={b.id}
          style={styles.bunkerCard}
          onPress={() => handleOpenBunker(b.id)}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.bunkerName}>{b.name}</Text>
              <Text style={styles.cropBadge}>{b.crop_type} · {b.type}</Text>
            </View>
            <View style={styles.healthBadge}>
              <Text style={styles.healthText}>FQI 94 (EXCELLENT)</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{b.capacity_tonnes ?? 350} t</Text>
              <Text style={styles.statLabel}>Capacity</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{b.probe_positions?.length ?? 3} Probes</Text>
              <Text style={styles.statLabel}>Active IoT</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>pH 3.85</Text>
              <Text style={styles.statLabel}>Fermentation</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>26.4 °C</Text>
              <Text style={styles.statLabel}>Core Temp</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.twinLink}>Open 3D Digital Twin & Spoilage Forecast ›</Text>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/bunkers/probes')}>
        <Text style={styles.addBtnText}>+ Register Silage Probe Node</Text>
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
    marginBottom: THEME.spacing.md,
  },
  title: {
    ...THEME.typography.h1,
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    ...THEME.typography.body,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  bunkerCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bunkerName: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  cropBadge: {
    fontSize: 12,
    color: THEME.colors.accent,
    marginTop: 2,
  },
  healthBadge: {
    backgroundColor: '#132B18',
    borderColor: THEME.colors.good,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
  },
  healthText: {
    color: THEME.colors.good,
    fontSize: 11,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.sm,
    padding: 12,
  },
  statCol: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  cardFooter: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  twinLink: {
    color: THEME.colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  addBtn: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.accent,
    borderWidth: 1.5,
    borderRadius: THEME.borderRadius.md,
    minHeight: THEME.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addBtnText: {
    fontWeight: '700',
    color: THEME.colors.accent,
    fontSize: 15,
  },
});
