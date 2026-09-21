/**
 * AAHAR Mobile — BLE & CRC-16 Unit Tests
 * Verifies Section 8.5 BLE characteristic contracts and CRC-16 CCITT validation.
 */

import { describe, it, expect } from 'vitest';
import { crc16Ccitt } from '../../src/ble/crc16';
import { MockBleTransport } from '../../src/ble/mockTransport';

describe('AAHAR Mobile BLE Transport & CRC-16', () => {
  it('should compute valid CRC-16 CCITT checksums', () => {
    // Standard test vectors
    const testBytes1 = new TextEncoder().encode('123456789');
    const crc1 = crc16Ccitt(testBytes1);
    expect(crc1).toBe(0x29b1);

    const testBytes2 = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    const crc2 = crc16Ccitt(testBytes2);
    expect(typeof crc2).toBe('number');
    expect(crc2).toBeGreaterThanOrEqual(0);
    expect(crc2).toBeLessThanOrEqual(0xffff);
  });

  it('should connect to mock scanner and retrieve device info', async () => {
    const transport = new MockBleTransport({
      simulatedSku: 'AAHAR_PRO',
      serialNumber: 'AAHAR-P-004821',
    });

    expect(transport.isConnected()).toBe(false);
    const connected = await transport.connect();
    expect(connected).toBe(true);
    expect(transport.isConnected()).toBe(true);

    const info = await transport.getDeviceInfo();
    expect(info.sku).toBe('AAHAR_PRO');
    expect(info.serial_number).toBe('AAHAR-P-004821');
    expect(info.firmware_version).toBe('v1.2.4');
  });

  it('should stream 228-band NIR spectrum with verified CRC-16 and macro images', async () => {
    const transport = new MockBleTransport({
      scanDurationMs: 100, // Fast test duration
      sampleType: 'COTTONSEED_CAKE',
      spikedUrea: 2.0,
    });
    await transport.connect();

    let receivedProgress = 0;
    transport.onScanProgress((p) => {
      receivedProgress = p;
    });

    let frameCount = 0;
    transport.onImageStream((idx) => {
      frameCount++;
    });

    const streamPromise = new Promise<{
      wavelengths: number[];
      intensities: number[];
      repeats: number[][];
      crc16: number;
    }>((resolve) => {
      transport.onSpectrumStream((data) => {
        resolve(data);
      });
    });

    await transport.sendCommand('START_SCAN');
    const result = await streamPromise;

    expect(receivedProgress).toBe(100);
    expect(frameCount).toBe(4);
    expect(result.wavelengths.length).toBe(228);
    expect(result.intensities.length).toBe(228);
    expect(result.repeats.length).toBe(3);
    expect(result.wavelengths[0]).toBe(900);
    expect(result.wavelengths[227]).toBe(1700);

    // Verify CRC-16 was calculated
    expect(result.crc16).toBeGreaterThan(0);
  });
});
