import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../src/audit/traversal.ts';
import { parseFiles } from '../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../src/audit/context.ts';
import type { AnalysisContext, ParsedFile } from '../../../src/audit/types.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../fixtures/clean-app');

describe('buildAnalysisContext', () => {
  let cleanParsed!: ParsedFile[];
  let cleanCtx!: AnalysisContext;
  let sampleParsed!: ParsedFile[];
  let sampleCtx!: AnalysisContext;

  beforeAll(() => {
    cleanParsed = parseFiles(traverseFiles(CLEAN_APP));
    cleanCtx = buildAnalysisContext(CLEAN_APP, cleanParsed);
    sampleParsed = parseFiles(traverseFiles(SAMPLE_TS_APP));
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, sampleParsed);
  });

  it('sets projectRoot correctly', () => {
    expect(cleanCtx.projectRoot).toBe(CLEAN_APP);
  });

  it('includes all parsed files', () => {
    expect(cleanCtx.files.length).toBe(cleanParsed.length);
  });

  it('computes totalLoc as sum of individual file LOCs', () => {
    const expected = cleanParsed.reduce((s, f) => s + f.loc, 0);
    expect(cleanCtx.totalLoc).toBe(expected);
  });

  it('builds languageDistribution correctly', () => {
    expect(cleanCtx.languageDistribution['typescript']).toBeGreaterThan(0);
  });

  it('flattens import graph from all files', () => {
    // sample-ts-app has files with imports
    expect(sampleCtx.importGraph.length).toBeGreaterThan(0);
  });

  it('deduplicates import graph edges', () => {
    const edgeKeys = sampleCtx.importGraph.map((e) => `${e.from}→${e.to}`);
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
