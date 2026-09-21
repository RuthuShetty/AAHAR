/**
 * AAHAR Mobile — Screen 13: Bunker Digital Twin & Spoilage Forecast
 * Integrates the full 3D SilageBunkerScene driven by live store state.
 * Scene S4: Volumetric temperature/pH heat field with animated spoilage front.
 */

import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { useBunkerStore } from '../../store';
import { SilageBunkerCanvas } from '../../three/lod';
import type { ProbeNodeData } from '../../three/scenes/SilageBunkerScene';
import type { FermentationPhase } from '../../types/contracts';

const { height: SCREEN_H } = Dimensions.get('window');

/**
 * Was: MOCK_FORECAST = [0.0, 0.12, 0.28, 0.48, 0.72, 1.05, 1.45] -- seven
 * hardcoded metres of spoilage-front advance, rendered in the 3D twin and in
 * the day-by-day table as a model prediction. silage-forecast-v1 is not
 * trained or shipped, so there is no forecast to display.
 */
const FORECAST_UNAVAILABLE: number[] | null = null;
const forecast = FORECAST_UNAVAILABLE;

export default function BunkerTwinDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    bunkers, probeReadings,
    slicePositionX, setSlicePositionX,
    forecastDayOffset, setForecastDayOffset,
  } = useBunkerStore();

  const bunker = bunkers.find((b) => b.id === id) ?? bunkers[0];
  const readings = probeReadings[bunker?.id ?? ''] ?? [];
  const [cutaway, setCutaway] = useState(false);
  const [activeDay, setActiveDay] = useState(0);

  // Build probe nodes from readings
  const probeNodes: ProbeNodeData[] = useMemo(() =>
    readings.map((r: any, idx) => {
      const phVal = typeof r.ph === 'object' && r.ph !== null ? r.ph.value : (typeof r.ph === 'number' ? r.ph : 4.1);
      const co2Val = typeof r.co2_ppm === 'object' && r.co2_ppm !== null ? r.co2_ppm.value : (typeof r.co2_ppm === 'number' ? r.co2_ppm : 1800);
      const tempVal = Array.isArray(r.temperatures_c) && r.temperatures_c.length > 0
        ? r.temperatures_c[0].value_c
        : (r.core_temp_c ?? 22.5);

      return {
        probe_id:       r.probe_device_id ?? r.probe_id ?? `probe-${idx}`,
        label:          `Probe ${idx + 1}`,
        position_norm:  (r.position_norm ?? [
          0.3 + (idx % 3) * 0.2,
          0.25 + Math.floor(idx / 3) * 0.35,
          0.6,
        ]) as [number, number, number],
        phase:         (r.fermentation_phase ?? 'STABLE') as FermentationPhase,
        temperature_c:  tempVal,
        ph:             phVal,
        co2_ppm:        co2Val,
        battery_pct:    r.battery_pct ?? 85,
        online:         r.status !== 'OFFLINE',
      };
    }),
    [readings]
  );

  /**
   * Was: when no probe readings existed, three invented probes were rendered
   * with online:true and fabricated telemetry (pH 3.85 / 5.10 / 4.20, CO2
   * 3200 / 800 / 4100 ppm). One was even labelled AEROBIC_SPOILAGE, so the
   * twin displayed a spoilage event for a bunker with no probes installed.
   * An empty array renders the "no probes reporting" empty state instead.
   */
  const displayProbes: ProbeNodeData[] = probeNodes;
  const hasLiveProbes = displayProbes.length > 0;

  const dayLabels = ['Today', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6'];

  return (
    <View style={styles.root}>
      {/* 3D Canvas — full-width, fixed height */}
      <View style={styles.canvasWrap}>
        <SilageBunkerCanvas
          width_m={bunker?.dimensions?.width_m ?? 12}
          length_m={bunker?.dimensions?.length_m ?? 50}
          wall_height_m={bunker?.dimensions?.height_m ?? 3.5}
          spoilage_front_m={forecast ?? []}
          active_day={activeDay}
          probes={displayProbes}
          cutaway={cutaway}
        />
        {/* Overlay HUD */}
        <View style={styles.hud}>
          <Text style={styles.hudTitle}>
            {bunker?.name ?? 'Bunker Twin'}
          </Text>
          <Text style={styles.hudSub}>
            {bunker?.dimensions?.length_m ?? 50}m × {bunker?.dimensions?.width_m ?? 12}m × {bunker?.dimensions?.height_m ?? 3.5}m
          </Text>
        </View>
      </View>

      {/* Controls */}
      <ScrollView style={styles.controls} contentContainerStyle={styles.controlsContent}>

        {/* Day forecast selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Spoilage Forecast Day</Text>
          <View style={styles.dayRow}>
            {dayLabels.map((label, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dayBtn, activeDay === i && styles.dayBtnActive]}
                onPress={() => setActiveDay(i)}
              >
                <Text style={[styles.dayBtnText, activeDay === i && styles.dayBtnTextActive]}>
                  {label}
                </Text>
                <Text style={styles.dayFront}>
                  {(forecast as any)?.[i]?.toFixed ? (forecast as any)[i].toFixed(2) : 'MODEL UNAVAILABLE'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cut-away toggle */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>Cross-Section Cut-Away View</Text>
            <Switch
              value={cutaway}
              onValueChange={setCutaway}
              trackColor={{ false: THEME.colors.surface, true: THEME.colors.accent }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.cardSub}>
            Toggle to see spoilage heat field inside the bunker volume.
          </Text>
        </View>

        {/* Probe status cards */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>IoT Probe Telemetry Status</Text>
          {displayProbes.map(p => (
            <View key={p.probe_id} style={styles.probeRow}>
              <View style={[styles.probeDot, {
                backgroundColor: p.phase === 'AEROBIC_SPOILAGE' ? '#C62828' :
                                 p.phase === 'STABLE'           ? '#1565C0' : '#2E7D32',
              }]} />
              <View style={styles.probeInfo}>
                <Text style={styles.probeLabel}>{p.label}</Text>
                <Text style={styles.probeMeta}>
                  pH {p.ph.toFixed(2)} | {p.temperature_c.toFixed(1)}°C | CO₂ {p.co2_ppm} ppm
                </Text>
              </View>
              <Text style={[styles.probePhase, {
                color: p.phase === 'AEROBIC_SPOILAGE' ? '#EF9A9A' : '#90CAF9',
              }]}>{p.phase.replace('_', ' ')}</Text>
            </View>
          ))}
        </View>

        {/* Action row */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push('/results/advisory' as any)}
        >
          <Text style={styles.actionBtnText}>View Advisory ›</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: THEME.colors.background },
  canvasWrap:     { height: SCREEN_H * 0.45, position: 'relative' },
  hud: {
    position: 'absolute', top: 12, left: 16,
    backgroundColor: 'rgba(13,17,23,0.7)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  hudTitle:   { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  hudSub:     { color: '#90CAF9', fontSize: 11 },
  controls:   { flex: 1 },
  controlsContent: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#161b22',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#21262d',
  },
  cardTitle:  { color: '#e6edf3', fontWeight: '700', fontSize: 14, marginBottom: 8 },
  cardSub:    { color: '#8b949e', fontSize: 12, marginTop: 4 },
  row:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayBtn: {
    flex: 1, minWidth: 70, borderRadius: 8, padding: 8,
    backgroundColor: '#21262d', alignItems: 'center',
  },
  dayBtnActive: { backgroundColor: '#1d4ed8' },
  dayBtnText:   { color: '#8b949e', fontSize: 11, fontWeight: '600' },
  dayBtnTextActive: { color: '#fff' },
  dayFront:     { color: '#64748b', fontSize: 10, marginTop: 2 },
  probeRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  probeDot:     { width: 10, height: 10, borderRadius: 5 },
  probeInfo:    { flex: 1 },
  probeLabel:   { color: '#e6edf3', fontWeight: '600', fontSize: 13 },
  probeMeta:    { color: '#8b949e', fontSize: 11 },
  probePhase:   { fontSize: 10, fontWeight: '600' },
  actionBtn: {
    backgroundColor: '#1d4ed8', borderRadius: 12,
    padding: 14, alignItems: 'center', marginBottom: 24,
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
