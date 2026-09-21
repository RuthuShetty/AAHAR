/**
 * AAHAR Mobile — Sync Engine & Data Guard Unit Tests
 * Verifies Section 8.4 Sync Algorithm, Lamport clocks (ADR-002), and cellular budget.
 */

import { describe, it, expect } from 'vitest';
import { mergeFieldLevel } from '../../src/sync/conflict';
import { DataGuard } from '../../src/sync/dataGuard';
import { NetworkMonitor } from '../../src/sync/networkMonitor';

describe('AAHAR Mobile Sync Engine & Data Guard', () => {
  it('should merge mutable entities per-field using Lamport clocks without data loss', () => {
    // Device A edited farmer_name offline (counter 2)
    // Device B edited contact_phone offline (counter 3)
    const localFarm = {
      id: 'farm-001',
      farmer_name: 'Harpreet Singh (Edited Locally)',
      contact_phone: '+919811111111',
    };
    const localClocks = {
      farmer_name: { counter: 2, device: 'AAHAR-P-004821' },
      contact_phone: { counter: 1, device: 'AAHAR-P-004821' },
    };

    const remoteFarm = {
      id: 'farm-001',
      farmer_name: 'Harpreet Singh (Old)',
      contact_phone: '+919999999999 (Edited on Web)',
    };
    const remoteClocks = {
      farmer_name: { counter: 1, device: 'cloud-web' },
      contact_phone: { counter: 3, device: 'cloud-web' },
    };

    const { merged, clocks } = mergeFieldLevel(localFarm, localClocks, remoteFarm, remoteClocks);

    // Both offline edits survived!
    expect(merged.farmer_name).toBe('Harpreet Singh (Edited Locally)');
    expect(merged.contact_phone).toBe('+919999999999 (Edited on Web)');
    expect(clocks.farmer_name.counter).toBe(2);
    expect(clocks.contact_phone.counter).toBe(3);
  });

  it('should enforce 20 MB/month cellular data guard', () => {
    const guard = new DataGuard(20); // 20 MB
    const stats = guard.getStats();
    expect(stats.monthlyLimitBytes).toBe(20 * 1024 * 1024);
    expect(stats.usedBytesThisMonth).toBe(0);
    expect(stats.remainingBytes).toBe(20 * 1024 * 1024);

    // Wi-Fi is unlimited
    expect(guard.canTransmit(50 * 1024 * 1024, false)).toBe(true);

    // Cellular under 20 MB allowed
    expect(guard.canTransmit(5 * 1024 * 1024, true)).toBe(true);
    guard.recordUsage(19 * 1024 * 1024, true);

    // Only 1 MB left
    expect(guard.getStats().remainingBytes).toBe(1 * 1024 * 1024);
    expect(guard.canTransmit(2 * 1024 * 1024, true)).toBe(false);
  });

  it('should respect airplane mode in network monitor', () => {
    const monitor = new NetworkMonitor();
    expect(monitor.getState().isConnected).toBe(true);

    monitor.setAirplaneMode(true);
    expect(monitor.getState().isConnected).toBe(false);
    expect(monitor.getState().isAirplaneMode).toBe(true);

    monitor.setAirplaneMode(false);
    expect(monitor.getState().isConnected).toBe(true);
    expect(monitor.getState().isAirplaneMode).toBe(false);
  });
});
