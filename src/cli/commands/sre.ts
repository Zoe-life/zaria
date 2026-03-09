import { Command } from 'commander';
import { logger } from '../../logger.js';

/** `zaria sre` — SRE tool sub-commands. */
export const sreCommand = new Command('sre').description('Manage SRE tool connections');

/** `zaria sre connect` — interactive wizard for configuring an SRE tool. */
sreCommand
  .command('connect')
  .description('Interactively configure an SRE tool connection')
  .action(() => {
    logger.info('SRE connection wizard — coming soon.');
  });

/** `zaria sre test` — pings configured SRE providers. */
sreCommand
  .command('test')
  .description('Test connectivity to configured SRE tools')
  .action(() => {
    logger.info('No SRE providers configured.');
  });
