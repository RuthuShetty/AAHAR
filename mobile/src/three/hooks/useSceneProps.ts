/**
 * AAHAR 3D — React Hooks for Scene Data Binding
 * Connects Zustand stores → 3D scene props.
 * All three 3D views derive from live state — network not touched.
 */

import { useMemo } from 'react';
import type { SilageBunkerSceneProps, ProbeNodeData } from '../scenes/SilageBunkerScene';
import type { CowAnatomySceneProps } from '../scenes/CowAnatomyScene';
import type { SpectrumSceneProps } from '../scenes/SpectrumFingerprintScene';
import type { ProximateSnapshot } from '../materials';
import type { Bunker, ProbeReading } from '../../types/contracts';
import type { Measurement } from '../../types/contracts';

// ─── Silage Bunker hook ───────────────────────────────────────────────────────

export interface BunkerStoreSlice {
  bunker: Bunker;
  probeReadings: ProbeReading[];
  /** silage-forecast-v1 output: [day1, day2, ..., day7] positions in metres */
  spoilageForecast: number[];
  activeDay: number;
  cutaway: boolean;
}

export function useSilageBunkerSceneProps(store: BunkerStoreSlice): SilageBunkerSceneProps {
  return useMemo(() => {
    const probes: ProbeNodeData[] = store.probeReadings.map((pr: any, idx) => {
      const phVal = typeof pr.ph === 'object' && pr.ph !== null ? pr.ph.value : (pr.ph ?? 4.2);
      const co2Val = typeof pr.co2_ppm === 'object' && pr.co2_ppm !== null ? pr.co2_ppm.value : (pr.co2_ppm ?? 1500);
      const tempVal = Array.isArray(pr.temperatures_c) && pr.temperatures_c.length > 0
        ? pr.temperatures_c[0].value_c
        : (pr.core_temp_c ?? 22);

      return {
        probe_id:       pr.probe_device_id || pr.probe_id || `probe-${idx + 1}`,
        label:          `Probe ${idx + 1}`,
        position_norm:  pr.position_norm ?? [0.5, 0.5, 0.5],
        phase:          pr.fermentation_phase ?? 'STABLE',
        temperature_c:  tempVal,
        ph:             phVal,
        co2_ppm:        co2Val,
        battery_pct:    pr.battery_pct ?? 80,
        online:         pr.status !== 'OFFLINE',
      };
    });

    const b: any = store.bunker;
    return {
      width_m:          b?.dimensions?.width_m ?? b?.width_m ?? 12,
      length_m:         b?.dimensions?.length_m ?? b?.length_m ?? 50,
      wall_height_m:    b?.dimensions?.height_m ?? b?.wall_height_m ?? 3.5,
      spoilage_front_m: store.spoilageForecast.length > 0
                          ? store.spoilageForecast
                          : [0, 0.1, 0.2, 0.35, 0.5, 0.7, 1.0],
      active_day:       store.activeDay,
      probes,
      cutaway:          store.cutaway,
    };
  }, [store]);
}

// ─── Cow Anatomy hook ─────────────────────────────────────────────────────────

export function useCowAnatomySceneProps(measurement: Measurement | null): CowAnatomySceneProps {
  return useMemo(() => {
    // Default to neutral values when no measurement yet
    const proximates: ProximateSnapshot = {
      crude_protein_pct_dm: _numVal(measurement?.proximates?.crude_protein_pct_dm) ?? 14,
      ndf_pct_dm:           _numVal(measurement?.proximates?.ndf_pct_dm)           ?? 35,
      me_mj_kg_dm:          _numVal(measurement?.proximates?.me_mj_kg_dm)          ?? 9.5,
      moisture_pct:         _numVal(measurement?.proximates?.moisture_pct)         ?? 12,
      ash_pct_dm:           _numVal(measurement?.proximates?.ash_pct_dm)           ?? 7,
    };

    const adulterant_detected =
      measurement?.safety?.adulteration?.verdict === 'ADULTERATED' ||
      measurement?.safety?.adulteration?.verdict === 'SUSPECT';

    const toxin_band = (measurement?.safety?.mycotoxin?.aflatoxin_band ?? 'UNKNOWN') as any;

    return { proximates, adulterant_detected, toxin_band };
  }, [measurement]);
}

// ─── Spectrum Fingerprint hook ─────────────────────────────────────────────

export interface SpectrumStore {
  preprocessedSpectrum: Float32Array | null;
  wavelengths_nm: number[];
  lastMeasurement: Measurement | null;
}

export function useSpectrumFingerprintProps(store: SpectrumStore): SpectrumSceneProps {
  return useMemo(() => {
    // Use a flat mock spectrum if none available yet
    const spectrum = store.preprocessedSpectrum ?? new Float32Array(228).fill(0);
    const wavelengths = store.wavelengths_nm.length === 228
      ? store.wavelengths_nm
      : Array.from({ length: 228 }, (_, i) => 900 + i * 3.51);

    const grade = (store.lastMeasurement?.derived?.feed_grade ?? 'C') as any;
    const confidence = store.lastMeasurement?.confidence_overall ?? 0.5;
    const in_distribution = store.lastMeasurement?.in_distribution ?? true;

    // Detect adulterant spike bands (top 5 deviating bands if adulterant detected)
    let adulterant_band_indices: number[] = [];
    if (store.lastMeasurement?.safety?.adulteration?.verdict !== 'CLEAN') {
      // Highlight bands 90-115 (Urea N-H) as an example
      adulterant_band_indices = Array.from({ length: 26 }, (_, i) => i + 90);
    }

    return { spectrum, wavelengths_nm: wavelengths, grade, confidence, in_distribution, adulterant_band_indices };
  }, [store]);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function _numVal(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'value' in (v as any)) return (v as any).value;
  return undefined;
}
