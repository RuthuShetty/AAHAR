/**
 * AAHAR Mobile — Device Store (Zustand)
 * Manages BLE connection, battery, lamp temperature, LED ring state.
 */

import { create } from 'zustand';
import { BleDeviceInfo, BleDeviceStatus } from '../ble/types';
import { IBleTransport } from '../ble/gattClient';
import { NullBleTransport } from '../ble/nullTransport';

interface DeviceState {
  deviceInfo: BleDeviceInfo | null;
  status: BleDeviceStatus;
  isConnected: boolean;
  transport: IBleTransport;
  
  setTransport: (transport: IBleTransport) => void;
  connect: (deviceId?: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  updateStatus: (status: BleDeviceStatus) => void;
}

/**
 * Was: { battery_pct: 88, chamber_closed: true, lamp_temperature_c: 42.0,
 *        led_ring_color: '#2E7D32' } -- a healthy-looking device readout
 * rendered before any device had ever connected. Telemetry is now null until
 * a real status notification arrives, so the UI cannot show a green device
 * that is not there.
 */
const disconnectedStatus: BleDeviceStatus = {
  state: 'DISCONNECTED',
  battery_pct: null,
  chamber_closed: null,
  lamp_temperature_c: null,
  error_code: null,
  led_ring_color: null,
};

export const useDeviceStore = create<DeviceState>((set, get) => {
  // Production default is a transport that reports unavailability. Tests and
  // demo builds inject a different one through setTransport().
  const transport: IBleTransport = new NullBleTransport();

  return {
    deviceInfo: null,
    status: disconnectedStatus,
    isConnected: false,
    transport,

    setTransport: (transport) => set({ transport }),

    connect: async (deviceId) => {
      const { transport } = get();
      const success = await transport.connect(deviceId);
      if (success) {
        const info = await transport.getDeviceInfo();
        set({ isConnected: true, deviceInfo: info });
        transport.onStatusChange((status) => {
          set({ status });
        });
      }
      return success;
    },

    disconnect: async () => {
      const { transport } = get();
      await transport.disconnect();
      set({ isConnected: false, status: disconnectedStatus, deviceInfo: null });
    },

    updateStatus: (status) => set({ status }),
  };
});
