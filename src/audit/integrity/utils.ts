/**
 * Shared AST-free utilities for the Data Integrity audit dimension.
 *
 * These helpers operate on raw source text (string-based) to extract
 * logical function bodies without requiring a full TypeScript AST parse.
 * The approach keeps rule implementations O(n) in file size.
 */

// ---------------------------------------------------------------------------
// Function-start detection
// ---------------------------------------------------------------------------

/**
 * Matches the opening line of a JavaScript / TypeScript function in any of
 * the common forms:
 *
 * 1. Named function declaration:    `function foo(` / `async function foo(`
 * 2. const/let/var arrow or expr:   `const foo = (` / `const foo = async (`
 * 3. Arrow function (standalone):   `(a, b) =>` (matches before the `=>`)
 * 4. Method shorthand (class/obj):  `async foo(params) {`
 */
export const FUNCTION_START =
  /\b(?:async\s+)?function\s+\w+\s*\(|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(|(?:async\s*)?\([^)]*\)\s*=>|\basync\s+\w+\s*\([^)]*\)\s*\{/;

// ---------------------------------------------------------------------------
// Body extractor
// ---------------------------------------------------------------------------

/**
 * Splits `content` into rough function bodies using brace-depth tracking.
 *
 * For each line that matches `FUNCTION_START`, accumulates subsequent lines
 * until the matching closing brace is found (based on `{`/`}` depth).
 * Returns an array of body strings (each starting with the matched line).
 *
 * **Limitations:** This is a best-effort heuristic. It handles common
 * patterns correctly but may produce imprecise results for deeply nested
 * or exotic syntax. It is intentionally lightweight (O(chars)) to keep
 * rule evaluation fast.
 */
export function extractFunctionBodies(content: string): string[] {
  const bodies: string[] = [];
  const lines = content.split('\n');
  let inFunction = false;
  let depth = 0;
  let bodyLines: string[] = [];

  for (const line of lines) {
    if (!inFunction && FUNCTION_START.test(line)) {
      inFunction = true;
      depth = 0;
      bodyLines = [line];
    } else if (inFunction) {
      bodyLines.push(line);
    }

    if (inFunction) {
      for (const ch of line) {
        if (ch === '{') {
          depth++;
        } else if (ch === '}') {
          depth--;
          if (depth <= 0) {
            bodies.push(bodyLines.join('\n'));
            inFunction = false;
            bodyLines = [];
            break;
          }
        }
      }
    }
  }

  return bodies;
}
