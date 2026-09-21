/**
 * AAHAR Mobile — Screen: 3D Visualisation Hub
 * Single-screen navigation hub for all three 3D views:
 *  1. Spectrum Fingerprint (NIR waterfall)
 *  2. Cow Anatomy (organ impact)
 *  3. Silage Bunker (spoilage twin) — navigates to /bunkers/[id]
 *
 * Route: /views/3d
 */

import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { CowAnatomyCanvas, SpectrumFingerprintCanvas } from '../../three/lod';
import { useResultStore, useBunkerStore } from '../../store';
import type { ProximateSnapshot } from '../../three/materials';
import { Icon } from '../../components/Icon';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type ViewMode = 'spectrum' | 'anatomy' | 'bunker';

const VIEW_TABS = [
  { key: 'spectrum' as ViewMode, label: 'NIR Spectrum', icon: 'scan' as const },
  { key: 'anatomy'  as ViewMode, label: 'Organ Impact', icon: 'shield' as const },
  { key: 'bunker'   as ViewMode, label: 'Bunker Twin',  icon: 'bunker' as const },
];

// ─── Fallback spectrum (228 bands of a typical clean maize silage) ───────────
function makeDemoSpectrum(): Float32Array {
  const spec = new Float32Array(228);
  for (let i = 0; i < 228; i++) {
    const t = i / 228;
    spec[i] = 0.8 * Math.sin(Math.PI * t) + 0.2 * Math.sin(5 * Math.PI * t) + (Math.random() - 0.5) * 0.05;
  }
  return spec;
}
const DEMO_WAVELENGTHS = Array.from({ length: 228 }, (_, i) => 900 + i * 3.51);
const DEMO_SPECTRUM = makeDemoSpectrum();

export default function ThreeDViewHub() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewMode>('spectrum');

  // Pull live data from stores
  const { active } = useResultStore();
  const lastResult = active?.measurement;
  const { bunkers } = useBunkerStore();

  // Build spectrum props from last result
  const spectrumProps = useMemo(() => ({
    spectrum:              DEMO_SPECTRUM,
    wavelengths_nm:        DEMO_WAVELENGTHS,
    grade:                (lastResult?.derived?.feed_grade ?? 'B') as any,
    confidence:            lastResult?.confidence_overall ?? 0.78,
    in_distribution:       lastResult?.in_distribution ?? true,
    adulterant_band_indices: lastResult?.safety?.adulteration?.verdict !== 'CLEAN'
      ? Array.from({ length: 26 }, (_, i) => i + 90)
      : [],
  }), [lastResult]);

  // Build anatomy props from last result
  const proximates: ProximateSnapshot = useMemo(() => ({
    crude_protein_pct_dm: _numVal(lastResult?.proximates?.crude_protein_pct_dm) ?? 18.5,
    ndf_pct_dm:           _numVal(lastResult?.proximates?.ndf_pct_dm)           ?? 42.0,
    me_mj_kg_dm:          _numVal(lastResult?.proximates?.me_mj_kg_dm)          ?? 10.5,
    moisture_pct:         _numVal(lastResult?.proximates?.moisture_pct)         ?? 12.0,
    ash_pct_dm:           _numVal(lastResult?.proximates?.ash_pct_dm)           ?? 7.5,
  }), [lastResult]);

  const anatomyProps = useMemo(() => ({
    proximates,
    adulterant_detected: lastResult?.safety?.adulteration?.verdict === 'ADULTERATED',
    toxin_band: (lastResult?.safety?.mycotoxin?.aflatoxin_band ?? 'LOW') as any,
  }), [proximates, lastResult]);

  const firstBunkerId = bunkers[0]?.id;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1117" />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {VIEW_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeView === tab.key && styles.tabActive]}
            onPress={() => {
              if (tab.key === 'bunker' && firstBunkerId) {
                router.push(`/bunkers/${firstBunkerId}` as any);
              } else {
                setActiveView(tab.key);
              }
            }}
          >
            <Icon
              name={tab.icon}
              size={18}
              color={activeView === tab.key ? THEME.colors.primary : THEME.colors.muted}
            />
            <Text style={[styles.tabLabel, activeView === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 3D Canvas area */}
      <View style={styles.canvasArea}>
        {activeView === 'spectrum' && (
          <SpectrumFingerprintCanvas {...spectrumProps} />
        )}
        {activeView === 'anatomy' && (
          <CowAnatomyCanvas {...anatomyProps} />
        )}
        {activeView === 'bunker' && (
          <View style={styles.noCanvas}>
            <Text style={styles.noCanvasIcon}>[3D]</Text>
            <Text style={styles.noCanvasText}>
              Select a bunker to open its 3D Digital Twin
            </Text>
            {firstBunkerId && (
              <TouchableOpacity
                style={styles.openBtn}
                onPress={() => router.push(`/bunkers/${firstBunkerId}` as any)}
              >
                <Text style={styles.openBtnText}>Open Bunker Twin →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Context info strip */}
      <View style={styles.infoStrip}>
        {activeView === 'spectrum' && (
          <Text style={styles.infoText}>
            Pinch to zoom · Drag to rotate · Key bands: N-H(protein), O-H(moisture), C-H(fat)
          </Text>
        )}
        {activeView === 'anatomy' && (
          <Text style={styles.infoText}>
            Tap an organ for details · Particles show nutrient flow · Pulsing organs need attention
          </Text>
        )}
      </View>
    </View>
  );
}

function _numVal(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'value' in (v as any)) return (v as any).value;
  return undefined;
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#0d1117' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#161b22',
    paddingTop: 8, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: '#21262d',
    paddingBottom: 4,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 6,
    borderRadius: 8, marginHorizontal: 2,
  },
  tabActive:      { backgroundColor: '#1d4ed8' },
  tabIcon:        { fontSize: 18, marginBottom: 2 },
  tabLabel:       { color: '#8b949e', fontSize: 10, fontWeight: '600' },
  tabLabelActive: { color: '#fff' },
  canvasArea:     { flex: 1 },
  noCanvas: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  noCanvasIcon:  { fontSize: 64 },
  noCanvasText:  { color: '#8b949e', fontSize: 15, textAlign: 'center', maxWidth: 260 },
  openBtn: {
    backgroundColor: '#1d4ed8', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  openBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  infoStrip: {
    backgroundColor: 'rgba(22,27,34,0.9)',
    paddingVertical: 6, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: '#21262d',
  },
  infoText:     { color: '#8b949e', fontSize: 11, textAlign: 'center' },
});
