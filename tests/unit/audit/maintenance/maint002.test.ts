import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { maint002 } from '../../../../src/audit/maintenance/rules/maint002.ts';

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

/** Build a context with two files having the provided contents. */
function ctxWithTwoFiles(contentA: string, contentB: string): AnalysisContext {
  return {
    projectRoot: '/proj',
    files: [
      {
        sourceFile: {
          path: '/proj/src/a.ts',
          language: 'typescript',
          size: contentA.length,
          lastModified: new Date(),
        },
        content: contentA,
        loc: contentA.split('\n').length,
        functionCount: 0,
        classCount: 0,
        exportCount: 0,
        imports: [],
      },
      {
        sourceFile: {
          path: '/proj/src/b.ts',
          language: 'typescript',
          size: contentB.length,
          lastModified: new Date(),
        },
        content: contentB,
        loc: contentB.split('\n').length,
        functionCount: 0,
        classCount: 0,
        exportCount: 0,
        imports: [],
      },
    ],
    totalLoc: contentA.split('\n').length + contentB.split('\n').length,
    languageDistribution: { typescript: 2 },
    importGraph: [],
  };
}

/** Returns a string containing two functions with identical 6-line bodies. */
function duplicateContent(): string {
  return `
function encodeA(id: string, data: Record<string, unknown>): string {
  const payload = JSON.stringify(data);
  const encoded = Buffer.from(payload).toString('base64');
  const checksum = payload.length.toString(16);
  const timestamp = new Date().toISOString();
  const version = '1';
  return JSON.stringify({ id, encoded, checksum, timestamp, version });
}

function encodeB(id: string, data: Record<string, unknown>): string {
  const payload = JSON.stringify(data);
  const encoded = Buffer.from(payload).toString('base64');
  const checksum = payload.length.toString(16);
  const timestamp = new Date().toISOString();
  const version = '1';
  return JSON.stringify({ id, encoded, checksum, timestamp, version });
}`;
}

describe('MAINT002 — Code Duplication', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(maint002.id).toBe('MAINT002');
    expect(maint002.severity).toBe('low');
    expect(typeof maint002.check).toBe('function');
  });

  it('detects within-file duplicate blocks', () => {
    const findings = maint002.check(ctxWithContent(duplicateContent()));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('MAINT002');
  });

  it('detects cross-file duplicate blocks', () => {
    const body = `
const payload = JSON.stringify(data);
const encoded = Buffer.from(payload).toString('base64');
const checksum = payload.length.toString(16);
const timestamp = new Date().toISOString();
const version = '1';
return JSON.stringify({ payload, encoded, checksum, timestamp, version });`;
    const findings = maint002.check(ctxWithTwoFiles(body, body));
    expect(findings.length).toBeGreaterThan(0);
  });

  it('does NOT flag a file with unique content', () => {
    const content = `
function a(): string { return 'hello'; }
function b(): number { return 42; }
function c(): boolean { return true; }`;
    const findings = maint002.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('emits at most one finding per file', () => {
    const content = duplicateContent();
    const findings = maint002.check(ctxWithContent(content));
    expect(findings).toHaveLength(1);
  });

  it('detects code duplication in sample-ts-app maintenance fixture', () => {
    const findings = maint002.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('MAINT002');
  });

  it('produces zero findings on clean-app', () => {
    const findings = maint002.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });

  it('findings include a recommendation', () => {
    const findings = maint002.check(ctxWithContent(duplicateContent()));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].recommendation).toBeTruthy();
  });
});
