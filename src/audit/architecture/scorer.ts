/**
 * Architecture dimension scorer — Phase 6.5
 */

import type { Finding, DimensionResult, Rule, AnalysisContext } from '../types.js';
import { arch001 } from './rules/arch001.js';
import { arch002 } from './rules/arch002.js';
import { arch003 } from './rules/arch003.js';
import { arch004 } from './rules/arch004.js';

// ---------------------------------------------------------------------------
// Scoring weights
// ---------------------------------------------------------------------------

const SEVERITY_DEDUCTIONS: Record<string, number> = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** All architecture rules, in evaluation order. */
export const ARCHITECTURE_RULES: readonly Rule[] = [arch001, arch002, arch003, arch004];

/**
 * Run all architecture rules against `context` and return a `DimensionResult`.
 *
 * @param context   The analysis context produced by Phase 4.
 * @param skipRules Optional set of rule IDs to skip (from `ignore.rules` config).
 */
export function scoreArchitecture(
  context: AnalysisContext,
  skipRules: ReadonlySet<string> = new Set(),
): DimensionResult {
  const findings: Finding[] = [];

  for (const rule of ARCHITECTURE_RULES) {
    if (skipRules.has(rule.id)) continue;
    findings.push(...rule.check(context));
  }

  let score = 100;
  for (const finding of findings) {
    score -= SEVERITY_DEDUCTIONS[finding.severity] ?? 0;
  }
  score = Math.max(0, Math.min(100, score));

  return { dimension: 'architecture', score, findings };
}
