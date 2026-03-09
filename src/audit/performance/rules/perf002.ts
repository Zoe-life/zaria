/**
 * PERF002 — Synchronous Blocking in Async Context
 *
 * Detects calls to synchronous I/O and CPU-blocking APIs (e.g. `fs.readFileSync`,
 * `execSync`, `spawnSync`) that appear inside `async` functions. Such calls block
 * the Node.js event loop, negating the benefit of `async/await`.
 *
 * Detected patterns:
 *  - Direct calls: `readFileSync(...)`, `execSync(...)`
 *  - Namespaced calls: `fs.readFileSync(...)`, `child_process.execSync(...)`
 */

import { Project, SyntaxKind } from 'ts-morph';
import type { Node } from 'ts-morph';
import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Synchronous APIs that block the event loop. */
const SYNC_APIS = new Set([
  'readFileSync',
  'writeFileSync',
  'appendFileSync',
  'mkdirSync',
  'rmdirSync',
  'rmSync',
  'readdirSync',
  'statSync',
  'lstatSync',
  'accessSync',
  'chmodSync',
  'renameSync',
  'copyFileSync',
  'unlinkSync',
  'execSync',
  'spawnSync',
  'execFileSync',
]);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Returns true when `node` is nested inside an `async` function body. */
function isInsideAsyncFunction(node: Node): boolean {
  let current: Node | undefined = node.getParent();
  while (current) {
    const kind = current.getKind();
    if (
      kind === SyntaxKind.FunctionDeclaration ||
      kind === SyntaxKind.FunctionExpression ||
      kind === SyntaxKind.ArrowFunction ||
      kind === SyntaxKind.MethodDeclaration
    ) {
      // Check the `async` modifier
      const modifiers =
        'getModifiers' in current
          ? (current as { getModifiers: () => Array<{ getKind: () => number }> }).getModifiers()
          : [];
      for (const mod of modifiers) {
        if (mod.getKind() === SyntaxKind.AsyncKeyword) return true;
      }
      // Also handle ArrowFunction / FunctionExpression asyncness via getText
      const text = current.getText();
      if (text.startsWith('async ') || text.startsWith('async(')) return true;
    }
    current = current.getParent();
  }
  return false;
}

/** Extracts the called method name from a call expression node. */
function getCalledMethodName(node: Node): string | null {
  if (node.getKind() !== SyntaxKind.CallExpression) return null;

  const callExpr = node.asKindOrThrow(SyntaxKind.CallExpression);
  const expr = callExpr.getExpression();

  if (expr.getKind() === SyntaxKind.Identifier) {
    return expr.getText();
  }

  if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
    return expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName();
  }

  return null;
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const perf002: Rule = {
  id: 'PERF002',
  name: 'Synchronous Blocking in Async Context',
  description:
    'Detects synchronous I/O calls (readFileSync, execSync, etc.) inside async functions that block the Node.js event loop.',
  severity: 'high',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    // Create one shared project for all files to avoid N separate Project instances
    const project = new Project({
      useInMemoryFileSystem: false,
      skipFileDependencyResolution: true,
      compilerOptions: { allowJs: true, checkJs: false, noEmit: true, skipLibCheck: true },
    });

    for (const parsedFile of context.files) {
      try {
        project.addSourceFileAtPath(parsedFile.sourceFile.path);
      } catch {
        // skip unreadable files
      }
    }

    for (const parsedFile of context.files) {
      const tsFile = project.getSourceFile(parsedFile.sourceFile.path);
      if (!tsFile) continue;

      for (const node of tsFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
        const methodName = getCalledMethodName(node);
        if (!methodName || !SYNC_APIS.has(methodName)) continue;
        if (!isInsideAsyncFunction(node)) continue;

        const line = node.getStartLineNumber();
        findings.push({
          ruleId: 'PERF002',
          severity: 'high',
          message: `Synchronous call \`${methodName}\` inside an async function blocks the event loop (line ${line}).`,
          file: parsedFile.sourceFile.path,
          line,
          recommendation: `Replace \`${methodName}\` with its async counterpart (e.g. \`${methodName.replace('Sync', '')}\` from \`fs/promises\`) and \`await\` the result.`,
        });
      }
    }

    return findings;
  },
};
