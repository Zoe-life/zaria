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

/** `zaria sre test` — pings configured SRE providers. */
sreCommand
  .command('test')
  .description('Test connectivity to configured SRE tools')
  .option('-p, --provider <name>', 'provider name: prometheus|datadog|grafana')
  .option('--url <url>', 'base URL of the provider')
  .option('--token <token>', 'API token')
  .action(async (options: { provider?: string; url?: string; token?: string }) => {
    if (!options.provider || !options.url) {
      logger.info('No SRE providers configured. Run `zaria sre connect` to set one up.');
      return;
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
