/**
 * AnalysisContext builder — Phase 4.4
 *
 * Aggregates all ParsedFile objects into the single AnalysisContext that is
 * passed to every audit rule.
 */

import type { AnalysisContext, ParsedFile, ImportEdge } from './types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build an `AnalysisContext` from a list of already-parsed files.
 *
 * @param projectRoot  Absolute path to the analysed project root.
 * @param files        Parsed file list as produced by `parseFiles`.
 */
export function buildAnalysisContext(projectRoot: string, files: ParsedFile[]): AnalysisContext {
  const totalLoc = files.reduce((sum, f) => sum + f.loc, 0);

  // Language distribution — count files per language
  const languageDistribution: Record<string, number> = {};
  for (const f of files) {
    const lang = f.sourceFile.language;
    languageDistribution[lang] = (languageDistribution[lang] ?? 0) + 1;
  }

  // Flatten import graph across all files (deduplicate identical edges)
  const edgeSet = new Set<string>();
  const importGraph: ImportEdge[] = [];
  for (const f of files) {
    for (const edge of f.imports) {
      const key = `${edge.from}→${edge.to}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        importGraph.push(edge);
      }
    }
  }

  return { projectRoot, files, totalLoc, languageDistribution, importGraph };
}
