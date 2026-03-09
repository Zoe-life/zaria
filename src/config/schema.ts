import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enum schemas
// ---------------------------------------------------------------------------

/** Application type — Zaria works for any kind of codebase. */
export const ProjectTypeSchema = z.enum(['web', 'mobile', 'desktop', 'cli', 'library']);

/** Primary source language of the project. */
export const ProjectLanguageSchema = z.enum([
  'typescript',
  'javascript',
  'python',
  'go',
  'rust',
  'java',
]);

/** Audit dimensions available in Zaria. */
export const AuditDimensionSchema = z.enum([
  'performance',
  'architecture',
  'scalability',
  'integrity',
  'maintenance',
]);

/** Report output format. */
export const OutputFormatSchema = z.enum(['terminal', 'json', 'html', 'markdown', 'sarif']);

/** Verbosity of the report. */
export const OutputDetailSchema = z.enum(['minimal', 'standard', 'verbose']);

/** SRE provider type (used in Phase 12). */
export const SreProviderTypeSchema = z.enum(['prometheus', 'datadog', 'grafana', 'custom']);

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const ThresholdsSchema = z.object({
  /** Overall weighted score threshold (0–100). */
  overall: z.number().min(0).max(100).optional(),
  performance: z.number().min(0).max(100).optional(),
  architecture: z.number().min(0).max(100).optional(),
  scalability: z.number().min(0).max(100).optional(),
  integrity: z.number().min(0).max(100).optional(),
  maintenance: z.number().min(0).max(100).optional(),
});

const AuditSchema = z.object({
  /** Ordered list of dimensions to run. */
  dimensions: z.array(AuditDimensionSchema).optional(),
  thresholds: ThresholdsSchema.optional(),
});

const IgnoreSchema = z.object({
  /** Glob patterns / directory names to exclude from analysis. */
  paths: z.array(z.string()).optional(),
  /**
   * Rule IDs to disable globally (e.g. ["PERF001"]).
   * These are validated against known rule IDs in the validation step.
   */
  rules: z.array(z.string()).optional(),
});

const SreAuthSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('bearer'), token: z.string() }),
  z.object({ type: z.literal('basic'), username: z.string(), password: z.string() }),
  z.object({ type: z.literal('apiKey'), key: z.string() }),
]);

export const SreProviderSchema = z.object({
  type: SreProviderTypeSchema,
  url: z.string().url().optional(),
  auth: SreAuthSchema.optional(),
  /** Provider-specific extra options (key-value). */
  options: z.record(z.string(), z.string()).optional(),
});

const SreSchema = z.object({
  enabled: z.boolean().optional(),
  providers: z.array(SreProviderSchema).optional(),
});

const OutputSchema = z.object({
  format: OutputFormatSchema.optional(),
  colors: z.boolean().optional(),
  detail: OutputDetailSchema.optional(),
  /** Absolute or relative path of the output file (used with `--file`). */
  file: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Root config schema
// ---------------------------------------------------------------------------

/** Full Zod schema for .zariarc / zaria.config files. */
export const ZariaConfigSchema = z.object({
  /** Schema version — must be 1. */
  version: z.literal(1),

  project: z
    .object({
      name: z.string().optional(),
      /**
       * Project type. Zaria audits any kind of codebase:
       * web, mobile, desktop, CLI, or library.
       */
      type: ProjectTypeSchema.optional(),
      language: ProjectLanguageSchema.optional(),
    })
    .optional(),

  audit: AuditSchema.optional(),
  ignore: IgnoreSchema.optional(),
  plugins: z.array(z.string()).optional(),
  sre: SreSchema.optional(),
  output: OutputSchema.optional(),
});

// ---------------------------------------------------------------------------
// Derived TypeScript types
// ---------------------------------------------------------------------------

export type ZariaConfig = z.infer<typeof ZariaConfigSchema>;
export type ProjectType = z.infer<typeof ProjectTypeSchema>;
export type ProjectLanguage = z.infer<typeof ProjectLanguageSchema>;
export type AuditDimension = z.infer<typeof AuditDimensionSchema>;
export type OutputFormat = z.infer<typeof OutputFormatSchema>;
export type OutputDetail = z.infer<typeof OutputDetailSchema>;
export type SreProviderType = z.infer<typeof SreProviderTypeSchema>;

/** A single configured SRE provider (Phase 12). */
export type SreProvider = z.infer<typeof SreProviderSchema>;

/**
 * Fully-resolved config after merging defaults, file, env vars, and CLI flags.
 * All optional fields are now required with their default values filled in.
 */
export interface ResolvedConfig {
  version: 1;
  project: {
    name?: string;
    type: ProjectType;
    language: ProjectLanguage;
  };
  audit: {
    dimensions: AuditDimension[];
    thresholds: {
      overall: number;
      performance: number;
      architecture: number;
      scalability: number;
      integrity: number;
      maintenance: number;
    };
  };
  ignore: {
    paths: string[];
    rules: string[];
  };
  plugins: string[];
  sre: {
    enabled: boolean;
    providers?: SreProvider[];
  };
  output: {
    format: OutputFormat;
    colors: boolean;
    detail: OutputDetail;
    file?: string;
  };
  /** Config file path that was loaded (undefined if using all defaults). */
  configFilePath?: string;
}
