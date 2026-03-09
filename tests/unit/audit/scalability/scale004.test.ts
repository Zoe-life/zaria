import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { scale004 } from '../../../../src/audit/scalability/rules/scale004.ts';

const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

function ctxWithContent(content: string): AnalysisContext {
  return {
    projectRoot: '/proj',
    files: [
      {
        sourceFile: {
          path: '/proj/src/app.ts',
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

describe('SCALE004 — Missing Health Check Endpoint', () => {
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(scale004.id).toBe('SCALE004');
    expect(scale004.severity).toBe('medium');
    expect(typeof scale004.check).toBe('function');
  });

  it('flags an Express app with routes but no /health endpoint', () => {
    const content = `app.get('/users', (req, res) => res.json([]));\napp.post('/orders', handler);`;
    const findings = scale004.check(ctxWithContent(content));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('SCALE004');
  });

  it('does NOT flag when /health route is present', () => {
    const content = `app.get('/health', (req, res) => res.json({ status: 'ok' }));\napp.get('/users', handler);`;
    const findings = scale004.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag when /healthz route is present', () => {
    const content = `app.get('/healthz', (req, res) => res.json({ ok: true }));\napp.get('/api/data', handler);`;
    const findings = scale004.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag when /ping route is present', () => {
    const content = `router.get('/ping', (req, res) => res.send('pong'));\napp.get('/users', handler);`;
    const findings = scale004.check(ctxWithContent(content));
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag files with no route registrations', () => {
    const findings = scale004.check(ctxWithContent('export function greet() { return "hello"; }'));
    expect(findings).toHaveLength(0);
  });

  it('detects missing health check in an app with routes but no /health', () => {
    // Use a synthetic context with a non-exempt path to avoid the fixture path exemption
    const content = `import express from 'express';\nconst app = express();\napp.get('/users', handler);\napp.post('/orders', handler);\nexport { app };`;
    const syntheticCtx: AnalysisContext = {
      projectRoot: '/proj',
      files: [
        {
          sourceFile: {
            path: '/proj/src/app.ts',
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
    const findings = scale004.check(syntheticCtx);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('produces zero findings on clean-app', () => {
    const findings = scale004.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });
});
