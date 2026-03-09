/**
 * ARCH001 — Circular Dependency Detection
 *
 * Uses the project's import graph (produced in Phase 4) to detect import
 * cycles via a depth-first search (DFS) with back-edge detection.
 *
 * Only intra-project edges (i.e. edges where `to` resolves to an absolute
 * path inside `projectRoot`) are considered. External/npm package imports are
 * skipped.
 *
 * For each cycle, exactly one finding is emitted — at the file that first
 * closes the cycle.
 */

import type { Rule, Finding, AnalysisContext, ImportEdge } from '../../types.js';
import { relative, isAbsolute } from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build an adjacency map: file → set of files it imports (project-local only). */
function buildAdjacency(importGraph: ImportEdge[], projectRoot: string): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();

  for (const edge of importGraph) {
    // Only include intra-project edges using path.relative to avoid prefix collisions
    const rel = relative(projectRoot, edge.to);
    if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) continue;

    if (!adj.has(edge.from)) adj.set(edge.from, new Set());
    adj.get(edge.from)!.add(edge.to);

    // Ensure the target node exists in the map even if it has no outgoing edges
    if (!adj.has(edge.to)) adj.set(edge.to, new Set());
  }

  return adj;
}

/**
 * DFS-based cycle detection.
 * Returns an array of cycles, where each cycle is a list of file paths that
 * form the cycle (in order).
 */
function detectCycles(adj: Map<string, Set<string>>): string[][] {
  const WHITE = 0; // not visited
  const GRAY = 1; // in current DFS stack
  const BLACK = 2; // fully processed

  const color = new Map<string, 0 | 1 | 2>();
  const parent = new Map<string, string | null>();
  const cycles: string[][] = [];
  const reportedCycleKeys = new Set<string>();

  for (const node of adj.keys()) color.set(node, WHITE);

  function dfs(node: string): void {
    color.set(node, GRAY);

    for (const neighbour of adj.get(node) ?? []) {
      if (color.get(neighbour) === GRAY) {
        // Back edge found — reconstruct the cycle
        const cycle: string[] = [neighbour, node];
        let cur: string | null | undefined = parent.get(node);
        while (cur && cur !== neighbour) {
          cycle.push(cur);
          cur = parent.get(cur);
        }
        cycle.reverse();

        // Deduplicate cycles by their sorted key
        const key = [...cycle].sort().join('|');
        if (!reportedCycleKeys.has(key)) {
          reportedCycleKeys.add(key);
          cycles.push(cycle);
        }
      } else if (color.get(neighbour) === WHITE) {
        parent.set(neighbour, node);
        dfs(neighbour);
      }
    }

    color.set(node, BLACK);
  }

  for (const node of adj.keys()) {
    if (color.get(node) === WHITE) {
      parent.set(node, null);
      dfs(node);
    }
  }

  return cycles;
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const arch001: Rule = {
  id: 'ARCH001',
  name: 'Circular Dependency',
  description:
    'Detects import cycles between project modules using DFS back-edge detection on the import graph.',
  severity: 'high',

  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const adj = buildAdjacency(context.importGraph, context.projectRoot);
    const cycles = detectCycles(adj);

    for (const cycle of cycles) {
      const entry = cycle[0];
      findings.push({
        ruleId: 'ARCH001',
        severity: 'high',
        message: `Circular dependency detected: ${cycle.map((f) => relative(context.projectRoot, f)).join(' → ')} → (back to start)`,
        file: entry,
        recommendation:
          'Break the cycle by extracting shared logic into a separate module that neither participant imports from.',
      });
    }

    return findings;
  },
};
