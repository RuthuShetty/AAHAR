/**
 * AAHAR Mobile — Mock BLE Transport
 * Simulates AAHAR Pro (serial AAHAR-P-004821) and AAHAR Lite (AAHAR-L-001290)
 * Generates realistic 228-band NIR spectra, CRC-16 packets, and macro images for dev & tests.
 */

import { IBleTransport } from './gattClient';
import { BleCommandType, BleDeviceInfo, BleDeviceStatus, BleEnvData } from './types';
import { crc16Ccitt } from './crc16';
import { FeedType } from '../types/contracts';

export interface MockTransportConfig {
  scanDurationMs?: number;
  simulatedSku?: 'AAHAR_PRO' | 'AAHAR_LITE';
  serialNumber?: string;
  sampleType?: FeedType;
  spikedUrea?: number; // e.g. 2.5 %
  aflatoxinHigh?: boolean;
}

export class MockBleTransport implements IBleTransport {
  private connected = false;
  private config: Required<MockTransportConfig>;
  private statusListeners = new Set<(status: BleDeviceStatus) => void>();
  private envListeners = new Set<(env: BleEnvData) => void>();
  private progressListeners = new Set<(progress: number) => void>();
  private spectrumListeners = new Set<
    (result: {
      wavelengths: number[];
      intensities: number[];
      repeats: number[][];
      crc16: number;
    }) => void
  >();
  private imageListeners = new Set<
    (frameIndex: number, totalFrames: number, frameBase64: string) => void
  >();

  private currentStatus: BleDeviceStatus = {
    state: 'IDLE',
    battery_pct: 88,
    chamber_closed: true,
    lamp_temperature_c: 41.8,
    error_code: 0,
    led_ring_color: '#2E7D32', // green
  };

  constructor(config: MockTransportConfig = {}) {
    this.config = {
      scanDurationMs: config.scanDurationMs ?? 2000,
      simulatedSku: config.simulatedSku ?? 'AAHAR_PRO',
      serialNumber: config.serialNumber ?? 'AAHAR-P-004821',
      sampleType: config.sampleType ?? 'COTTONSEED_CAKE',
      spikedUrea: config.spikedUrea ?? 0,
      aflatoxinHigh: config.aflatoxinHigh ?? false,
    };
  }

  setSampleConfig(config: Partial<MockTransportConfig>): void {
    this.config = { ...this.config, ...config };
  }

  isConnected(): boolean {
    return this.connected;
  }

  async connect(_deviceId?: string): Promise<boolean> {
    this.connected = true;
    this.currentStatus = {
      ...this.currentStatus,
      state: 'IDLE',
      led_ring_color: '#2E7D32',
    };
    this.notifyStatus();
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.currentStatus = {
      ...this.currentStatus,
      state: 'SLEEP',
      led_ring_color: '#1565C0',
    };
    this.notifyStatus();
  }

  async getDeviceInfo(): Promise<BleDeviceInfo> {
    return {
      sku: this.config.simulatedSku,
      serial_number: this.config.serialNumber,
      firmware_version: 'v1.2.4',
      hardware_revision: 'REV_C3',
      calibration_date: '2026-09-01T00:00:00Z',
      battery_pct: this.currentStatus.battery_pct,
    };
  }

  async sendCommand(command: BleCommandType): Promise<void> {
    if (!this.connected) {
      throw new Error('BLE device is not connected');
    }

    switch (command) {
      case 'START_SCAN':
        await this.runSimulatedScan();
        break;
      case 'ABORT':
        this.currentStatus.state = 'IDLE';
        this.currentStatus.led_ring_color = '#F9A825';
        this.notifyStatus();
        break;
      case 'CALIBRATE':
        this.currentStatus.state = 'CALIBRATING';
        this.currentStatus.led_ring_color = '#1565C0';
        this.notifyStatus();
        setTimeout(() => {
          this.currentStatus.state = 'IDLE';
          this.currentStatus.led_ring_color = '#2E7D32';
          this.notifyStatus();
        }, 800);
        break;
      case 'SLEEP':
        this.currentStatus.state = 'SLEEP';
        this.notifyStatus();
        break;
      default:
        break;
    }
  }

