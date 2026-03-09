/**
 * ARCH004 — Tight Coupling Detection
 *
 * Flags files that have more than 15 unique import targets. A high import
 * count is a strong signal of tight coupling — the file depends on many
 * other modules and will be impacted by changes to any of them.
 *
 * Only unique import targets are counted (i.e. importing the same module
 * twice counts as one).
 *
 * Threshold: 15 unique imports (configurable via IMPORT_THRESHOLD below).
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Threshold
// ---------------------------------------------------------------------------

const IMPORT_THRESHOLD = 15;

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const arch004: Rule = {
  id: 'ARCH004',
  name: 'Tight Coupling',
  description: `Flags files with more than ${IMPORT_THRESHOLD} unique import targets as highly coupled modules that are difficult to change, test, and refactor independently.`,
  severity: 'low',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      const uniqueImports = new Set(parsedFile.imports.map((e) => e.to));
      if (uniqueImports.size > IMPORT_THRESHOLD) {
        findings.push({
          ruleId: 'ARCH004',
          severity: 'low',
          message: `Tightly coupled module: ${uniqueImports.size} unique imports detected (threshold: ${IMPORT_THRESHOLD}).`,
          file: parsedFile.sourceFile.path,
          recommendation:
            'Reduce the number of direct dependencies by applying the Dependency Inversion Principle, introducing facades, or splitting the module into smaller, more focused units.',
        });
      }
    }

    return findings;
  },
};
