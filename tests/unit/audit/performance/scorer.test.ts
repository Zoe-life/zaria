import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { scorePerformance, PERFORMANCE_RULES } from '../../../../src/audit/performance/scorer.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

describe('scorePerformance', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('returns dimension "performance"', () => {
    const result = scorePerformance(cleanCtx);
    expect(result.dimension).toBe('performance');
  });

  it('returns score 100 on clean-app (no findings)', () => {
    const result = scorePerformance(cleanCtx);
    expect(result.score).toBe(100);
    expect(result.findings).toHaveLength(0);
  });

  it('returns a score below 100 on sample-ts-app (has seeded issues)', () => {
    const result = scorePerformance(sampleCtx);
    expect(result.score).toBeLessThan(100);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('score is clamped to [0, 100]', () => {
    const result = scorePerformance(sampleCtx);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('respects skipRules — skips specified rule IDs', () => {
    const allRuleIds = new Set(PERFORMANCE_RULES.map((r) => r.id));
    const resultWithSkip = scorePerformance(sampleCtx, allRuleIds);
    expect(resultWithSkip.findings).toHaveLength(0);
    expect(resultWithSkip.score).toBe(100);
  });

  it('PERFORMANCE_RULES contains 4 rules', () => {
    expect(PERFORMANCE_RULES).toHaveLength(4);
  });

  it('all rules have unique IDs', () => {
    const ids = PERFORMANCE_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
