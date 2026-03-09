/**
 * MAINT005 — Outdated Dependency
 *
 * Reads the project's `package.json` and flags dependencies whose declared
 * major version is more than 2 major versions behind the latest known stable
 * release.
 *
 * Rationale: a package that is 3+ major versions behind is unlikely to receive
 * backported security fixes, may lack support for current Node.js / browser
 * targets, and accumulates a larger API-migration burden the longer it waits.
 *
 * The "latest known major" registry is a hard-coded map of popular packages.
 * This is intentionally offline-first — no npm API calls are made — keeping
 * the rule O(d) in number of dependencies.
 *
 * Version parsing:
 *  - Range operators (`^`, `~`, `>=`, `<=`, `>`, `<`) are stripped.
 *  - Only the major component is extracted and compared.
 *  - Wildcard versions (`*`, `x`) and pre-release tags are skipped.
 *
 * If no `package.json` exists at `projectRoot`, the rule is silently skipped.
 *
 * Time complexity:  O(d) — one Map.get() per dependency.
 * Space complexity: O(k) — the static registry (k constant entries).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { Rule, Finding, AnalysisContext } from '../../types.js';

// ---------------------------------------------------------------------------
// Known-current-major registry
// ---------------------------------------------------------------------------

/**
 * Maps a package name to its latest known stable major version.
 *
 * Only packages where the current major version is well-established and the
 * older versions are no longer receiving security backports are included.
 * The list is conservative to avoid false positives from fast-moving packages.
 */
const KNOWN_CURRENT_MAJOR: Readonly<Record<string, number>> = {
  lodash: 4,
  react: 18,
  'react-dom': 18,
  webpack: 5,
  jest: 29,
  eslint: 9,
  typescript: 5,
  'babel-core': 7,
  '@babel/core': 7,
  'core-js': 3,
  rxjs: 7,
  'zone.js': 0, // intentionally 0 — zone.js is at 0.x so no outdated check
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readPackageJson(projectRoot: string): PackageJson | null {
  try {
    const raw = readFileSync(join(projectRoot, 'package.json'), 'utf8');
    return JSON.parse(raw) as PackageJson;
  } catch {
    return null;
  }
}

/**
 * Parse the major version number from a semver range string.
 * Returns `null` for wildcard (`*`, `x`), pre-release, or unparseable values.
 *
 * Examples:
 *   "^1.2.3" → 1
 *   "~2.0.0" → 2
 *   ">=3.0.0" → 3
 *   "*"       → null
 *   "latest"  → null
 */
function parseMajorVersion(version: string): number | null {
  const stripped = version.trim().replace(/^[~^>=<]+/, '');
  if (stripped === '*' || stripped === 'x' || stripped === 'latest') return null;
  const match = /^(\d+)/.exec(stripped);
  if (!match) return null;
  return parseInt(match[1], 10);
}

// ---------------------------------------------------------------------------
// Rule implementation
// ---------------------------------------------------------------------------

export const maint005: Rule = {
  id: 'MAINT005',
  name: 'Outdated Dependency',
  description:
    'Detects dependencies whose declared major version is more than 2 major versions behind the latest known stable release. Severely outdated packages are unlikely to receive security backports.',
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

    for (const [name, versionRange] of Object.entries(allDeps)) {
      const currentMajor = KNOWN_CURRENT_MAJOR[name];
      if (currentMajor === undefined || currentMajor === 0) continue;

      const installedMajor = parseMajorVersion(versionRange);
      if (installedMajor === null) continue;

      if (currentMajor - installedMajor > 2) {
        findings.push({
          ruleId: 'MAINT005',
          severity: 'medium',
          message: `Dependency "${name}" is pinned to major version ${installedMajor} but the latest stable major is ${currentMajor} (${currentMajor - installedMajor} major versions behind). Security fixes are unlikely to be backported.`,
          file: pkgPath,
          recommendation: `Upgrade "${name}" to its latest major version following the official migration guide. Review the changelog for breaking changes.`,
        });
      }
    }

    return findings;
  },
};
