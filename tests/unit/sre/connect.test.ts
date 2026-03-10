import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runConnectWizard } from '../../../src/sre/connect.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect all log messages emitted during the wizard. */
function captureLog(): { messages: string[]; log: (msg: string) => void } {
  const messages: string[] = [];
  return { messages, log: (msg: string) => messages.push(msg) };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

// ---------------------------------------------------------------------------
// runConnectWizard — non-TTY (env-var driven) mode
// ---------------------------------------------------------------------------

describe('runConnectWizard (non-TTY)', () => {
  // Ensure stdin.isTTY is false so the wizard reads from env vars.
  beforeEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', { value: undefined, configurable: true });
  });

  it('returns prometheus config when ZARIA_SRE_PROVIDER=prometheus', async () => {
    process.env.ZARIA_SRE_PROVIDER = 'prometheus';
    process.env.ZARIA_SRE_BASE_URL = 'https://prom.example.com';
    process.env.ZARIA_SRE_TOKEN = 'mytoken';
    delete process.env.ZARIA_SRE_APP_KEY;

    const { messages, log } = captureLog();
    const result = await runConnectWizard({ skipTest: true }, log);

    expect(result.provider).toBe('prometheus');
    expect(result.config.baseUrl).toBe('https://prom.example.com');
    expect(result.config.token).toBe('mytoken');
    expect(result.testPassed).toBeUndefined();
    expect(messages.some((m) => m.includes('Zaria SRE Connection Wizard'))).toBe(true);

    delete process.env.ZARIA_SRE_PROVIDER;
    delete process.env.ZARIA_SRE_BASE_URL;
    delete process.env.ZARIA_SRE_TOKEN;
  });

  it('pre-selects provider when options.provider is set', async () => {
    process.env.ZARIA_SRE_BASE_URL = 'https://grafana.example.com';
    process.env.ZARIA_SRE_TOKEN = 'glsa_tok';
    delete process.env.ZARIA_SRE_APP_KEY;

    const { log } = captureLog();
    const result = await runConnectWizard({ provider: 'grafana', skipTest: true }, log);

    expect(result.provider).toBe('grafana');
    expect(result.config.token).toBe('glsa_tok');

    delete process.env.ZARIA_SRE_BASE_URL;
    delete process.env.ZARIA_SRE_TOKEN;
  });

  // BUG 3 FIX verification: Datadog wizard must collect both API key and app key.
  it('encodes Datadog api-key+app-key as basicAuth when both are provided', async () => {
    process.env.ZARIA_SRE_BASE_URL = 'https://api.datadoghq.com';
    process.env.ZARIA_SRE_TOKEN = 'myapikey';
    process.env.ZARIA_SRE_APP_KEY = 'myappkey';

    const { log } = captureLog();
    const result = await runConnectWizard({ provider: 'datadog', skipTest: true }, log);

    expect(result.provider).toBe('datadog');
    expect(result.config.basicAuth).toBe('myapikey:myappkey');
    // token should NOT be set separately when basicAuth encodes both keys
    expect(result.config.token).toBeUndefined();

    delete process.env.ZARIA_SRE_BASE_URL;
    delete process.env.ZARIA_SRE_TOKEN;
    delete process.env.ZARIA_SRE_APP_KEY;
  });

  it('falls back to token-only config when Datadog app key is absent', async () => {
    process.env.ZARIA_SRE_BASE_URL = 'https://api.datadoghq.com';
    process.env.ZARIA_SRE_TOKEN = 'myapikey';
    delete process.env.ZARIA_SRE_APP_KEY;

    const { log } = captureLog();
    const result = await runConnectWizard({ provider: 'datadog', skipTest: true }, log);

    expect(result.provider).toBe('datadog');
    expect(result.config.token).toBe('myapikey');
    expect(result.config.basicAuth).toBeUndefined();

    delete process.env.ZARIA_SRE_BASE_URL;
    delete process.env.ZARIA_SRE_TOKEN;
  });

  it('runs connectivity test and sets testPassed', async () => {
    process.env.ZARIA_SRE_BASE_URL = 'https://prom.example.com';
    process.env.ZARIA_SRE_TOKEN = 'tok';
    delete process.env.ZARIA_SRE_APP_KEY;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) }),
    );

    const { log } = captureLog();
    const result = await runConnectWizard({ provider: 'prometheus' }, log);

    expect(result.testPassed).toBe(true);

    delete process.env.ZARIA_SRE_BASE_URL;
    delete process.env.ZARIA_SRE_TOKEN;
  });
});
