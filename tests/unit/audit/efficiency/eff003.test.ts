import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { eff003 } from '../../../../src/audit/efficiency/rules/eff003.ts';

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

describe('EFF003 — ReDoS-Susceptible Pattern', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(eff003.id).toBe('EFF003');
    expect(eff003.severity).toBe('high');
    expect(typeof eff003.check).toBe('function');
    expect(eff003.name).toBe('ReDoS-Susceptible Pattern');
  });

  it('detects nested quantifier pattern (a+)+', () => {
    const content = `const re = /(a+)+b/;`;
    const findings = eff003.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('EFF003');
    expect(findings[0].severity).toBe('high');
  });

  it('detects nested quantifier with word chars (\\w+)+', () => {
    const content = `const validate = (s: string) => /^(\\w+)+$/.test(s);`;
    const findings = eff003.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('EFF003');
  });

  it('detects quantified alternation (a|b)+', () => {
    const content = `const re = /(foo|bar)+end/;`;
    const findings = eff003.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('EFF003');
  });

  it('detects quantified alternation with character classes', () => {
    const content = `const unsafe = /(\\w|\\d)+end/;`;
    const findings = eff003.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('EFF003');
  });

  it('findings include line number', () => {
    const content = `
const safe = /^[a-z]+$/;
const unsafe = /(a+)+b/;`;
    const findings = eff003.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].line).toBeGreaterThan(0);
  });

  it('findings include a recommendation', () => {
    const content = `const re = /(x+)+y/;`;
    const findings = eff003.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].recommendation).toBeTruthy();
    expect(findings[0].recommendation).toMatch(/nested quantifier/i);
  });

  it('does NOT flag a simple character-class quantifier', () => {
    const content = `const re = /^[a-zA-Z0-9]+$/;`;
    const findings = eff003.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag a basic email-like pattern', () => {
    const content = `const emailRe = /^[\\w.+-]+@[\\w-]+\\.[a-z]{2,}$/i;`;
    const findings = eff003.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('detects ReDoS patterns in sample-ts-app efficiency fixture', () => {
    const findings = eff003.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('EFF003');
  });

  it('produces zero findings on clean-app', () => {
    const findings = eff003.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });

  it('message includes the flagged regex pattern', () => {
    const content = `const re = /(a+)+b/;`;
    const findings = eff003.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].message).toMatch(/ReDoS/i);
  });
});
