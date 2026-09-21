/**
 * AAHAR Mobile — Network Monitor & Airplane Mode Simulator
 */

export interface NetworkState {
  isConnected: boolean;
  isAirplaneMode: boolean;
  connectionType: 'wifi' | 'cellular' | 'none';
}

export class NetworkMonitor {
  private isAirplaneMode = false;
  private forcedOffline = false;
  private connectionType: 'wifi' | 'cellular' | 'none' = 'wifi';
  private listeners = new Set<(state: NetworkState) => void>();

  getState(): NetworkState {
    const isConnected = !this.isAirplaneMode && !this.forcedOffline && this.connectionType !== 'none';
    return {
      isConnected,
      isAirplaneMode: this.isAirplaneMode,
      connectionType: isConnected ? this.connectionType : 'none',
    };
  }

  setAirplaneMode(enabled: boolean): void {
    this.isAirplaneMode = enabled;
    this.notify();
  }

  setConnectionType(type: 'wifi' | 'cellular' | 'none'): void {
    this.connectionType = type;
    this.notify();
  }

  setForcedOffline(forced: boolean): void {
    this.forcedOffline = forced;
    this.notify();
  }

  subscribe(cb: (state: NetworkState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

export const networkMonitor = new NetworkMonitor();
