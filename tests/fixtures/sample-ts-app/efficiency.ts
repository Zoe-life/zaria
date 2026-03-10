/**
 * Efficiency fixture — Phase 13.
 * Intentionally contains seeded issues that EFF001–EFF003 should detect.
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

// ---------------------------------------------------------------------------
// EFF003 — ReDoS-Susceptible Pattern (dangerous regex literals)
// ---------------------------------------------------------------------------

const NESTED_QUANT_PATTERN = /(a+)+b/;

const ALTERNATION_QUANT_PATTERN = /(\w|\d)+end/;

export function matchNested(input: string): boolean {
  return NESTED_QUANT_PATTERN.test(input);
}

export function matchAlternation(input: string): boolean {
  return ALTERNATION_QUANT_PATTERN.test(input);
}
