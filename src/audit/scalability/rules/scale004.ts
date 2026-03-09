/**
 * SCALE004 — Missing Health Check Endpoint
 *
 * Detects Express / Fastify / Koa / Hapi application files that register HTTP
 * routes but do not expose a `/health` or `/healthz` endpoint. Health check
 * endpoints are required for load balancers, container orchestrators (Kubernetes
 * liveness/readiness probes), and uptime monitors to verify service availability.
 *
 * Heuristic (content-based):
 *  - A file is considered an "app/router file" if it registers at least one
 *    HTTP route (contains `.get(`, `.post(`, `.use(`, etc. with a string path).
 *  - The file is flagged if it does NOT contain a route registered on
 *    `/health`, `/healthz`, `/ping`, or `/status`.
 *  - Exempt: files whose path contains `test`, `spec`, or `fixture`.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/** Matches HTTP route registration patterns in Express / Fastify / Koa / Hapi. */
const ROUTE_REGISTRATION = /\.\s*(get|post|put|patch|delete|use|route|register)\s*\(\s*['"`]/;

/**
 * Matches a health-check route registration.
 * Covers: /health, /healthz, /ping, /status (with optional prefix).
 */
const HEALTH_ROUTE =
  /\.\s*(get|use|route|register)\s*\(\s*['"`][^'"` ]*\/(health|healthz|ping|status)['"`]/i;

/** Path segments that identify test/fixture files — exempt from this rule. */
const EXEMPT_PATH_SEGMENTS = ['test', 'spec', 'fixture', '__tests__', '__mocks__'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isExemptFile(filePath: string): boolean {
  const lower = filePath.replace(/\\/g, '/').toLowerCase();
  return EXEMPT_PATH_SEGMENTS.some((seg) => lower.includes(seg));
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const scale004: Rule = {
  id: 'SCALE004',
  name: 'Missing Health Check Endpoint',
  description:
    'Detects HTTP application files that register routes but do not expose a /health, /healthz, /ping, or /status endpoint required by load balancers and container orchestrators.',
  severity: 'medium',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      if (isExemptFile(parsedFile.sourceFile.path)) continue;

      const content = parsedFile.content;

      // Only examine files that register HTTP routes
      if (!ROUTE_REGISTRATION.test(content)) continue;

      // Skip if a health-check route is already present
      if (HEALTH_ROUTE.test(content)) continue;

      findings.push({
        ruleId: 'SCALE004',
        severity: 'medium',
        message:
          'HTTP application registers routes but does not expose a /health or /healthz endpoint. Load balancers and Kubernetes probes require a health-check route.',
        file: parsedFile.sourceFile.path,
        recommendation:
          'Add a lightweight GET /health (or /healthz) route that returns HTTP 200 with a JSON body like `{ status: "ok" }`. Wire it to Kubernetes liveness and readiness probes.',
      });
    }

    return findings;
  },
};
