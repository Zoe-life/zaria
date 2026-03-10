/**
 * SRE integration — shared types — Phase 12.1.
 *
 * Defines the `SreProvider` interface and related value types consumed by all
 * concrete SRE adapters (Prometheus, Datadog, Grafana).
 */

// ---------------------------------------------------------------------------
// Metric primitives
// ---------------------------------------------------------------------------

/** A single numeric metric sample returned by an SRE provider. */
export interface Metric {
  /** Human-readable metric name, e.g. `"http_request_duration_seconds_p99"`. */
  name: string;
  /** Numeric value of the sample. */
  value: number;
  /** Unix timestamp (seconds) when the sample was recorded. */
  timestamp: number;
  /**
   * Arbitrary key/value labels attached to this metric, e.g.
   * `{ service: "api", env: "production" }`.
   */
  labels: Readonly<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

/**
 * Credential / connection configuration shared by all SRE provider adapters.
 * Each adapter may extend this with provider-specific fields.
 */
export interface SreConfig {
  /** Base URL of the SRE tool's HTTP API, e.g. `"https://prometheus.example.com"`. */
  baseUrl: string;
  /**
   * Bearer token for API authentication.
   * Stored in the system keychain at runtime; never written to disk by Zaria.
   */
  token?: string;
  /**
   * Basic-auth credentials as `"username:password"`.
   * Mutually exclusive with `token`.
   */
  basicAuth?: string;
  /**
   * Request timeout in milliseconds (default: 10 000 ms).
   * Capped to prevent long hangs during `audit` runs.
   */
  timeoutMs?: number;
}

/**
 * The minimal contract that every SRE provider adapter must satisfy.
 *
 * Adapters are lazily instantiated — they don't perform any I/O until
 * `test()` or `fetchMetrics()` is called.
 */
export interface SreProvider {
  /** Short identifier for the provider, e.g. `"prometheus"`. */
  readonly name: string;

  /**
   * Probe the provider's API to verify that credentials are valid and the
   * endpoint is reachable.
   *
   * @returns `true` when the provider is healthy; `false` otherwise.
   */
  test(): Promise<boolean>;

  /**
   * Fetch one or more metrics matching `query`.
   *
   * The semantics of `query` are provider-specific:
   *   • Prometheus: a PromQL expression
   *   • Datadog: a Datadog metrics query string
   *   • Grafana: a Loki LogQL expression or a datasource-specific query
   *
   * @param query  Provider-specific query string.
   * @returns      Array of matching `Metric` samples (may be empty).
   */
  fetchMetrics(query: string): Promise<Metric[]>;
}

// ---------------------------------------------------------------------------
// Enrichment output
// ---------------------------------------------------------------------------

/**
 * SRE context attached to a static finding when runtime data correlates with
 * the code path identified by that finding.
 */
export interface SreEnrichment {
  /** Identifier of the SRE provider that supplied this data. */
  provider: string;
  /** Fraction of production errors attributed to this code path (0–1). */
  errorRate?: number;
  /** p99 latency in milliseconds for requests touching this code path. */
  p99LatencyMs?: number;
  /** Human-readable summary of the runtime impact. */
  summary: string;
}
