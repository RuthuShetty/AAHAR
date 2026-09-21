/**
 * AAHAR Mobile — Bunker & Silage Twin Store (Zustand)
 * Drives Scene S4 (Silage Bunker Twin) and bunker list screens.
 */

import { create } from 'zustand';
import { Bunker, ProbeReading } from '../types/contracts';

export type BunkerRecord = Bunker & { id: string };

interface BunkerState {
  bunkers: BunkerRecord[];
  selectedBunkerId: string | null;
  probeReadings: Record<string, ProbeReading[]>;
  slicePositionX: number; // 0.0 to 1.0 cross-section slider
  forecastDayOffset: number; // 0 to 7 days ahead

  setBunkers: (bunkers: BunkerRecord[]) => void;
  selectBunker: (id: string | null) => void;
  setProbeReadings: (bunkerId: string, readings: ProbeReading[]) => void;
  setSlicePositionX: (x: number) => void;
  setForecastDayOffset: (days: number) => void;
}

export const useBunkerStore = create<BunkerState>((set) => ({
  bunkers: [
    {
      id: 'bunker-001',
      farm_id: 'farm-def-001',
      name: 'North Silo Bunker #1',
      type: 'BUNKER',
      dimensions: {
        length_m: 25.0,
        width_m: 8.0,
        height_m: 3.5,
      },
      capacity_tonnes: 350,
      ensiling_date: '2026-08-10',
      crop_type: 'Corn (Maize)',
      probe_positions: [
        { probe_device_id: 'probe-c6-01', x_m: 5.0, y_m: 1.5, z_m: 2.0 },
        { probe_device_id: 'probe-c6-02', x_m: 12.5, y_m: 1.5, z_m: 2.0 },
        { probe_device_id: 'probe-c6-03', x_m: 20.0, y_m: 1.5, z_m: 2.0 },
      ],
      fields: {},
    },
  ],
  selectedBunkerId: 'bunker-001',
  probeReadings: {
    'bunker-001': [
      {
        bunker_id: 'bunker-001',
        probe_device_id: 'probe-c6-01',
        ph: { value: 3.85, raw_mv: 410 },
        temperatures_c: [{ depth_cm: 120, value_c: 26.4 }],
        moisture_pct: { value: 66.2 },
        co2_ppm: { value: 4200 },
        o2_pct: { value: 0.4 },
        voc: { voc_index: 35 },
        fermentation_quality_index: 94.0,
      },
      {
        bunker_id: 'bunker-001',
        probe_device_id: 'probe-c6-02',
        ph: { value: 3.92, raw_mv: 418 },
        temperatures_c: [{ depth_cm: 200, value_c: 27.1 }],
        moisture_pct: { value: 67.0 },
        co2_ppm: { value: 4500 },
        o2_pct: { value: 0.3 },
        voc: { voc_index: 38 },
        fermentation_quality_index: 92.5,
      },
    ],
  },
  slicePositionX: 0.5,
  forecastDayOffset: 0,

  setBunkers: (bunkers) => set({ bunkers }),
  selectBunker: (selectedBunkerId) => set({ selectedBunkerId }),
  setProbeReadings: (bunkerId, readings) =>
    set((state) => ({
      probeReadings: { ...state.probeReadings, [bunkerId]: readings },
    })),
  setSlicePositionX: (slicePositionX) => set({ slicePositionX }),
  setForecastDayOffset: (forecastDayOffset) => set({ forecastDayOffset }),
}));
