/**
 * MAINT004 — Missing Test Coverage
 *
 * Detects source files that have no corresponding test file when the project
 * already has a testing infrastructure in place.
 *
 * Heuristic:
 *  1. Identify "test files" — files whose name matches `*.test.[jt]sx?` or
 *     `*.spec.[jt]sx?`, or that live inside a `tests/` or `__tests__/`
 *     directory (checked against the path relative to `projectRoot`).
 *  2. If no test files are found in `context.files`, the rule is silently
 *     skipped: a project with zero tests has a different problem (complete
 *     absence of testing), which is outside this rule's scope.
 *  3. Build a Set of "covered basenames" from the test-file names by stripping
 *     the `.test.` / `.spec.` suffix. E.g. `user.test.ts` → `user`.
 *  4. For each source file (non-test), check whether its basename (without
 *     extension) appears in the covered set. If not, emit a finding.
 *
 * This is a best-effort heuristic that matches files by name. It does not
 * analyse import graphs or actual coverage reports.
 *
 * Time complexity:  O(f) — one pass to build the covered-Set, one pass to
 *   check each source file.
 * Space complexity: O(t) where t = number of test files.
 */

import { basename, relative } from 'path';
import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/** Matches test/spec file names: `foo.test.ts`, `bar.spec.jsx`, etc. */
const TEST_FILE_NAME_RE = /\.(test|spec)\.[jt]sx?$/;

/** Path segments that identify test directories (relative to project root). */
const TEST_DIR_SEGMENTS = new Set(['tests', 'test', '__tests__', '__test__']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the file is a test/spec file.
 * Uses the path relative to `projectRoot` for directory-segment checks so
 * that ancestor directories (e.g. a parent `tests/` folder containing the
 * project) do not cause false positives.
 *
 * O(path segments) per file.
 */
function isTestFile(filePath: string, projectRoot: string): boolean {
  const normalised = filePath.replace(/\\/g, '/');

  // First check the filename itself: *.test.ts, *.spec.js, etc.
  if (TEST_FILE_NAME_RE.test(normalised)) return true;

  // Then check directory segments RELATIVE to the project root so that
  // a `tests/` directory above the project root does not trigger the rule.
  const rel = relative(projectRoot, filePath).replace(/\\/g, '/');
  const parts = rel.split('/');
  return parts.some((seg) => TEST_DIR_SEGMENTS.has(seg.toLowerCase()));
}

/**
 * Extract the "covered basename" from a test-file name.
 * `user.test.ts` → `user`, `auth.spec.js` → `auth`.
 */
function testedBasename(filename: string): string {
  return filename.replace(TEST_FILE_NAME_RE, '');
}

/**
 * Extract the plain basename (without extension) from a source-file name.
 * `user.ts` → `user`, `routes.js` → `routes`.
 */
function sourceBasename(filename: string): string {
  return filename.replace(/\.[jt]sx?$/, '');
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const maint004: Rule = {
  id: 'MAINT004',
  name: 'Missing Test Coverage',
  description:
    'Detects source files that have no corresponding test file. Applies only when the project already has some test infrastructure — if no test files are found the rule is skipped.',
  severity: 'low',

  check(context: AnalysisContext): Finding[] {
    // Partition files into test files and source files.
    const testFiles = context.files.filter((f) =>
      isTestFile(f.sourceFile.path, context.projectRoot),
    );

    // Rule is inactive when there are no test files in the project.
    if (testFiles.length === 0) return [];

    // Build the set of covered basenames (O(t)).
    const coveredBases = new Set<string>();
    for (const f of testFiles) {
      const name = basename(f.sourceFile.path);
      if (TEST_FILE_NAME_RE.test(name)) {
        coveredBases.add(testedBasename(name));
      }
    }

    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      // Skip test files themselves.
      if (isTestFile(parsedFile.sourceFile.path, context.projectRoot)) continue;

      const name = basename(parsedFile.sourceFile.path);
      const base = sourceBasename(name);

      if (!coveredBases.has(base)) {
        findings.push({
          ruleId: 'MAINT004',
          severity: 'low',
          message: `Source file "${name}" has no corresponding test file. Untested code is harder to refactor safely and more likely to contain latent bugs.`,
          file: parsedFile.sourceFile.path,
          recommendation: `Create a test file named "${base}.test.ts" (or "${base}.spec.ts") that covers the public API of this module. Aim for at least one unit test per exported function.`,
        });
      }
    }

    return findings;
  },
};
