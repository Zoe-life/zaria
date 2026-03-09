/**
 * ARCH003 — Missing Abstraction Layer
 *
 * Detects presentation-layer files (route handlers) that import ORM/database
 * models directly, bypassing the service/repository abstraction layer.
 *
 * Heuristic:
 *  - A file is considered a "route file" if its path contains any of the
 *    route path segments: `route`, `router`, `controller`, `handler`, `api`.
 *  - A file is considered a "model import" if it imports from a path that
 *    contains any of: `model`, `entity`, `schema`, `repository`, `dao`.
 *
 * Both checks are case-insensitive and operate on file paths.
 */

import type { Rule, Finding, AnalysisContext } from '../../types.js';
import { relative } from 'path';

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/** Path segments that identify presentation-layer (route) files. */
const ROUTE_PATH_SEGMENTS = ['route', 'router', 'controller', 'handler', '/api/'];

/** Path segments that identify data-layer (model/ORM) files. */
const MODEL_PATH_SEGMENTS = ['model', 'entity', 'schema', 'repository', 'dao', 'orm'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRouteFile(filePath: string): boolean {
  // Normalize to forward slashes for cross-platform compatibility
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  return ROUTE_PATH_SEGMENTS.some((seg) => normalized.includes(seg));
}

function isModelImport(importTo: string): boolean {
  const lower = importTo.toLowerCase();
  return MODEL_PATH_SEGMENTS.some((seg) => lower.includes(seg));
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const arch003: Rule = {
  id: 'ARCH003',
  name: 'Missing Abstraction Layer',
  description:
    'Detects route/controller files that import ORM models directly, bypassing the service or repository layer.',
  severity: 'medium',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const parsedFile of context.files) {
      if (!isRouteFile(parsedFile.sourceFile.path)) continue;

      const modelImports = parsedFile.imports.filter((edge) => isModelImport(edge.to));
      if (modelImports.length === 0) continue;

      findings.push({
        ruleId: 'ARCH003',
        severity: 'medium',
        message: `Route/controller file imports data-layer module(s) directly: ${modelImports.map((e) => relative(context.projectRoot, e.to)).join(', ')}`,
        file: parsedFile.sourceFile.path,
        recommendation:
          'Introduce a service or repository layer between route handlers and data models. Route handlers should call service functions, not ORM methods directly.',
      });
    }

    return findings;
  },
};
