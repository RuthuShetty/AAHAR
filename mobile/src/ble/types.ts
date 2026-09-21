/**
 * AAHAR Mobile — BLE Protocol Definitions
 * Aligned with Section 8.5 of Master Build Prompt.
 */

export const BLE_SERVICE_UUID = '0000aa00-0000-1000-8000-00805f9b34fb';

export const BLE_CHAR_UUIDS = {
  DEVICE_INFO: '0000aa01-0000-1000-8000-00805f9b34fb',
  STATUS: '0000aa02-0000-1000-8000-00805f9b34fb',
  COMMAND: '0000aa03-0000-1000-8000-00805f9b34fb',
  SPECTRUM_STREAM: '0000aa04-0000-1000-8000-00805f9b34fb',
  IMAGE_STREAM: '0000aa05-0000-1000-8000-00805f9b34fb',
  ENV_DATA: '0000aa06-0000-1000-8000-00805f9b34fb',
  OTA: '0000aa07-0000-1000-8000-00805f9b34fb',
} as const;

export type BleCommandType =
  | 'START_SCAN'
  | 'ABORT'
  | 'CALIBRATE'
  | 'SLEEP'
  | 'OTA_BEGIN';

export interface BleDeviceInfo {
  sku: 'AAHAR_PRO' | 'AAHAR_LITE';
  serial_number: string;
  firmware_version: string;
  hardware_revision: string;
  calibration_date: string;
  battery_pct: number | null;
}

export interface BleDeviceStatus {
  state: 'DISCONNECTED' | 'IDLE' | 'CALIBRATING' | 'SCANNING' | 'ERROR' | 'SLEEP';
  battery_pct: number | null;
  chamber_closed: boolean | null;
  lamp_temperature_c: number | null;
  error_code: number | null;
  led_ring_color: string | null; // '#2E7D32' (green), '#F9A825' (amber), '#C62828' (red), '#1565C0' (blue)
}

export interface BleEnvData {
  temperature_c: number;
  humidity_pct: number;
  pressure_hpa: number;
  voc_index: number;
  ambient_light_lux: number;
}

export interface SpectrumPacketHeader {
  seq: number;
  crc16: number;
  total_packets: number;
  payload_length: number;
}
