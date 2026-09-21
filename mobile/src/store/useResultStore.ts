/**
 * AAHAR Mobile — Result Store (Zustand)
 * Single source of truth for active test results, charts, 3D scenes (S3 & S5), and advisory cards.
 * Section 6.6 Binding pattern.
 */

import { create } from 'zustand';
import { MeasurementRecord } from '../db/repositories/measurementRepository';

interface ResultState {
  active: MeasurementRecord | null;

  setActiveResult: (result: MeasurementRecord | null) => void;
  clearResult: () => void;
}

export const useResultStore = create<ResultState>((set) => ({
  active: null,
  setActiveResult: (active) => set({ active }),
  clearResult: () => set({ active: null }),
}));
