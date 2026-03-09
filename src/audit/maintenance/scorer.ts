/**
 * Long-Term Maintenance dimension scorer — Phase 9.
 *
 * Starts at 100 and deducts points for each finding based on severity.
 * The score is clamped to [0, 100].
 */

import type { Finding, DimensionResult, Rule, AnalysisContext } from '../types.js';
import { maint001 } from './rules/maint001.js';
import { maint002 } from './rules/maint002.js';
import { maint003 } from './rules/maint003.js';
import { maint004 } from './rules/maint004.js';
import { maint005 } from './rules/maint005.js';

// ---------------------------------------------------------------------------
// Scoring weights
// ---------------------------------------------------------------------------

/** Score deduction per finding, by severity. */
const SEVERITY_DEDUCTIONS: Record<string, number> = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** All maintenance rules, in evaluation order. */
export const MAINTENANCE_RULES: readonly Rule[] = [
  maint001,
  maint002,
  maint003,
  maint004,
  maint005,
];

/**
 * Run all maintenance rules against `context` and return a `DimensionResult`.
 *
 * @param context   The analysis context produced by Phase 4.
 * @param skipRules Optional set of rule IDs to skip (from `ignore.rules` config).
 */
export function scoreMaintenance(
  context: AnalysisContext,
  skipRules: ReadonlySet<string> = new Set(),
): DimensionResult {
  const findings: Finding[] = [];

  for (const rule of MAINTENANCE_RULES) {
    if (skipRules.has(rule.id)) continue;
    findings.push(...rule.check(context));
  }

  let score = 100;
  for (const finding of findings) {
    score -= SEVERITY_DEDUCTIONS[finding.severity] ?? 0;
  }
  score = Math.max(0, Math.min(100, score));

  return { dimension: 'maintenance', score, findings };
}
