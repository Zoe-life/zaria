import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { eff001 } from '../../../../src/audit/efficiency/rules/eff001.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

function ctxWithContent(content: string): AnalysisContext {
  return {
    projectRoot: '/proj',
    files: [
      {
        sourceFile: {
          path: '/proj/src/service.ts',
          language: 'typescript',
          size: content.length,
          lastModified: new Date(),
        },
        content,
        loc: content.split('\n').length,
        functionCount: 0,
        classCount: 0,
        exportCount: 0,
        imports: [],
      },
    ],
    totalLoc: content.split('\n').length,
    languageDistribution: { typescript: 1 },
    importGraph: [],
  };
}

describe('EFF001 — Quadratic Iteration Pattern', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(eff001.id).toBe('EFF001');
    expect(eff001.severity).toBe('high');
    expect(typeof eff001.check).toBe('function');
    expect(eff001.name).toBe('Quadratic Iteration Pattern');
  });

  it('detects nested for-of loops', () => {
    const content = `
function findCommon(xs: number[], ys: number[]): number[] {
  const result: number[] = [];
  for (const x of xs) {
    for (const y of ys) {
      if (x === y) result.push(x);
    }
  }
  return result;
}`;
    const findings = eff001.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('EFF001');
    expect(findings[0].severity).toBe('high');
  });

  it('detects nested forEach callbacks', () => {
    const content = `
function buildPairs(left: string[], right: string[]): string[] {
  const out: string[] = [];
  left.forEach((a) => {
    right.forEach((b) => {
      out.push(a + b);
    });
  });
  return out;
}`;
    const findings = eff001.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('EFF001');
  });

  it('findings include the outer-loop line number reference', () => {
    const content = `
function example(xs: number[], ys: number[]): void {
  for (const x of xs) {
    for (const y of ys) {
      console.log(x, y);
    }
  }
}`;
    const findings = eff001.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].line).toBeGreaterThan(0);
    expect(findings[0].message).toMatch(/quadratic iteration/i);
  });

  it('findings include a recommendation', () => {
    const content = `
function fn(xs: number[], ys: number[]): void {
  for (const x of xs) {
    for (const y of ys) {
      console.log(x + y);
    }
  }
}`;
    const findings = eff001.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].recommendation).toBeTruthy();
    expect(findings[0].recommendation).toMatch(/Map|Set/i);
  });

  it('does NOT flag a flat loop with no inner loop', () => {
    const content = `
function sum(xs: number[]): number {
  let total = 0;
  for (const x of xs) {
    total += x;
  }
  return total;
}`;
    const findings = eff001.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag a Map-based lookup inside a loop', () => {
    const content = `
function lookupAll(ids: string[], map: Map<string, number>): number[] {
  const result: number[] = [];
  for (const id of ids) {
    const val = map.get(id);
    if (val !== undefined) result.push(val);
  }
  return result;
}`;
    const findings = eff001.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('detects quadratic pattern in sample-ts-app efficiency fixture', () => {
    const findings = eff001.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('EFF001');
  });

  it('produces zero findings on clean-app', () => {
    const findings = eff001.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });

  it('findings include file path', () => {
    const findings = eff001.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].file).toBeTruthy();
  });
});