  private async runSimulatedScan(): Promise<void> {
    this.currentStatus.state = 'SCANNING';
    this.currentStatus.led_ring_color = '#1565C0'; // Pulsing blue/cyan
    this.notifyStatus();

    // Emit env reading at start of scan
    this.notifyEnv({
      temperature_c: 31.4,
      humidity_pct: 62.5,
      pressure_hpa: 1012.3,
      voc_index: 42,
      ambient_light_lux: 120,
    });

    const steps = 10;
    const interval = Math.max(20, Math.floor(this.config.scanDurationMs / steps));

    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, interval));
      const progress = Math.min(100, Math.round((i / steps) * 100));
      this.notifyProgress(progress);

      // Stream macro image frames at 25%, 50%, 75%, 100%
      if (i === 2 || i === 5 || i === 7 || i === 10) {
        const frameIdx = i === 2 ? 0 : i === 5 ? 1 : i === 7 ? 2 : 3;
        this.notifyImage(frameIdx, 4, `data:image/jpeg;base64,mockFrame${frameIdx}`);
      }
    }

    // Generate 228 bands (900 nm to 1700 nm)
    const numBands = 228;
    const wavelengths: number[] = [];
    const stepNm = (1700 - 900) / (numBands - 1);
    for (let i = 0; i < numBands; i++) {
      wavelengths.push(Math.round((900 + i * stepNm) * 10) / 10);
    }

    // Build realistic spectral absorption curve
    const intensities: number[] = [];
    const repeats: number[][] = [[], [], []];

    for (let i = 0; i < numBands; i++) {
      const wl = wavelengths[i];
      // Baseline reflectance
      let baseline = 0.55 + 0.35 * Math.sin((wl - 900) / 500);

      // Moisture dip around 1450 nm
      baseline -= 0.25 * Math.exp(-Math.pow((wl - 1450) / 35, 2));

      // Protein absorption around 1510 nm
      baseline -= 0.18 * Math.exp(-Math.pow((wl - 1510) / 45, 2));

      // If urea spiked, sharp absorption around 1490-1530 nm and secondary peak
      if (this.config.spikedUrea > 0) {
        baseline -= (this.config.spikedUrea * 0.04) * Math.exp(-Math.pow((wl - 1500) / 20, 2));
      }

      // Clamp 0.05 to 0.98
      const val = Math.max(0.05, Math.min(0.98, baseline));
      intensities.push(Math.round(val * 10000) / 10000);

      // Repeats with subtle instrument noise (< 0.005)
      for (let r = 0; r < 3; r++) {
        const noise = (Math.random() - 0.5) * 0.006;
        repeats[r].push(Math.round(Math.max(0.01, val + noise) * 10000) / 10000);
      }
    }

    // Compute CRC16 over packed float array
    const rawBuffer = new Uint8Array(numBands * 2);
    for (let i = 0; i < numBands; i++) {
      const uint16Val = Math.floor(intensities[i] * 65535);
      rawBuffer[i * 2] = (uint16Val >> 8) & 0xff;
      rawBuffer[i * 2 + 1] = uint16Val & 0xff;
    }
    const crc = crc16Ccitt(rawBuffer);

    this.currentStatus.state = 'IDLE';
    this.currentStatus.led_ring_color = '#2E7D32';
    this.notifyStatus();

    this.notifySpectrum({
      wavelengths,
      intensities,
      repeats,
      crc16: crc,
    });
  }

  onStatusChange(cb: (status: BleDeviceStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.currentStatus);
    return () => this.statusListeners.delete(cb);
  }

  onEnvData(cb: (env: BleEnvData) => void): () => void {
    this.envListeners.add(cb);
    return () => this.envListeners.delete(cb);
  }

  onScanProgress(cb: (progress: number) => void): () => void {
    this.progressListeners.add(cb);
    return () => this.progressListeners.delete(cb);
  }

  onSpectrumStream(
    cb: (result: {
      wavelengths: number[];
      intensities: number[];
      repeats: number[][];
      crc16: number;
    }) => void,
  ): () => void {
    this.spectrumListeners.add(cb);
    return () => this.spectrumListeners.delete(cb);
  }

  onImageStream(cb: (frameIndex: number, totalFrames: number, frameBase64: string) => void): () => void {
    this.imageListeners.add(cb);
    return () => this.imageListeners.delete(cb);
  }

  private notifyStatus(): void {
    for (const listener of this.statusListeners) {
      listener({ ...this.currentStatus });
    }
  }

  private notifyEnv(env: BleEnvData): void {
    for (const listener of this.envListeners) {
      listener(env);
    }
  }

  private notifyProgress(pct: number): void {
    for (const listener of this.progressListeners) {
      listener(pct);
    }
  }

  private notifySpectrum(data: {
    wavelengths: number[];
    intensities: number[];
    repeats: number[][];
    crc16: number;
  }): void {
    for (const listener of this.spectrumListeners) {
      listener(data);
    }
  }

  private notifyImage(idx: number, total: number, b64: string): void {
    for (const listener of this.imageListeners) {
      listener(idx, total, b64);
    }
  }
}
