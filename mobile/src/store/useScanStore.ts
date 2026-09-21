/**
 * AAHAR Mobile — Scan Store (Zustand)
 * Manages active feed scanning, live progress, streaming 228-band spectrum, macro images.
 */

import { create } from 'zustand';
import { FeedType } from '../types/contracts';
import { BleEnvData } from '../ble/types';

interface ScanState {
  selectedFeedType: FeedType;
  sampleBatchCode: string;
  isScanning: boolean;
  progress: number;
  streamingSpectrum: {
    wavelengths: number[];
    intensities: number[];
    repeats: number[][];
    crc16: number;
  } | null;
  macroImages: string[];
  envData: BleEnvData | null;

  setSelectedFeedType: (feedType: FeedType) => void;
  setSampleBatchCode: (code: string) => void;
  setScanning: (isScanning: boolean) => void;
  setProgress: (progress: number) => void;
  setStreamingSpectrum: (spectrum: ScanState['streamingSpectrum']) => void;
  addMacroImage: (frameBase64: string) => void;
  setEnvData: (env: BleEnvData) => void;
  resetScan: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  selectedFeedType: 'COTTONSEED_CAKE',
  sampleBatchCode: '',
  isScanning: false,
  progress: 0,
  streamingSpectrum: null,
  macroImages: [],
  envData: null,

  setSelectedFeedType: (selectedFeedType) => set({ selectedFeedType }),
  setSampleBatchCode: (sampleBatchCode) => set({ sampleBatchCode }),
  setScanning: (isScanning) => set({ isScanning }),
  setProgress: (progress) => set({ progress }),
  setStreamingSpectrum: (streamingSpectrum) => set({ streamingSpectrum }),
  addMacroImage: (frame) =>
    set((state) => ({ macroImages: [...state.macroImages, frame] })),
  setEnvData: (envData) => set({ envData }),
  resetScan: () =>
    set({
      isScanning: false,
      progress: 0,
      streamingSpectrum: null,
      macroImages: [],
      envData: null,
    }),
}));
