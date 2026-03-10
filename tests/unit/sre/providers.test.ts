import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrometheusAdapter } from '../../../src/sre/prometheus.ts';
import { DatadogAdapter } from '../../../src/sre/datadog.ts';
import { GrafanaAdapter } from '../../../src/sre/grafana.ts';
import { createProvider } from '../../../src/sre/connect.ts';

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------

function mockFetch(response: {
  ok: boolean;
  status?: number;
  json?: () => Promise<unknown>;
}): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      json: response.json ?? ((): Promise<unknown> => Promise.resolve({})),
    }),
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

// ---------------------------------------------------------------------------
// PrometheusAdapter
// ---------------------------------------------------------------------------

describe('PrometheusAdapter', () => {
  const adapter = new PrometheusAdapter({ baseUrl: 'https://prom.example.com', token: 'tok' });

  it('name is "prometheus"', () => {
    expect(adapter.name).toBe('prometheus');
  });

  it('test() returns true when API responds 200', async () => {
    mockFetch({ ok: true });
    expect(await adapter.test()).toBe(true);
  });

  it('test() returns false when API responds 401', async () => {
    mockFetch({ ok: false, status: 401 });
    expect(await adapter.test()).toBe(false);
  });

  it('test() returns false when fetch throws (network error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    expect(await adapter.test()).toBe(false);
  });

  it('fetchMetrics() returns Metric array for a vector result', async () => {
    mockFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'success',
          data: {
            resultType: 'vector',
            result: [{ metric: { job: 'api' }, value: [1_735_689_600, '0.042'] }],
          },
        }),
    });
    const metrics = await adapter.fetchMetrics('up');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].value).toBeCloseTo(0.042);
    expect(metrics[0].labels).toEqual({ job: 'api' });
  });

  it('fetchMetrics() returns [] for non-vector resultType', async () => {
    mockFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'success',
          data: { resultType: 'matrix', result: [] },
        }),
    });
    const metrics = await adapter.fetchMetrics('rate(up[5m])');
    expect(metrics).toHaveLength(0);
  });

  it('fetchMetrics() throws when status is not 200', async () => {
    mockFetch({ ok: false, status: 500 });
    await expect(adapter.fetchMetrics('up')).rejects.toThrow(/500/);
  });

  it('fetchMetrics() throws when Prometheus returns error status', async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve({ status: 'error', error: 'bad query' }),
    });
    await expect(adapter.fetchMetrics('bad{{')).rejects.toThrow(/bad query/);
  });
});

// ---------------------------------------------------------------------------
// DatadogAdapter
// ---------------------------------------------------------------------------

describe('DatadogAdapter', () => {
  const adapter = new DatadogAdapter({
    baseUrl: 'https://api.datadoghq.com',
    basicAuth: 'apikey:appkey',
  });

  it('name is "datadog"', () => {
    expect(adapter.name).toBe('datadog');
  });

  it('test() returns true when validate endpoint is 200', async () => {
    mockFetch({ ok: true });
    expect(await adapter.test()).toBe(true);
  });

  it('test() returns false when API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect(await adapter.test()).toBe(false);
  });

  it('fetchMetrics() parses series correctly', async () => {
    mockFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'ok',
          series: [
            {
              metric: 'system.cpu.user',
              pointlist: [
                [1_735_689_600_000, 12.5],
                [1_735_689_660_000, 15.0],
              ],
              tags: ['env:production', 'service:api'],
            },
          ],
        }),
    });
    const metrics = await adapter.fetchMetrics('avg:system.cpu.user{*}');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('system.cpu.user');
    expect(metrics[0].value).toBe(15.0);
    expect(metrics[0].labels).toEqual({ env: 'production', service: 'api' });
  });

  it('fetchMetrics() skips series with all-null points', async () => {
    mockFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'ok',
          series: [{ metric: 'no.data', pointlist: [[1_000_000, null]], tags: [] }],
        }),
    });
    const metrics = await adapter.fetchMetrics('avg:no.data{*}');
    expect(metrics).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// GrafanaAdapter
// ---------------------------------------------------------------------------

describe('GrafanaAdapter', () => {
  const adapter = new GrafanaAdapter({
    baseUrl: 'https://grafana.example.com',
    token: 'glsa_xxx',
  });

  it('name is "grafana"', () => {
    expect(adapter.name).toBe('grafana');
  });

  it('test() returns true when /api/health is 200', async () => {
    mockFetch({ ok: true });
    expect(await adapter.test()).toBe(true);
  });

  it('test() returns false on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('DNS error')));
    expect(await adapter.test()).toBe(false);
  });

  it('fetchMetrics("alerts") returns one metric per alert', async () => {
    mockFetch({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: 1, name: 'High Error Rate', state: 'alerting', newStateDate: '2026-01-01' },
          { id: 2, name: 'Low Disk Space', state: 'ok', newStateDate: '2026-01-01' },
        ]),
    });
    const metrics = await adapter.fetchMetrics('alerts');
    expect(metrics).toHaveLength(2);
    expect(metrics[0].value).toBe(1); // alerting
    expect(metrics[1].value).toBe(0); // ok
    expect(metrics[0].labels.alert_name).toBe('High Error Rate');
  });

  it('fetchMetrics() returns [] for unsupported query types', async () => {
    const metrics = await adapter.fetchMetrics('some-other-query');
    expect(metrics).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// createProvider factory
// ---------------------------------------------------------------------------

describe('createProvider', () => {
  it('creates a PrometheusAdapter for "prometheus"', () => {
    const p = createProvider('prometheus', { baseUrl: 'https://p.example.com' });
    expect(p.name).toBe('prometheus');
  });

  it('creates a DatadogAdapter for "datadog"', () => {
    const p = createProvider('datadog', { baseUrl: 'https://dd.example.com' });
    expect(p.name).toBe('datadog');
  });

  it('creates a GrafanaAdapter for "grafana"', () => {
    const p = createProvider('grafana', { baseUrl: 'https://g.example.com' });
    expect(p.name).toBe('grafana');
  });

  it('throws for an unknown provider name', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createProvider('unknown' as any, { baseUrl: 'https://x.example.com' }),
    ).toThrow(/unknown sre provider/i);
  });
});
