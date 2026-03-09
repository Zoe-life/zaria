/**
 * PERF001 — N+1 Query Pattern Detection
 *
 * Detects ORM/database method calls that occur inside loop bodies. This is the
 * classic N+1 query problem: one query to fetch a list, then one additional
 * query per item in that list.
 *
 * Heuristic:
 *  - Looks for call expressions whose callee contains ORM-like method names
 *    (`find`, `findOne`, `findById`, `findAll`, `findByPk`, `create`, `update`,
 *    `delete`, `save`, `query`, `execute`, `count`, `upsert`) **and** that
 *    call expression is a descendant of a loop statement (`for`, `while`,
 *    `do-while`, `for-of`, `for-in`, `Array.forEach/map/filter/reduce`).
 */

import { Project, SyntaxKind, Node } from 'ts-morph';
import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** ORM method names that represent a database access. */
const ORM_METHODS = new Set([
  'find',
  'findOne',
  'findById',
  'findAll',
  'findByPk',
  'findFirst',
  'findMany',
  'create',
  'update',
  'delete',
  'destroy',
  'save',
  'query',
  'execute',
  'count',
  'upsert',
  'insert',
  'bulkCreate',
  'aggregate',
]);

/** Iterable-callback method names on Array prototype. */
const ARRAY_CALLBACKS = new Set(['forEach', 'map', 'filter', 'reduce', 'flatMap', 'find']);

/** SyntaxKinds that represent loop statements. */
const LOOP_KINDS = new Set([
  SyntaxKind.ForStatement,
  SyntaxKind.ForOfStatement,
  SyntaxKind.ForInStatement,
  SyntaxKind.WhileStatement,
  SyntaxKind.DoStatement,
]);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Returns true if the node has a loop ancestor. */
function isInsideLoop(node: Node): boolean {
  let current: Node | undefined = node.getParent();
  while (current) {
    if (LOOP_KINDS.has(current.getKind())) return true;

    // Detect Array.prototype callback: e.g. items.forEach(async (item) => { ... })
    if (current.getKind() === SyntaxKind.CallExpression) {
      const callExpr = current.asKindOrThrow(SyntaxKind.CallExpression);
      const propAccess = callExpr.getExpression();
      if (propAccess.getKind() === SyntaxKind.PropertyAccessExpression) {
        const methodName = propAccess.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName();
        if (ARRAY_CALLBACKS.has(methodName)) return true;
      }
    }

    current = current.getParent();
  }
  return false;
}

/** Returns true if the call expression looks like an ORM database access. */
function isOrmCall(node: Node): boolean {
  if (node.getKind() !== SyntaxKind.CallExpression) return false;

  const callExpr = node.asKindOrThrow(SyntaxKind.CallExpression);
  const expr = callExpr.getExpression();

  if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
    const methodName = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName();
    return ORM_METHODS.has(methodName);
  }

  return false;
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const perf001: Rule = {
  id: 'PERF001',
  name: 'N+1 Query Pattern',
  description:
    'Detects database/ORM calls inside loops, which cause one additional query per iteration (N+1 problem).',
  severity: 'high',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      const project = new Project({
        useInMemoryFileSystem: false,
        skipFileDependencyResolution: true,
        compilerOptions: { allowJs: true, checkJs: false, noEmit: true, skipLibCheck: true },
      });

      let tsFile;
      try {
        tsFile = project.addSourceFileAtPath(parsedFile.sourceFile.path);
      } catch {
        continue;
      }

      for (const node of tsFile.getDescendants()) {
        if (isOrmCall(node) && isInsideLoop(node)) {
          const startLine = node.getStartLineNumber();
          findings.push({
            ruleId: 'PERF001',
            severity: 'high',
            message: `N+1 query pattern detected: database call inside a loop at line ${startLine}.`,
            file: parsedFile.sourceFile.path,
            line: startLine,
            recommendation:
              'Fetch all required data in a single query before the loop, then use an in-memory lookup (e.g. Map) inside the loop.',
          });
        }
      }
    }

    return findings;
  },
};
