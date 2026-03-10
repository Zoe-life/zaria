/**
 * Prometheus SRE adapter — Phase 12.2.
 *
 * Queries a Prometheus-compatible HTTP API using PromQL.
 * Uses the `instant query` endpoint (`/api/v1/query`) for single-point
 * metric values and the `range query` endpoint for time-series data.
 *
 * Authentication:
 *   • Bearer token via `Authorization: Bearer <token>` header.
 *   • HTTP Basic auth via `Authorization: Basic <base64>` header.
 *
 * Time  O(R)  where R = number of result series returned by Prometheus.
 * Space O(R).
 */

import type { Metric, SreConfig, SreProvider } from './types.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a base64-encoded Basic auth header value. */
function basicAuthHeader(cred: string): string {
  return `Basic ${Buffer.from(cred).toString('base64')}`;
}

/** Construct the `Authorization` header from the config, if any. */
function authHeader(cfg: SreConfig): string | undefined {
  if (cfg.token) return `Bearer ${cfg.token}`;
  if (cfg.basicAuth) return basicAuthHeader(cfg.basicAuth);
  return undefined;
}

// ---------------------------------------------------------------------------
// Prometheus Instant Query response types (minimal subset)
// ---------------------------------------------------------------------------

interface PrometheusVector {
  metric: Record<string, string>;
  value: [number, string]; // [timestamp, value]
}

interface PrometheusResponse {
  status: 'success' | 'error';
  data?: { resultType: string; result: PrometheusVector[] };
  error?: string;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * Prometheus SRE adapter.
 *
 * @example
 * ```ts
 * const prom = new PrometheusAdapter({ baseUrl: 'https://prom.example.com', token: 'xxx' });
 * if (await prom.test()) {
 *   const metrics = await prom.fetchMetrics('rate(http_requests_total[5m])');
 * }
 * ```
 */
export class PrometheusAdapter implements SreProvider {
  readonly name = 'prometheus';

  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(cfg: SreConfig) {
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '');
    this.timeoutMs = cfg.timeoutMs ?? 10_000;
    const auth = authHeader(cfg);
    this.headers = {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: auth } : {}),
    };
  }

  /**
   * Test connectivity by calling the Prometheus build-info endpoint.
   * Returns `true` when the API responds with HTTP 2xx.
   */
  async test(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/status/buildinfo`, {
        headers: this.headers,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Execute a PromQL instant query and return the result as `Metric[]`.
   *
   * @param query  A valid PromQL expression.
   */
  async fetchMetrics(query: string): Promise<Metric[]> {
    const url = new URL(`${this.baseUrl}/api/v1/query`);
    url.searchParams.set('query', query);

    const res = await fetch(url.toString(), {
      headers: this.headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`Prometheus query failed: HTTP ${res.status}`);
    }

    const body = (await res.json()) as PrometheusResponse;

    if (body.status !== 'success' || !body.data) {
      throw new Error(`Prometheus error: ${body.error ?? 'unknown'}`);
    }

    if (body.data.resultType !== 'vector') {
      // Range queries and scalar results are unsupported via this helper.
      return [];
    }

    return body.data.result.map(({ metric, value }) => ({
      name: query,
      value: parseFloat(value[1]),
      timestamp: value[0],
      labels: metric,
    }));
  }
}
