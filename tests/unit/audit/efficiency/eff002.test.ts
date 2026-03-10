import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { eff002 } from '../../../../src/audit/efficiency/rules/eff002.ts';

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

describe('EFF002 — Linear Search in Loop', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(eff002.id).toBe('EFF002');
    expect(eff002.severity).toBe('medium');
    expect(typeof eff002.check).toBe('function');
    expect(eff002.name).toBe('Linear Search in Loop');
  });

  it('detects Array.includes inside a for-of loop', () => {
    const content = `
function filterActive(items: string[], active: string[]): string[] {
  const result: string[] = [];
  for (const item of items) {
    if (active.includes(item)) {
      result.push(item);
    }
  }
  return result;
}`;
    const findings = eff002.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('EFF002');
    expect(findings[0].severity).toBe('medium');
  });

  it('detects Array.indexOf inside a for-of loop', () => {
    const content = `
function findPositions(haystack: number[], needles: number[]): number[] {
  const positions: number[] = [];
  for (const needle of needles) {
    const pos = haystack.indexOf(needle);
    if (pos !== -1) positions.push(pos);
  }
  return positions;
}`;
    const findings = eff002.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('EFF002');
  });

  it('detects Array.find inside a for loop', () => {
    const content = `
function lookupAll(ids: string[], records: {id: string; val: number}[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < ids.length; i++) {
    const rec = records.find((r) => r.id === ids[i]);
    if (rec) out.push(rec.val);
  }
  return out;
}`;
    const findings = eff002.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('EFF002');
  });

  it('findings include line number and recommendation', () => {
    const content = `
function check(items: string[], allowed: string[]): boolean {
  for (const item of items) {
    if (allowed.includes(item)) return true;
  }
  return false;
}`;
    const findings = eff002.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].line).toBeGreaterThan(0);
    expect(findings[0].recommendation).toBeTruthy();
    expect(findings[0].recommendation).toMatch(/Set|Map/i);
  });

  it('does NOT flag includes outside a loop', () => {
    const content = `
function isMember(list: string[], item: string): boolean {
  return list.includes(item);
}`;
    const findings = eff002.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag Set.has inside a loop', () => {
    const content = `
function filterBySet(items: string[], allowed: Set<string>): string[] {
  const result: string[] = [];
  for (const item of items) {
    if (allowed.has(item)) result.push(item);
  }
  return result;
}`;
    const findings = eff002.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('detects linear search in sample-ts-app efficiency fixture', () => {
    const findings = eff002.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('EFF002');
  });

  it('produces zero findings on clean-app', () => {
    const findings = eff002.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });

  it('findings include file path', () => {
    const findings = eff002.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].file).toBeTruthy();
  });
});
