import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../src/audit/traversal.ts';
import { parseFiles } from '../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../src/audit/context.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../fixtures/clean-app');

describe('buildAnalysisContext', () => {
  it('sets projectRoot correctly', () => {
    const files = parseFiles(traverseFiles(CLEAN_APP));
    const ctx = buildAnalysisContext(CLEAN_APP, files);
    expect(ctx.projectRoot).toBe(CLEAN_APP);
  });

  it('includes all parsed files', () => {
    const sourceFiles = traverseFiles(CLEAN_APP);
    const parsed = parseFiles(sourceFiles);
    const ctx = buildAnalysisContext(CLEAN_APP, parsed);
    expect(ctx.files.length).toBe(parsed.length);
  });

  it('computes totalLoc as sum of individual file LOCs', () => {
    const parsed = parseFiles(traverseFiles(CLEAN_APP));
    const ctx = buildAnalysisContext(CLEAN_APP, parsed);
    const expected = parsed.reduce((s, f) => s + f.loc, 0);
    expect(ctx.totalLoc).toBe(expected);
  });

  it('builds languageDistribution correctly', () => {
    const parsed = parseFiles(traverseFiles(CLEAN_APP));
    const ctx = buildAnalysisContext(CLEAN_APP, parsed);
    expect(ctx.languageDistribution['typescript']).toBeGreaterThan(0);
  });

  it('flattens import graph from all files', () => {
    const parsed = parseFiles(traverseFiles(SAMPLE_TS_APP));
    const ctx = buildAnalysisContext(SAMPLE_TS_APP, parsed);
    // sample-ts-app has files with imports
    expect(ctx.importGraph.length).toBeGreaterThan(0);
  });

  it('deduplicates import graph edges', () => {
    const parsed = parseFiles(traverseFiles(SAMPLE_TS_APP));
    const ctx = buildAnalysisContext(SAMPLE_TS_APP, parsed);
    const edgeKeys = ctx.importGraph.map((e) => `${e.from}→${e.to}`);
    const unique = new Set(edgeKeys);
    expect(unique.size).toBe(edgeKeys.length);
  });

  it('handles an empty file list', () => {
    const ctx = buildAnalysisContext('/some/root', []);
    expect(ctx.files).toEqual([]);
    expect(ctx.totalLoc).toBe(0);
    expect(ctx.importGraph).toEqual([]);
    expect(ctx.languageDistribution).toEqual({});
  });
});
