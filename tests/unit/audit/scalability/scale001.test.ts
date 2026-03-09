import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { scale001 } from '../../../../src/audit/scalability/rules/scale001.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

describe('SCALE001 — Missing Structured Logging', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(scale001.id).toBe('SCALE001');
    expect(scale001.severity).toBe('medium');
    expect(typeof scale001.check).toBe('function');
  });

  it('detects console.log usage in sample-ts-app scalability fixture', () => {
    const findings = scale001.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('SCALE001');
    expect(findings[0].severity).toBe('medium');
  });

  it('findings include file path', () => {
    const findings = scale001.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].file).toBeTruthy();
  });

  it('findings include a recommendation', () => {
    const findings = scale001.check(sampleCtx);
    expect(findings[0].recommendation).toBeTruthy();
  });

  it('does NOT flag files in logger module paths', () => {
    const fakeCtx: AnalysisContext = {
      projectRoot: '/proj',
      files: [
        {
          sourceFile: {
            path: '/proj/src/logger.ts',
            language: 'typescript',
            size: 100,
            lastModified: new Date(),
          },
          content: 'console.log("debug");',
          loc: 1,
          functionCount: 0,
          classCount: 0,
          exportCount: 0,
          imports: [],
        },
      ],
      totalLoc: 1,
      languageDistribution: { typescript: 1 },
      importGraph: [],
    };
    const findings = scale001.check(fakeCtx);
    expect(findings).toHaveLength(0);
  });

  it('produces zero findings on clean-app (no console.log)', () => {
    const findings = scale001.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });
});
