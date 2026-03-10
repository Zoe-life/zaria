/**
 * EFF002 — Linear Search in Loop
 *
 * Detects calls to Array linear-search methods — `.includes()`, `.indexOf()`,
 * `.find()`, or `.findIndex()` — that appear inside a loop body.  Each such
 * call is O(n) per iteration, making the overall loop O(n²).  Pre-computing
 * a `Set` or `Map` before the loop reduces membership testing to O(1).
 *
 * This rule is complementary to EFF001 (which targets nested loop structure).
 * EFF002 targets the *data-structure* anti-pattern: choosing a sequential
 * array search where a constant-time lookup would suffice.
 *
 * Detection strategy:
 *  - Single-pass, line-by-line scan with brace-depth tracking (O(n)).
 *  - Any outer loop (`for`, `while`, `do`, `.forEach`, `.map`, `.reduce`)
 *    opens a "hot-path" zone.
 *  - A linear-search call inside that zone emits a finding.
 *
 * Time complexity:  O(n) per file.
 * Space complexity: O(f) where f = number of findings.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Matches the opening of a loop construct. */
const LOOP_RE = /\b(?:for|while|do)\s*[\s({]|\.(?:forEach|map|reduce|flatMap)\s*\(/;

/** Matches O(n) array membership / search calls that should use Set or Map. */
const LINEAR_SEARCH_RE = /\.(?:includes|indexOf|find|findIndex)\s*\(/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Net brace change for `line` (heuristic; ignores string/comment context). */
function braceDelta(line: string): number {
  let delta = 0;
  for (const ch of line) {
    if (ch === '{') delta++;
    else if (ch === '}') delta--;
  }
  return delta;
}

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

export const eff002: Rule = {
  id: 'EFF002',
  name: 'Linear Search in Loop',
  description:
    'Detects Array.includes / indexOf / find / findIndex calls inside a loop. ' +
    'These are O(n) per iteration; hoisting the array into a Set or Map before the loop gives O(1) lookup.',
  severity: 'medium',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      const lines = parsedFile.content.split('\n');
      let depth = 0;
      // -1 = no active outer loop; otherwise: depth before the outer-loop line.
      let outerLoopBodyDepth = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trimStart();
        const depthBefore = depth;

        const isComment = trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('*');

        if (!isComment) {
          if (outerLoopBodyDepth === -1) {
            if (LOOP_RE.test(line)) {
              outerLoopBodyDepth = depthBefore;
            }
          } else if (depthBefore > outerLoopBodyDepth && LINEAR_SEARCH_RE.test(line)) {
            findings.push({
              ruleId: 'EFF002',
              severity: 'medium',
              message:
                `Linear search inside a loop at line ${i + 1}: ` +
                'Array.includes / indexOf / find / findIndex is O(n) per iteration.',
              file: parsedFile.sourceFile.path,
              line: i + 1,
              recommendation:
                'Hoist the searched array into a Set (for includes/indexOf) or a Map ' +
                '(for find/findIndex) before the loop to reduce lookup to O(1).',
            });
          }
        }

        depth += braceDelta(line);

        if (outerLoopBodyDepth !== -1 && depth <= outerLoopBodyDepth) {
          outerLoopBodyDepth = -1;
        }
      }
    }

    return findings;
  },
};
