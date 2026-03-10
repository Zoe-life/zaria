import { describe, it, expect } from 'vitest';
import { plugin } from '../../../plugins/zaria-plugin-prisma/src/index.ts';
import type { AnalysisContext, ParsedFile } from '../../../src/audit/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(path: string, content: string): ParsedFile {
  return {
    sourceFile: {
      path,
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
  };
}

function makeContext(files: ParsedFile[]): AnalysisContext {
  return {
    projectRoot: '/tmp/prisma-project',
    files,
    totalLoc: files.reduce((s, f) => s + f.loc, 0),
    languageDistribution: { typescript: files.length },
    importGraph: [],
  };
}

// ---------------------------------------------------------------------------
// Plugin metadata
// ---------------------------------------------------------------------------

describe('zaria-plugin-prisma metadata', () => {
  it('has the correct name', () => {
    expect(plugin.name).toBe('zaria-plugin-prisma');
  });

  it('has a version string', () => {
    expect(plugin.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('exposes three rules', () => {
    expect(plugin.rules).toHaveLength(3);
  });

  it('has an onInit hook', () => {
    expect(typeof plugin.onInit).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// PRISMA001 — PrismaClient outside singleton module
// ---------------------------------------------------------------------------

describe('PRISMA001 — PrismaClient outside singleton', () => {
  const [rule] = plugin.rules;

  it('flags a non-singleton file that instantiates PrismaClient', () => {
    const ctx = makeContext([
      makeFile(
        '/app/routes/users.ts',
        'import { PrismaClient } from "@prisma/client";\nconst prisma = new PrismaClient();',
      ),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('PRISMA001');
  });

  it('does not flag the canonical lib/prisma.ts singleton file', () => {
    const ctx = makeContext([
      makeFile(
        '/app/lib/prisma.ts',
        'import { PrismaClient } from "@prisma/client";\nexport const prisma = new PrismaClient();',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag files that do not instantiate PrismaClient', () => {
    const ctx = makeContext([
      makeFile(
        '/app/routes/users.ts',
        'import { prisma } from "../lib/prisma"; prisma.user.findMany()',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// PRISMA002 — Missing $disconnect()
// ---------------------------------------------------------------------------

describe('PRISMA002 — missing $disconnect', () => {
  const rule = plugin.rules[1];

  it('flags a file with new PrismaClient() but no $disconnect()', () => {
    const ctx = makeContext([
      makeFile(
        '/app/scripts/seed.ts',
        'const prisma = new PrismaClient();\nawait prisma.user.create({ data: {} });',
      ),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('PRISMA002');
  });

  it('does not flag a file that calls $disconnect()', () => {
    const ctx = makeContext([
      makeFile(
        '/app/scripts/seed.ts',
        'const prisma = new PrismaClient();\ntry { await prisma.user.create({data:{}}); } finally { await prisma.$disconnect(); }',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('returns no findings for files without PrismaClient instantiation', () => {
    const ctx = makeContext([makeFile('/app/lib/util.ts', 'export function helper() {}')]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// PRISMA003 — $queryRaw with plain string (SQL injection)
// ---------------------------------------------------------------------------

describe('PRISMA003 — raw SQL injection risk', () => {
  const rule = plugin.rules[2];

  it('flags $queryRaw called with a string literal', () => {
    const ctx = makeContext([
      makeFile(
        '/app/db/query.ts',
        'const rows = await prisma.$queryRaw("SELECT * FROM users WHERE id = " + id);',
      ),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('PRISMA003');
    expect(findings[0].severity).toBe('critical');
  });

  it('does not flag $queryRaw used as a tagged-template literal', () => {
    const ctx = makeContext([
      makeFile(
        '/app/db/query.ts',
        'const rows = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`;',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('flags $executeRaw called with a string literal', () => {
    const ctx = makeContext([
      makeFile('/app/db/exec.ts', 'await prisma.$executeRaw("DELETE FROM logs WHERE old = true")'),
    ]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });
});
