import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { maint003 } from '../../../../src/audit/maintenance/rules/maint003.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

/** Build a context whose projectRoot points to a temp dir with the given package.json. */
function ctxWithPackageJson(packageJson: Record<string, unknown>): {
  ctx: AnalysisContext;
  dir: string;
} {
  const dir = join(tmpdir(), `zaria-maint003-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify(packageJson));
  const ctx: AnalysisContext = {
    projectRoot: dir,
    files: [],
    totalLoc: 0,
    languageDistribution: {},
    importGraph: [],
  };
  return { ctx, dir };
}

describe('MAINT003 — Deprecated Dependency', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(maint003.id).toBe('MAINT003');
    expect(maint003.severity).toBe('medium');
    expect(typeof maint003.check).toBe('function');
  });

  it('detects a deprecated dependency', () => {
    const { ctx, dir } = ctxWithPackageJson({
      dependencies: { request: '^2.88.2', express: '^4.18.0' },
    });
    try {
      const findings = maint003.check(ctx);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].ruleId).toBe('MAINT003');
      expect(findings[0].severity).toBe('medium');
      expect(findings[0].message).toContain('request');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does NOT flag packages that are not deprecated', () => {
    const { ctx, dir } = ctxWithPackageJson({
      dependencies: { express: '^4.18.0', pino: '^9.0.0' },
    });
    try {
      const findings = maint003.check(ctx);
      expect(findings).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects deprecated dependency in sample-ts-app fixture', () => {
    const findings = maint003.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('MAINT003');
  });

  it('produces zero findings on clean-app (no package.json)', () => {
    const findings = maint003.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });

  it('silently skips when package.json is absent', () => {
    const ctx: AnalysisContext = {
      projectRoot: '/non/existent/path',
      files: [],
      totalLoc: 0,
      languageDistribution: {},
      importGraph: [],
    };
    const findings = maint003.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('also checks devDependencies', () => {
    const { ctx, dir } = ctxWithPackageJson({
      devDependencies: { 'node-uuid': '^1.4.8' },
    });
    try {
      const findings = maint003.check(ctx);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].message).toContain('node-uuid');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('findings include a recommendation', () => {
    const findings = maint003.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].recommendation).toBeTruthy();
  });
});
