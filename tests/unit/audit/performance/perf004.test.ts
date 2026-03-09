import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext, ParsedFile, SourceFile } from '../../../../src/audit/types.ts';
import { perf004 } from '../../../../src/audit/performance/rules/perf004.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

function buildContext(dir: string): import('../../../../src/audit/types.ts').AnalysisContext {
  return buildAnalysisContext(dir, parseFiles(traverseFiles(dir)));
}

function syntheticContext(filePath: string, content: string): AnalysisContext {
  const sourceFile: SourceFile = {
    path: filePath,
    language: 'typescript',
    size: content.length,
    lastModified: new Date(),
  };
  const parsedFile: ParsedFile = {
    sourceFile,
    content,
    loc: content.split('\n').length,
    functionCount: 1,
    classCount: 0,
    exportCount: 0,
    imports: [],
  };
  return {
    projectRoot: '/project',
    files: [parsedFile],
    totalLoc: parsedFile.loc,
    languageDistribution: { typescript: 1 },
    importGraph: [],
  };
}

describe('PERF004 — Memory Leak Patterns', () => {
  it('has correct metadata', () => {
    expect(perf004.id).toBe('PERF004');
    expect(perf004.severity).toBe('medium');
    expect(typeof perf004.check).toBe('function');
  });

  it('detects addEventListener without removeEventListener in sample-ts-app', () => {
    const ctx = buildContext(SAMPLE_TS_APP);
    const findings = perf004.check(ctx);
    // sample-ts-app/index.ts has two addEventListener calls and no removeEventListener
    expect(findings.some((f) => f.message.includes('addEventListener'))).toBe(true);
  });

  it('findings include ruleId PERF004', () => {
    const ctx = buildContext(SAMPLE_TS_APP);
    const findings = perf004.check(ctx);
    expect(findings.every((f) => f.ruleId === 'PERF004')).toBe(true);
  });

  it('does NOT flag balanced addEventListener / removeEventListener', () => {
    const content = `
      target.addEventListener('click', handler);
      target.removeEventListener('click', handler);
    `;
    const ctx = syntheticContext('/project/handlers.ts', content);
    const findings = perf004.check(ctx);
    const domFindings = findings.filter((f) => f.message.includes('addEventListener'));
    expect(domFindings).toHaveLength(0);
  });

  it('flags imbalanced addEventListener count', () => {
    const content = `
      el.addEventListener('focus', handler1);
      el.addEventListener('blur', handler2);
    `;
    const ctx = syntheticContext('/project/listeners.ts', content);
    const findings = perf004.check(ctx);
    expect(findings.some((f) => f.message.includes('addEventListener'))).toBe(true);
  });

  it('produces zero findings on clean-app', () => {
    const ctx = buildContext(CLEAN_APP);
    const findings = perf004.check(ctx);
    expect(findings).toHaveLength(0);
  });
});
