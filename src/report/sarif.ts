/**
 * SARIF reporter — Phase 11.5.
 *
 * Produces a SARIF 2.1.0 document (https://docs.oasis-open.org/sarif/sarif/v2.1.0/)
 * from an `AuditResult`.  SARIF is consumed by:
 *   • GitHub Advanced Security / Code Scanning
 *   • Azure DevOps
 *   • VS Code SARIF Viewer extension
 *
 * Severity mapping (SARIF → Zaria):
 *   error   → critical
 *   warning → high
 *   note    → medium | low
 *
 * Time  O(F)  where F = total findings.
 * Space O(F).
 */

import type { AuditResult, Finding } from '../audit/types.js';

// ---------------------------------------------------------------------------
// SARIF 2.1.0 type shapes (minimal subset used by Zaria)
// ---------------------------------------------------------------------------

interface SarifLocation {
  physicalLocation: {
    artifactLocation: { uri: string; uriBaseId: string };
    region?: { startLine: number; startColumn?: number };
  };
}

interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note' | 'none';
  message: { text: string };
  locations: SarifLocation[];
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  defaultConfiguration: { level: string };
}

interface SarifLog {
  $schema: string;
  version: '2.1.0';
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: SarifRule[];
      };
    };
    results: SarifResult[];
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert Zaria severity to SARIF level. */
function toSarifLevel(severity: string): 'error' | 'warning' | 'note' | 'none' {
  switch (severity) {
    case 'critical':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
    case 'low':
      return 'note';
    default:
      return 'none';
  }
}

/** Convert an absolute file path to a file:// URI. */
function toUri(filePath: string): string {
  // Ensure forward slashes and proper URI scheme.
  const normalised = filePath.replace(/\\/g, '/');
  return normalised.startsWith('/') ? `file://${normalised}` : `file:///${normalised}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render `result` as a SARIF 2.1.0 JSON string.
 *
 * @param result   The audit result to serialise.
 * @param version  Tool version to embed (default `'0.0.1'`).
 * @returns        A UTF-8 JSON string conforming to the SARIF 2.1.0 schema.
 */
export function renderSarif(result: AuditResult, version = '0.0.1'): string {
  const allFindings: Finding[] = result.dimensions.flatMap((d) => d.findings);

  // Deduplicate rules by ID using a Map for O(1) lookups.
  const ruleMap = new Map<string, SarifRule>();

  const sarifResults: SarifResult[] = allFindings.map((f) => {
    if (!ruleMap.has(f.ruleId)) {
      ruleMap.set(f.ruleId, {
        id: f.ruleId,
        name: f.ruleId,
        shortDescription: { text: f.message },
        fullDescription: { text: `${f.message} — ${f.recommendation}` },
        defaultConfiguration: { level: toSarifLevel(f.severity) },
      });
    }

    const location: SarifLocation = {
      physicalLocation: {
        artifactLocation: { uri: toUri(f.file), uriBaseId: '%SRCROOT%' },
        ...(f.line != null
          ? {
              region: { startLine: f.line, ...(f.column != null ? { startColumn: f.column } : {}) },
            }
          : {}),
      },
    };

    return {
      ruleId: f.ruleId,
      level: toSarifLevel(f.severity),
      message: { text: f.message },
      locations: [location],
    };
  });

  const log: SarifLog = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'Zaria',
            version,
            informationUri: 'https://github.com/Zoe-life/zaria',
            rules: [...ruleMap.values()],
          },
        },
        results: sarifResults,
      },
    ],
  };

  return JSON.stringify(log, null, 2);
}
