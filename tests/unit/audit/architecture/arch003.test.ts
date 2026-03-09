import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext, ParsedFile, SourceFile } from '../../../../src/audit/types.ts';
import { arch003 } from '../../../../src/audit/architecture/rules/arch003.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

function buildContext(dir: string): import('../../../../src/audit/types.ts').AnalysisContext {
  return buildAnalysisContext(dir, parseFiles(traverseFiles(dir)));
}

function makeFile(filePath: string, importTos: string[]): ParsedFile {
  const sf: SourceFile = {
    path: filePath,
    language: 'typescript',
    size: 100,
    lastModified: new Date(),
  };
  return {
    sourceFile: sf,
    content: '',
    loc: 10,
    functionCount: 1,
    classCount: 0,
    exportCount: 1,
    imports: importTos.map((to) => ({ from: filePath, to })),
  };
}

function syntheticContext(files: ParsedFile[]): AnalysisContext {
  return { projectRoot: '/proj', files, totalLoc: 0, languageDistribution: {}, importGraph: [] };
}

describe('ARCH003 — Missing Abstraction Layer', () => {
  it('has correct metadata', () => {
    expect(arch003.id).toBe('ARCH003');
    expect(arch003.severity).toBe('medium');
    expect(typeof arch003.check).toBe('function');
  });

  it('detects routes.ts directly importing model files in sample-ts-app', () => {
    const ctx = buildContext(SAMPLE_TS_APP);
    const findings = arch003.check(ctx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((f) => f.file.endsWith('routes.ts'))).toBe(true);
  });

  it('flags a route file that imports directly from a model path', () => {
    const ctx = syntheticContext([makeFile('/proj/routes/users.ts', ['/proj/models/user.ts'])]);
    const findings = arch003.check(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('ARCH003');
  });

  it('does NOT flag a route file that imports from a service layer', () => {
    const ctx = syntheticContext([
      makeFile('/proj/routes/users.ts', ['/proj/services/userService.ts']),
    ]);
    const findings = arch003.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag a non-route file importing from a model', () => {
    const ctx = syntheticContext([
      makeFile('/proj/services/userService.ts', ['/proj/models/user.ts']),
    ]);
    const findings = arch003.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('findings include a recommendation', () => {
    const ctx = syntheticContext([makeFile('/proj/routes/users.ts', ['/proj/models/user.ts'])]);
    const findings = arch003.check(ctx);
    expect(findings[0].recommendation).toBeTruthy();
  });

  it('produces zero findings on clean-app', () => {
    const ctx = buildContext(CLEAN_APP);
    const findings = arch003.check(ctx);
    expect(findings).toHaveLength(0);
  });
});
