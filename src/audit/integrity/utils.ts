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
  /**
   * `pendingFunction` is true after `FUNCTION_START` matches but before the
   * opening `{` is found.  This handles two cases that the original code got
   * wrong:
   *
   * 1. Expression-bodied arrows (`const fn = (x) => x * 2`) — no `{` follows,
   *    so the pending state is abandoned when the next `FUNCTION_START` appears.
   * 2. Multi-line function signatures — the `{` may be on a line after the one
   *    that matched `FUNCTION_START`, so we keep accumulating lines until we
   *    see the opening brace.
   *
   * Importantly, `}` characters are ignored while still pending so an
   * expression-bodied arrow cannot trigger a spurious body termination.
   */
  let pendingFunction = false;
  let depth = 0;
  let bodyLines: string[] = [];

  for (const line of lines) {
    if (!inFunction && !pendingFunction && FUNCTION_START.test(line)) {
      // Candidate function start — wait for the opening `{`
      pendingFunction = true;
      depth = 0;
      bodyLines = [line];
    } else if (inFunction) {
      bodyLines.push(line);
    } else if (pendingFunction) {
      // Still waiting for `{`.  If a new FUNCTION_START appears first, the
      // previous candidate was an expression-bodied arrow — reset to the new
      // candidate so we don't accumulate unrelated lines.
      if (FUNCTION_START.test(line)) {
        bodyLines = [line];
        depth = 0;
      } else {
        bodyLines.push(line);
      }
    }

    if (pendingFunction || inFunction) {
      for (const ch of line) {
        if (ch === '{') {
          depth++;
          if (pendingFunction) {
            // Opening brace found — transition from pending to active tracking
            pendingFunction = false;
            inFunction = true;
          }
        } else if (ch === '}' && inFunction) {
          depth--;
          if (depth <= 0) {
            bodies.push(bodyLines.join('\n'));
            inFunction = false;
            bodyLines = [];
            depth = 0;
            break;
          }
        }
      }
    }
  }

  return bodies;
}
