import { Command } from 'commander';

/** `zaria plugin` — plugin management sub-commands. */
export const pluginCommand = new Command('plugin').description('Manage Zaria plugins');

/** `zaria plugin list` — lists installed plugins. */
pluginCommand
  .command('list')
  .description('List installed plugins')
  .action(() => {
    console.log('No plugins installed.');
  });

/** `zaria plugin add <name>` — installs a plugin. */
pluginCommand
  .command('add <name>')
  .description('Install a Zaria plugin')
  .action((name: string) => {
    console.log(`Installing plugin ${name}…`);
  });

/** `zaria plugin remove <name>` — removes a plugin. */
pluginCommand
  .command('remove <name>')
  .description('Remove a Zaria plugin')
  .action((name: string) => {
    console.log(`Removing plugin ${name}…`);
  });
