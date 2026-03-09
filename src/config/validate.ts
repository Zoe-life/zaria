import type { ZariaConfig } from './schema.js';
import { ZariaConfigSchema } from './schema.js';

/** A single validation error with location information. */
export interface ValidationError {
  /** Dot-separated path within the config object (e.g. "audit.thresholds.overall"). */
  path: string;
  /** Human-readable error message. */
  message: string;
}

/** Result returned by {@link validateConfig}. */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Known Zaria rule IDs, used to validate `ignore.rules` entries.
 * This list will grow as audit rules are implemented in Phases 5–9.
 */
export const KNOWN_RULE_IDS: ReadonlySet<string> = new Set([
  // Performance
  'PERF001',
  'PERF002',
  'PERF003',
  'PERF004',
  // Architecture
  'ARCH001',
  'ARCH002',
  'ARCH003',
  'ARCH004',
  // Scalability
  'SCALE001',
  'SCALE002',
  'SCALE003',
  'SCALE004',
  // Integrity
  'INT001',
  'INT002',
  'INT003',
  'INT004',
  // Maintenance
  'MAINT001',
  'MAINT002',
  'MAINT003',
  'MAINT004',
  'MAINT005',
]);

/**
 * Validate a raw config object against the Zaria schema.
 *
 * Performs two passes:
 *  1. Zod structural validation (types, required fields, value ranges).
 *  2. Semantic validation (e.g. `ignore.rules` contains real rule IDs).
 *
 * @param raw  The raw config object to validate (typically loaded from a file).
 * @returns    A {@link ValidationResult} with any errors found.
 */
export function validateConfig(raw: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // --- Pass 1: structural validation ---
  const result = ZariaConfigSchema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join('.') || '(root)',
        message: issue.message,
      });
    }
    return { valid: false, errors };
  }

  const config: ZariaConfig = result.data;

  // --- Pass 2: semantic validation ---

  // Validate ignore.rules against known rule IDs.
  const unknownRules = (config.ignore?.rules ?? []).filter((id) => !KNOWN_RULE_IDS.has(id));
  for (const id of unknownRules) {
    errors.push({
      path: 'ignore.rules',
      message: `Unknown rule ID "${id}". Known IDs: ${[...KNOWN_RULE_IDS].join(', ')}.`,
    });
  }

  // Validate that dimensions list is not empty when explicitly provided.
  if (config.audit?.dimensions !== undefined && config.audit.dimensions.length === 0) {
    errors.push({
      path: 'audit.dimensions',
      message: 'At least one audit dimension must be specified.',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format validation errors for terminal display.
 *
 * @param result The {@link ValidationResult} to format.
 * @param filePath Optional path to the config file for display purposes.
 * @returns A multi-line string suitable for `console.log`.
 */
export function formatValidationResult(result: ValidationResult, filePath?: string): string {
  const lines: string[] = [];

  if (result.valid) {
    const source = filePath ? ` (${filePath})` : '';
    lines.push(`✅  Config valid${source}`);
  } else {
    const source = filePath ? ` "${filePath}"` : '';
    lines.push(`❌  Config${source} has ${result.errors.length} error(s):\n`);
    for (const err of result.errors) {
      lines.push(`  • ${err.path}: ${err.message}`);
    }
  }

  return lines.join('\n');
}
