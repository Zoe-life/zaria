/**
 * File traversal engine — Phase 4.1 / Phase 15
 *
 * Recursively walks a project directory and returns SourceFile descriptors
 * for every recognised source file, honouring both a hard-coded default
 * ignore list and the caller-supplied `ignorePaths` array from the Zaria
 * config.
 *
 * Supported languages: TypeScript, JavaScript, Python, Go, Rust, Java,
 * C, C++, C#.
 */

import { readdirSync, lstatSync, realpathSync } from 'fs';
import { join, extname, relative } from 'path';
import type { SourceFile, SupportedLanguage } from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** File extensions considered TypeScript source. */
const TS_EXTENSIONS = new Set(['.ts', '.tsx']);

/** File extensions considered JavaScript source. */
const JS_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs']);

/** File extensions for other supported languages. */
const OTHER_EXTENSIONS = new Map<string, SupportedLanguage>([
  ['.py', 'python'],
  ['.go', 'go'],
  ['.rs', 'rust'],
  ['.java', 'java'],
  // C
  ['.c', 'c'],
  ['.h', 'c'],
  // C++
  ['.cpp', 'cpp'],
  ['.cxx', 'cpp'],
  ['.cc', 'cpp'],
  ['.hpp', 'cpp'],
  ['.hxx', 'cpp'],
  // C#
  ['.cs', 'csharp'],
]);

/** Directory / path segments that are always skipped. */
const DEFAULT_IGNORE = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  '.git',
  '.hg',
  '.svn',
  'coverage',
  '.next',
  '.nuxt',
  '.vite',
  '__pycache__',
  '.cache',
  '.turbo',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectLanguage(ext: string): SupportedLanguage {
  if (TS_EXTENSIONS.has(ext)) return 'typescript';
  if (JS_EXTENSIONS.has(ext)) return 'javascript';
  return OTHER_EXTENSIONS.get(ext) ?? 'unknown';
}

/**
 * Returns `true` when the given absolute `filePath` (or any of its ancestor
 * segments relative to `projectRoot`) matches one of the ignore patterns.
 *
 * Each entry in `ignorePaths` is matched as:
 *  - a literal directory/filename segment, OR
 *  - a simple path prefix (relative to the project root).
 */
function isIgnored(filePath: string, projectRoot: string, ignorePaths: string[]): boolean {
  const rel = relative(projectRoot, filePath);
  const segments = rel.split(/[\\/]/);

  // Check default ignores against every path segment
  for (const segment of segments) {
    if (DEFAULT_IGNORE.has(segment)) return true;
  }

  // Check caller-supplied ignores
  for (const pattern of ignorePaths) {
    // Normalise the pattern to forward slashes for consistent comparison
    const normalised = pattern.replace(/\\/g, '/');
    const normRel = rel.replace(/\\/g, '/');
    if (
      normRel === normalised ||
      normRel.startsWith(normalised + '/') ||
      segments.includes(pattern)
    ) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Recursively traverses `projectRoot` and returns a `SourceFile` descriptor
 * for every TypeScript / JavaScript file found.
 *
 * @param projectRoot  Absolute path to the root directory to analyse.
 * @param ignorePaths  Additional path patterns to skip (from `ignore.paths` in
 *                     the Zaria config).
 */
export function traverseFiles(projectRoot: string, ignorePaths: string[] = []): SourceFile[] {
  const results: SourceFile[] = [];
  const visitedRealPaths = new Set<string>();

  function walk(dir: string): void {
    // Track real paths to avoid symlink cycles
    let realDir: string;
    try {
      realDir = realpathSync(dir);
    } catch {
      return;
    }
    if (visitedRealPaths.has(realDir)) return;
    visitedRealPaths.add(realDir);

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      // Unreadable directory — skip silently
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry);

      if (isIgnored(fullPath, projectRoot, ignorePaths)) continue;

      let lstat;
      try {
        lstat = lstatSync(fullPath);
      } catch {
        continue;
      }

      // Skip symbolic links to prevent infinite recursion on symlink cycles
      if (lstat.isSymbolicLink()) continue;

      if (lstat.isDirectory()) {
        walk(fullPath);
      } else if (lstat.isFile()) {
        const ext = extname(entry).toLowerCase();
        const language = detectLanguage(ext);
        if (language === 'unknown') continue; // only include recognised languages

        results.push({
          path: fullPath,
          language,
          size: lstat.size,
          lastModified: lstat.mtime,
        });
      }
    }
  }

  walk(projectRoot);
  return results;
}
