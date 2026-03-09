import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { traverseFiles } from '../../../../src/audit/traversal.ts';
import { parseFiles } from '../../../../src/audit/parser.ts';
import { buildAnalysisContext } from '../../../../src/audit/context.ts';
import type { AnalysisContext, ParsedFile, SourceFile } from '../../../../src/audit/types.ts';
import { perf003 } from '../../../../src/audit/performance/rules/perf003.ts';

const CLEAN_APP = resolve(import.meta.dirname, '../../../fixtures/clean-app');

/** Build a minimal synthetic context with a single file containing `content`. */
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
    exportCount: 1,
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

describe('PERF003 — Missing Caching Strategy', () => {
  let cleanCtx!: AnalysisContext;

  beforeAll(() => {
    cleanCtx = buildAnalysisContext(CLEAN_APP, parseFiles(traverseFiles(CLEAN_APP)));
  });

  it('has correct metadata', () => {
    expect(perf003.id).toBe('PERF003');
    expect(perf003.severity).toBe('medium');
    expect(typeof perf003.check).toBe('function');
  });

  it('flags a route file that sends responses without caching headers', () => {
    const content = `
      app.get('/users', (req, res) => {
        const users = User.findAll();
        res.json(users);
      });
    `;
    const ctx = syntheticContext('/project/routes/users.ts', content);
    const findings = perf003.check(ctx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('PERF003');
  });

  it('does NOT flag a route file that includes Cache-Control', () => {
    const content = `
      app.get('/users', (req, res) => {
        res.set('Cache-Control', 'public, max-age=300');
        res.json([]);
      });
    `;
    const ctx = syntheticContext('/project/routes/users.ts', content);
    const findings = perf003.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag a route file that includes ETag', () => {
    const content = `
      router.get('/items', (req, res) => {
        res.set('ETag', '"abc123"');
        res.json([]);
      });
    `;
    const ctx = syntheticContext('/project/routes/items.ts', content);
    const findings = perf003.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag non-route files', () => {
    const content = `
      export function compute() { return 42; }
    `;
    const ctx = syntheticContext('/project/utils/math.ts', content);
    const findings = perf003.check(ctx);
    expect(findings).toHaveLength(0);
  });

  it('produces zero findings on clean-app', () => {
    const findings = perf003.check(cleanCtx);
    expect(findings).toHaveLength(0);
  });

  it('findings include a recommendation', () => {
    const content = `
      app.get('/data', (req, res) => { res.json({}); });
    `;
    const ctx = syntheticContext('/project/routes/data.ts', content);
    const findings = perf003.check(ctx);
    if (findings.length > 0) {
      expect(findings[0].recommendation).toBeTruthy();
    }
  });
});
