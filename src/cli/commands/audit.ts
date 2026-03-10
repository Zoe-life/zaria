import { Command } from 'commander';
import { resolve } from 'path';
import { writeFile } from 'node:fs/promises';
import { logger } from '../../logger.js';
import { traverseFiles } from '../../audit/traversal.js';
import { parseFiles } from '../../audit/parser.js';
import { buildAnalysisContext } from '../../audit/context.js';
import { scorePerformance } from '../../audit/performance/scorer.js';
import { scoreArchitecture } from '../../audit/architecture/scorer.js';
import { scoreScalability } from '../../audit/scalability/scorer.js';
import { scoreIntegrity } from '../../audit/integrity/scorer.js';
import { scoreMaintenance } from '../../audit/maintenance/scorer.js';
import { aggregateScores } from '../../scorer/aggregate.js';
import { generateReport } from '../../report/index.js';
import type { OutputFormat } from '../../report/index.js';
import type { DimensionResult, AuditResult } from '../../audit/types.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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
    .option('--skip <dimensions>', 'comma-separated dimensions to skip')
    .option('-v, --verbose', 'include full finding list in terminal output');
}

function resolveTargetPath(p: string | undefined): string {
  return resolve(p ?? '.');
}

/** Parse a comma-separated list into a lowercase Set. */
function parseList(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.split(',').map((s) => s.trim().toLowerCase()));
}

/** Validate and normalise the output format, falling back to 'terminal'. */
function normaliseFormat(raw: string): OutputFormat {
  const VALID: ReadonlySet<OutputFormat> = new Set([
    'terminal',
    'json',
    'html',
    'markdown',
    'sarif',
  ]);
  const lower = raw.toLowerCase() as OutputFormat;
  return VALID.has(lower) ? lower : 'terminal';
}

// ---------------------------------------------------------------------------
// Core runner
// ---------------------------------------------------------------------------

interface AuditFlags {
  output?: string;
  file?: string;
  threshold?: number;
  only?: string;
  skip?: string;
  verbose?: boolean;
}

type DimensionName = 'performance' | 'architecture' | 'scalability' | 'integrity' | 'maintenance';

const ALL_DIMENSIONS: ReadonlyArray<{
  name: DimensionName;
  scorer: (
    ctx: ReturnType<typeof buildAnalysisContext>,
    skip: ReadonlySet<string>,
  ) => DimensionResult;
}> = [
  { name: 'performance', scorer: scorePerformance },
  { name: 'architecture', scorer: scoreArchitecture },
  { name: 'scalability', scorer: scoreScalability },
  { name: 'integrity', scorer: scoreIntegrity },
  { name: 'maintenance', scorer: scoreMaintenance },
];

/**
 * Run the audit engine for the selected dimensions and emit a report.
 *
 * @param targetPath    Absolute path to the project to analyse.
 * @param flags         Parsed CLI flags.
 * @param limitToNames  When non-empty, only run scorers in this set.
 */
async function runAudit(
  targetPath: string,
  flags: AuditFlags,
  limitToNames: ReadonlySet<DimensionName> = new Set(),
): Promise<void> {
  const format = normaliseFormat(flags.output ?? 'terminal');

  logger.info(`Analysing ${targetPath}…`);

  const sourceFiles = traverseFiles(targetPath);
  const parsedFiles = parseFiles(sourceFiles);
  const ctx = buildAnalysisContext(targetPath, parsedFiles);

  const skipRules = parseList(flags.skip);
  const activeDimensions = ALL_DIMENSIONS.filter(
    (d) => limitToNames.size === 0 || limitToNames.has(d.name),
  );

  const dimensions: DimensionResult[] = activeDimensions.map(({ scorer }) =>
    scorer(ctx, skipRules),
  );

  const overall = aggregateScores(dimensions);

  const result: AuditResult = {
    projectRoot: targetPath,
    timestamp: new Date().toISOString(),
    dimensions,
    overall,
  };

  const report = generateReport(result, format, flags.verbose === true);

  if (flags.file) {
    await writeFile(flags.file, report, 'utf8');
    logger.info(`Report written to ${flags.file}`);
  } else {
    process.stdout.write(report + '\n');
  }

  // CI quality gate — exit 1 when the score is below the threshold.
  if (flags.threshold != null && overall.weighted < flags.threshold) {
    logger.warn(
      `Score ${overall.weighted.toFixed(1)} is below threshold ${flags.threshold} — failing.`,
    );
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Command definitions
// ---------------------------------------------------------------------------

/** Full audit command: `zaria audit [path]` */
export const auditCommand = addAuditFlags(
  new Command('audit')
    .description('Run a full audit on the given project path (default: current directory)')
    .argument('[path]', 'path to the project root')
    .action(async (path: string | undefined, options: AuditFlags) => {
      await runAudit(resolveTargetPath(path), options);
    }),
);

/** `zaria audit:perf [path]` */
export const auditPerfCommand = addAuditFlags(
  new Command('audit:perf')
    .description('Run only the Performance audit')
    .argument('[path]', 'path to the project root')
    .action(async (path: string | undefined, options: AuditFlags) => {
      await runAudit(resolveTargetPath(path), options, new Set(['performance']));
    }),
);

/** `zaria audit:arch [path]` */
export const auditArchCommand = addAuditFlags(
  new Command('audit:arch')
    .description('Run only the Architecture audit')
    .argument('[path]', 'path to the project root')
    .action(async (path: string | undefined, options: AuditFlags) => {
      await runAudit(resolveTargetPath(path), options, new Set(['architecture']));
    }),
);

/** `zaria audit:scale [path]` */
export const auditScaleCommand = addAuditFlags(
  new Command('audit:scale')
    .description('Run only the Scalability & Observability audit')
    .argument('[path]', 'path to the project root')
    .action(async (path: string | undefined, options: AuditFlags) => {
      await runAudit(resolveTargetPath(path), options, new Set(['scalability']));
    }),
);

/** `zaria audit:integrity [path]` */
export const auditIntegrityCommand = addAuditFlags(
  new Command('audit:integrity')
    .description('Run only the Data Integrity & Race Conditions audit')
    .argument('[path]', 'path to the project root')
    .action(async (path: string | undefined, options: AuditFlags) => {
      await runAudit(resolveTargetPath(path), options, new Set(['integrity']));
    }),
);

/** `zaria audit:maint [path]` */
export const auditMaintCommand = addAuditFlags(
  new Command('audit:maint')
    .description('Run only the Long-Term Maintenance audit')
    .argument('[path]', 'path to the project root')
    .action(async (path: string | undefined, options: AuditFlags) => {
      await runAudit(resolveTargetPath(path), options, new Set(['maintenance']));
    }),
);
