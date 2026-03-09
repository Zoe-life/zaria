import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { scale003 } from '../../../../src/audit/scalability/rules/scale003.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

function ctxWithFile(path: string, content: string): AnalysisContext {
  return {
    projectRoot: '/proj',
    files: [
      {
        sourceFile: {
          path,
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

describe('SCALE003 — Stateful Singleton Pattern', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(scale003.id).toBe('SCALE003');
    expect(scale003.severity).toBe('medium');
    expect(typeof scale003.check).toBe('function');
  });

  it('detects module-level let variable', () => {
    const findings = scale003.check(
      ctxWithFile(
        '/proj/src/counter.ts',
        'let count = 0;\nexport function increment() { count++; }',
      ),
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('SCALE003');
  });

  it('detects exported mutable const object', () => {
    const findings = scale003.check(
      ctxWithFile('/proj/src/state.ts', 'export const state = { requests: 0 };'),
    );
    expect(findings.length).toBeGreaterThan(0);
  });

  it('does NOT flag const with primitive value', () => {
    const findings = scale003.check(ctxWithFile('/proj/src/const.ts', 'const MAX_RETRIES = 3;'));
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag config files (exempt by path)', () => {
    const findings = scale003.check(
      ctxWithFile('/proj/src/config.ts', 'let env = process.env.NODE_ENV;'),
    );
    expect(findings).toHaveLength(0);
  });

  it('detects stateful singleton in sample-ts-app scalability fixture', () => {
    const findings = scale003.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('produces zero findings on clean-app', () => {
    const findings = scale003.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });
});
