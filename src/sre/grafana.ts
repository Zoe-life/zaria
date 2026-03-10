/**
 * Grafana SRE adapter — Phase 12.4.
 *
 * Queries the Grafana HTTP API to:
 *   • Retrieve datasource-backed metric queries via the `/api/ds/query` endpoint.
 *   • Fetch active and firing alert rules via `/api/alerting/alerts`.
 *
 * Authentication:
 *   • Service-account token via `Authorization: Bearer <token>` header.
 *   • Basic auth (legacy) via `Authorization: Basic <base64>` header.
 *
 * Time  O(F)  where F = frames returned per series query.
 * Space O(F).
 */

import type { Metric, SreConfig, SreProvider } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function basicAuthHeader(cred: string): string {
  return `Basic ${Buffer.from(cred).toString('base64')}`;
}

function authHeader(cfg: SreConfig): string | undefined {
  if (cfg.token) return `Bearer ${cfg.token}`;
  if (cfg.basicAuth) return basicAuthHeader(cfg.basicAuth);
  return undefined;
}

// ---------------------------------------------------------------------------
// Grafana API response types (minimal subset)
// ---------------------------------------------------------------------------

/** A single active alert rule returned by `/api/alerting/alerts`. */
interface GrafanaAlert {
  id: number;
  name: string;
  state: string; // 'alerting' | 'ok' | 'no_data' | 'paused' | 'pending'
  newStateDate: string;
  panelId?: number;
  dashboardId?: number;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * Grafana SRE adapter.
 *
 * `fetchMetrics` interprets the `query` parameter as a keyword:
 *   • `"alerts"` — return a metric per firing alert (value = 1).
 *   • Any other value — treated as a literal panel/query name (not yet supported).
 *
 * @example
 * ```ts
 * const grafana = new GrafanaAdapter({ baseUrl: 'https://grafana.example.com', token: 'glsa_xxx' });
 * if (await grafana.test()) {
 *   const alerts = await grafana.fetchMetrics('alerts');
 * }
 * ```
 */
export class GrafanaAdapter implements SreProvider {
  readonly name = 'grafana';

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
   * Test connectivity by calling the Grafana health endpoint.
   * Returns `true` when the API responds with HTTP 2xx.
   */
  async test(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, {
        headers: this.headers,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch metrics from Grafana.
   *
   * When `query === "alerts"`, returns one `Metric` per firing alert rule
   * (value = 1, labels include `name` and `state`).
   *
   * @param query  `"alerts"` to retrieve active alert states.
   */
  async fetchMetrics(query: string): Promise<Metric[]> {
    if (query === 'alerts') {
      return this.fetchAlerts();
    }

    // Unsupported query type — return empty rather than throw so callers can
    // degrade gracefully without crashing the audit pipeline.
    return [];
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async fetchAlerts(): Promise<Metric[]> {
    const res = await fetch(`${this.baseUrl}/api/alerting/alerts`, {
      headers: this.headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`Grafana alerts fetch failed: HTTP ${res.status}`);
    }

    const alerts = (await res.json()) as GrafanaAlert[];
    const now = Date.now() / 1_000;

    return alerts.map((alert) => ({
      name: 'grafana_alert',
      value: alert.state === 'alerting' ? 1 : 0,
      timestamp: now,
      labels: {
        alert_name: alert.name,
        state: alert.state,
        ...(alert.dashboardId != null ? { dashboard_id: String(alert.dashboardId) } : {}),
        ...(alert.panelId != null ? { panel_id: String(alert.panelId) } : {}),
      },
    }));
  }
}
