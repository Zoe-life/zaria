import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext } from '../../../../src/audit/types.ts';
import { maint005 } from '../../../../src/audit/maintenance/rules/maint005.ts';

const SAMPLE_TS_APP = resolve(import.meta.dirname, '../../../fixtures/sample-ts-app');
const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

function ctxWithPackageJson(packageJson: Record<string, unknown>): {
  ctx: AnalysisContext;
  dir: string;
} {
  const dir = join(tmpdir(), `zaria-maint005-${Date.now()}`);
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

describe('MAINT005 — Outdated Dependency', () => {
  let sampleCtx!: AnalysisContext;
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    sampleCtx = buildAnalysisContext(SAMPLE_TS_APP, parseFiles(traverseFiles(SAMPLE_TS_APP)));
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(maint005.id).toBe('MAINT005');
    expect(maint005.severity).toBe('medium');
    expect(typeof maint005.check).toBe('function');
  });

  it('flags a dependency more than 2 major versions behind (lodash 1.x, current 4.x)', () => {
    const { ctx, dir } = ctxWithPackageJson({
      dependencies: { lodash: '^1.3.1' },
    });
    try {
      const findings = maint005.check(ctx);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].ruleId).toBe('MAINT005');
      expect(findings[0].severity).toBe('medium');
      expect(findings[0].message).toContain('lodash');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does NOT flag a dependency exactly 2 major versions behind (lodash 2.x, current 4.x)', () => {
    const { ctx, dir } = ctxWithPackageJson({
      dependencies: { lodash: '^2.4.2' },
    });
    try {
      const findings = maint005.check(ctx);
      expect(findings).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does NOT flag a package not in the known-versions registry', () => {
    const { ctx, dir } = ctxWithPackageJson({
      dependencies: { 'some-obscure-package': '^0.1.0' },
    });
    try {
      const findings = maint005.check(ctx);
      expect(findings).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects outdated dependency in sample-ts-app fixture (lodash ^1.x)', () => {
    const findings = maint005.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('MAINT005');
  });

  it('produces zero findings on clean-app (no package.json)', () => {
    const findings = maint005.check(cleanCtx);
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
    const findings = maint005.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('also checks devDependencies', () => {
    const { ctx, dir } = ctxWithPackageJson({
      devDependencies: { jest: '^1.0.0' },
    });
    try {
      const findings = maint005.check(ctx);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].message).toContain('jest');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('parses wildcard and pre-release versions gracefully (no finding)', () => {
    const { ctx, dir } = ctxWithPackageJson({
      dependencies: { lodash: '*' },
    });
    try {
      const findings = maint005.check(ctx);
      expect(findings).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('findings include a recommendation', () => {
    const findings = maint005.check(sampleCtx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].recommendation).toBeTruthy();
  });
});
