/**
 * Datadog SRE adapter — Phase 12.3.
 *
 * Queries the Datadog Metrics API v1 (`/api/v1/query`) using the standard
 * Datadog metrics query syntax.
 *
 * Authentication:
 *   • API key via `DD-API-KEY` header.
 *   • Application key via `DD-APPLICATION-KEY` header (required for query).
 *
 * The adapter accepts both keys via `basicAuth` (convention: `"<api-key>:<app-key>"`).
 * When only `token` is supplied it is used as the API key alone; metric queries
 * will succeed only when the Datadog organisation does not require an app key
 * (rare).  For full functionality always supply both keys via `basicAuth`.
 * The adapter accepts the API key via `token` and the application key via
 * `basicAuth` (convention: `"<api-key>:<app-key>"`).
 *
 * Time  O(S)  where S = number of series returned.
 * Space O(S).
 */

import type { Metric, SreConfig, SreProvider } from './types.js';

// ---------------------------------------------------------------------------
// Datadog Metrics API response types (minimal subset)
// ---------------------------------------------------------------------------

interface DatadogSeries {
  metric: string;
  pointlist: Array<[number, number | null]>; // [timestamp_ms, value]
  tags?: string[];
}

interface DatadogQueryResponse {
  status: 'ok' | 'error';
  series?: DatadogSeries[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * Datadog SRE adapter.
 *
 * @example
 * ```ts
 * // Provide both API key and application key via basicAuth: "apikey:appkey"
 * // token = API key, basicAuth = "api-key:app-key"
 * const dd = new DatadogAdapter({ baseUrl: 'https://api.datadoghq.com', basicAuth: 'apikey:appkey' });
 * if (await dd.test()) {
 *   const metrics = await dd.fetchMetrics('avg:system.cpu.user{*}');
 * }
 * ```
 */
export class DatadogAdapter implements SreProvider {
  readonly name = 'datadog';

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly appKey: string;
  private readonly timeoutMs: number;

  constructor(cfg: SreConfig) {
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '');
    this.timeoutMs = cfg.timeoutMs ?? 10_000;

    // Parse credentials: basicAuth = "apikey:appkey" (preferred for fetchMetrics).
    // Falling back to token-only sets appKey to '' which works for test() but
    // will cause fetchMetrics() to fail on most Datadog organisations.
    // Parse credentials: token = DD-API-KEY, basicAuth = "apikey:appkey"
    if (cfg.basicAuth) {
      const sep = cfg.basicAuth.indexOf(':');
      this.apiKey = cfg.basicAuth.slice(0, sep);
      this.appKey = cfg.basicAuth.slice(sep + 1);
    } else {
      this.apiKey = cfg.token ?? '';
      this.appKey = '';
    }
  }

  private get authHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'DD-API-KEY': this.apiKey,
      ...(this.appKey ? { 'DD-APPLICATION-KEY': this.appKey } : {}),
    };
  }

  /**
   * Test connectivity by calling the Datadog validate endpoint.
   * Returns `true` when the API key is valid.
   */
  async test(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/validate`, {
        headers: this.authHeaders,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Run a Datadog metrics query and return results as `Metric[]`.
   *
   * The time window defaults to the past 1 hour.
   *
   * @param query  A Datadog metrics query string, e.g. `avg:system.cpu.user{*}`.
   */
  async fetchMetrics(query: string): Promise<Metric[]> {
    const now = Math.floor(Date.now() / 1_000);
    const from = now - 3_600; // 1 hour window

    const url = new URL(`${this.baseUrl}/api/v1/query`);
    url.searchParams.set('from', String(from));
    url.searchParams.set('to', String(now));
    url.searchParams.set('query', query);

    const res = await fetch(url.toString(), {
      headers: this.authHeaders,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`Datadog query failed: HTTP ${res.status}`);
    }

    const body = (await res.json()) as DatadogQueryResponse;

    if (body.status !== 'ok' || !body.series) {
      throw new Error(`Datadog error: ${body.error ?? 'unknown'}`);
    }

    const metrics: Metric[] = [];
    for (const series of body.series) {
      // Use the last non-null point in the series as the representative value.
      const lastPoint = [...series.pointlist].reverse().find(([, v]) => v !== null);
      if (!lastPoint) continue;

      const [tsMs, value] = lastPoint;
      if (value === null) continue;

      // Convert tags array ["key:value", …] to a label map.
      const labels: Record<string, string> = {};
      for (const tag of series.tags ?? []) {
        const idx = tag.indexOf(':');
        if (idx !== -1) labels[tag.slice(0, idx)] = tag.slice(idx + 1);
      }

      metrics.push({ name: series.metric, value, timestamp: tsMs / 1_000, labels });
    }

    return metrics;
  }
}
