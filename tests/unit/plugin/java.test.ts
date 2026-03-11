import { describe, it, expect } from 'vitest';
import { plugin } from '../../../plugins/zaria-plugin-java/src/index.ts';
import type { AnalysisContext, ParsedFile } from '../../../src/audit/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(path: string, content: string): ParsedFile {
  return {
    sourceFile: {
      path,
      language: 'java',
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
    projectRoot: '/tmp/java-project',
    files,
    totalLoc: files.reduce((s, f) => s + f.loc, 0),
    languageDistribution: { java: files.length },
    importGraph: [],
  };
}

// ---------------------------------------------------------------------------
// Plugin metadata
// ---------------------------------------------------------------------------

describe('zaria-plugin-java metadata', () => {
  it('has the correct name', () => {
    expect(plugin.name).toBe('zaria-plugin-java');
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

  it('does not flag non-Java files', () => {
    const ctx: AnalysisContext = {
      projectRoot: '/tmp',
      files: [
        {
          sourceFile: {
            path: '/tmp/app.ts',
            language: 'typescript',
            size: 30,
            lastModified: new Date(),
          },
          content: 'System.out.println("hi");\n} catch (Exception e) {}',
          loc: 2,
          functionCount: 0,
          classCount: 0,
          exportCount: 0,
          imports: [],
        },
      ],
      totalLoc: 2,
      languageDistribution: { typescript: 1 },
      importGraph: [],
    };
    for (const rule of plugin.rules) {
      expect(rule.check(ctx)).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// JAVA001 — System.out.println() instead of logger
// ---------------------------------------------------------------------------

describe('JAVA001 — System.out.println() instead of logger', () => {
  const [rule] = plugin.rules;

  it('flags System.out.println() in a production file', () => {
    const ctx = makeContext([
      makeFile('/src/main/java/Service.java', 'System.out.println("Starting service");\n'),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('JAVA001');
    expect(findings[0].severity).toBe('low');
  });

  it('flags System.err.println() in a production file', () => {
    const ctx = makeContext([
      makeFile('/src/main/java/Service.java', 'System.err.println("Error occurred");\n'),
    ]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });

  it('does not flag System.out.println() in a test file', () => {
    const ctx = makeContext([
      makeFile('/src/test/java/ServiceTest.java', 'System.out.println("debug");\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag files using a logger', () => {
    const ctx = makeContext([
      makeFile('/src/main/java/Service.java', 'log.info("Starting service");\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag comment lines', () => {
    const ctx = makeContext([
      makeFile('/src/main/java/Service.java', '// Use System.out.println only in tests\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// JAVA002 — Empty catch blocks
// ---------------------------------------------------------------------------

describe('JAVA002 — empty catch blocks', () => {
  const rule = plugin.rules[1];

  it('flags a catch block with only whitespace before the closing brace', () => {
    const ctx = makeContext([
      makeFile(
        '/src/main/java/Service.java',
        'try {\n    riskyOp();\n} catch (IOException e) {\n}\n',
      ),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('JAVA002');
    expect(findings[0].severity).toBe('high');
  });

  it('does not flag a catch block that logs the exception', () => {
    const ctx = makeContext([
      makeFile(
        '/src/main/java/Service.java',
        'try {\n    riskyOp();\n} catch (IOException e) {\n    log.warn("IO error", e);\n}\n',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// JAVA003 — Catching Exception or Throwable
// ---------------------------------------------------------------------------

describe('JAVA003 — catching Exception or Throwable', () => {
  const rule = plugin.rules[2];

  it('flags catch (Exception e)', () => {
    const ctx = makeContext([
      makeFile(
        '/src/main/java/Service.java',
        'try {\n    doSomething();\n} catch (Exception e) {\n    log.error("error", e);\n}\n',
      ),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('JAVA003');
    expect(findings[0].severity).toBe('medium');
  });

  it('flags catch (Throwable t)', () => {
    const ctx = makeContext([
      makeFile(
        '/src/main/java/Service.java',
        'try {\n    doSomething();\n} catch (Throwable t) {\n    log.error("fatal", t);\n}\n',
      ),
    ]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });

  it('does not flag specific exception types', () => {
    const ctx = makeContext([
      makeFile(
        '/src/main/java/Service.java',
        'try {\n    doSomething();\n} catch (IOException | SQLException e) {\n    handle(e);\n}\n',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag comment lines', () => {
    const ctx = makeContext([
      makeFile('/src/main/java/Service.java', '// catch (Exception e) — example\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});
