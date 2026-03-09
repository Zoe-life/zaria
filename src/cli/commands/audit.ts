import { Command } from 'commander';
import { resolve } from 'path';
import { logger } from '../../logger.js';

/** Shared audit flags applied to every audit (sub-)command. */
function addAuditFlags(cmd: Command): Command {
  return cmd
    .option('-o, --output <format>', 'output format: terminal|json|html|markdown|sarif', 'terminal')
    .option('-f, --file <path>', 'write report to file instead of stdout')
    .option(
      '-t, --threshold <score>',
      'fail if overall score is below this value (0–100)',
      parseFloat,
    )
    .option('--only <dimensions>', 'comma-separated dimensions to run')
    .option('--skip <dimensions>', 'comma-separated dimensions to skip');
}

function resolveTargetPath(p: string | undefined): string {
  return resolve(p ?? '.');
}

/** Full audit command: `zaria audit [path]` */
export const auditCommand = addAuditFlags(
  new Command('audit')
    .description('Run a full audit on the given project path (default: current directory)')
    .argument('[path]', 'path to the project root')
    .action((path: string | undefined) => {
      logger.info(`Running full audit on ${resolveTargetPath(path)}…`);
    }),
);

/** `zaria audit:perf [path]` */
export const auditPerfCommand = addAuditFlags(
  new Command('audit:perf')
    .description('Run only the Performance audit')
    .argument('[path]', 'path to the project root')
    .action((path: string | undefined) => {
      logger.info(`Running performance audit on ${resolveTargetPath(path)}…`);
    }),
);

/** `zaria audit:arch [path]` */
export const auditArchCommand = addAuditFlags(
  new Command('audit:arch')
    .description('Run only the Architecture audit')
    .argument('[path]', 'path to the project root')
    .action((path: string | undefined) => {
      logger.info(`Running architecture audit on ${resolveTargetPath(path)}…`);
    }),
);

/** `zaria audit:scale [path]` */
export const auditScaleCommand = addAuditFlags(
  new Command('audit:scale')
    .description('Run only the Scalability & Observability audit')
    .argument('[path]', 'path to the project root')
    .action((path: string | undefined) => {
      logger.info(`Running scalability audit on ${resolveTargetPath(path)}…`);
    }),
);

/** `zaria audit:integrity [path]` */
export const auditIntegrityCommand = addAuditFlags(
  new Command('audit:integrity')
    .description('Run only the Data Integrity & Race Conditions audit')
    .argument('[path]', 'path to the project root')
    .action((path: string | undefined) => {
      logger.info(`Running integrity audit on ${resolveTargetPath(path)}…`);
    }),
);

/** `zaria audit:maint [path]` */
export const auditMaintCommand = addAuditFlags(
  new Command('audit:maint')
    .description('Run only the Long-Term Maintenance audit')
    .argument('[path]', 'path to the project root')
    .action((path: string | undefined) => {
      logger.info(`Running maintenance audit on ${resolveTargetPath(path)}…`);
    }),
);
