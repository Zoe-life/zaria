/**
 * INT004 — Non-Idempotent Write Endpoint
 *
 * Detects HTTP POST handlers that create resources without first checking
 * whether the resource already exists. Non-idempotent writes can cause
 * duplicate records when clients retry requests (e.g. after a timeout)
 * or when multiple concurrent requests race.
 *
 * Heuristic (content-based):
 *  - Identify POST route handler blocks: `app.post(`, `router.post(`,
 *    `fastify.post(`.
 *  - Within each POST handler body, look for a write call (`.create`,
 *    `.insert`, `.save`, `.add`) WITHOUT a preceding existence-check call
 *    (`findOne`, `findById`, `findFirst`, `exists`, `count`, `findOrCreate`,
 *    `upsert`, `insertOrIgnore`, `ON CONFLICT`).
 *  - If a write exists but no existence-check pattern is found in the same
 *    handler block, emit a finding.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/** POST route registration patterns. */
const POST_ROUTE = /\b(app|router|fastify|server|hapi)\s*\.\s*post\s*\(\s*['"`]/g;

/** Write calls that create new records. */
const WRITE_CALLS = /\b(\.create\s*\(|\.insert\s*\(|\.save\s*\(|\.add\s*\(|\.bulkCreate\s*\()/;

/**
 * Existence-check or idempotency-guard patterns.
 * If any of these appear in the same handler block, the endpoint is considered safe.
 */
const EXISTENCE_CHECK =
  /\b(findOne|findById|findFirst|findByPk|exists\s*\(|\.count\s*\(|findOrCreate|upsert|insertOrIgnore|ON CONFLICT|onConflict|checkExist|alreadyExists)\b/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the body of each POST route handler from the file content.
 * Returns an array of handler body strings.
 *
 * Strategy: find each `.post(` invocation, then grab text from the opening
 * brace of the callback to the matching closing brace.
 */
function extractPostHandlerBodies(content: string): string[] {
  const bodies: string[] = [];
  POST_ROUTE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = POST_ROUTE.exec(content)) !== null) {
    // Find the first `{` after the route match position
    let start = content.indexOf('{', match.index + match[0].length);
    if (start === -1) continue;

    let depth = 0;
    let end = start;
    for (let i = start; i < content.length; i++) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    bodies.push(content.slice(start, end + 1));
  }

  return bodies;
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const int004: Rule = {
  id: 'INT004',
  name: 'Non-Idempotent Write Endpoint',
  description:
    'Detects POST route handlers that create resources without first checking for an existing record. Duplicate creation on retry or concurrent requests leads to inconsistent data.',
  severity: 'medium',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      const bodies = extractPostHandlerBodies(parsedFile.content);

      for (const body of bodies) {
        if (!WRITE_CALLS.test(body)) continue; // handler doesn't create anything
        if (EXISTENCE_CHECK.test(body)) continue; // already has a guard

        findings.push({
          ruleId: 'INT004',
          severity: 'medium',
          message:
            'POST handler creates a resource without checking for an existing record. Retried or concurrent requests will produce duplicate entries.',
          file: parsedFile.sourceFile.path,
          recommendation:
            'Before creating a new record, check for an existing one (findOne, findOrCreate) or use a database-level unique constraint with upsert / INSERT … ON CONFLICT to guarantee idempotency.',
        });
      }
    }

    return findings;
  },
};
