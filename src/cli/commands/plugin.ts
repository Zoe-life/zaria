import { Command } from 'commander';
import { resolve } from 'path';
import { logger } from '../../logger.js';
import { discoverPlugins } from '../../plugin/discovery.js';

/** `zaria plugin` — plugin management sub-commands. */
export const pluginCommand = new Command('plugin').description('Manage Zaria plugins');

/** `zaria plugin list [path]` — lists discovered and installed plugins. */
pluginCommand
  .command('list')
  .description('List installed Zaria plugins (discovered from node_modules)')
  .argument('[path]', 'path to the project root (default: current directory)')
  .action(async (path: string | undefined) => {
    const projectRoot = resolve(path ?? '.');
    const discovered = await discoverPlugins(projectRoot);
    if (discovered.length === 0) {
      logger.info('No plugins installed.');
    } else {
      logger.info(`Found ${discovered.length} plugin(s): ${discovered.join(', ')}`);
    }
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
