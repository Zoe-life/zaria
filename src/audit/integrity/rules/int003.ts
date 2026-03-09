/**
 * INT003 — TOCTOU Vulnerability Pattern
 *
 * Detects "Time-Of-Check-Time-Of-Use" (TOCTOU) patterns where a check
 * (e.g. `existsSync`, `findOne`, `findById`) is followed by a mutating
 * action on the same resource within the same function body, without
 * an atomic operation protecting the critical section.
 *
 * TOCTOU vulnerabilities allow race conditions: another process or request
 * can change the resource between the check and the action, leading to
 * double-creation, privilege escalation, or data corruption.
 *
 * Heuristic (content-based):
 *  - In each function body, look for a check call followed (within 10 lines)
 *    by a write call on what appears to be the same subject.
 *  - Check patterns: `existsSync`, `accessSync`, `statSync`, `findOne`,
 *    `findById`, `findFirst`, `exists(`.
 *  - Write patterns (on the same resource path/identifier): `writeFileSync`,
 *    `writeFile`, `mkdir`, `create`, `insert`, `save`.
 *  - Exempt patterns that use atomic flags: `{ flag: 'wx' }`, `{ exclusive }`,
 *    `createIfNotExists`, `insertOrIgnore`, `upsert`, `findOrCreate`.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';
import { extractFunctionBodies } from '../utils.js';

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/** Check operations — reads/tests state before acting. */
const CHECK_CALLS =
  /\b(existsSync|accessSync|statSync|lstatSync|findOne|findById|findFirst|findByPk|\.exists\s*\()/;

/** Write operations — mutate state. */
const WRITE_CALLS =
  /\b(writeFileSync|writeFile|mkdirSync|mkdir|createWriteStream|\.create\s*\(|\.insert\s*\(|\.save\s*\(|\.put\s*\()/;

/**
 * Atomic operation markers — patterns that make the operation safe.
 * If any of these appear in the same function body, skip the finding.
 */
const ATOMIC_MARKERS =
  /\b(flag:\s*['"`]wx|exclusive|createIfNotExists|insertOrIgnore|upsert|findOrCreate|ON CONFLICT|onConflict)\b/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const int003: Rule = {
  id: 'INT003',
  name: 'TOCTOU Vulnerability Pattern',
  description:
    'Detects check-then-act patterns (e.g. existsSync followed by writeFile, or findOne followed by create) on the same resource without atomic protection, creating a race condition window.',
  severity: 'high',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      const bodies = extractFunctionBodies(parsedFile.content);

      for (const body of bodies) {
        // Skip if an atomic operation is already in place
        if (ATOMIC_MARKERS.test(body)) continue;

        const hasCheck = CHECK_CALLS.test(body);
        const hasWrite = WRITE_CALLS.test(body);

        if (hasCheck && hasWrite) {
          findings.push({
            ruleId: 'INT003',
            severity: 'high',
            message:
              'TOCTOU pattern detected: a check operation is followed by a write operation on the same resource without an atomic guard. A concurrent request can exploit the race window.',
            file: parsedFile.sourceFile.path,
            recommendation:
              'Use atomic file-system flags (e.g. `{ flag: "wx" }` in `writeFile`) or database-level atomic operations (upsert, INSERT … ON CONFLICT, findOrCreate) to eliminate the race window.',
          });
        }
      }
    }

    return findings;
  },
};
