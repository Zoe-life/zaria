import { describe, it, expect } from 'vitest';
import { plugin } from '../../../plugins/zaria-plugin-nextjs/src/index.ts';
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
    projectRoot: '/tmp/next-project',
    files,
    totalLoc: files.reduce((s, f) => s + f.loc, 0),
    languageDistribution: { typescript: files.length },
    importGraph: [],
  };
}

// ---------------------------------------------------------------------------
// Plugin metadata
// ---------------------------------------------------------------------------

describe('zaria-plugin-nextjs metadata', () => {
  it('has the correct name', () => {
    expect(plugin.name).toBe('zaria-plugin-nextjs');
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
// NEXTJS001 — Bare <img> instead of next/image
// ---------------------------------------------------------------------------

describe('NEXTJS001 — bare <img> tag', () => {
  const [rule] = plugin.rules;

  it('flags a .tsx file containing a bare <img>', () => {
    const ctx = makeContext([
      makeFile('/app/pages/index.tsx', '<div><img src="/logo.png" alt="logo" /></div>'),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('NEXTJS001');
  });

  it('returns no findings for a file using <Image>', () => {
    const ctx = makeContext([
      makeFile('/app/pages/index.tsx', 'import Image from "next/image"; <Image src="/l.png" />'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag non-TSX/JSX files', () => {
    const ctx = makeContext([makeFile('/app/styles.css', 'background: url(img.png);')]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// NEXTJS002 — Direct fetch inside page component
// ---------------------------------------------------------------------------

describe('NEXTJS002 — fetch inside page component', () => {
  const rule = plugin.rules[1];

  it('flags fetch() inside a pages/ file', () => {
    const ctx = makeContext([
      makeFile('/app/pages/users.tsx', 'export default function Page() { fetch("/api/users"); }'),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('NEXTJS002');
  });

  it('flags axios.get() inside a pages/ file', () => {
    const ctx = makeContext([makeFile('/app/pages/data.tsx', 'axios.get("/api/data")')]);
    expect(rule.check(ctx).length).toBeGreaterThanOrEqual(1);
  });

  it('does not flag fetch inside a non-page file', () => {
    const ctx = makeContext([
      makeFile(
        '/home/project/lib/api.ts',
        'export async function getData() { return fetch("/api"); }',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// NEXTJS003 — Missing error boundary in page files
// ---------------------------------------------------------------------------

describe('NEXTJS003 — missing error boundary', () => {
  const rule = plugin.rules[2];

  it('flags a pages/ file without an error boundary', () => {
    const ctx = makeContext([
      makeFile('/app/pages/about.tsx', 'export default function About() { return <div/>; }'),
    ]);
    const findings = rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].ruleId).toBe('NEXTJS003');
  });

  it('does not flag a pages/ file that references ErrorBoundary', () => {
    const ctx = makeContext([
      makeFile(
        '/app/pages/home.tsx',
        'import ErrorBoundary from "../components/ErrorBoundary"; ' +
          'export default function Home() { return <ErrorBoundary><div/></ErrorBoundary>; }',
      ),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });

  it('does not flag _app or _document files', () => {
    const ctx = makeContext([
      makeFile('/app/pages/_app.tsx', 'export default function App() { return <div/>; }'),
    ]);
    expect(rule.check(ctx)).toHaveLength(0);
  });
});
