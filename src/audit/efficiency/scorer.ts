/**
 * Efficiency dimension scorer — Phase 13.
 *
 * Starts at 100 and deducts points for each finding based on severity.
 * The score is clamped to [0, 100].
 */

import type { Finding, DimensionResult, Rule, AnalysisContext } from '../types.js';
import { eff001 } from './rules/eff001.js';
import { eff002 } from './rules/eff002.js';
import { eff003 } from './rules/eff003.js';

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

/** All efficiency rules, in evaluation order. */
export const EFFICIENCY_RULES: readonly Rule[] = [eff001, eff002, eff003];

/**
 * Run all efficiency rules against `context` and return a `DimensionResult`.
 *
 * @param context   The analysis context produced by the audit engine.
 * @param skipRules Optional set of rule IDs to skip (from `ignore.rules` config).
 */
export function scoreEfficiency(
  context: AnalysisContext,
  skipRules: ReadonlySet<string> = new Set(),
): DimensionResult {
  const findings: Finding[] = [];

  for (const rule of EFFICIENCY_RULES) {
    if (skipRules.has(rule.id)) continue;
    findings.push(...rule.check(context));
  }

  let score = 100;
  for (const finding of findings) {
    score -= SEVERITY_DEDUCTIONS[finding.severity] ?? 0;
  }
  score = Math.max(0, Math.min(100, score));

  return { dimension: 'efficiency', score, findings };
}
