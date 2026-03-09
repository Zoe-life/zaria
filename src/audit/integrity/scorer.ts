/**
 * Data Integrity dimension scorer — Phase 8.5
 *
 * Starts at 100 and deducts points for each finding based on severity.
 * The score is clamped to [0, 100].
 */

import type { Finding, DimensionResult, Rule, AnalysisContext } from '../types.js';
import { int001 } from './rules/int001.js';
import { int002 } from './rules/int002.js';
import { int003 } from './rules/int003.js';
import { int004 } from './rules/int004.js';

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

/** All data integrity rules, in evaluation order. */
export const INTEGRITY_RULES: readonly Rule[] = [int001, int002, int003, int004];

/**
 * Run all data integrity rules against `context` and return a `DimensionResult`.
 *
 * @param context   The analysis context produced by Phase 4.
 * @param skipRules Optional set of rule IDs to skip (from `ignore.rules` config).
 */
export function scoreIntegrity(
  context: AnalysisContext,
  skipRules: ReadonlySet<string> = new Set(),
): DimensionResult {
  const findings: Finding[] = [];

  for (const rule of INTEGRITY_RULES) {
    if (skipRules.has(rule.id)) continue;
    findings.push(...rule.check(context));
  }

  let score = 100;
  for (const finding of findings) {
    score -= SEVERITY_DEDUCTIONS[finding.severity] ?? 0;
  }
  score = Math.max(0, Math.min(100, score));

  return { dimension: 'integrity', score, findings };
}
