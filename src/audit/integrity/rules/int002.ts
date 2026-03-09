/**
 * INT002 — Missing Transaction Boundary
 *
 * Detects functions that perform multiple ORM write operations (create, update,
 * delete, save, upsert, insert) without wrapping them in a transaction. Without
 * a transaction, a partial failure leaves the database in an inconsistent state.
 *
 * Heuristic (function-level content analysis):
 *  - Split the file into logical blocks per function (detected by counting
 *    braces from each `async function` / `function` / arrow function opening).
 *  - For each function body, count distinct ORM write calls.
 *  - If ≥ 2 write calls are present and no transaction keyword is found
 *    (`transaction`, `trx`, `beginTransaction`, `withTransaction`,
 *    `sequelize.transaction`, `knex.transaction`, `prisma.$transaction`),
 *    emit a finding.
 *
 * This rule operates on raw content (regex) to avoid ts-morph overhead.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';
import { extractFunctionBodies } from '../utils.js';

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/** ORM write method names. */
const ORM_WRITES =
  /\b(\.create|\.update|\.delete|\.destroy|\.save|\.upsert|\.insert|\.bulkCreate|\.bulkInsert|\.remove)\s*\(/g;

/**
 * Transaction markers — any of these in the same function signals that a
 * transaction boundary is present.
 */
const TRANSACTION_MARKERS =
  /\b(transaction|trx|beginTransaction|withTransaction|sequelize\.transaction|knex\.transaction|prisma\.\$transaction|startTransaction|commit|rollback)\b/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countOrmWrites(body: string): number {
  ORM_WRITES.lastIndex = 0;
  return (body.match(ORM_WRITES) ?? []).length;
}

function hasTransactionMarker(body: string): boolean {
  return TRANSACTION_MARKERS.test(body);
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const int002: Rule = {
  id: 'INT002',
  name: 'Missing Transaction Boundary',
  description:
    'Detects functions that perform two or more ORM write operations (create, update, delete, etc.) without wrapping them in a database transaction, risking partial failure and data inconsistency.',
  severity: 'high',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      const bodies = extractFunctionBodies(parsedFile.content);

      for (const body of bodies) {
        if (countOrmWrites(body) >= 2 && !hasTransactionMarker(body)) {
          findings.push({
            ruleId: 'INT002',
            severity: 'high',
            message:
              'Function performs multiple ORM write operations without a transaction boundary. A partial failure will leave the database in an inconsistent state.',
            file: parsedFile.sourceFile.path,
            recommendation:
              'Wrap all related write operations in a single database transaction (e.g. `await sequelize.transaction(async (t) => { ... })` or `prisma.$transaction([...])`). Ensure the transaction rolls back on any error.',
          });
        }
      }
    }

    return findings;
  },
};
