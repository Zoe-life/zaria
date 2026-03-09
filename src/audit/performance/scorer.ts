/**
 * Performance dimension scorer — Phase 5.6
 *
 * Starts at 100 and deducts points for each finding based on severity.
 * The score is clamped to [0, 100].
 */

import type { Finding, DimensionResult } from '../types.js';
import { perf001 } from './rules/perf001.js';
import { perf002 } from './rules/perf002.js';
import { perf003 } from './rules/perf003.js';
import { perf004 } from './rules/perf004.js';
import type { Rule, AnalysisContext } from '../types.js';

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

/** All performance rules, in evaluation order. */
export const PERFORMANCE_RULES: readonly Rule[] = [perf001, perf002, perf003, perf004];

/**
 * Run all performance rules against `context` and return a `DimensionResult`.
 *
 * @param context   The analysis context produced by Phase 4.
 * @param skipRules Optional set of rule IDs to skip (from `ignore.rules` config).
 */
export function scorePerformance(
  context: AnalysisContext,
  skipRules: ReadonlySet<string> = new Set(),
): DimensionResult {
  const findings: Finding[] = [];

  for (const rule of PERFORMANCE_RULES) {
    if (skipRules.has(rule.id)) continue;
    findings.push(...rule.check(context));
  }

  let score = 100;
  for (const finding of findings) {
    score -= SEVERITY_DEDUCTIONS[finding.severity] ?? 0;
  }
  score = Math.max(0, Math.min(100, score));

  return { dimension: 'performance', score, findings };
}
