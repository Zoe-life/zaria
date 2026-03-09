/**
 * SCALE003 — Stateful Singleton Pattern
 *
 * Detects module-level mutable state that prevents horizontal scaling. When a
 * Node.js service is deployed across multiple instances, module-level variables
 * are NOT shared between instances. Storing counters, caches, or session data
 * in module-scope variables therefore causes inconsistency across replicas.
 *
 * Heuristic (content-based):
 *  - Flag files that declare module-level `let` variables (mutable).
 *  - Flag exported `const` objects/arrays whose value is a mutable literal
 *    (`{ ... }` or `[ ... ]`) — these can be mutated by callers.
 *  - Exempt: files that are explicitly configuration or constants modules
 *    (path contains `config`, `constant`, `defaults`).
 *  - Exempt: `const` declarations with primitive values (strings, numbers,
 *    booleans) — these are safe immutable constants.
 *
 * Only files with at least one such declaration are flagged.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/** Module-level `let` variable declaration (not inside a function/class). */
const MODULE_LET = /^(?:export\s+)?let\s+\w+/m;

/**
 * Exported `const` with a mutable initialiser (object or array literal).
 * e.g. `export const state = { count: 0 };`
 */
const MUTABLE_EXPORT_CONST = /^export\s+const\s+\w+\s*[=:][^=][\s\S]*?[{[]/m;

/** Path segments that identify config/constants files — exempt from this rule. */
const EXEMPT_PATH_SEGMENTS = ['config', 'constant', 'defaults', 'setting', 'env'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isExemptFile(filePath: string): boolean {
  const lower = filePath.replace(/\\/g, '/').toLowerCase();
  return EXEMPT_PATH_SEGMENTS.some((seg) => lower.includes(seg));
}

function hasMutableModuleState(content: string): boolean {
  return MODULE_LET.test(content) || MUTABLE_EXPORT_CONST.test(content);
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const scale003: Rule = {
  id: 'SCALE003',
  name: 'Stateful Singleton Pattern',
  description:
    'Detects module-level mutable state (let variables, exported mutable objects) that cannot be shared across horizontal replicas, causing inconsistency in scaled deployments.',
  severity: 'medium',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      if (isExemptFile(parsedFile.sourceFile.path)) continue;
      if (!hasMutableModuleState(parsedFile.content)) continue;

      findings.push({
        ruleId: 'SCALE003',
        severity: 'medium',
        message:
          'Module-level mutable state detected. This state is not shared across horizontal replicas and will cause inconsistency in scaled deployments.',
        file: parsedFile.sourceFile.path,
        recommendation:
          'Move shared state to an external store (Redis, a database, or a distributed cache). Use `const` with immutable values for module-level constants.',
      });
    }

    return findings;
  },
};
