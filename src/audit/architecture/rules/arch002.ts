/**
 * ARCH002 — God Module Detection
 *
 * Flags files that have both a high line count (>500 LOC) AND a large number
 * of exports (>20). Such files take on too many responsibilities and are
 * expensive to understand, test, and maintain.
 *
 * Thresholds (configurable via constants below):
 *  - LOC_THRESHOLD  : 500 lines
 *  - EXPORT_THRESHOLD: 20 exports
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const LOC_THRESHOLD = 500;
const EXPORT_THRESHOLD = 20;

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const arch002: Rule = {
  id: 'ARCH002',
  name: 'God Module',
  description: `Flags files with >${LOC_THRESHOLD} LOC and >${EXPORT_THRESHOLD} exports as potential god modules that violate the Single Responsibility Principle.`,
  severity: 'medium',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      if (parsedFile.loc > LOC_THRESHOLD && parsedFile.exportCount > EXPORT_THRESHOLD) {
        findings.push({
          ruleId: 'ARCH002',
          severity: 'medium',
          message: `God module detected: ${parsedFile.loc} LOC with ${parsedFile.exportCount} exports. This file has too many responsibilities.`,
          file: parsedFile.sourceFile.path,
          recommendation:
            'Split this module into smaller, focused modules each with a single responsibility. Consider domain-driven grouping.',
        });
      }
    }

    return findings;
  },
};
