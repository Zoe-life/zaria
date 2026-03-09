import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext, ParsedFile, SourceFile } from '../../../../src/audit/types.ts';
import { arch004 } from '../../../../src/audit/architecture/rules/arch004.ts';

const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

function buildContext(dir: string): import('../../../../src/audit/types.ts').AnalysisContext {
  return buildAnalysisContext(dir, parseFiles(traverseFiles(dir)));
}

function makeFileWithImports(filePath: string, importCount: number): ParsedFile {
  const sf: SourceFile = {
    path: filePath,
    language: 'typescript',
    size: 200,
    lastModified: new Date(),
  };
  const imports = Array.from({ length: importCount }, (_, i) => ({
    from: filePath,
    to: `/proj/dep${i}.ts`,
  }));
  return {
    sourceFile: sf,
    content: '',
    loc: 20,
    functionCount: 1,
    classCount: 0,
    exportCount: 1,
    imports,
  };
}

function syntheticContext(files: ParsedFile[]): AnalysisContext {
  return { projectRoot: '/proj', files, totalLoc: 0, languageDistribution: {}, importGraph: [] };
}

describe('ARCH004 — Tight Coupling Detection', () => {
  it('has correct metadata', () => {
    expect(arch004.id).toBe('ARCH004');
    expect(arch004.severity).toBe('low');
    expect(typeof arch004.check).toBe('function');
  });

  it('flags a file with >15 unique imports', () => {
    const ctx = syntheticContext([makeFileWithImports('/proj/bloat.ts', 16)]);
    const findings = arch004.check(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('ARCH004');
    expect(findings[0].message).toMatch(/16/);
  });

  it('does NOT flag a file with exactly 15 imports', () => {
    const ctx = syntheticContext([makeFileWithImports('/proj/ok.ts', 15)]);
    const findings = arch004.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag a file with fewer than 15 imports', () => {
    const ctx = syntheticContext([makeFileWithImports('/proj/lean.ts', 5)]);
    const findings = arch004.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('counts only unique import targets', () => {
    const sf: SourceFile = {
      path: '/proj/dup.ts',
      language: 'typescript',
      size: 100,
      lastModified: new Date(),
    };
    // 20 imports but all pointing to the same target = 1 unique
    const imports = Array.from({ length: 20 }, () => ({
      from: '/proj/dup.ts',
      to: '/proj/single.ts',
    }));
    const file: ParsedFile = {
      sourceFile: sf,
      content: '',
      loc: 5,
      functionCount: 0,
      classCount: 0,
      exportCount: 0,
      imports,
    };
    const ctx = syntheticContext([file]);
    const findings = arch004.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('findings include a recommendation', () => {
    const ctx = syntheticContext([makeFileWithImports('/proj/big.ts', 20)]);
    const findings = arch004.check(ctx);
    expect(findings[0].recommendation).toBeTruthy();
  });

  it('produces zero findings on clean-app', () => {
    const ctx = buildContext(CLEAN_APP);
    const findings = arch004.check(ctx);
    expect(findings).toHaveLength(0);
  });
});
