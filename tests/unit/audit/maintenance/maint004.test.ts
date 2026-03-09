import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext, ParsedFile } from '../../../../src/audit/types.ts';
import { maint004 } from '../../../../src/audit/maintenance/rules/maint004.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

function makeFile(path: string, content = 'export const x = 1;'): ParsedFile {
  return {
    sourceFile: { path, language: 'typescript', size: content.length, lastModified: new Date() },
    content,
    loc: content.split('\n').length,
    functionCount: 0,
    classCount: 0,
    exportCount: 1,
    imports: [],
  };
}

function ctxWithFiles(files: ParsedFile[], projectRoot = '/proj'): AnalysisContext {
  return {
    projectRoot,
    files,
    totalLoc: 0,
    languageDistribution: { typescript: files.length },
    importGraph: [],
  };
}

describe('MAINT004 — Missing Test Coverage', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(maint004.id).toBe('MAINT004');
    expect(maint004.severity).toBe('low');
    expect(typeof maint004.check).toBe('function');
  });

  it('flags source files without a corresponding test file', () => {
    const ctx = ctxWithFiles([
      makeFile('/proj/src/user.ts'),
      makeFile('/proj/src/user.test.ts'),
      makeFile('/proj/src/product.ts'), // no product.test.ts
    ]);
    const findings = maint004.check(ctx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('MAINT004');
    expect(findings[0].file).toContain('product.ts');
  });

  it('does NOT flag source files that have a corresponding test file', () => {
    const ctx = ctxWithFiles([makeFile('/proj/src/user.ts'), makeFile('/proj/src/user.test.ts')]);
    const findings = maint004.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('returns no findings when there are no test files (rule is inactive)', () => {
    // No test files → rule is silently skipped
    const ctx = ctxWithFiles([makeFile('/proj/src/service.ts'), makeFile('/proj/src/utils.ts')]);
    const findings = maint004.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('recognises spec files as test files', () => {
    const ctx = ctxWithFiles([makeFile('/proj/src/auth.ts'), makeFile('/proj/src/auth.spec.ts')]);
    const findings = maint004.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('detects missing coverage in sample-ts-app (has partial test coverage)', () => {
    const findings = maint004.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('MAINT004');
  });

  it('produces zero findings on clean-app (no test files → rule inactive)', () => {
    const findings = maint004.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });

  it('does not flag files inside a tests directory', () => {
    const ctx = ctxWithFiles([
      makeFile('/proj/src/config.ts'),
      makeFile('/proj/tests/config.test.ts'),
    ]);
    const findings = maint004.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('does not flag source files covered by directory-based test files (no .test./.spec. suffix)', () => {
    // tests/user.ts is detected as a test file via directory segment, not filename suffix.
    // Its basename "user" must still be added to coveredBases so src/user.ts is not flagged.
    const ctx = ctxWithFiles([makeFile('/proj/src/user.ts'), makeFile('/proj/tests/user.ts')]);
    const findings = maint004.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('correctly identifies covered and uncovered files with mixed test conventions', () => {
    const ctx = ctxWithFiles([
      makeFile('/proj/src/user.ts'),
      makeFile('/proj/src/auth.ts'),
      makeFile('/proj/src/product.ts'), // no test
      makeFile('/proj/tests/user.ts'), // directory-based test for user
      makeFile('/proj/src/auth.spec.ts'), // spec-based test for auth
    ]);
    const findings = maint004.check(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0].file).toContain('product.ts');
  });

  it('findings include a recommendation', () => {
    const ctx = ctxWithFiles([
      makeFile('/proj/src/foo.ts'),
      makeFile('/proj/src/foo.test.ts'),
      makeFile('/proj/src/bar.ts'),
    ]);
    const findings = maint004.check(ctx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].recommendation).toContain('bar.test.ts');
  });
});
