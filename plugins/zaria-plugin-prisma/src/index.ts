/**
 * `zaria-plugin-prisma` — official Prisma ORM plugin for Zaria.
 *
 * Provides static-analysis rules specific to projects using Prisma:
 *   PRISMA001  PrismaClient instantiated outside of a singleton module
 *   PRISMA002  Missing $disconnect() call (potential connection leak)
 *   PRISMA003  Raw SQL queries via $queryRaw without parameterisation guard
 */

import type { ZariaPlugin, PluginContext } from '../../src/plugin/types.js';
import type { Rule, AnalysisContext, Finding } from '../../src/audit/types.js';

// ---------------------------------------------------------------------------
// PRISMA001 — PrismaClient instantiated outside a singleton module
// ---------------------------------------------------------------------------

const prisma001: Rule = {
  id: 'PRISMA001',
  name: 'Use a PrismaClient singleton',
  description:
    'Creating a new PrismaClient() in multiple files exhausts the database connection pool ' +
    'and causes "Too many connections" errors. Instantiate the client once and export the ' +
    'singleton (commonly from lib/prisma.ts or prisma/client.ts).',
  severity: 'high',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const NEW_CLIENT_RE = /new\s+PrismaClient\s*\(/g;
    // Files that conventionally host the singleton — no finding raised there.
    const SINGLETON_PATH_RE = /[\\/](lib|prisma|db)[\\/](prisma|client|db)\.[jt]sx?$/;

    for (const file of context.files) {
      if (SINGLETON_PATH_RE.test(file.sourceFile.path)) continue;
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        if (NEW_CLIENT_RE.test(line)) {
          findings.push({
            ruleId: 'PRISMA001',
            severity: 'high',
            message:
              'PrismaClient instantiated outside a singleton module — this may exhaust the ' +
              'database connection pool.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Create one PrismaClient instance in lib/prisma.ts and import it elsewhere. ' +
              'In Next.js dev mode, use the global object to prevent hot-reload leaks.',
          });
        }
        NEW_CLIENT_RE.lastIndex = 0;
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// PRISMA002 — Missing $disconnect() (connection leak)
// ---------------------------------------------------------------------------

const prisma002: Rule = {
  id: 'PRISMA002',
  name: 'Ensure PrismaClient.$disconnect() is called',
  description:
    'Scripts and serverless handlers that create a PrismaClient and never call ' +
    '$disconnect() leak database connections.  Long-running servers that manage their ' +
    'own lifecycle are exempt if the singleton pattern (PRISMA001) is followed.',
  severity: 'medium',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const NEW_CLIENT_RE = /new\s+PrismaClient\s*\(/;
    const DISCONNECT_RE = /\$disconnect\s*\(/;

    for (const file of context.files) {
      if (!NEW_CLIENT_RE.test(file.content)) continue;
      if (!DISCONNECT_RE.test(file.content)) {
        findings.push({
          ruleId: 'PRISMA002',
          severity: 'medium',
          message: 'PrismaClient is instantiated but $disconnect() is never called in this file.',
          file: file.sourceFile.path,
          recommendation:
            'Add await prisma.$disconnect() in a finally block or process exit handler, ' +
            'or ensure the singleton module handles the lifecycle.',
        });
      }
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// PRISMA003 — $queryRaw without tagged-template literal (SQL injection risk)
// ---------------------------------------------------------------------------

const prisma003: Rule = {
  id: 'PRISMA003',
  name: 'Use parameterised $queryRaw to prevent SQL injection',
  description:
    'Calling $queryRaw with a plain string (e.g. `$queryRaw("SELECT …")`) instead of ' +
    "the tagged-template form (`$queryRaw\\`SELECT … ${id}\\``) bypasses Prisma's " +
    'automatic parameterisation and opens an SQL injection vector.',
  severity: 'critical',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    // Match $queryRaw( or $executeRaw( followed by a string literal (not a template tag)
    const RAW_STRING_RE = /\$(?:queryRaw|executeRaw)\s*\(\s*['"`]/g;
    for (const file of context.files) {
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        if (RAW_STRING_RE.test(line)) {
          findings.push({
            ruleId: 'PRISMA003',
            severity: 'critical',
            message: '$queryRaw/$executeRaw called with a plain string — potential SQL injection.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Use the tagged-template literal form: `prisma.$queryRaw\\`SELECT * FROM "User" ' +
              'WHERE id = ${userId}\\`` so Prisma automatically parameterises the query.',
          });
        }
        RAW_STRING_RE.lastIndex = 0;
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Plugin export
// ---------------------------------------------------------------------------

export const plugin: ZariaPlugin = {
  name: 'zaria-plugin-prisma',
  version: '1.0.0',
  rules: [prisma001, prisma002, prisma003],

  async onInit(_context: PluginContext): Promise<void> {
    // No async setup required for static analysis rules.
  },
};

export default plugin;
