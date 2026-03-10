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
import { scoreEfficiency } from '../../audit/efficiency/scorer.js';
import { aggregateScores } from '../../scorer/aggregate.js';
import { generateReport } from '../../report/index.js';
import type { OutputFormat } from '../../report/index.js';
import type { DimensionResult, AuditResult } from '../../audit/types.js';
import { loadPlugins } from '../../plugin/loader.js';
import { discoverPlugins } from '../../plugin/discovery.js';

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
    .option(
      '--dim-threshold <thresholds>',
      'per-dimension thresholds as comma-separated dim=score pairs (e.g. performance=80,integrity=90)',
    )
    .option(
      '--only <dimensions>',
      'comma-separated dimension names to run (e.g. performance,architecture)',
    )
    .option('--skip <rules>', 'comma-separated rule IDs to skip (e.g. MAINT001,ARCH002)')
    .option('--plugins <paths>', 'comma-separated plugin package names or file paths to load')
    .option('-v, --verbose', 'include full finding list in terminal output');
}

function resolveTargetPath(p: string | undefined): string {
  return resolve(p ?? '.');
}

/**
 * Parse a comma-separated list of dimension names into a lowercase Set.
 * Dimension names are always lowercase (e.g. 'performance', 'architecture').
 */
function parseDimensionList(raw: string | undefined): Set<DimensionName> {
  if (!raw) return new Set();
  return new Set(raw.split(',').map((s) => s.trim().toLowerCase()) as DimensionName[]);
}

/**
 * Parse a comma-separated list of rule IDs into an uppercase Set.
 * Rule IDs are always uppercase (e.g. 'MAINT001', 'ARCH002').
 *
 * BUG 1 FIX: The original implementation used .toLowerCase() here, which
 * caused skipRules to never match rule.id values (which are uppercase like
 * 'MAINT002').  Rule IDs must be uppercased for the Set.has() check in each
 * scorer to succeed.
 */
function parseRuleList(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.split(',').map((s) => s.trim().toUpperCase()));
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
  dimThreshold?: string;
  only?: string;
  skip?: string;
  plugins?: string;
  verbose?: boolean;
}

type DimensionName =
  | 'performance'
  | 'architecture'
  | 'scalability'
  | 'integrity'
  | 'maintenance'
  | 'efficiency';

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
  { name: 'efficiency', scorer: scoreEfficiency },
];

/**
 * Score deductions per severity level — shared by built-in scorers and the
 * plugin dimension scorer to guarantee consistent severity weights.
 */
const SEVERITY_DEDUCTIONS: Readonly<Record<string, number>> = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2,
};

/**
 * Parse a comma-separated `dim=score` string into a Map<dimensionName, threshold>.
 * Example: "performance=80,integrity=90" → Map { performance → 80, integrity → 90 }
 */
function parseDimThresholds(raw: string | undefined): Map<string, number> {
  const map = new Map<string, number>();
  if (!raw) return map;
  for (const pair of raw.split(',')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const dim = pair.slice(0, eqIdx).trim().toLowerCase();
    const val = parseFloat(pair.slice(eqIdx + 1).trim());
    if (dim && !Number.isNaN(val)) map.set(dim, val);
  }
  return map;
}

/**
 * Run the audit engine for the selected dimensions and emit a report.
 *
 * @param targetPath    Absolute path to the project to analyse.
 * @param flags         Parsed CLI flags.
 * @param limitToNames  When non-empty, only run scorers in this set (used by
 *                      sub-commands like `audit:perf`).  The `--only` flag is
 *                      merged with this set: when both are provided the
 *                      sub-command's set takes precedence.
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

  // BUG 1 FIX: use parseRuleList (toUpperCase) so that rule IDs like
  // 'MAINT002' match what scorers check via skipRules.has(rule.id).
  const skipRules = parseRuleList(flags.skip);

  // BUG 2 FIX: honour the --only flag by parsing it as dimension names and
  // merging with any sub-command-level limitToNames.  Sub-command limits take
  // precedence (they already narrow to a single dimension); the --only flag is
  // only applied when no sub-command restriction is active.
  const onlyFlag = parseDimensionList(flags.only);
  const effectiveLimit: ReadonlySet<DimensionName> =
    limitToNames.size > 0 ? limitToNames : onlyFlag;

  const activeDimensions = ALL_DIMENSIONS.filter(
    (d) => effectiveLimit.size === 0 || effectiveLimit.has(d.name),
  );

  const dimensions: DimensionResult[] = activeDimensions.map(({ scorer }) =>
    scorer(ctx, skipRules),
  );

  // Phase 14: load and run plugin rules, appending findings to a plugin dimension.
  const pluginPaths = flags.plugins ? flags.plugins.split(',').map((p) => p.trim()) : [];
  const autoDiscovered = await discoverPlugins(targetPath);
  const allPluginPaths = [...new Set([...autoDiscovered, ...pluginPaths])];
  const plugins = await loadPlugins(allPluginPaths, { projectRoot: targetPath });

  if (plugins.length > 0) {
    const pluginFindings = plugins.flatMap((plugin) =>
      plugin.rules.flatMap((rule) => {
        try {
          return rule.check(ctx);
        } catch {
          return [];
        }
      }),
    );
    if (pluginFindings.length > 0) {
      let pluginScore = 100;
      for (const f of pluginFindings) pluginScore -= SEVERITY_DEDUCTIONS[f.severity] ?? 0;
      pluginScore = Math.max(0, Math.min(100, pluginScore));
      dimensions.push({ dimension: 'plugins', score: pluginScore, findings: pluginFindings });
    }
    if (flags.verbose) {
      logger.info(`Loaded ${plugins.length} plugin(s): ${plugins.map((p) => p.name).join(', ')}`);
    }
  }

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

  // Phase 13 — CI quality gates
  // 13.1: exit 1 when the overall score is below the --threshold flag.
  if (flags.threshold != null && overall.weighted < flags.threshold) {
    logger.warn(
      `Score ${overall.weighted.toFixed(1)} is below threshold ${flags.threshold} — failing.`,
    );
    process.exitCode = 1;
  }

  // 13.2: exit 1 when any dimension score is below its configured per-dimension threshold.
  const dimThresholds = parseDimThresholds(flags.dimThreshold);
  for (const dim of dimensions) {
    const dimLimit = dimThresholds.get(dim.dimension);
    if (dimLimit != null && dim.score < dimLimit) {
      logger.warn(
        `Dimension '${dim.dimension}' score ${dim.score} is below threshold ${dimLimit} — failing.`,
      );
      process.exitCode = 1;
    }
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

/** `zaria audit:eff [path]` */
export const auditEffCommand = addAuditFlags(
  new Command('audit:eff')
    .description('Run only the Efficiency audit')
    .argument('[path]', 'path to the project root')
    .action(async (path: string | undefined, options: AuditFlags) => {
      await runAudit(resolveTargetPath(path), options, new Set(['efficiency']));
    }),
);
