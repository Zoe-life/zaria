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
   *
   * Additionally, TypeScript inline object type literals in parameter
   * annotations (e.g. `(opts: { dir?: string }) => {`) contain `{}`
   * before the real body `{`.  The pending-phase scanner therefore applies
   * two heuristics to identify the genuine body-opening brace, depending on
   * which `FUNCTION_START` alternative matched:
   *
   * - **Alternative 3** (`(?:async\s*)?\([^)]*\)\s*=>`, i.e. a
   *   `(params) =>` form): the match text ends with `=>`, so the real
   *   body `{` is always the first `{` seen after `sawArrow` with no
   *   unclosed type-annotation brace (`pendingBraceDepth === 0`).  Because
   *   the surrounding call-site `(` (e.g. from `.action(async () => {`)
   *   is never closed within the pending phase, `pendingParenDepth` may be
   *   > 0 at the body `{` and cannot be used as a guard.
   *
   * - **Alternatives 1, 2, 4** (`function foo(`, `const fn = (`,
   *   `async foo(params) {`): the match text ends with `(` or `{`, so the
   *   `=>` (if any) only appears inside the parameter list.  These are
   *   **non-immediately-arrow** forms.  Only a `{` seen **after** the
   *   parameter list has fully closed (`pendingParenDepth <= 0`) with no
   *   unclosed type-annotation brace is accepted as the body opener.  The
   *   `pendingParenDepth` guard is essential: `=>` tokens inside nested
   *   parameter type annotations (e.g. `(cb: () => { x: number }) =>`)
   *   set `sawArrow` while the outer `(` is still open, so without this
   *   guard the type-literal `{` would be mistaken for the real body opener.
   *
   * `pendingBraceDepth` counts `{` / `}` pairs encountered inside the
   * parameter list (i.e. while `pendingParenDepth > 0`) so that a
   * type-literal closing `}` cannot accidentally terminate an unstarted body.
   */
  let pendingFunction = false;
  let depth = 0;
  let bodyLines: string[] = [];

  // Pending-phase tracking for selective body-opener detection
  let sawArrow = false; // true once `=>` has been seen in the signature
  let sawEq = false; // intermediate flag: `=` just seen (for `=>` detection)
  let pendingParenDepth = 0; // `(` / `)` nesting during the pending phase
  let pendingBraceDepth = 0; // `{` / `}` pairs inside type annotations (pending phase)
  // true when the FUNCTION_START match was alternative 3 (`(params) =>`), i.e.
  // the match text itself ends with `=>`.  For these matches the body `{` may
  // appear while `pendingParenDepth > 0` (the surrounding call-site `(` is never
  // closed in the pending phase), so body-opener detection skips the depth guard
  // and relies solely on `sawArrow && pendingBraceDepth === 0`.  For all other
  // alternatives (1, 2, 4) the depth guard `pendingParenDepth <= 0` is required
  // to prevent a nested `=>` in a type annotation from triggering body detection.
  let pendingIsArrow3 = false;

  /** Resets all pending-phase tracking to a clean initial state. */
  function resetPending(firstLine: string, isArrow3: boolean): void {
    pendingFunction = true;
    depth = 0;
    bodyLines = [firstLine];
    sawArrow = false;
    sawEq = false;
    pendingParenDepth = 0;
    pendingBraceDepth = 0;
    pendingIsArrow3 = isArrow3;
  }

  for (const line of lines) {
    let m: RegExpExecArray | null;

    if (!inFunction && !pendingFunction && (m = FUNCTION_START.exec(line)) !== null) {
      // Candidate function start — wait for the opening `{`
      // Detect alternative 3 (`(params) =>`) by whether the match ends with `=>`;
      // this controls which body-opener heuristic is applied (see comment above).
      resetPending(line, m[0].trimEnd().endsWith('=>'));
    } else if (inFunction) {
      bodyLines.push(line);
    } else if (pendingFunction) {
      // Still waiting for `{`.  If a new FUNCTION_START appears first, the
      // previous candidate was an expression-bodied arrow — reset to the new
      // candidate so we don't accumulate unrelated lines.
      if ((m = FUNCTION_START.exec(line)) !== null) {
        resetPending(line, m[0].trimEnd().endsWith('=>'));
      } else {
        bodyLines.push(line);
      }
    }

    if (pendingFunction || inFunction) {
      for (const ch of line) {
        if (pendingFunction) {
          // ── Two-character `=>` detection ──────────────────────────────────
          if (ch === '=') {
            sawEq = true;
          } else if (ch === '>' && sawEq) {
            sawArrow = true;
            sawEq = false;
          } else {
            sawEq = false;
          }

          // ── Paren / brace depth tracking ──────────────────────────────────
          if (ch === '(') {
            pendingParenDepth++;
          } else if (ch === ')') {
            pendingParenDepth--;
          } else if (ch === '{') {
            // Accept as body opener only when we have passed the relevant
            // syntactic marker and there is no unclosed type-annotation brace.
            // For alt-3 matches (`(params) =>`, `pendingIsArrow3 = true`) the
            // surrounding call-site `(` keeps depth > 0, so we rely on
            // `sawArrow` alone.  For all other alternatives the parameter list
            // must have fully closed (`pendingParenDepth <= 0`) to avoid
            // mistaking a nested type-annotation `{` for the body opener.
            const isBodyOpener =
              (pendingIsArrow3 && sawArrow && pendingBraceDepth === 0) ||
              (!pendingIsArrow3 && pendingParenDepth <= 0 && pendingBraceDepth === 0);

            if (isBodyOpener) {
              depth = 1;
              pendingFunction = false;
              inFunction = true;
              // Remaining characters on this line are processed by the
              // `else if (inFunction)` branch in the next iterations.
            } else {
              // Inside a type annotation — track its depth so we don't
              // mistake its closing `}` for a body terminator.
              pendingBraceDepth++;
            }
          } else if (ch === '}' && pendingBraceDepth > 0) {
            pendingBraceDepth--;
          }
        } else if (inFunction) {
          if (ch === '{') {
            depth++;
          } else if (ch === '}') {
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
  }

  return bodies;
}
