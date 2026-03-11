import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

/** Regex that matches a canonical UUID v4 string. */
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Dynamically re-import the telemetry module so each test gets a fresh
 *  module state (important because `_cachedId` is module-level). */
async function importTelemetry(): Promise<typeof import('../../../src/telemetry/index.ts')> {
  // Vitest resets module registry when vi.resetModules() is called.
  return import('../../../src/telemetry/index.ts');
}

// ---------------------------------------------------------------------------
// isTelemetryEnabled
// ---------------------------------------------------------------------------

describe('isTelemetryEnabled', () => {
  afterEach(() => {
    delete process.env['ZARIA_TELEMETRY'];
  });

  it('returns true when ZARIA_TELEMETRY is not set', async () => {
    delete process.env['ZARIA_TELEMETRY'];
    const { isTelemetryEnabled } = await importTelemetry();
    expect(isTelemetryEnabled()).toBe(true);
  });

  it('returns false when ZARIA_TELEMETRY=0', async () => {
    process.env['ZARIA_TELEMETRY'] = '0';
    const { isTelemetryEnabled } = await importTelemetry();
    expect(isTelemetryEnabled()).toBe(false);
  });

  it('returns true when ZARIA_TELEMETRY is set to any value other than "0"', async () => {
    process.env['ZARIA_TELEMETRY'] = '1';
    const { isTelemetryEnabled } = await importTelemetry();
    expect(isTelemetryEnabled()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getInstallationId
// ---------------------------------------------------------------------------

describe('getInstallationId', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'zaria-telemetry-test-'));
    vi.resetModules();
  });

  afterEach(async () => {
    vi.resetModules();
    vi.restoreAllMocks();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('generates a UUID on first call', async () => {
    // Redirect the config dir to our temp directory.
    const { getInstallationId, _resetInstallationIdCache } = await importTelemetry();
    _resetInstallationIdCache();

    // Mock the TELEMETRY_ID_FILE path via the fs module — easier: just spy on
    // readFile/writeFile to verify the UUID is a valid v4 UUID shape.
    const id = await getInstallationId();
    expect(id).toMatch(UUID_V4_RE);
  });

  it('returns the same ID on subsequent calls (caching)', async () => {
    const { getInstallationId, _resetInstallationIdCache } = await importTelemetry();
    _resetInstallationIdCache();

    const id1 = await getInstallationId();
    const id2 = await getInstallationId();
    expect(id1).toBe(id2);
  });

  it('does not throw when the config directory cannot be created', async () => {
    vi.resetModules();
    // Stub fs/promises so mkdir and writeFile both throw.
    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn().mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' })),
      writeFile: vi.fn().mockRejectedValue(new Error('EPERM')),
      mkdir: vi.fn().mockRejectedValue(new Error('EPERM')),
    }));

    const { getInstallationId, _resetInstallationIdCache } = await importTelemetry();
    _resetInstallationIdCache();

    // Should still return a UUID — an in-memory fallback.
    const id = await getInstallationId();
    expect(id).toMatch(UUID_V4_RE);

    vi.doUnmock('node:fs/promises');
  });
});

// ---------------------------------------------------------------------------
// trackEvent
// ---------------------------------------------------------------------------

describe('trackEvent', () => {
  afterEach(() => {
    delete process.env['ZARIA_TELEMETRY'];
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not call fetch when ZARIA_TELEMETRY=0', async () => {
    process.env['ZARIA_TELEMETRY'] = '0';
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { trackEvent } = await importTelemetry();
    trackEvent('audit_run');

    // Give the fire-and-forget a tick to run (it won't, but we wait anyway).
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('calls fetch with a POST request containing the event payload', async () => {
    delete process.env['ZARIA_TELEMETRY'];

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchSpy);

    const { trackEvent, _resetInstallationIdCache } = await importTelemetry();
    _resetInstallationIdCache();

    trackEvent('audit_run', { command: 'audit', dimensionCount: 6 });

    // Wait for the async fire-and-forget to complete.
    await new Promise((r) => setTimeout(r, 100));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://telemetry.zaria.dev/v1/events');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string) as {
      event: string;
      properties: { command: string; dimensionCount: number };
    };
    expect(body.event).toBe('audit_run');
    expect(body.properties.command).toBe('audit');
    expect(body.properties.dimensionCount).toBe(6);
  });

  it('silently swallows fetch errors so the CLI is never disrupted', async () => {
    delete process.env['ZARIA_TELEMETRY'];

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const { trackEvent, _resetInstallationIdCache } = await importTelemetry();
    _resetInstallationIdCache();

    // Should not throw.
    expect(() => {
      trackEvent('audit_run');
    }).not.toThrow();

    // Even after the async work finishes there should be no unhandled rejection.
    await new Promise((r) => setTimeout(r, 100));
  });

  it('includes zariaVersion, nodeVersion, platform, and timestamp in the payload', async () => {
    delete process.env['ZARIA_TELEMETRY'];

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchSpy);

    const { trackEvent, _resetInstallationIdCache } = await importTelemetry();
    _resetInstallationIdCache();

    trackEvent('plugin_listed', { pluginCount: 2 });
    await new Promise((r) => setTimeout(r, 100));

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      zariaVersion: string;
      nodeVersion: string;
      platform: string;
      timestamp: string;
      installationId: string;
    };

    expect(body.zariaVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(body.nodeVersion).toMatch(/^v\d+/);
    expect(typeof body.platform).toBe('string');
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.installationId).toMatch(UUID_V4_RE);
  });
});
