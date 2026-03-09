/**
 * SCALE001 — Missing Structured Logging
 *
 * Detects `console.log`, `console.warn`, `console.error`, and `console.info`
 * calls outside of files that are explicitly logger/utility modules.
 *
 * Raw `console.*` calls in application code are a scalability concern because:
 *  - They produce unstructured output that is hard to query in log aggregators.
 *  - They cannot be silenced in production without monkey-patching.
 *  - They lack contextual fields (request ID, trace ID, service name, level).
 *
 * Heuristic:
 *  - Flag any file that contains `console.log`, `console.warn`, `console.error`,
 *    or `console.info` calls.
 *  - Exempt files whose path contains `logger`, `log`, `logging`, or `debug`
 *    (i.e. the logger module itself).
 *  - The count of calls is reported so severity can be assessed.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Console methods that should be replaced with structured logging. */
const CONSOLE_CALLS = /\bconsole\s*\.\s*(log|warn|error|info|debug)\s*\(/g;

/** Path segments that identify logger/utility files — exempt from this rule. */
const LOGGER_PATH_SEGMENTS = ['logger', 'logging', '/log.', '/log/', 'debug'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isLoggerFile(filePath: string): boolean {
  const lower = filePath.replace(/\\/g, '/').toLowerCase();
  return LOGGER_PATH_SEGMENTS.some((seg) => lower.includes(seg));
}

function countConsoleCallsInContent(content: string): number {
  return (content.match(CONSOLE_CALLS) ?? []).length;
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const scale001: Rule = {
  id: 'SCALE001',
  name: 'Missing Structured Logging',
  description:
    'Detects raw console.log/warn/error/info calls in application code. These should be replaced with a structured logger (e.g. pino, winston) that emits JSON-formatted log entries.',
  severity: 'medium',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      // Exempt dedicated logger modules
      if (isLoggerFile(parsedFile.sourceFile.path)) continue;

      const callCount = countConsoleCallsInContent(parsedFile.content);
      if (callCount === 0) continue;

      findings.push({
        ruleId: 'SCALE001',
        severity: 'medium',
        message: `${callCount} raw console call(s) detected. Unstructured logging prevents log aggregation and querying at scale.`,
        file: parsedFile.sourceFile.path,
        recommendation:
          'Replace console.* calls with a structured logger such as pino or winston that emits JSON log lines with level, timestamp, and contextual fields.',
      });
    }

    return findings;
  },
};
