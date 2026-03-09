import { Command } from 'commander';
import { logger } from '../../logger.js';

/** `zaria plugin` — plugin management sub-commands. */
export const pluginCommand = new Command('plugin').description('Manage Zaria plugins');

/** `zaria plugin list` — lists installed plugins. */
pluginCommand
  .command('list')
  .description('List installed plugins')
  .action(() => {
    logger.info('No plugins installed.');
  });

/** `zaria plugin add <name>` — installs a plugin. */
pluginCommand
  .command('add <name>')
  .description('Install a Zaria plugin')
  .action((name: string) => {
    logger.info(`Installing plugin ${name}…`);
  });

/** `zaria plugin remove <name>` — removes a plugin. */
pluginCommand
  .command('remove <name>')
  .description('Remove a Zaria plugin')
  .action((name: string) => {
    logger.info(`Removing plugin ${name}…`);
  });
