import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { scoreEfficiency, EFFICIENCY_RULES } from '../../../../src/audit/efficiency/scorer.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

describe('scoreEfficiency', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('returns dimension "efficiency"', () => {
    const result = scoreEfficiency(cleanCtx);
    expect(result.dimension).toBe('efficiency');
  });

  it('returns score 100 on clean-app (no findings)', () => {
    const result = scoreEfficiency(cleanCtx);
    expect(result.score).toBe(100);
    expect(result.findings).toHaveLength(0);
  });

  it('returns a score below 100 on sample-ts-app (has seeded issues)', () => {
    const result = scoreEfficiency(sampleCtx);
    expect(result.score).toBeLessThan(100);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('score is clamped to [0, 100]', () => {
    const result = scoreEfficiency(sampleCtx);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('respects skipRules — skips all rules when all IDs are provided', () => {
    const allRuleIds = new Set(EFFICIENCY_RULES.map((r) => r.id));
    const result = scoreEfficiency(sampleCtx, allRuleIds);
    expect(result.findings).toHaveLength(0);
    expect(result.score).toBe(100);
  });

  it('EFFICIENCY_RULES contains 3 rules', () => {
    expect(EFFICIENCY_RULES).toHaveLength(3);
  });

  it('all rules have unique IDs', () => {
    const ids = EFFICIENCY_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all rule IDs start with EFF', () => {
    for (const rule of EFFICIENCY_RULES) {
      expect(rule.id).toMatch(/^EFF\d{3}$/);
    }
  });
});
