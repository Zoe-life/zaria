import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { scale002 } from '../../../../src/audit/scalability/rules/scale002.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

/** Build a minimal AnalysisContext containing a single in-memory file. */
function ctxWithContent(content: string): AnalysisContext {
  return {
    projectRoot: '/proj',
    files: [
      {
        sourceFile: {
          path: '/proj/src/repo.ts',
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

describe('SCALE002 — Unbounded Query', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(scale002.id).toBe('SCALE002');
    expect(scale002.severity).toBe('high');
    expect(typeof scale002.check).toBe('function');
  });

  it('detects unbounded findAll() with no limit', () => {
    const findings = scale002.check(ctxWithContent('db.findAll()'));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('SCALE002');
  });

  it('detects unbounded findMany() with no limit', () => {
    const findings = scale002.check(
      ctxWithContent('await repo.findMany({ where: { active: true } })'),
    );
    expect(findings.length).toBeGreaterThan(0);
  });
  it('does NOT flag findAll() with inline limit option', () => {
    const findings = scale002.check(
      ctxWithContent('db.findAll({ limit: 100, where: { active: true } })'),
    );
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag findMany() with chained .take()', () => {
    const findings = scale002.check(ctxWithContent('db.findMany({ where: {} }).take(50)'));
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag findMany() with chained .limit()', () => {
    const findings = scale002.check(ctxWithContent('db.findMany({}).limit(20)'));
    expect(findings).toHaveLength(0);
  });

  it('detects unbounded query in sample-ts-app', () => {
    const findings = scale002.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe('high');
  });

  it('findings include line number', () => {
    const findings = scale002.check(ctxWithContent('const users = db.findAll();'));
    expect(findings[0].line).toBe(1);
  });

  it('produces zero findings on clean-app', () => {
    const findings = scale002.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });
});
