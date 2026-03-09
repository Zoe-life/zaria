import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext, ParsedFile, SourceFile } from '../../../../src/audit/types.ts';
import { arch002 } from '../../../../src/audit/architecture/rules/arch002.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

function buildContext(dir: string): import('../../../../src/audit/types.ts').AnalysisContext {
  return buildAnalysisContext(dir, parseFiles(traverseFiles(dir)));
}

function makeFile(loc: number, exportCount: number): ParsedFile {
  const sf: SourceFile = {
    path: `/proj/file-${loc}-${exportCount}.ts`,
    language: 'typescript',
    size: loc * 40,
    lastModified: new Date(),
  };
  return {
    sourceFile: sf,
    content: '',
    loc,
    functionCount: 0,
    classCount: 0,
    exportCount,
    imports: [],
  };
}

function syntheticContext(files: ParsedFile[]): AnalysisContext {
  return { projectRoot: '/proj', files, totalLoc: 0, languageDistribution: {}, importGraph: [] };
}

describe('ARCH002 — God Module Detection', () => {
  it('has correct metadata', () => {
    expect(arch002.id).toBe('ARCH002');
    expect(arch002.severity).toBe('medium');
    expect(typeof arch002.check).toBe('function');
  });

  it('detects god-module.ts in sample-ts-app (>500 LOC, >20 exports)', () => {
    const ctx = buildContext(SAMPLE_TS_APP);
    const findings = arch002.check(ctx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((f) => f.file.endsWith('god-module.ts'))).toBe(true);
  });

  it('findings include ruleId ARCH002', () => {
    const ctx = buildContext(SAMPLE_TS_APP);
    const findings = arch002.check(ctx);
    expect(findings.every((f) => f.ruleId === 'ARCH002')).toBe(true);
  });

  it('flags a synthetic file with >500 LOC and >20 exports', () => {
    const ctx = syntheticContext([makeFile(501, 21)]);
    const findings = arch002.check(ctx);
    expect(findings).toHaveLength(1);
  });

  it('does NOT flag a file with 501 LOC but only 5 exports', () => {
    const ctx = syntheticContext([makeFile(501, 5)]);
    const findings = arch002.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag a file with 21 exports but only 100 LOC', () => {
    const ctx = syntheticContext([makeFile(100, 21)]);
    const findings = arch002.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag a file exactly at the thresholds (500 LOC, 20 exports)', () => {
    const ctx = syntheticContext([makeFile(500, 20)]);
    const findings = arch002.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('produces zero findings on clean-app', () => {
    const ctx = buildContext(CLEAN_APP);
    const findings = arch002.check(ctx);
    expect(findings).toHaveLength(0);
  });
});
