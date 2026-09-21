/**
 * AAHAR Mobile — BLE GATT Client Interface & Base Transport
 */

import { BleCommandType, BleDeviceInfo, BleDeviceStatus, BleEnvData } from './types';

export interface IBleTransport {
  isConnected(): boolean;
  connect(deviceId?: string): Promise<boolean>;
  disconnect(): Promise<void>;
  getDeviceInfo(): Promise<BleDeviceInfo>;
  sendCommand(command: BleCommandType): Promise<void>;
  
  onStatusChange(cb: (status: BleDeviceStatus) => void): () => void;
  onEnvData(cb: (env: BleEnvData) => void): () => void;
  onScanProgress(cb: (progress: number) => void): () => void;
  onSpectrumStream(
    cb: (result: {
      wavelengths: number[];
      intensities: number[];
      repeats: number[][];
      crc16: number;
    }) => void,
  ): () => void;
  onImageStream(cb: (frameIndex: number, totalFrames: number, frameBase64: string) => void): () => void;
}
