import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { int001 } from '../../../../src/audit/integrity/rules/int001.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

function ctxWithContent(content: string): AnalysisContext {
  return {
    projectRoot: '/proj',
    files: [
      {
        sourceFile: {
          path: '/proj/src/routes.ts',
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

describe('INT001 — Missing Input Validation', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(int001.id).toBe('INT001');
    expect(int001.severity).toBe('high');
    expect(typeof int001.check).toBe('function');
  });

  it('detects missing validation when route reads req.body without any schema', () => {
    const content = `app.post('/users', (req, res) => {\n  const { name } = req.body;\n  res.json({ name });\n});`;
    const findings = int001.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('INT001');
    expect(findings[0].severity).toBe('high');
  });

  it('does NOT flag route when zod .parse() is present', () => {
    const content = `app.post('/users', (req, res) => {\n  const body = schema.parse(req.body);\n  res.json(body);\n});`;
    const findings = int001.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag route when express-validator validate() is present', () => {
    const content = `app.post('/users', validate(schema), (req, res) => {\n  const { name } = req.body;\n  res.json({ name });\n});`;
    const findings = int001.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag files with no route registrations', () => {
    const content = `function helper() { return req.body; }`;
    const findings = int001.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('detects missing validation in sample-ts-app integrity fixture', () => {
    const findings = int001.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('findings include a recommendation', () => {
    const content = `app.post('/x', (req, res) => { const d = req.body; res.json(d); });`;
    const findings = int001.check(ctxWithContent(content));
    expect(findings[0].recommendation).toBeTruthy();
  });

  it('produces zero findings on clean-app', () => {
    const findings = int001.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });
});
