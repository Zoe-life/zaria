import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { int003 } from '../../../../src/audit/integrity/rules/int003.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

function ctxWithContent(content: string): AnalysisContext {
  return {
    projectRoot: '/proj',
    files: [
      {
        sourceFile: {
          path: '/proj/src/files.ts',
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

describe('INT003 — TOCTOU Vulnerability Pattern', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(int003.id).toBe('INT003');
    expect(int003.severity).toBe('high');
    expect(typeof int003.check).toBe('function');
  });

  it('detects existsSync → writeFileSync TOCTOU pattern', () => {
    const content = `function save(path, data) {\n  if (!existsSync(path)) {\n    writeFileSync(path, data);\n  }\n}`;
    const findings = int003.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('INT003');
    expect(findings[0].severity).toBe('high');
  });

  it('detects findOne → create TOCTOU pattern', () => {
    const content = `async function register(username) {\n  const existing = db.findOne({ username });\n  if (!existing) {\n    db.create({ username });\n  }\n}`;
    const findings = int003.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
  });

  it('does NOT flag when atomic flag { flag: "wx" } is used', () => {
    const content = `function save(path, data) {\n  writeFile(path, data, { flag: 'wx' }, cb);\n}`;
    const findings = int003.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag when findOrCreate is used (atomic)', () => {
    const content = `async function register(username) {\n  const [user] = await db.findOrCreate({ where: { username } });\n  return user;\n}`;
    const findings = int003.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('detects TOCTOU pattern in sample-ts-app integrity fixture', () => {
    const findings = int003.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('findings include a recommendation', () => {
    const content = `function fn(p) {\n  if (!existsSync(p)) {\n    writeFileSync(p, 'x');\n  }\n}`;
    const findings = int003.check(ctxWithContent(content));
    expect(findings[0].recommendation).toBeTruthy();
  });

  it('produces zero findings on clean-app', () => {
    const findings = int003.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });
});
