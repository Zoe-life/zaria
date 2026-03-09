import { DEFAULT_CONFIG } from './defaults.js';
import type {
  ZariaConfig,
  ResolvedConfig,
  AuditDimension,
  ProjectType,
  ProjectLanguage,
  OutputFormat,
  OutputDetail,
} from './schema.js';

/** CLI flags that can override config-file settings. */
export interface CliOverrides {
  /** Output format override (`--output`). */
  output?: string;
  /** Output file path override (`--file`). */
  file?: string;
  /** Score threshold override (`--threshold`). */
  threshold?: number;
  /** Comma-separated dimensions to run only (`--only`). */
  only?: string;
  /** Comma-separated dimensions to skip (`--skip`). */
  skip?: string;
  /** Verbose mode (`-v / --verbose`). */
  verbose?: boolean;
  /** Disable SRE even if configured (`--no-sre`). */
  noSre?: boolean;
}

/** Environment-variable overrides read by {@link readEnvOverrides}. */
export interface EnvOverrides {
  /** `ZARIA_OUTPUT_FORMAT` — overrides `output.format`. */
  outputFormat?: OutputFormat;
  /** `ZARIA_THRESHOLD` — overrides `audit.thresholds.overall`. */
  threshold?: number;
  /** `NO_COLOR` / `ZARIA_NO_COLOR` — disables colour output. */
  noColor?: boolean;
  /** `ZARIA_SRE_ENABLED` — enables/disables SRE data fetching. */
  sreEnabled?: boolean;
}

const OUTPUT_FORMATS: OutputFormat[] = ['terminal', 'json', 'html', 'markdown', 'sarif'];
const AUDIT_DIMENSIONS: AuditDimension[] = [
  'performance',
  'architecture',
  'scalability',
  'integrity',
  'maintenance',
];

/** Read recognised environment variables and return typed overrides. */
export function readEnvOverrides(env: NodeJS.ProcessEnv = process.env): EnvOverrides {
  const overrides: EnvOverrides = {};

  const outputFormat = env['ZARIA_OUTPUT_FORMAT'];
  if (outputFormat && (OUTPUT_FORMATS as string[]).includes(outputFormat)) {
    overrides.outputFormat = outputFormat as OutputFormat;
  }

  const threshold = env['ZARIA_THRESHOLD'];
  if (threshold !== undefined) {
    const n = Number(threshold);
    if (!isNaN(n) && n >= 0 && n <= 100) {
      overrides.threshold = n;
    }
  }

  if (env['NO_COLOR'] !== undefined || env['ZARIA_NO_COLOR'] !== undefined) {
    overrides.noColor = true;
  }

  const sreEnabled = env['ZARIA_SRE_ENABLED'];
  if (sreEnabled !== undefined) {
    overrides.sreEnabled = sreEnabled.toLowerCase() === 'true' || sreEnabled === '1';
  }

  return overrides;
}

/**
 * Merge config sources into a single, fully-resolved config object.
 *
 * Priority order (highest → lowest):
 *   1. CLI flags (`cliOverrides`)
 *   2. Environment variables (`ZARIA_*` / `NO_COLOR`)
 *   3. Config file (`fileConfig`)
 *   4. Built-in defaults (`DEFAULT_CONFIG`)
 *
 * @param fileConfig      Raw config loaded from the config file (may be partial).
 * @param cliOverrides    Parsed CLI flag values.
 * @param configFilePath  Absolute path to the config file that was loaded.
 * @param env             Process environment map (defaults to `process.env`).
 */
export function mergeConfig(
  fileConfig: ZariaConfig | null,
  cliOverrides: CliOverrides = {},
  configFilePath?: string,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedConfig {
  const envOverrides = readEnvOverrides(env);

  // --- Resolve audit dimensions from CLI --only / --skip flags ---
  let dimensions: AuditDimension[] =
    fileConfig?.audit?.dimensions ?? DEFAULT_CONFIG.audit.dimensions;

  if (cliOverrides.only) {
    const requested = cliOverrides.only
      .split(',')
      .map((d) => d.trim())
      .filter((d): d is AuditDimension => (AUDIT_DIMENSIONS as string[]).includes(d));
    if (requested.length > 0) {
      dimensions = requested;
    }
  } else if (cliOverrides.skip) {
    const skipped = new Set(cliOverrides.skip.split(',').map((d) => d.trim()));
    dimensions = dimensions.filter((d) => !skipped.has(d));
  }

  // --- Resolve threshold: CLI > env > file > default ---
  const overallThreshold =
    cliOverrides.threshold ??
    envOverrides.threshold ??
    fileConfig?.audit?.thresholds?.overall ??
    DEFAULT_CONFIG.audit.thresholds.overall;

  // --- Resolve output format: CLI > env > file > default ---
  const rawFormat = cliOverrides.output ?? envOverrides.outputFormat ?? fileConfig?.output?.format;
  const outputFormat: OutputFormat = (OUTPUT_FORMATS as string[]).includes(rawFormat ?? '')
    ? (rawFormat as OutputFormat)
    : DEFAULT_CONFIG.output.format;

  // --- Resolve colours: NO_COLOR env wins, then file, then default ---
  const colors = envOverrides.noColor
    ? false
    : (fileConfig?.output?.colors ?? DEFAULT_CONFIG.output.colors);

  // --- Resolve SRE: CLI --no-sre > env > file > default ---
  const sreEnabled = cliOverrides.noSre
    ? false
    : (envOverrides.sreEnabled ?? fileConfig?.sre?.enabled ?? DEFAULT_CONFIG.sre.enabled);

  return {
    version: 1,
    project: {
      name: fileConfig?.project?.name,
      type: (fileConfig?.project?.type ?? DEFAULT_CONFIG.project.type) as ProjectType,
      language: (fileConfig?.project?.language ??
        DEFAULT_CONFIG.project.language) as ProjectLanguage,
    },
    audit: {
      dimensions,
      thresholds: {
        overall: overallThreshold,
        performance:
          fileConfig?.audit?.thresholds?.performance ?? DEFAULT_CONFIG.audit.thresholds.performance,
        architecture:
          fileConfig?.audit?.thresholds?.architecture ??
          DEFAULT_CONFIG.audit.thresholds.architecture,
        scalability:
          fileConfig?.audit?.thresholds?.scalability ?? DEFAULT_CONFIG.audit.thresholds.scalability,
        integrity:
          fileConfig?.audit?.thresholds?.integrity ?? DEFAULT_CONFIG.audit.thresholds.integrity,
        maintenance:
          fileConfig?.audit?.thresholds?.maintenance ?? DEFAULT_CONFIG.audit.thresholds.maintenance,
      },
    },
    ignore: {
      paths: fileConfig?.ignore?.paths ?? DEFAULT_CONFIG.ignore.paths,
      rules: fileConfig?.ignore?.rules ?? DEFAULT_CONFIG.ignore.rules,
    },
    plugins: fileConfig?.plugins ?? DEFAULT_CONFIG.plugins,
    sre: {
      enabled: sreEnabled,
      providers: fileConfig?.sre?.providers,
    },
    output: {
      format: outputFormat,
      colors,
      detail: (fileConfig?.output?.detail ?? DEFAULT_CONFIG.output.detail) as OutputDetail,
      file: cliOverrides.file ?? fileConfig?.output?.file,
    },
    configFilePath,
  };
}
