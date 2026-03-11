import { describe, it, expect } from 'vitest';
import { plugin } from '../../../plugins/zaria-plugin-rust/src/index.ts';
import type { AnalysisContext, ParsedFile } from '../../../src/audit/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(path: string, content: string): ParsedFile {
  return {
    sourceFile: {
      path,
      language: 'rust',
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
    projectRoot: '/tmp/rust-project',
    files,
    totalLoc: files.reduce((s, f) => s + f.loc, 0),
    languageDistribution: { rust: files.length },
    importGraph: [],
  };
}

// ---------------------------------------------------------------------------
// Plugin metadata
// ---------------------------------------------------------------------------

describe('zaria-plugin-rust metadata', () => {
  it('has the correct name', () => {
    expect(plugin.name).toBe('zaria-plugin-rust');
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

  it('does not flag non-Rust files', () => {
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
          content: 'result.unwrap()\nunsafe { deref(ptr) }\nval.clone()',
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
// RUST001 — .unwrap() calls
// ---------------------------------------------------------------------------

describe('RUST001 — .unwrap() calls', () => {
  const [rule] = plugin.rules;

  it('flags .unwrap() in production code', () => {
    const ctx = makeContext([makeFile('/src/main.rs', 'let val = result.unwrap();\n')]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('RUST001');
    expect(findings[0].severity).toBe('high');
  });

  it('does not flag .unwrap() in a test module', () => {
    const ctx = makeContext([
      makeFile(
        '/src/lib.rs',
        '#[cfg(test)]\nmod tests {\n    #[test]\n    fn it_works() {\n        let x = Some(1).unwrap();\n    }\n}\n',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag comment lines', () => {
    const ctx = makeContext([makeFile('/src/main.rs', '// Do not use .unwrap() in production\n')]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag code that uses ? operator', () => {
    const ctx = makeContext([makeFile('/src/main.rs', 'let val = result?;\n')]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('reports correct line number', () => {
    const content = 'fn main() {\n    let f = File::open("hello.txt").unwrap();\n}\n';
    const ctx = makeContext([makeFile('/src/main.rs', content)]);
    const [finding] = rule.check(ctx);
    expect(finding.line).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// RUST002 — unsafe blocks without SAFETY comment
// ---------------------------------------------------------------------------

describe('RUST002 — unsafe blocks', () => {
  const rule = plugin.rules[1];

  it('flags an unsafe block without a SAFETY comment', () => {
    const ctx = makeContext([
      makeFile('/src/lib.rs', 'fn read_ptr(p: *const u8) -> u8 {\n    unsafe { *p }\n}\n'),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('RUST002');
    expect(findings[0].severity).toBe('medium');
  });

  it('does not flag an unsafe block that has a preceding SAFETY comment', () => {
    const ctx = makeContext([
      makeFile(
        '/src/lib.rs',
        'fn read_ptr(p: *const u8) -> u8 {\n    // SAFETY: p is guaranteed non-null by contract\n    unsafe { *p }\n}\n',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag comment lines', () => {
    const ctx = makeContext([makeFile('/src/lib.rs', '// Do not write unsafe { }\n')]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// RUST003 — .clone() calls
// ---------------------------------------------------------------------------

describe('RUST003 — .clone() calls', () => {
  const rule = plugin.rules[2];

  it('flags .clone() in production code', () => {
    const ctx = makeContext([makeFile('/src/main.rs', 'let owned = some_string.clone();\n')]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('RUST003');
    expect(findings[0].severity).toBe('low');
  });

  it('does not flag .clone() in a test module', () => {
    const ctx = makeContext([
      makeFile(
        '/src/lib.rs',
        '#[cfg(test)]\nmod tests {\n    fn it_works() { let s = "hi".to_string().clone(); }\n}\n',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag comment lines', () => {
    const ctx = makeContext([makeFile('/src/main.rs', '// Avoid unnecessary .clone() calls\n')]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag files with no .clone() calls', () => {
    const ctx = makeContext([
      makeFile('/src/main.rs', 'fn greet(name: &str) { println!("Hello, {}", name); }\n'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});
