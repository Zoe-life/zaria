import { describe, it, expect } from 'vitest';
import { plugin } from '../../../plugins/zaria-plugin-python/src/index.ts';
import type { AnalysisContext, ParsedFile } from '../../../src/audit/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(path: string, content: string): ParsedFile {
  return {
    sourceFile: {
      path,
      language: 'python',
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
    projectRoot: '/tmp/python-project',
    files,
    totalLoc: files.reduce((s, f) => s + f.loc, 0),
    languageDistribution: { python: files.length },
    importGraph: [],
  };
}

// ---------------------------------------------------------------------------
// Plugin metadata
// ---------------------------------------------------------------------------

describe('zaria-plugin-python metadata', () => {
  it('has the correct name', () => {
    expect(plugin.name).toBe('zaria-plugin-python');
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

  it('does not flag TypeScript files', () => {
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
          content: 'print("hello")\nexcept Exception:\n  pass',
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
// PY001 — print() instead of logging
// ---------------------------------------------------------------------------

describe('PY001 — print() instead of logging', () => {
  const [rule] = plugin.rules;

  it('flags print() in a non-test Python file', () => {
    const ctx = makeContext([makeFile('/app/service.py', 'print("starting server")\n')]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('PY001');
    expect(findings[0].severity).toBe('low');
  });

  it('does not flag print() in a test file (tests/ directory)', () => {
    const ctx = makeContext([makeFile('/app/tests/test_service.py', 'print("debug")\n')]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag print() in a _test.py file', () => {
    const ctx = makeContext([makeFile('/app/service_test.py', 'print("debug")\n')]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag files with no print() calls', () => {
    const ctx = makeContext([
      makeFile(
        '/app/service.py',
        'import logging\nlogger = logging.getLogger(__name__)\nlogger.info("started")\n',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('reports correct file path and line number', () => {
    const content = '# module\n\nprint("value")\n';
    const ctx = makeContext([makeFile('/app/utils.py', content)]);
    const [finding] = rule.check(ctx);
    expect(finding.file).toBe('/app/utils.py');
    expect(finding.line).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// PY002 — Bare or broad except clauses
// ---------------------------------------------------------------------------

describe('PY002 — bare or broad except clauses', () => {
  const rule = plugin.rules[1];

  it('flags a bare `except:` block', () => {
    const ctx = makeContext([makeFile('/app/io.py', 'try:\n    open("f")\nexcept:\n    pass\n')]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('PY002');
  });

  it('flags `except Exception:` block', () => {
    const ctx = makeContext([
      makeFile('/app/io.py', 'try:\n    risky()\nexcept Exception:\n    pass\n'),
    ]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });

  it('flags `except Exception as e:` block', () => {
    const ctx = makeContext([
      makeFile('/app/io.py', 'try:\n    risky()\nexcept Exception as e:\n    pass\n'),
    ]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });

  it('returns high severity when body is pass', () => {
    const ctx = makeContext([makeFile('/app/io.py', 'try:\n    x()\nexcept:\n    pass\n')]);
    const findings = rule.check(ctx);
    expect(findings[0].severity).toBe('high');
  });

  it('does not flag specific exception types', () => {
    const ctx = makeContext([
      makeFile(
        '/app/io.py',
        'try:\n    open("f")\nexcept FileNotFoundError as e:\n    handle(e)\n',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// PY003 — Mutable default arguments
// ---------------------------------------------------------------------------

describe('PY003 — mutable default arguments', () => {
  const rule = plugin.rules[2];

  it('flags a list default argument', () => {
    const ctx = makeContext([
      makeFile(
        '/app/util.py',
        'def append_item(item, items=[]):\n    items.append(item)\n    return items\n',
      ),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('PY003');
    expect(findings[0].severity).toBe('medium');
  });

  it('flags a dict default argument', () => {
    const ctx = makeContext([
      makeFile('/app/util.py', 'def build(config={}):\n    return config\n'),
    ]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });

  it('flags a set() default argument', () => {
    const ctx = makeContext([
      makeFile('/app/util.py', 'def collect(seen=set()):\n    return seen\n'),
    ]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });

  it('does not flag None as default', () => {
    const ctx = makeContext([
      makeFile(
        '/app/util.py',
        'def append_item(item, items=None):\n    if items is None: items = []\n    return items\n',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag immutable defaults (int, str, tuple)', () => {
    const ctx = makeContext([
      makeFile('/app/util.py', 'def greet(name="world", count=0):\n    pass\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});
