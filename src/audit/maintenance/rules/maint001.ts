/**
 * MAINT001 — High Cyclomatic Complexity
 *
 * Flags functions whose cyclomatic complexity exceeds the threshold of 10.
 *
 * Cyclomatic complexity = 1 + number of decision-point keywords/operators
 * found inside the function body:
 *   if, for, while, do, case, catch, &&, ||, ??
 *
 * Heuristic (content-based):
 *  - Extract function bodies using brace-depth tracking (reuses the shared
 *    utility from the integrity engine — same project, no external dep).
 *  - Count branch-point keywords in each body.
 *  - Emit one finding per function body that exceeds the threshold, reporting
 *    the computed complexity so developers can prioritise refactoring.
 *
 * Time complexity:  O(n) per file (single pass over characters).
 * Space complexity: O(b) where b = number of function bodies in the file.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';
import { extractFunctionBodies } from '../../integrity/utils.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Functions with cyclomatic complexity above this value are flagged. */
const COMPLEXITY_THRESHOLD = 10;

/**
 * Regex matching decision-point keywords and short-circuit operators that each
 * add one path through the function:
 *   if (    for (    while (    do {|;    case <val>:    catch (
 *   &&      ||       ??
 *
 * The regex is re-used via `.match()` (non-global) on each body string.
 */
const BRANCH_RE =
  /\bif\s*\(|\bfor\s*\(|\bwhile\s*\(|\bdo\s*[{;]|\bcase\s+[^:]+:|\bcatch\s*\(|&&|\|\||\?\?/g;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count decision-point keywords in a function body string. O(n). */
function countBranchPoints(body: string): number {
  // Reset lastIndex since the regex is declared at module scope with the /g flag
  BRANCH_RE.lastIndex = 0;
  return (body.match(BRANCH_RE) ?? []).length;
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const maint001: Rule = {
  id: 'MAINT001',
  name: 'High Cyclomatic Complexity',
  description:
    'Detects functions whose cyclomatic complexity exceeds 10. High complexity makes code harder to understand, test, and maintain, and is strongly correlated with defect density.',
  severity: 'medium',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      const bodies = extractFunctionBodies(parsedFile.content);

      // Track whether we have already flagged this file to avoid duplicates
      // when multiple functions in the same file exceed the threshold.
      let fileFlagged = false;

      for (const body of bodies) {
        if (fileFlagged) break;

        const complexity = 1 + countBranchPoints(body);
        if (complexity > COMPLEXITY_THRESHOLD) {
          findings.push({
            ruleId: 'MAINT001',
            severity: 'medium',
            message: `Function with cyclomatic complexity ${complexity} detected (threshold: ${COMPLEXITY_THRESHOLD}). High complexity increases the risk of bugs and makes the code hard to test.`,
            file: parsedFile.sourceFile.path,
            recommendation:
              'Refactor the function by extracting helper functions, replacing nested conditionals with early returns (guard clauses), or applying the Strategy / Command pattern to eliminate branching.',
          });
          fileFlagged = true;
        }
      }
    }

    return findings;
  },
};
