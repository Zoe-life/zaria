import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import { perf002 } from '../../../../src/audit/performance/rules/perf002.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

function buildContext(dir: string): import('../../../../src/audit/types.ts').AnalysisContext {
  return buildAnalysisContext(dir, parseFiles(traverseFiles(dir)));
}

describe('PERF002 — Synchronous Blocking in Async Context', () => {
  it('has correct metadata', () => {
    expect(perf002.id).toBe('PERF002');
    expect(perf002.severity).toBe('high');
    expect(typeof perf002.check).toBe('function');
  });

  it('detects readFileSync inside async function in sample-ts-app', () => {
    const ctx = buildContext(SAMPLE_TS_APP);
    const findings = perf002.check(ctx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((f) => f.message.includes('readFileSync'))).toBe(true);
  });

  it('findings include file path and line number', () => {
    const ctx = buildContext(SAMPLE_TS_APP);
    const findings = perf002.check(ctx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].file).toBeTruthy();
    expect(findings[0].line).toBeGreaterThan(0);
  });

  it('findings include a recommendation mentioning the async alternative', () => {
    const ctx = buildContext(SAMPLE_TS_APP);
    const findings = perf002.check(ctx);
    expect(findings[0].recommendation).toMatch(/async|await|readFile/i);
  });

  it('produces zero findings on clean-app (uses fs/promises)', () => {
    const ctx = buildContext(CLEAN_APP);
    const findings = perf002.check(ctx);
    expect(findings).toHaveLength(0);
  });
});
