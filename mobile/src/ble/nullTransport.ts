/**
 * AAHAR Mobile — Null BLE transport.
 *
 * The production default. Every method reports DEVICE_UNAVAILABLE instead of
 * producing data. It exists because useDeviceStore previously instantiated
 * MockBleTransport as the production transport, so the app behaved as though
 * a scanner were attached when none was — including emitting a full synthetic
 * spectrum that the results screen presented as a measurement.
 *
 * Replace it at runtime via setTransport(new RnBleTransport()) once a real
 * BLE stack is installed. Until then the UI shows "no scanner connected",
 * which is the truth.
 */
import { BleCommandType, BleDeviceInfo, BleDeviceStatus, BleEnvData } from './types';
import { IBleTransport } from './gattClient';

export class BleUnavailableError extends Error {
  readonly code = 'DEVICE_UNAVAILABLE';
  constructor(detail = 'No BLE transport is configured on this build.') {
    super(detail);
    this.name = 'BleUnavailableError';
  }
}

const noop = () => () => {};

export class NullBleTransport implements IBleTransport {
  isConnected(): boolean {
    return false;
  }
  async connect(): Promise<boolean> {
    return false; // never throws: the UI renders a disconnected state
  }
  async disconnect(): Promise<void> {}
  async getDeviceInfo(): Promise<BleDeviceInfo> {
    throw new BleUnavailableError('Cannot read device info: no scanner connected.');
  }
  async sendCommand(_command: BleCommandType): Promise<void> {
    throw new BleUnavailableError('Cannot start a scan: no scanner connected.');
  }
  onStatusChange(_cb: (s: BleDeviceStatus) => void) { return noop(); }
  onEnvData(_cb: (e: BleEnvData) => void) { return noop(); }
  onScanProgress(_cb: (p: number) => void) { return noop(); }
  onSpectrumStream(_cb: (r: any) => void) { return noop(); }
  onImageStream(_cb: (i: number, t: number, f: string) => void) { return noop(); }
}
