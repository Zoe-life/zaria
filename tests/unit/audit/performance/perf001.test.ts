import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import { perf001 } from '../../../../src/audit/performance/rules/perf001.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

function buildContext(dir: string): import('../../../../src/audit/types.ts').AnalysisContext {
  return buildAnalysisContext(dir, parseFiles(traverseFiles(dir)));
}

describe('PERF001 — N+1 Query Pattern', () => {
  it('has correct metadata', () => {
    expect(perf001.id).toBe('PERF001');
    expect(perf001.severity).toBe('high');
    expect(typeof perf001.check).toBe('function');
  });

  it('detects N+1 pattern in sample-ts-app', () => {
    const ctx = buildContext(SAMPLE_TS_APP);
    const findings = perf001.check(ctx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('PERF001');
    expect(findings[0].severity).toBe('high');
  });

  it('findings include file path and line number', () => {
    const ctx = buildContext(SAMPLE_TS_APP);
    const findings = perf001.check(ctx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].file).toBeTruthy();
    expect(findings[0].line).toBeGreaterThan(0);
  });

  it('findings include a recommendation', () => {
    const ctx = buildContext(SAMPLE_TS_APP);
    const findings = perf001.check(ctx);
    expect(findings[0].recommendation).toBeTruthy();
  });

  it('produces zero findings on clean-app', () => {
    const ctx = buildContext(CLEAN_APP);
    const findings = perf001.check(ctx);
    expect(findings).toHaveLength(0);
  });
});
