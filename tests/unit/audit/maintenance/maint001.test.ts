import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { maint001 } from '../../../../src/audit/maintenance/rules/maint001.ts';

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

describe('MAINT001 — High Cyclomatic Complexity', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(maint001.id).toBe('MAINT001');
    expect(maint001.severity).toBe('medium');
    expect(typeof maint001.check).toBe('function');
  });

  it('detects a function with complexity > 10', () => {
    // 12 branch points → complexity 13
    const content = `
function validate(input: Record<string, unknown>): string {
  if (!input) return 'empty';
  if (typeof input.a !== 'string') return 'bad a';
  if (typeof input.b !== 'number') return 'bad b';
  if (typeof input.c !== 'boolean') return 'bad c';
  if (input.a.length === 0) return 'empty a';
  if (input.b < 0 || input.b > 100) return 'out of range';
  if (input.c && input.a === 'admin') return 'admin';
  if (!input.c && input.b > 50) return 'elevated';
  for (const k of Object.keys(input)) {
    if (k.startsWith('_')) continue;
    if (typeof input[k] === 'undefined') return 'missing';
  }
  return 'ok';
}`;
    const findings = maint001.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('MAINT001');
    expect(findings[0].severity).toBe('medium');
    expect(findings[0].message).toMatch(/cyclomatic complexity/i);
  });

  it('does NOT flag a function with complexity <= 10', () => {
    const content = `
function simple(x: number): string {
  if (x > 0) return 'positive';
  if (x < 0) return 'negative';
  return 'zero';
}`;
    const findings = maint001.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('detects high complexity in sample-ts-app maintenance fixture', () => {
    const findings = maint001.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('MAINT001');
  });

  it('produces zero findings on clean-app', () => {
    const findings = maint001.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });

  it('findings include a recommendation', () => {
    const content = `
function branchy(x: Record<string, unknown>): string {
  if (!x) return 'a';
  if (!x.a) return 'b';
  if (!x.b) return 'c';
  if (!x.c) return 'd';
  if (!x.d) return 'e';
  if (x.a && x.b) return 'f';
  if (x.c || x.d) return 'g';
  if (x.a ?? false) return 'h';
  if (x.b ?? false) return 'i';
  for (const k of Object.keys(x)) {
    if (!k) return 'j';
  }
  return 'z';
}`;
    const findings = maint001.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].recommendation).toBeTruthy();
  });

  it('emits at most one finding per file', () => {
    // Two complex functions in the same file — should produce ≤ 1 finding per file
    const content = `
function a(x: Record<string, unknown>): string {
  if (!x) return 'a';
  if (!x.a) return 'b';
  if (!x.b) return 'c';
  if (!x.c) return 'd';
  if (!x.d) return 'e';
  if (x.a && x.b) return 'f';
  if (x.c || x.d) return 'g';
  if (x.a ?? false) return 'h';
  for (const k of Object.keys(x)) {
    if (!k) return 'i';
    if (k.length > 10) return 'j';
  }
  return 'z';
}
function b(x: Record<string, unknown>): string {
  if (!x) return 'a';
  if (!x.a) return 'b';
  if (!x.b) return 'c';
  if (!x.c) return 'd';
  if (!x.d) return 'e';
  if (x.a && x.b) return 'f';
  if (x.c || x.d) return 'g';
  if (x.a ?? false) return 'h';
  for (const k of Object.keys(x)) {
    if (!k) return 'i';
    if (k.length > 10) return 'j';
  }
  return 'z';
}`;
    const findings = maint001.check(ctxWithContent(content));
    expect(findings).toHaveLength(1);
  });
});
