/**
 * SRE connection wizard — Phase 12.5.
 *
 * Provides an interactive CLI setup flow for configuring SRE provider
 * credentials.  In a real interactive TTY, the wizard uses `readline` to
 * prompt the user; in non-TTY environments (CI, pipes) it falls back to
 * reading values from `ZARIA_SRE_*` environment variables.
 *
 * Credentials are **never** written to disk by this module — the returned
 * `SreConfig` should be stored in the OS keychain via an appropriate
 * keychain library (macOS Keychain, Linux libsecret, Windows Credential
 * Manager) by the CLI command handler.
 */

import * as readline from 'node:readline/promises';
import { stdin, stdout, env } from 'node:process';
import type { SreConfig } from './types.js';
import { PrometheusAdapter } from './prometheus.js';
import { DatadogAdapter } from './datadog.js';
import { GrafanaAdapter } from './grafana.js';
import type { SreProvider } from './types.js';

// ---------------------------------------------------------------------------
// Supported providers
// ---------------------------------------------------------------------------

export type ProviderName = 'prometheus' | 'datadog' | 'grafana';

const PROVIDER_LABELS: Readonly<Record<ProviderName, string>> = {
  prometheus: 'Prometheus / Thanos / Cortex',
  datadog: 'Datadog',
  grafana: 'Grafana',
};

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------

/** Options accepted by `runConnectWizard`. */
export interface ConnectWizardOptions {
  /**
   * Pre-select a provider without prompting.  When omitted the wizard asks
   * the user to choose.
   */
  provider?: ProviderName;
  /**
   * When `true`, skip the connectivity test after gathering credentials
   * (useful in unit tests).
   */
  skipTest?: boolean;
}

/** Result returned by the connect wizard. */
export interface ConnectResult {
  /** The SRE provider name that was configured. */
  provider: ProviderName;
  /** The SRE config gathered during the wizard session. */
  config: SreConfig;
  /** Whether the connectivity test passed (`undefined` when skipped). */
  testPassed?: boolean;
}

/**
 * Run the interactive SRE connection wizard.
 *
 * The wizard reads from `stdin` in interactive TTY environments.  In
 * non-interactive environments it reads from `ZARIA_SRE_*` env vars:
 *   `ZARIA_SRE_PROVIDER` — `prometheus | datadog | grafana`
 *   `ZARIA_SRE_BASE_URL` — base URL of the SRE tool
 *   `ZARIA_SRE_TOKEN`    — API token / bearer token
 *
 * @param options  Optional pre-configuration.
 * @param log      Callback for outputting wizard messages (default: console.log).
 * @returns        The gathered `ConnectResult`.
 */
export async function runConnectWizard(
  options: ConnectWizardOptions = {},
  log: (msg: string) => void = (msg) => stdout.write(msg + '\n'),
): Promise<ConnectResult> {
  const isTTY = stdin.isTTY === true;

  // Helper: prompt in TTY mode, else read from env or default.
  const rl = isTTY ? readline.createInterface({ input: stdin, output: stdout }) : null;

  async function ask(prompt: string, envKey: string, defaultValue = ''): Promise<string> {
    if (!isTTY) return env[envKey] ?? defaultValue;
    const answer = await rl!.question(prompt);
    return answer.trim() || defaultValue;
  }

  try {
    log('');
    log('🔗  Zaria SRE Connection Wizard');
    log('────────────────────────────────');

    // Step 1: Choose provider.
    let providerName: ProviderName;
    if (options.provider) {
      providerName = options.provider;
      log(`   Provider: ${PROVIDER_LABELS[providerName]}`);
    } else {
      const labels = (Object.keys(PROVIDER_LABELS) as ProviderName[])
        .map((k, i) => `   ${i + 1}. ${PROVIDER_LABELS[k]}`)
        .join('\n');
      log('   Select a provider:\n' + labels);
      const choice = await ask('   Enter number [1]: ', 'ZARIA_SRE_PROVIDER', '1');
      const providers = Object.keys(PROVIDER_LABELS) as ProviderName[];
      // Accept numeric choice or direct name.
      const idx = parseInt(choice, 10);
      providerName =
        Number.isInteger(idx) && idx >= 1 && idx <= providers.length
          ? providers[idx - 1]
          : (providers.find((p) => p === choice) ?? providers[0]);
    }

    // Step 2: Gather connection details.
    const baseUrl = await ask(
      `   Base URL (e.g. https://${providerName}.example.com): `,
      'ZARIA_SRE_BASE_URL',
    );
    const token = await ask('   API Token (leave blank for none): ', 'ZARIA_SRE_TOKEN');

    const config: SreConfig = {
      baseUrl,
      ...(token ? { token } : {}),
    };

    // Step 3: Optional connectivity test.
    let testPassed: boolean | undefined;
    if (!options.skipTest) {
      log('   Testing connectivity…');
      const adapter = createProvider(providerName, config);
      testPassed = await adapter.test();
      if (testPassed) {
        log('   ✅  Connection successful!');
      } else {
        log('   ⚠️   Connection test failed — check the URL and credentials.');
      }
    }

    log('');
    return { provider: providerName, config, testPassed };
  } finally {
    rl?.close();
  }
}

// ---------------------------------------------------------------------------
// Provider factory (also exported for use in other modules)
// ---------------------------------------------------------------------------

/**
 * Instantiate the correct `SreProvider` adapter for the given provider name.
 *
 * @param name    Provider identifier.
 * @param config  Connection configuration.
 * @returns       An `SreProvider` ready to call `test()` or `fetchMetrics()`.
 */
export function createProvider(name: ProviderName, config: SreConfig): SreProvider {
  switch (name) {
    case 'prometheus':
      return new PrometheusAdapter(config);
    case 'datadog':
      return new DatadogAdapter(config);
    case 'grafana':
      return new GrafanaAdapter(config);
    default: {
      const _exhaustive: never = name;
      throw new Error(`Unknown SRE provider: ${String(_exhaustive)}`);
    }
  }
}
