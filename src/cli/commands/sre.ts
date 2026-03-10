import { Command } from 'commander';
import { logger } from '../../logger.js';
import { runConnectWizard, createProvider } from '../../sre/connect.js';
import type { ProviderName } from '../../sre/connect.js';
import type { SreConfig } from '../../sre/types.js';

/** `zaria sre` — SRE tool sub-commands. */
export const sreCommand = new Command('sre').description('Manage SRE tool connections');

/** `zaria sre connect` — interactive wizard for configuring an SRE tool. */
sreCommand
  .command('connect')
  .description('Interactively configure an SRE tool connection')
  .option('-p, --provider <name>', 'provider name: prometheus|datadog|grafana')
  .action(async (options: { provider?: string }) => {
    logger.info('Starting SRE connection wizard…');
    const provider = options.provider as ProviderName | undefined;
    try {
      const result = await runConnectWizard({ provider });
      if (result.testPassed === false) {
        logger.warn('SRE connection test failed — check your credentials and base URL.');
        process.exitCode = 1;
      } else {
        logger.info(`SRE provider "${result.provider}" configured successfully.`);
      }
    } catch (err) {
      logger.error({ err }, 'SRE connection wizard encountered an error.');
      process.exitCode = 1;
    }
  });

/**
 * `zaria sre test` — pings configured SRE providers.
 *
 * BUG 3/4 FIX: Added `--app-key` option for Datadog.  Datadog requires both
 * an API key (`--token`) and an application key (`--app-key`) for metric
 * queries.  When both are provided they are encoded as `basicAuth` in the
 * format `"apikey:appkey"` which `DatadogAdapter` expects.  Without the app
 * key, `adapter.test()` (which only validates the API key) would succeed but
 * subsequent `fetchMetrics()` calls would fail with 403.
 */
sreCommand
  .command('test')
  .description('Test connectivity to configured SRE tools')
  .option('-p, --provider <name>', 'provider name: prometheus|datadog|grafana')
  .option('--url <url>', 'base URL of the provider')
  .option('--token <token>', 'API token / API key')
  .option('--app-key <key>', 'Datadog application key (required for Datadog metric queries)')
  .action(async (options: { provider?: string; url?: string; token?: string; appKey?: string }) => {
  .option('--token <token>', 'API token')
  .action(async (options: { provider?: string; url?: string; token?: string }) => {
    if (!options.provider || !options.url) {
      logger.info('No SRE providers configured. Run `zaria sre connect` to set one up.');
      return;
    }

    // Build SreConfig: for Datadog encode both keys as basicAuth when app-key
    // is supplied so DatadogAdapter can set DD-APPLICATION-KEY on requests.
    let cfg: SreConfig;
    if (options.provider === 'datadog' && options.token && options.appKey) {
      cfg = { baseUrl: options.url, basicAuth: `${options.token}:${options.appKey}` };
    } else {
      cfg = { baseUrl: options.url, token: options.token };
    }

    const cfg: SreConfig = { baseUrl: options.url, token: options.token };
    try {
      const adapter = createProvider(options.provider as ProviderName, cfg);
      const ok = await adapter.test();
      if (ok) {
        logger.info(`✅  ${options.provider} connection OK`);
      } else {
        logger.warn(`❌  ${options.provider} connection FAILED`);
        process.exitCode = 1;
      }
    } catch (err) {
      logger.error({ err }, 'SRE test failed');
      process.exitCode = 1;
    }
  });
