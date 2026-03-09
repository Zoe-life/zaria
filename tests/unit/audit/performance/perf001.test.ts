import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { perf001 } from '../../../../src/audit/performance/rules/perf001.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

describe('PERF001 — N+1 Query Pattern', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(perf001.id).toBe('PERF001');
    expect(perf001.severity).toBe('high');
    expect(typeof perf001.check).toBe('function');
  });

  it('detects N+1 pattern in sample-ts-app', () => {
    const findings = perf001.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('PERF001');
    expect(findings[0].severity).toBe('high');
  });

  it('findings include file path and line number', () => {
    const findings = perf001.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].file).toBeTruthy();
    expect(findings[0].line).toBeGreaterThan(0);
  });

  it('findings include a recommendation', () => {
    const findings = perf001.check(sampleCtx);
    expect(findings[0].recommendation).toBeTruthy();
  });

  it('produces zero findings on clean-app', () => {
    const findings = perf001.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });
});
