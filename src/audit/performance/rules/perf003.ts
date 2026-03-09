/**
 * PERF003 — Missing Caching Strategy
 *
 * Flags HTTP route handler functions that do not set any caching-related
 * response headers. When an API response is cacheable but no `Cache-Control`,
 * `ETag`, or `Last-Modified` header is set, every client request results in a
 * full server-side computation.
 *
 * Heuristic (content-based):
 *  - Look for files that appear to be Express / Fastify / Koa route handlers
 *    (i.e. they reference `req`/`res`, `request`/`response`, or `ctx`).
 *  - Within such files, flag exported functions (route handlers) that contain
 *    a `res.send` / `res.json` / `ctx.body` assignment but no explicit
 *    `Cache-Control`, `ETag`, or `Last-Modified` header assignment.
 *
 * This rule operates on raw file content (regex-based) because header
 * manipulation is idiomatic enough that regex is more reliable than AST
 * traversal across different frameworks.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/** Matches common response-sending patterns. */
const RESPONSE_PATTERNS = [
  /res\s*\.\s*(send|json|end|render)\s*\(/,
  /ctx\s*\.\s*body\s*=/,
  /reply\s*\.\s*(send|code)\s*\(/,
];

/** Matches caching-related header assignments. */
const CACHE_PATTERNS = [/Cache-Control/i, /ETag/i, /Last-Modified/i, /Expires/i, /s-maxage/i];

/** Matches route handler registration patterns. */
const ROUTE_PATTERNS = [
  /\.\s*(get|post|put|patch|delete|use)\s*\(\s*['"`]/,
  /router\s*\./,
  /app\s*\.\s*(get|post|put|patch|delete|use)\s*\(/,
  /fastify\s*\.\s*(get|post|put|patch|delete)\s*\(/,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasRouteHandlerPattern(content: string): boolean {
  return ROUTE_PATTERNS.some((re) => re.test(content));
}

function hasCachingHeader(content: string): boolean {
  return CACHE_PATTERNS.some((re) => re.test(content));
}

function hasResponsePattern(content: string): boolean {
  return RESPONSE_PATTERNS.some((re) => re.test(content));
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const perf003: Rule = {
  id: 'PERF003',
  name: 'Missing Caching Strategy',
  description:
    'Flags HTTP route handler files that send responses without setting any caching headers (Cache-Control, ETag, Last-Modified).',
  severity: 'medium',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      const content = parsedFile.content;

      // Only analyse files that look like route handlers
      if (!hasRouteHandlerPattern(content)) continue;

      // If no response is sent at all, skip
      if (!hasResponsePattern(content)) continue;

      // If caching headers are already present, skip
      if (hasCachingHeader(content)) continue;

      findings.push({
        ruleId: 'PERF003',
        severity: 'medium',
        message:
          'HTTP route handler sends responses without setting any caching headers (Cache-Control, ETag, or Last-Modified).',
        file: parsedFile.sourceFile.path,
        recommendation:
          'Add appropriate Cache-Control headers (e.g. `res.set("Cache-Control", "public, max-age=300")`) or implement ETag-based conditional responses.',
      });
    }

    return findings;
  },
};
