import { describe, it, expect } from 'vitest';
import { aggregateScores, gradeFromScore } from '../../../src/scorer/aggregate.ts';
import type { DimensionResult } from '../../../src/audit/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal DimensionResult for use in tests. */
function dim(dimension: string, score: number): DimensionResult {
  return { dimension, score, findings: [] };
}

/** Full set of six standard dimensions, all scoring 100. */
const PERFECT_FIVE: DimensionResult[] = [
  dim('performance', 100),
  dim('architecture', 100),
  dim('scalability', 100),
  dim('integrity', 100),
  dim('maintenance', 100),
  dim('efficiency', 100),
];

/** Full set of six standard dimensions, all scoring 0. */
const ZERO_FIVE: DimensionResult[] = [
  dim('performance', 0),
  dim('architecture', 0),
  dim('scalability', 0),
  dim('integrity', 0),
  dim('maintenance', 0),
  dim('efficiency', 0),
];

// ---------------------------------------------------------------------------
// gradeFromScore
// ---------------------------------------------------------------------------

describe('gradeFromScore', () => {
  it('returns A for score 100', () => expect(gradeFromScore(100)).toBe('A'));
  it('returns A for score 90', () => expect(gradeFromScore(90)).toBe('A'));
  it('returns B for score 89', () => expect(gradeFromScore(89)).toBe('B'));
  it('returns B for score 80', () => expect(gradeFromScore(80)).toBe('B'));
  it('returns C for score 79', () => expect(gradeFromScore(79)).toBe('C'));
  it('returns C for score 70', () => expect(gradeFromScore(70)).toBe('C'));
  it('returns D for score 69', () => expect(gradeFromScore(69)).toBe('D'));
  it('returns D for score 60', () => expect(gradeFromScore(60)).toBe('D'));
  it('returns F for score 59', () => expect(gradeFromScore(59)).toBe('F'));
  it('returns F for score 0', () => expect(gradeFromScore(0)).toBe('F'));
});

// ---------------------------------------------------------------------------
// aggregateScores — weighted computation
// ---------------------------------------------------------------------------

describe('aggregateScores', () => {
  it('returns weighted 100 and grade A when all dimensions score 100', () => {
    const result = aggregateScores(PERFECT_FIVE);
    expect(result.weighted).toBe(100);
    expect(result.grade).toBe('A');
  });

  it('returns weighted 0 and grade F when all dimensions score 0', () => {
    const result = aggregateScores(ZERO_FIVE);
    expect(result.weighted).toBe(0);
    expect(result.grade).toBe('F');
  });

  it('computes correct weighted average for mixed scores', () => {
    // performance(22%) = 80, arch(22%) = 60, scale(18%) = 70,
    // integrity(18%) = 90, maint(10%) = 50, efficiency(10%) = 40
    // weightedSum = 0.22*80 + 0.22*60 + 0.18*70 + 0.18*90 + 0.10*50 + 0.10*40
    //            = 17.6 + 13.2 + 12.6 + 16.2 + 5 + 4 = 68.6
    // weighted   = 68.6 / 1.00 = 68.6
    const dims = [
      dim('performance', 80),
      dim('architecture', 60),
      dim('scalability', 70),
      dim('integrity', 90),
      dim('maintenance', 50),
      dim('efficiency', 40),
    ];
    const result = aggregateScores(dims);
    expect(result.weighted).toBe(68.6);
    expect(result.grade).toBe('D');
  });

  it('weighted score is clamped to [0, 100]', () => {
    const result = aggregateScores(PERFECT_FIVE);
    expect(result.weighted).toBeGreaterThanOrEqual(0);
    expect(result.weighted).toBeLessThanOrEqual(100);

    const resultZero = aggregateScores(ZERO_FIVE);
    expect(resultZero.weighted).toBeGreaterThanOrEqual(0);
  });

  it('grade reflects weighted score', () => {
    const dims = [
      dim('performance', 90),
      dim('architecture', 90),
      dim('scalability', 90),
      dim('integrity', 90),
      dim('maintenance', 90),
      dim('efficiency', 90),
    ];
    const result = aggregateScores(dims);
    expect(result.grade).toBe('A');
  });

  it('returns breakdown with one entry per dimension', () => {
    const result = aggregateScores(PERFECT_FIVE);
    expect(result.breakdown).toHaveLength(6);
  });

  it('breakdown entries contain dimension name, score, and weight', () => {
    const result = aggregateScores(PERFECT_FIVE);
    const perfEntry = result.breakdown.find((b) => b.dimension === 'performance');
    expect(perfEntry).toBeDefined();
    expect(perfEntry!.score).toBe(100);
    expect(perfEntry!.weight).toBe(0.22);
  });

  it('handles a single dimension gracefully', () => {
    const result = aggregateScores([dim('performance', 75)]);
    expect(result.weighted).toBe(75);
    expect(result.grade).toBe('C');
  });

  it('handles empty array returning weighted 0', () => {
    const result = aggregateScores([]);
    expect(result.weighted).toBe(0);
    expect(result.grade).toBe('F');
  });

  it('applies 22% weight to performance dimension', () => {
    // Only performance dim, score 100 → 100% of that
    const result = aggregateScores([dim('performance', 100)]);
    expect(result.breakdown[0].weight).toBe(0.22);
  });

  it('applies 10% weight to maintenance dimension', () => {
    const result = aggregateScores([dim('maintenance', 100)]);
    expect(result.breakdown[0].weight).toBe(0.1);
  });

  it('applies 10% weight to efficiency dimension', () => {
    const result = aggregateScores([dim('efficiency', 100)]);
    expect(result.breakdown[0].weight).toBe(0.1);
  });

  it('grade is B for score in 80–89 range', () => {
    const dims = [
      dim('performance', 85),
      dim('architecture', 85),
      dim('scalability', 85),
      dim('integrity', 85),
      dim('maintenance', 85),
      dim('efficiency', 85),
    ];
    const result = aggregateScores(dims);
    expect(result.grade).toBe('B');
  });
});
