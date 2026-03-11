import { describe, it, expect } from 'vitest';
import { plugin } from '../../../plugins/zaria-plugin-go/src/index.ts';
import type { AnalysisContext, ParsedFile } from '../../../src/audit/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(path: string, content: string): ParsedFile {
  return {
    sourceFile: {
      path,
      language: 'go',
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
    projectRoot: '/tmp/go-project',
    files,
    totalLoc: files.reduce((s, f) => s + f.loc, 0),
    languageDistribution: { go: files.length },
    importGraph: [],
  };
}

// ---------------------------------------------------------------------------
// Plugin metadata
// ---------------------------------------------------------------------------

describe('zaria-plugin-go metadata', () => {
  it('has the correct name', () => {
    expect(plugin.name).toBe('zaria-plugin-go');
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

  it('does not flag non-Go files', () => {
    const ctx: AnalysisContext = {
      projectRoot: '/tmp',
      files: [
        {
          sourceFile: {
            path: '/tmp/app.ts',
            language: 'typescript',
            size: 20,
            lastModified: new Date(),
          },
          content: 'result, _ := doThing()\npanic("oops")\nfmt.Println("hi")',
          loc: 3,
          functionCount: 0,
          classCount: 0,
          exportCount: 0,
          imports: [],
        },
      ],
      totalLoc: 3,
      languageDistribution: { typescript: 1 },
      importGraph: [],
    };
    for (const rule of plugin.rules) {
      expect(rule.check(ctx)).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// GO001 — Ignored errors
// ---------------------------------------------------------------------------

describe('GO001 — ignored errors', () => {
  const [rule] = plugin.rules;

  it('flags a blank identifier on the error position', () => {
    const ctx = makeContext([
      makeFile('/app/main.go', 'result, _ := doSomething()\nfmt.Println(result)\n'),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('GO001');
    expect(findings[0].severity).toBe('high');
  });

  it('does not flag properly checked errors', () => {
    const ctx = makeContext([
      makeFile(
        '/app/main.go',
        'result, err := doSomething()\nif err != nil { return err }\nprocess(result)\n',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag errors in test files', () => {
    const ctx = makeContext([makeFile('/app/main_test.go', 'result, _ := doSomething()\n')]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag comment lines', () => {
    const ctx = makeContext([
      makeFile('/app/main.go', '// result, _ := doSomething() — intentional\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// GO002 — panic() in production code
// ---------------------------------------------------------------------------

describe('GO002 — panic() in production code', () => {
  const rule = plugin.rules[1];

  it('flags a panic() call in production code', () => {
    const ctx = makeContext([
      makeFile('/app/server.go', 'func run() {\n    panic("unrecoverable state")\n}\n'),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('GO002');
    expect(findings[0].severity).toBe('high');
  });

  it('does not flag panic() in test files', () => {
    const ctx = makeContext([
      makeFile('/app/server_test.go', 'func TestFoo(t *testing.T) { panic("test") }\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag a comment mentioning panic', () => {
    const ctx = makeContext([
      makeFile('/app/server.go', '// This function will panic() if state is invalid\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag code without panic()', () => {
    const ctx = makeContext([
      makeFile('/app/server.go', 'func run() error {\n    return fmt.Errorf("failed")\n}\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// GO003 — fmt.Print* instead of structured logger
// ---------------------------------------------------------------------------

describe('GO003 — fmt.Print* instead of structured logger', () => {
  const rule = plugin.rules[2];

  it('flags fmt.Println in production code', () => {
    const ctx = makeContext([
      makeFile('/app/main.go', 'fmt.Println("Starting server on port", port)\n'),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('GO003');
    expect(findings[0].severity).toBe('low');
  });

  it('flags fmt.Printf in production code', () => {
    const ctx = makeContext([makeFile('/app/main.go', 'fmt.Printf("value: %d\\n", val)\n')]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });

  it('flags fmt.Print in production code', () => {
    const ctx = makeContext([makeFile('/app/main.go', 'fmt.Print("done")\n')]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });

  it('does not flag fmt.Print* in test files', () => {
    const ctx = makeContext([makeFile('/app/main_test.go', 'fmt.Println("test output")\n')]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag files that use slog', () => {
    const ctx = makeContext([
      makeFile('/app/main.go', 'slog.Info("Server started", "port", port)\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});
