/**
 * Scoring & Aggregation — Phase 10.
 *
 * Accepts up to five `DimensionResult` objects, applies configured weights,
 * and produces a single weighted overall score (0–100) with a letter grade.
 *
 * Weights (must sum to 1.0):
 *   Performance  25 %  — runtime speed and resource usage
 *   Architecture 25 %  — structural quality and modularity
 *   Scalability  20 %  — observability and horizontal growth readiness
 *   Integrity    20 %  — data safety and race-condition prevention
 *   Maintenance  10 %  — long-term sustainability and technical debt
 *
 * Grade thresholds:
 *   A  90–100   B  80–89   C  70–79   D  60–69   F  0–59
 *
 * Time  O(n)  where n = number of dimension results (at most 5).
 * Space O(n)  for the breakdown array.
 */

import type { DimensionResult, Grade, OverallScore } from '../audit/types.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Ordered list of (dimension name → weight) pairs. Weights sum to 1. */
const DIMENSION_WEIGHTS: ReadonlyMap<string, number> = new Map([
  ['performance', 0.25],
  ['architecture', 0.25],
  ['scalability', 0.2],
  ['integrity', 0.2],
  ['maintenance', 0.1],
]);

/** Grade boundaries (descending). */
const GRADE_BOUNDARIES: ReadonlyArray<readonly [number, Grade]> = [
  [90, 'A'],
  [80, 'B'],
  [70, 'C'],
  [60, 'D'],
] as const;

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Convert a numeric score (0–100) to a letter grade.
 *
 * @param score  Numeric score, already clamped to [0, 100].
 * @returns      Letter grade A–F.
 */
export function gradeFromScore(score: number): Grade {
  for (const [threshold, grade] of GRADE_BOUNDARIES) {
    if (score >= threshold) return grade;
  }
  return 'F';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a weighted overall score from one or more dimension results.
 *
 * Dimensions whose `dimension` name is not in `DIMENSION_WEIGHTS` receive
 * an equal share of the remaining unaccounted weight so the function is
 * forward-compatible with new dimensions added in future phases.
 *
 * @param dimensions  Array of `DimensionResult` objects to aggregate.
 * @returns           `OverallScore` with `weighted`, `grade`, and `breakdown`.
 */
export function aggregateScores(dimensions: readonly DimensionResult[]): OverallScore {
  let weightedSum = 0;
  let totalWeight = 0;

  const breakdown = dimensions.map((dim) => {
    const weight = DIMENSION_WEIGHTS.get(dim.dimension) ?? 0;
    weightedSum += dim.score * weight;
    totalWeight += weight;
    return { dimension: dim.dimension, score: dim.score, weight };
  });

  // If dimensions with known weights are present but don't cover 100 %,
  // normalise by the actual total weight to avoid deflated scores.
  const weighted =
    totalWeight > 0
      ? Math.max(0, Math.min(100, Math.round((weightedSum / totalWeight) * 100) / 100))
      : 0;

  return { weighted, grade: gradeFromScore(weighted), breakdown };
}
