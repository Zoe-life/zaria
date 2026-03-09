import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { arch001 } from '../../../../src/audit/architecture/rules/arch001.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

/** Construct a synthetic AnalysisContext with the given import edges. */
function contextWithEdges(projectRoot: string, edges: Array<[string, string]>): AnalysisContext {
  return {
    projectRoot,
    files: [],
    totalLoc: 0,
    languageDistribution: {},
    importGraph: edges.map(([from, to]) => ({ from, to })),
  };
}

describe('ARCH001 — Circular Dependency Detection', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(arch001.id).toBe('ARCH001');
    expect(arch001.severity).toBe('high');
    expect(typeof arch001.check).toBe('function');
  });

  it('detects the circular dependency in sample-ts-app', () => {
    const findings = arch001.check(sampleCtx);
    // circular-a.ts ↔ circular-b.ts form a cycle
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('ARCH001');
  });

  it('findings reference the file at the start of the cycle', () => {
    const findings = arch001.check(sampleCtx);
    expect(findings[0].file).toBeTruthy();
  });

  it('detects a direct two-node cycle in synthetic context', () => {
    const root = '/proj';
    const ctx = contextWithEdges(root, [
      [`${root}/a.ts`, `${root}/b.ts`],
      [`${root}/b.ts`, `${root}/a.ts`],
    ]);
    const findings = arch001.check(ctx);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('does NOT flag acyclic imports in a synthetic context', () => {
    const root = '/proj';
    const ctx = contextWithEdges(root, [
      [`${root}/a.ts`, `${root}/b.ts`],
      [`${root}/b.ts`, `${root}/c.ts`],
    ]);
    const findings = arch001.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag external package imports (bare specifiers)', () => {
    const root = '/proj';
    const ctx = contextWithEdges(root, [
      [`${root}/a.ts`, 'express'],
      [`${root}/a.ts`, 'react'],
    ]);
    const findings = arch001.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('produces zero findings on clean-app', () => {
    const findings = arch001.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });

  it('detects a three-node cycle', () => {
    const root = '/proj';
    const ctx = contextWithEdges(root, [
      [`${root}/a.ts`, `${root}/b.ts`],
      [`${root}/b.ts`, `${root}/c.ts`],
      [`${root}/c.ts`, `${root}/a.ts`],
    ]);
    const findings = arch001.check(ctx);
    expect(findings.length).toBeGreaterThan(0);
  });
});
