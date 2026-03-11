import { describe, it, expect } from 'vitest';
import { plugin } from '../../../plugins/zaria-plugin-csharp/src/index.ts';
import type { AnalysisContext, ParsedFile } from '../../../src/audit/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(path: string, content: string): ParsedFile {
  return {
    sourceFile: {
      path,
      language: 'csharp',
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
    projectRoot: '/tmp/csharp-project',
    files,
    totalLoc: files.reduce((s, f) => s + f.loc, 0),
    languageDistribution: { csharp: files.length },
    importGraph: [],
  };
}

// ---------------------------------------------------------------------------
// Plugin metadata
// ---------------------------------------------------------------------------

describe('zaria-plugin-csharp metadata', () => {
  it('has the correct name', () => {
    expect(plugin.name).toBe('zaria-plugin-csharp');
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

  it('does not flag non-C# files', () => {
    const ctx: AnalysisContext = {
      projectRoot: '/tmp',
      files: [
        {
          sourceFile: {
            path: '/tmp/app.ts',
            language: 'typescript',
            size: 40,
            lastModified: new Date(),
          },
          content: 'Console.WriteLine("hi");\n} catch {\n}\nThread.Sleep(1000);',
          loc: 4,
          functionCount: 0,
          classCount: 0,
          exportCount: 0,
          imports: [],
        },
      ],
      totalLoc: 4,
      languageDistribution: { typescript: 1 },
      importGraph: [],
    };
    for (const rule of plugin.rules) {
      expect(rule.check(ctx)).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// CS001 — Console.WriteLine() instead of ILogger
// ---------------------------------------------------------------------------

describe('CS001 — Console.WriteLine() instead of ILogger', () => {
  const [rule] = plugin.rules;

  it('flags Console.WriteLine() in a production file', () => {
    const ctx = makeContext([
      makeFile('/src/Services/MyService.cs', 'Console.WriteLine("Service started");\n'),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('CS001');
    expect(findings[0].severity).toBe('low');
  });

  it('flags Console.Write() in a production file', () => {
    const ctx = makeContext([
      makeFile('/src/Services/MyService.cs', 'Console.Write("Loading");\n'),
    ]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });

  it('does not flag Console.WriteLine() in a test file', () => {
    const ctx = makeContext([
      makeFile('/src/Tests/MyServiceTests.cs', 'Console.WriteLine("debug output");\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag ILogger usage', () => {
    const ctx = makeContext([
      makeFile('/src/Services/MyService.cs', '_logger.LogInformation("Service started");\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag comment lines', () => {
    const ctx = makeContext([
      makeFile('/src/Services/MyService.cs', '// Use _logger instead of Console.WriteLine()\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CS002 — Empty catch blocks
// ---------------------------------------------------------------------------

describe('CS002 — empty catch blocks', () => {
  const rule = plugin.rules[1];

  it('flags an empty catch block', () => {
    const ctx = makeContext([
      makeFile(
        '/src/Services/MyService.cs',
        'try {\n    RiskyOp();\n} catch (Exception ex) {\n}\n',
      ),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('CS002');
    expect(findings[0].severity).toBe('high');
  });

  it('flags a parameterless catch block', () => {
    const ctx = makeContext([
      makeFile('/src/Services/MyService.cs', 'try {\n    RiskyOp();\n} catch {\n}\n'),
    ]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });

  it('does not flag a catch block that logs', () => {
    const ctx = makeContext([
      makeFile(
        '/src/Services/MyService.cs',
        'try {\n    RiskyOp();\n} catch (Exception ex) {\n    _logger.LogWarning(ex, "Unexpected");\n}\n',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CS003 — Thread.Sleep() in async code
// ---------------------------------------------------------------------------

describe('CS003 — Thread.Sleep() in async code', () => {
  const rule = plugin.rules[2];

  it('flags Thread.Sleep() inside an async method', () => {
    const ctx = makeContext([
      makeFile(
        '/src/Services/MyService.cs',
        'public async Task DoWorkAsync() {\n    Thread.Sleep(1000);\n}\n',
      ),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('CS003');
    expect(findings[0].severity).toBe('high');
  });

  it('does not flag Thread.Sleep() in a synchronous method', () => {
    const ctx = makeContext([
      makeFile(
        '/src/Services/MyService.cs',
        'public void DoWork() {\n    Thread.Sleep(1000);\n}\n',
      ),
    ]);
    // File has no `async` keyword, so the rule skips it.
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag Task.Delay() in async code', () => {
    const ctx = makeContext([
      makeFile(
        '/src/Services/MyService.cs',
        'public async Task DoWorkAsync() {\n    await Task.Delay(1000);\n}\n',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag comment lines', () => {
    const ctx = makeContext([
      makeFile(
        '/src/Services/MyService.cs',
        'public async Task DoWorkAsync() {\n    // Avoid Thread.Sleep() here\n}\n',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});
