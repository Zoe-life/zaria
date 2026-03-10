/**
 * Efficiency fixture — Phase 13.
 * Intentionally contains seeded issues that EFF001–EFF002 should detect.
 * EFF003 (ReDoS) is tested via inline content in tests/unit/audit/efficiency/eff003.test.ts
 * to avoid embedding genuinely dangerous regex literals in the codebase.
 */

// ---------------------------------------------------------------------------
// EFF001 — Quadratic Iteration Pattern (nested loops)
// ---------------------------------------------------------------------------

export function findCommonElements(xs: number[], ys: number[]): number[] {
  const result: number[] = [];
  for (const x of xs) {
    for (const y of ys) {
      if (x === y) result.push(x);
    }
  }
  return result;
}

export function buildPairs(left: string[], right: string[]): string[] {
  const out: string[] = [];
  left.forEach((a) => {
    right.forEach((b) => {
      out.push(`${a}:${b}`);
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// EFF002 — Linear Search in Loop (Array.includes inside a loop)
// ---------------------------------------------------------------------------

export function filterActive(items: string[], activeItems: string[]): string[] {
  const result: string[] = [];
  for (const item of items) {
    if (activeItems.includes(item)) {
      result.push(item);
    }
  }
  return result;
}

export function findPositions(haystack: number[], needles: number[]): number[] {
  const positions: number[] = [];
  for (const needle of needles) {
    const pos = haystack.indexOf(needle);
    if (pos !== -1) positions.push(pos);
  }
  return positions;
}
