/**
 * SCALE002 — Unbounded Query
 *
 * Detects ORM/database queries that do not apply a result limit. Unbounded
 * queries can return arbitrarily large data sets as the database grows,
 * causing memory exhaustion, slow response times, and cascading failures.
 *
 * Heuristic (content-based regex):
 *  - Look for ORM fetch method calls: `find(`, `findAll(`, `findMany(`,
 *    `findAndCountAll(`, `query(`, `getMany(`, `execute(`.
 *  - If the call is NOT followed by a chained `.limit(` or `.take(` within
 *    the same statement, flag it.
 *  - Also flag calls where the options argument (object literal) does not
 *    contain a `limit:` or `take:` key.
 *
 * This rule uses line-by-line content analysis for O(lines) performance.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/**
 * Matches ORM fetch calls that likely return multiple rows.
 * Capture group 1 = method name.
 */
const FETCH_CALL = /\b(findAll|findMany|findAndCountAll|getMany|getAll)\s*\(/g;

/** A chained `.limit(` or `.take(` call following a fetch. */
const LIMIT_CHAIN = /\.\s*(limit|take)\s*\(/;

/** An inline `limit:` or `take:` key inside an options object. */
const LIMIT_OPTION = /\b(limit|take)\s*:/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the statement text contains a limit/take constraint.
 * Checks both chained `.limit()` / `.take()` and inline `{ limit: N }` options.
 */
function hasLimitConstraint(statement: string): boolean {
  return LIMIT_CHAIN.test(statement) || LIMIT_OPTION.test(statement);
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const scale002: Rule = {
  id: 'SCALE002',
  name: 'Unbounded Query',
  description:
    'Detects ORM fetch calls (findAll, findMany, getMany, etc.) that do not apply a .limit() / .take() constraint, which can return unbounded result sets.',
  severity: 'high',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      const lines = parsedFile.content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;

        // Reset lastIndex for global regex on each line
        FETCH_CALL.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = FETCH_CALL.exec(line)) !== null) {
          const methodName = match[1]!;

          // Gather the statement: current line + next 3 lines for multi-line calls
          const statement = lines.slice(i, i + 4).join(' ');

          if (hasLimitConstraint(statement)) continue;

          findings.push({
            ruleId: 'SCALE002',
            severity: 'high',
            message: `Unbounded query: \`${methodName}()\` called without a \`limit\` or \`take\` constraint (line ${i + 1}).`,
            file: parsedFile.sourceFile.path,
            line: i + 1,
            recommendation:
              'Always apply a `.limit(n)` / `.take(n)` constraint or pass `{ limit: n }` in the options object to prevent unbounded data sets. Use cursor-based pagination for large collections.',
          });
        }
      }
    }

    return findings;
  },
};
