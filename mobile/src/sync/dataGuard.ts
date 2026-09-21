/**
 * AAHAR Mobile — Data Guard
 * Enforces a hard cap of 20 MB/month on cellular networks to protect farmer data costs.
 * Section 8.4 Data guard specification.
 */

export interface DataUsageStats {
  monthlyLimitBytes: number;
  usedBytesThisMonth: number;
  remainingBytes: number;
  isBudgetExhausted: boolean;
  currentMonthKey: string;
}

export class DataGuard {
  // Default 20 MB (20 * 1024 * 1024 = 20,971,520 bytes)
  private monthlyLimitBytes = 20 * 1024 * 1024;
  private usedBytes = 0;
  private monthKey: string;

  constructor(limitMb = 20) {
    this.monthlyLimitBytes = limitMb * 1024 * 1024;
    this.monthKey = this.getCurrentMonthKey();
  }

  private getCurrentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  checkReset(): void {
    const currentKey = this.getCurrentMonthKey();
    if (currentKey !== this.monthKey) {
      this.monthKey = currentKey;
      this.usedBytes = 0;
    }
  }

  canTransmit(bytesToTransfer: number, isCellular: boolean): boolean {
    this.checkReset();
    if (!isCellular) return true; // Wi-Fi is unlimited
    return (this.usedBytes + bytesToTransfer) <= this.monthlyLimitBytes;
  }

  recordUsage(bytes: number, isCellular: boolean): void {
    this.checkReset();
    if (isCellular) {
      this.usedBytes += bytes;
    }
  }

  getStats(): DataUsageStats {
    this.checkReset();
    const remaining = Math.max(0, this.monthlyLimitBytes - this.usedBytes);
    return {
      monthlyLimitBytes: this.monthlyLimitBytes,
      usedBytesThisMonth: this.usedBytes,
      remainingBytes: remaining,
      isBudgetExhausted: remaining === 0,
      currentMonthKey: this.monthKey,
    };
  }

  setMonthlyLimitMb(mb: number): void {
    this.monthlyLimitBytes = mb * 1024 * 1024;
  }
}

export const dataGuard = new DataGuard();
