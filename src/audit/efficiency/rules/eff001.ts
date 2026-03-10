/**
 * EFF001 — Quadratic Iteration Pattern
 *
 * Detects nested loops whose combined traversal produces O(n²) or worse
 * time complexity.  Any outer `for`/`while`/`do`/`.forEach`/`.map`/`.reduce`
 * loop whose body contains another such loop is flagged.
 *
 * Detection strategy:
 *  - Single-pass, line-by-line scan with brace-depth tracking.
 *  - "Outer loop" is identified by a loop keyword at the current depth.
 *  - "Inner loop" is any loop keyword seen at a greater brace depth.
 *  - One finding is emitted per inner-loop site (not per outer loop).
 *
 * Time complexity:  O(n) per file — one pass over characters.
 * Space complexity: O(f) where f = number of findings.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Matches the start of a loop construct:
 *   for (   while (   do {   .forEach(   .map(   .reduce(   .flatMap(
 *
 * Note: `.map` and `.reduce` iterate over every element and qualify as outer
 * loops for quadratic-detection purposes.
 */
const LOOP_RE = /\b(?:for|while|do)\s*[\s({]|\.(?:forEach|map|reduce|flatMap)\s*\(/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the net change in brace depth contributed by `line`.
 * Ignores string/comment context for speed (heuristic, O(chars)).
 */
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

export const eff001: Rule = {
  id: 'EFF001',
  name: 'Quadratic Iteration Pattern',
  description:
    'Detects nested loops that produce O(n²) or worse time complexity. ' +
    'Pre-computing a Map or Set before the outer loop reduces complexity to O(n).',
  severity: 'high',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      const lines = parsedFile.content.split('\n');
      let depth = 0;
      // -1 = no active outer loop; otherwise: brace depth *before* the outer
      // loop line was processed (body is at depth > outerLoopBodyDepth).
      let outerLoopBodyDepth = -1;
      let outerLoopLine = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trimStart();
        const depthBefore = depth;

        // Skip blank lines and single-line comment lines for pattern matching.
        const isComment = trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('*');

        if (!isComment) {
          if (outerLoopBodyDepth === -1) {
            // Not inside an outer loop — look for one.
            if (LOOP_RE.test(line)) {
              outerLoopBodyDepth = depthBefore;
              outerLoopLine = i + 1;
            }
          } else if (depthBefore > outerLoopBodyDepth && LOOP_RE.test(line)) {
            // Inner loop detected inside the outer loop body.
            findings.push({
              ruleId: 'EFF001',
              severity: 'high',
              message:
                `Quadratic iteration at line ${i + 1}: nested loop inside loop at line ${outerLoopLine}. ` +
                'This produces O(n²) or worse time complexity.',
              file: parsedFile.sourceFile.path,
              line: i + 1,
              recommendation:
                'Pre-compute a Map or Set from the inner collection before the outer loop ' +
                'to reduce time complexity from O(n²) to O(n).',
            });
          }
        }

        depth += braceDelta(line);

        // Exited the outer loop when depth falls back to the recorded baseline.
        if (outerLoopBodyDepth !== -1 && depth <= outerLoopBodyDepth) {
          outerLoopBodyDepth = -1;
        }
      }
    }

    return findings;
  },
};
