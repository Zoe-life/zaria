import { describe, it, expect } from 'vitest';
import { plugin } from '../../../plugins/zaria-plugin-c/src/index.ts';
import type { AnalysisContext, ParsedFile } from '../../../src/audit/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(path: string, content: string): ParsedFile {
  return {
    sourceFile: {
      path,
      language: 'c',
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
    projectRoot: '/tmp/c-project',
    files,
    totalLoc: files.reduce((s, f) => s + f.loc, 0),
    languageDistribution: { c: files.length },
    importGraph: [],
  };
}

// ---------------------------------------------------------------------------
// Plugin metadata
// ---------------------------------------------------------------------------

describe('zaria-plugin-c metadata', () => {
  it('has the correct name', () => {
    expect(plugin.name).toBe('zaria-plugin-c');
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

  it('does not flag non-C files', () => {
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
          content: 'gets(buf);\nsprintf(buf, "%s", s);\nbuf = malloc(n);',
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
// C001 — gets() — guaranteed buffer overflow
// ---------------------------------------------------------------------------

describe('C001 — gets() usage', () => {
  const [rule] = plugin.rules;

  it('flags a gets() call', () => {
    const ctx = makeContext([makeFile('/src/input.c', 'char buf[256];\ngets(buf);\n')]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('C001');
    expect(findings[0].severity).toBe('critical');
  });

  it('does not flag fgets()', () => {
    const ctx = makeContext([
      makeFile('/src/input.c', 'char buf[256];\nfgets(buf, sizeof(buf), stdin);\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag comment lines', () => {
    const ctx = makeContext([makeFile('/src/input.c', '// Never use gets(buf); it is unsafe\n')]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('reports correct file path and line number', () => {
    const content = '#include <stdio.h>\n\nchar buf[64];\ngets(buf);\n';
    const ctx = makeContext([makeFile('/src/input.c', content)]);
    const [finding] = rule.check(ctx);
    expect(finding.file).toBe('/src/input.c');
    expect(finding.line).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// C002 — sprintf() without bounds
// ---------------------------------------------------------------------------

describe('C002 — sprintf() without bounds', () => {
  const rule = plugin.rules[1];

  it('flags sprintf()', () => {
    const ctx = makeContext([makeFile('/src/format.c', 'sprintf(buf, "%s/%s", dir, file);\n')]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('C002');
    expect(findings[0].severity).toBe('high');
  });

  it('does not flag snprintf()', () => {
    const ctx = makeContext([
      makeFile('/src/format.c', 'snprintf(buf, sizeof(buf), "%s/%s", dir, file);\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag comment lines', () => {
    const ctx = makeContext([
      makeFile('/src/format.c', '// Use snprintf instead of sprintf(buf, ...)\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// C003 — malloc() without NULL check
// ---------------------------------------------------------------------------

describe('C003 — malloc() without NULL check', () => {
  const rule = plugin.rules[2];

  it('flags malloc() without an immediately following NULL check', () => {
    const ctx = makeContext([
      makeFile('/src/alloc.c', 'char *buf = malloc(size);\nprocess(buf);\n'),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('C003');
    expect(findings[0].severity).toBe('high');
  });

  it('does not flag malloc() when the next line is a NULL check', () => {
    const ctx = makeContext([
      makeFile(
        '/src/alloc.c',
        'char *buf = malloc(size);\nif (buf == NULL) { perror("malloc"); return -1; }\n',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag calloc() when the next line is a NULL check', () => {
    const ctx = makeContext([
      makeFile('/src/alloc.c', 'int *arr = calloc(n, sizeof(int));\nif (!arr) { return NULL; }\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag comment lines', () => {
    const ctx = makeContext([
      makeFile('/src/alloc.c', '// buf = malloc(n) — always check for NULL\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});
