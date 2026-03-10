/**
 * `zaria-plugin-nextjs` — official Next.js plugin for Zaria.
 *
 * Provides static-analysis rules specific to Next.js projects:
 *   NEXTJS001  Bare <img> tags instead of next/image
 *   NEXTJS002  Direct fetch/axios calls inside page components
 *   NEXTJS003  Missing error boundaries in page files
 */

import type { ZariaPlugin, PluginContext } from '../../src/plugin/types.js';
import type { Rule, AnalysisContext, Finding } from '../../src/audit/types.js';

// ---------------------------------------------------------------------------
// NEXTJS001 — Bare <img> tag instead of next/image
// ---------------------------------------------------------------------------

const nextjs001: Rule = {
  id: 'NEXTJS001',
  name: 'Use next/image instead of <img>',
  description:
    'Raw <img> elements bypass Next.js image optimisation (lazy loading, WebP conversion, ' +
    'blur placeholder). Replace with the <Image> component from next/image.',
  severity: 'medium',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    // Match bare <img (not </img or <!-- img)
    const IMG_RE = /<img[\s>]/g;
    for (const file of context.files) {
      if (!/\.[jt]sx?$/.test(file.sourceFile.path)) continue;
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        if (IMG_RE.test(line)) {
          findings.push({
            ruleId: 'NEXTJS001',
            severity: 'medium',
            message: 'Bare <img> element found — use <Image> from next/image for optimisation.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Replace <img> with <Image> from "next/image". ' +
              'Set width, height, and alt props to avoid layout shift.',
          });
        }
        IMG_RE.lastIndex = 0;
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// NEXTJS002 — Direct fetch/axios calls inside page components
// ---------------------------------------------------------------------------

const nextjs002: Rule = {
  id: 'NEXTJS002',
  name: 'Avoid data fetching inside page components',
  description:
    'Calling fetch() or axios inside a React component body runs on every render. ' +
    'Prefer getServerSideProps, getStaticProps, React Server Components, or a data-fetching ' +
    'library (SWR, React Query) to decouple data from rendering.',
  severity: 'high',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    // Only flag files that look like Next.js pages:
    // - pages/ router: any file directly inside a pages/ directory
    // - app/ router: files named page.tsx, page.ts, route.tsx, or route.ts
    const PAGE_PATH_RE = /[\\/]pages[\\/]|[\\/]app[\\/].*[\\/](?:page|route)\.[jt]sx?$/;
    const FETCH_RE = /\bfetch\s*\(|axios\s*\.\s*(get|post|put|patch|delete)\s*\(/g;
    for (const file of context.files) {
      if (!PAGE_PATH_RE.test(file.sourceFile.path)) continue;
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        if (FETCH_RE.test(line)) {
          findings.push({
            ruleId: 'NEXTJS002',
            severity: 'high',
            message:
              'Direct HTTP call inside a page component detected. ' +
              'Move data fetching to getServerSideProps, getStaticProps, or a Server Component.',
            file: file.sourceFile.path,
            line: idx + 1,
            recommendation:
              'Extract the fetch call into getServerSideProps or getStaticProps, ' +
              'or use a client-side library like SWR or TanStack Query with appropriate caching.',
          });
        }
        FETCH_RE.lastIndex = 0;
      });
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// NEXTJS003 — Missing error boundary in page files
// ---------------------------------------------------------------------------

const nextjs003: Rule = {
  id: 'NEXTJS003',
  name: 'Add error boundaries to page components',
  description:
    'Page components that render dynamic data should be wrapped in an error boundary ' +
    'so that uncaught errors display a fallback UI instead of crashing the entire page.',
  severity: 'low',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];
    const PAGE_PATH_RE = /[\\/]pages[\\/][^_]/; // skip _app, _document
    const HAS_BOUNDARY_RE = /ErrorBoundary|error\.tsx|error\.jsx/;
    for (const file of context.files) {
      if (!PAGE_PATH_RE.test(file.sourceFile.path)) continue;
      if (!HAS_BOUNDARY_RE.test(file.content)) {
        findings.push({
          ruleId: 'NEXTJS003',
          severity: 'low',
          message: 'Page component lacks an error boundary.',
          file: file.sourceFile.path,
          recommendation:
            'Wrap the page export in an ErrorBoundary component, ' +
            'or add an error.tsx sibling file (Next.js 13+ App Router).',
        });
      }
    }
    return findings;
  },
};

// ---------------------------------------------------------------------------
// Plugin export
// ---------------------------------------------------------------------------

export const plugin: ZariaPlugin = {
  name: 'zaria-plugin-nextjs',
  version: '1.0.0',
  rules: [nextjs001, nextjs002, nextjs003],

  async onInit(_context: PluginContext): Promise<void> {
    // No async setup required for static analysis rules.
  },
};

export default plugin;
