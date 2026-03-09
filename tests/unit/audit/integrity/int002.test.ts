import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { int002 } from '../../../../src/audit/integrity/rules/int002.ts';

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

describe('INT002 — Missing Transaction Boundary', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(int002.id).toBe('INT002');
    expect(int002.severity).toBe('high');
    expect(typeof int002.check).toBe('function');
  });

  it('detects two writes without a transaction', () => {
    const content = `async function transfer() {\n  db.update(fromId, { balance: -100 });\n  db.update(toId, { balance: 100 });\n}`;
    const findings = int002.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('INT002');
    expect(findings[0].severity).toBe('high');
  });

  it('does NOT flag a function with a single write', () => {
    const content = `async function create() {\n  db.create({ name: 'test' });\n}`;
    const findings = int002.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag two writes inside a transaction', () => {
    const content = `async function transfer() {\n  await sequelize.transaction(async (trx) => {\n    db.update(fromId, { balance: -100 });\n    db.update(toId, { balance: 100 });\n  });\n}`;
    const findings = int002.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('detects missing transaction in sample-ts-app integrity fixture', () => {
    const findings = int002.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('findings include a recommendation', () => {
    const content = `async function fn() {\n  db.create({ a: 1 });\n  db.save({ b: 2 });\n}`;
    const findings = int002.check(ctxWithContent(content));
    expect(findings[0].recommendation).toBeTruthy();
  });

  it('produces zero findings on clean-app', () => {
    const findings = int002.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });
});
