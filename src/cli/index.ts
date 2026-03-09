import { Command } from 'commander';
import { createRequire } from 'module';
import {
  auditCommand,
  auditPerfCommand,
  auditArchCommand,
  auditScaleCommand,
  auditIntegrityCommand,
  auditMaintCommand,
} from './commands/audit.js';
import { reportCommand } from './commands/report.js';
import { configCommand } from './commands/config.js';
import { sreCommand } from './commands/sre.js';
import { pluginCommand } from './commands/plugin.js';

const _require = createRequire(import.meta.url);
const pkg = _require('../../package.json') as { version: string };

/** Build and return the root Commander program. */
export function buildProgram(): Command {
  const program = new Command()
    .name('zaria')
    .description('Enterprise-grade codebase audit CLI')
    .version(pkg.version, '--version', 'Show version number')
    .option('--config <path>', 'path to a custom config file')
    .option('-v, --verbose', 'show verbose output')
    .option('--no-sre', 'disable SRE data fetching even if configured');

  program.addCommand(auditCommand);
  program.addCommand(auditPerfCommand);
  program.addCommand(auditArchCommand);
  program.addCommand(auditScaleCommand);
  program.addCommand(auditIntegrityCommand);
  program.addCommand(auditMaintCommand);
  program.addCommand(reportCommand);
  program.addCommand(configCommand);
  program.addCommand(sreCommand);
  program.addCommand(pluginCommand);

  return program;
}
