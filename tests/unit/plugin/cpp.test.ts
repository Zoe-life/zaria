import { describe, it, expect } from 'vitest';
import { plugin } from '../../../plugins/zaria-plugin-cpp/src/index.ts';
import type { AnalysisContext, ParsedFile } from '../../../src/audit/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(path: string, content: string, language: 'cpp' = 'cpp'): ParsedFile {
  return {
    sourceFile: {
      path,
      language,
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
    projectRoot: '/tmp/cpp-project',
    files,
    totalLoc: files.reduce((s, f) => s + f.loc, 0),
    languageDistribution: { cpp: files.length },
    importGraph: [],
  };
}

// ---------------------------------------------------------------------------
// Plugin metadata
// ---------------------------------------------------------------------------

describe('zaria-plugin-cpp metadata', () => {
  it('has the correct name', () => {
    expect(plugin.name).toBe('zaria-plugin-cpp');
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

  it('does not flag non-C++ files', () => {
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
          content: 'using namespace std;\nnew Widget();\nprintf("hi");',
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
// CPP001 — using namespace std; in headers
// ---------------------------------------------------------------------------

describe('CPP001 — using namespace std; in headers', () => {
  const [rule] = plugin.rules;

  it('flags "using namespace std;" in a .hpp header', () => {
    const ctx = makeContext([
      makeFile('/include/utils.hpp', '#pragma once\nusing namespace std;\nvoid foo();\n'),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('CPP001');
    expect(findings[0].severity).toBe('medium');
  });

  it('flags "using namespace std;" in a .h header', () => {
    const ctx = makeContext([makeFile('/include/utils.h', 'using namespace std;\n')]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });

  it('does not flag "using namespace std;" in a .cpp implementation file', () => {
    const ctx = makeContext([
      makeFile('/src/utils.cpp', 'using namespace std;\nvoid foo() { cout << "hi"; }\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag comment lines in headers', () => {
    const ctx = makeContext([makeFile('/include/utils.hpp', '// do not: using namespace std;\n')]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CPP002 — Raw new/delete instead of smart pointers
// ---------------------------------------------------------------------------

describe('CPP002 — raw new/delete', () => {
  const rule = plugin.rules[1];

  it('flags raw new Widget()', () => {
    const ctx = makeContext([
      makeFile('/src/main.cpp', 'Widget *w = new Widget();\nw->render();\n'),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('CPP002');
    expect(findings[0].severity).toBe('high');
  });

  it('flags delete pointer', () => {
    const ctx = makeContext([makeFile('/src/main.cpp', 'delete ptr;\n')]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });

  it('does not flag make_unique', () => {
    const ctx = makeContext([makeFile('/src/main.cpp', 'auto w = std::make_unique<Widget>();\n')]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag comment lines', () => {
    const ctx = makeContext([
      makeFile('/src/main.cpp', '// Avoid: Widget *w = new Widget(); use make_unique\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CPP003 — printf/scanf instead of iostream
// ---------------------------------------------------------------------------

describe('CPP003 — printf/scanf instead of iostream', () => {
  const rule = plugin.rules[2];

  it('flags printf()', () => {
    const ctx = makeContext([makeFile('/src/main.cpp', 'printf("Value: %d\\n", value);\n')]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('CPP003');
    expect(findings[0].severity).toBe('medium');
  });

  it('flags scanf()', () => {
    const ctx = makeContext([makeFile('/src/main.cpp', 'scanf("%d", &n);\n')]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });

  it('flags fprintf()', () => {
    const ctx = makeContext([makeFile('/src/main.cpp', 'fprintf(stderr, "error: %s\\n", msg);\n')]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });

  it('does not flag std::cout', () => {
    const ctx = makeContext([
      makeFile('/src/main.cpp', 'std::cout << "Value: " << value << std::endl;\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag comment lines', () => {
    const ctx = makeContext([makeFile('/src/main.cpp', '// Use std::cout instead of printf()\n')]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});
