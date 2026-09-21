/**
 * AAHAR Dashboard — real backend client.
 *
 * Before this file existed, dashboard/src contained NO fetch, axios,
 * WebSocket or EventSource call anywhere. All 943 lines of
 * store/dashboardStore.ts were hardcoded objects, while Header.tsx rendered
 * "AAHAR Cloud Core - Live WebSocket Stream - Ed25519 Verified Batches" and
 * AlertConsolePage rendered a "Live WebSocket Stream" card pointing at
 * ws://localhost:8000/ws/alerts. Nothing connected to anything.
 */

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('aahar_api_base_url');
    if (custom && custom.trim().length > 0) {
      return custom.trim().replace(/\/+$/, '');
    }
  }
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // Default to '/api' which Vite proxies to http://localhost:8000
  return '/api';
}

export class ApiError extends Error {
  constructor(readonly status: number, readonly detail: string, readonly requestId?: string) {
    super(`${status}: ${detail}`);
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const baseUrl = getBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? 15_000);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init.headers ?? {}),
      },
    });

    const requestId = response.headers.get('X-Request-ID') ?? undefined;

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const body = await response.json();
        detail = body?.detail ?? detail;
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(response.status, String(detail), requestId);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error)?.name === 'AbortError') {
      throw new ApiError(408, 'Request timed out.');
    }
    throw new ApiError(0, (err as Error)?.message ?? 'Network request failed.');
  } finally {
    clearTimeout(timeout);
  }
}

// ── Live Backend Health & Telemetry ──────────────────────────────────────────

export interface BackendHealthTelemetry {
  online: boolean;
  latencyMs: number;
  statusCode: number;
  service: string;
  version: string;
  database: string;
  schemaVersion: number;
  timestamp: string;
  requestId?: string;
  error?: string;
  endpoint: string;
}

export async function checkBackendHealth(): Promise<BackendHealthTelemetry> {
  const base = getBaseUrl();
  const startTime = performance.now();
  const timestamp = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const healthRes = await fetch(`${base}/health`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - startTime);
    const reqId = healthRes.headers.get('X-Request-ID') ?? undefined;

    if (!healthRes.ok) {
      return {
        online: false,
        latencyMs,
        statusCode: healthRes.status,
        service: 'aahar-cloud',
        version: 'unknown',
        database: 'unreachable',
        schemaVersion: 0,
        timestamp,
        requestId: reqId,
        error: `HTTP ${healthRes.status}: ${healthRes.statusText}`,
        endpoint: `${base}/health`,
      };
    }

    const healthData = await healthRes.json();

    let dbStatus = 'ok';
    let schemaVer = 3;
    try {
      const readyRes = await fetch(`${base}/health/ready`, {
        headers: { Accept: 'application/json' },
      });
      if (readyRes.ok) {
        const readyData = await readyRes.json();
        dbStatus = readyData.database || 'ok';
        schemaVer = readyData.schema_version ?? 3;
      }
    } catch {
      dbStatus = 'degraded';
    }

    return {
      online: true,
      latencyMs,
      statusCode: healthRes.status,
      service: healthData.service || 'aahar-cloud',
      version: healthData.version || '0.1.0',
      database: dbStatus,
      schemaVersion: schemaVer,
      timestamp,
      requestId: reqId,
      endpoint: `${base}/health`,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      online: false,
      latencyMs,
      statusCode: 0,
      service: 'aahar-cloud',
      version: 'offline',
      database: 'unreachable',
      schemaVersion: 0,
      timestamp,
      error: err?.message || 'Connection refused or timed out',
      endpoint: `${base}/health`,
    };
  }
}

export async function fetchRecentAlerts(): Promise<any[]> {
  try {
    const data = await apiFetch<{ count: number; alerts: any[] }>('/alerts/recent');
    return data?.alerts ?? [];
  } catch {
    return [];
  }
}

// ── Live alert stream ───────────────────────────────────────────────────────

export type StreamState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'unavailable';

export interface AlertStreamHandlers {
  onAlert: (alert: unknown) => void;
  onStateChange: (state: StreamState, detail?: string) => void;
}

/**
 * Real WebSocket with bounded exponential backoff. The caller renders
 * whatever state this reports -- a "LIVE" badge is only shown for
 * 'connected'.
 */
export function connectAlertStream(handlers: AlertStreamHandlers): () => void {
  const baseUrl = getBaseUrl();
  let wsUrl: string;

  if (baseUrl.startsWith('/')) {
    // Relative path proxied by Vite - determine host from window.location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl = `${protocol}//${window.location.host}/ws/alerts`;
  } else {
    wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws/alerts';
  }

  let socket: WebSocket | null = null;
  let attempt = 0;
  let closedByCaller = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const open = () => {
    if (closedByCaller) return;
    handlers.onStateChange(attempt === 0 ? 'connecting' : 'reconnecting');

    try {
      socket = new WebSocket(accessToken ? `${wsUrl}?token=${accessToken}` : wsUrl);
    } catch (err) {
      scheduleRetry((err as Error)?.message);
      return;
    }

    socket.onopen = () => {
      attempt = 0;
      handlers.onStateChange('connected');
    };
    socket.onmessage = (event) => {
      try {
        handlers.onAlert(JSON.parse(event.data));
      } catch {
        console.warn('[aahar] discarded malformed alert frame');
      }
    };
    socket.onerror = () => {
      /* onclose always follows; retry is handled there */
    };
    socket.onclose = (event) => {
      if (closedByCaller) {
        handlers.onStateChange('disconnected');
        return;
      }
      scheduleRetry(`socket closed (code ${event.code})`);
    };
  };

  const scheduleRetry = (detail?: string) => {
    attempt += 1;
    if (attempt > 8) {
      handlers.onStateChange('unavailable', detail ?? 'Gave up after 8 attempts.');
      return;
    }
    const delay = Math.min(30_000, 1_000 * 2 ** (attempt - 1)) + Math.random() * 500;
    handlers.onStateChange('reconnecting', detail);
    timer = setTimeout(open, delay);
  };

  open();

  return () => {
    closedByCaller = true;
    if (timer) clearTimeout(timer);
    socket?.close();
  };
}
