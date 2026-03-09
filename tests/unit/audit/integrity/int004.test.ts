import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { int004 } from '../../../../src/audit/integrity/rules/int004.ts';

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

describe('INT004 — Non-Idempotent Write Endpoint', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(int004.id).toBe('INT004');
    expect(int004.severity).toBe('medium');
    expect(typeof int004.check).toBe('function');
  });

  it('flags a POST handler that creates without existence check', () => {
    const content = `app.post('/items', (req, res) => {\n  const item = db.create(req.body);\n  res.status(201).json(item);\n});`;
    const findings = int004.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('INT004');
    expect(findings[0].severity).toBe('medium');
  });

  it('does NOT flag POST handler that uses findOrCreate', () => {
    const content = `app.post('/items', async (req, res) => {\n  const [item] = await db.findOrCreate({ where: req.body });\n  res.json(item);\n});`;
    const findings = int004.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag POST handler that checks findOne before create', () => {
    const content = `app.post('/items', async (req, res) => {\n  const existing = await db.findOne({ where: { name: req.body.name } });\n  if (existing) return res.status(409).json({ error: 'exists' });\n  const item = await db.create(req.body);\n  res.status(201).json(item);\n});`;
    const findings = int004.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag POST handler with no write call', () => {
    const content = `app.post('/search', (req, res) => {\n  const results = db.findAll({ where: req.body });\n  res.json(results);\n});`;
    const findings = int004.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('detects non-idempotent POST in sample-ts-app integrity fixture', () => {
    const findings = int004.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('findings include a recommendation', () => {
    const content = `app.post('/items', (req, res) => { db.create(req.body); res.json({}); });`;
    const findings = int004.check(ctxWithContent(content));
    expect(findings[0].recommendation).toBeTruthy();
  });

  it('produces zero findings on clean-app', () => {
    const findings = int004.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });
});
