/**
 * Scalability dimension scorer — Phase 7.5
 *
 * Starts at 100 and deducts points for each finding based on severity.
 * The score is clamped to [0, 100].
 */

import type { Finding, DimensionResult, Rule, AnalysisContext } from '../types.js';
import { scale001 } from './rules/scale001.js';
import { scale002 } from './rules/scale002.js';
import { scale003 } from './rules/scale003.js';
import { scale004 } from './rules/scale004.js';

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

/** All scalability rules, in evaluation order. */
export const SCALABILITY_RULES: readonly Rule[] = [scale001, scale002, scale003, scale004];

/**
 * Run all scalability rules against `context` and return a `DimensionResult`.
 *
 * @param context   The analysis context produced by Phase 4.
 * @param skipRules Optional set of rule IDs to skip (from `ignore.rules` config).
 */
export function scoreScalability(
  context: AnalysisContext,
  skipRules: ReadonlySet<string> = new Set(),
): DimensionResult {
  const findings: Finding[] = [];

  for (const rule of SCALABILITY_RULES) {
    if (skipRules.has(rule.id)) continue;
    findings.push(...rule.check(context));
  }

  let score = 100;
  for (const finding of findings) {
    score -= SEVERITY_DEDUCTIONS[finding.severity] ?? 0;
  }
  score = Math.max(0, Math.min(100, score));

  return { dimension: 'scalability', score, findings };
}
