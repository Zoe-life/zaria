/**
 * Report factory — Phase 11.6.
 *
 * Picks the correct formatter based on the requested output format and
 * delegates to the appropriate renderer module.
 *
 * Supported formats:
 *   terminal  — ANSI-coloured human-readable output
 *   json      — machine-readable JSON
 *   markdown  — GitHub / GitLab PR comment format
 *   html      — self-contained HTML document
 *   sarif     — SARIF 2.1.0 for GitHub Code Scanning / Azure DevOps
 */

import type { AuditResult } from '../audit/types.js';
import { renderTerminal } from './terminal.js';
import { renderJson } from './json.js';
import { renderMarkdown } from './markdown.js';
import { renderHtml } from './html.js';
import { renderSarif } from './sarif.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** All supported report output formats. */
export type OutputFormat = 'terminal' | 'json' | 'markdown' | 'html' | 'sarif';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a report string in the requested format.
 *
 * @param result   The `AuditResult` produced by running the audit engine.
 * @param format   Output format (default `'terminal'`).
 * @param verbose  When `true` and `format === 'terminal'`, include full finding list.
 * @returns        A UTF-8 string ready to be written to stdout or a file.
 */
export function generateReport(
  result: AuditResult,
  format: OutputFormat = 'terminal',
  verbose = false,
): string {
  switch (format) {
    case 'terminal':
      return renderTerminal(result, verbose);
    case 'json':
      return renderJson(result);
    case 'markdown':
      return renderMarkdown(result);
    case 'html':
      return renderHtml(result);
    case 'sarif':
      return renderSarif(result);
    default: {
      // Exhaustiveness guard — TypeScript will flag unhandled formats at compile time.
      const _exhaustive: never = format;
      throw new Error(`Unknown output format: ${String(_exhaustive)}`);
    }
  }
}
