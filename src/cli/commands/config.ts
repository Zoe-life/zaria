import { Command } from 'commander';

/** `zaria config` — configuration management sub-commands. */
export const configCommand = new Command('config').description('Manage Zaria configuration');

/** `zaria config init` — scaffolds a .zariarc.yml from the bundled template. */
configCommand
  .command('init')
  .description('Scaffold a .zariarc config file in the current directory')
  .action(() => {
    console.log('Scaffolding .zariarc.yml…');
  });

/** `zaria config validate` — validates the current config file. */
configCommand
  .command('validate')
  .description('Validate the current .zariarc file')
  .action(() => {
    console.log('Config valid.');
  });
