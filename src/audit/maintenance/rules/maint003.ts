/**
 * MAINT003 — Deprecated Dependency
 *
 * Reads the project's `package.json` (from `context.projectRoot`) and flags
 * any dependency (regular or dev) that is known to be officially deprecated or
 * abandoned in favour of a maintained alternative.
 *
 * The deprecated-package registry is a hard-coded `Set` of well-known,
 * publicly documented deprecations. This approach is intentionally offline-first:
 * it requires no network access and runs in O(d) time where d is the number of
 * declared dependencies.
 *
 * If no `package.json` exists at `projectRoot`, the rule is silently skipped
 * (the project may use a different package manager or none at all).
 *
 * Time complexity:  O(d) — one Set.has() per dependency.
 * Space complexity: O(k) — the static registry (k constant entries).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Deprecated-package registry
// ---------------------------------------------------------------------------

/**
 * Well-known packages that have been officially deprecated by their maintainers
 * or by the npm registry, with established modern replacements.
 *
 * Sources: npm deprecation notices, GitHub repositories, and official
 * maintainer announcements.
 */
const DEPRECATED_PACKAGES: ReadonlySet<string> = new Set([
  // HTTP client — deprecated 2020; use node-fetch, got, axios, or undici
  'request',
  'request-promise',
  'request-promise-native',
  // UUID — superseded by the 'uuid' package
  'node-uuid',
  // Deprecated npm lifecycle packages
  'inflight',
  'npmlog',
  'are-we-there-yet',
  'gauge',
  // File-system utilities now covered by Node.js built-ins
  'mkdirp', // use fs.mkdir({ recursive: true })
  'rimraf', // use fs.rm({ recursive: true, force: true })
  // Other well-known deprecated packages
  'domexception', // built into Node.js 17+
  'abab', // built into Node.js (atob/btoa)
  'querystring', // use URLSearchParams (built-in)
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Read and parse `package.json` from `projectRoot`.
 * Returns `null` if the file does not exist or cannot be parsed.
 */
function readPackageJson(projectRoot: string): PackageJson | null {
  try {
    const raw = readFileSync(join(projectRoot, 'package.json'), 'utf8');
    return JSON.parse(raw) as PackageJson;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const maint003: Rule = {
  id: 'MAINT003',
  name: 'Deprecated Dependency',
  description:
    'Detects dependencies listed in package.json that are officially deprecated or abandoned. Deprecated packages receive no security patches and may be removed from the npm registry.',
  severity: 'medium',

  check(context: AnalysisContext): Finding[] {
    const pkg = readPackageJson(context.projectRoot);
    if (pkg === null) return [];

    const pkgPath = join(context.projectRoot, 'package.json');
    const allDeps: Record<string, string> = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };

    const findings: Finding[] = [];

    for (const name of Object.keys(allDeps)) {
      if (!DEPRECATED_PACKAGES.has(name)) continue;

      findings.push({
        ruleId: 'MAINT003',
        severity: 'medium',
        message: `Dependency "${name}" is officially deprecated and is no longer maintained. It will not receive security updates.`,
        file: pkgPath,
        recommendation: `Replace "${name}" with an actively maintained alternative. Consult the package's npm page or GitHub repository for the recommended successor.`,
      });
    }

    return findings;
  },
};
