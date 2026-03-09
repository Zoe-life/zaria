/**
 * TypeScript / JavaScript AST parser — Phase 4.2 & 4.3
 *
 * Uses ts-morph to parse source files and extract:
 *  - LOC (non-blank lines)
 *  - function count
 *  - class count
 *  - export count
 *  - import edges
 */

import { Project, SyntaxKind } from 'ts-morph';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import type { SourceFile as ZariaSourceFile, ParsedFile, ImportEdge } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count non-blank lines in raw source text. */
function countLoc(content: string): number {
  return content.split('\n').filter((l) => l.trim().length > 0).length;
}

/**
 * Attempt to resolve a relative import specifier to an absolute path.
 * Returns the specifier unchanged when it cannot be resolved (e.g. bare
 * package imports like "react" or "express").
 */
function resolveImportTo(specifier: string, fromFile: string): string {
  if (!specifier.startsWith('.')) {
    // Bare/external specifier — keep as-is
    return specifier;
  }

  const base = dirname(fromFile);
  // When a specifier ends with .js, also try the .ts/.tsx variant (ESM-style
  // TypeScript imports reference .js extensions even for .ts source files).
  let withTsExt = specifier;
  if (specifier.endsWith('.js')) {
    withTsExt = specifier.slice(0, -3) + '.ts';
  } else if (specifier.endsWith('.jsx')) {
    withTsExt = specifier.slice(0, -4) + '.tsx';
  }

  const candidates = [
    specifier,
    withTsExt,
    `${specifier}.ts`,
    `${specifier}.tsx`,
    `${specifier}.js`,
    `${specifier}.jsx`,
    `${specifier}/index.ts`,
    `${specifier}/index.js`,
  ];

  for (const candidate of candidates) {
    const abs = resolve(base, candidate);
    if (existsSync(abs)) return abs;
  }

  // Fall back to a resolved path even if the file doesn't exist on disk
  return resolve(base, specifier);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a collection of source files using ts-morph and return enriched
 * `ParsedFile` objects containing AST-derived metadata.
 *
 * A fresh ts-morph `Project` is created per call so that each audit run is
 * isolated and does not retain state between invocations.
 *
 * @param sourceFiles  SourceFile descriptors as produced by `traverseFiles`.
 */
export function parseFiles(sourceFiles: ZariaSourceFile[]): ParsedFile[] {
  if (sourceFiles.length === 0) return [];

  // Create an in-memory ts-morph project (no real tsconfig needed)
  const project = new Project({
    useInMemoryFileSystem: false,
    skipFileDependencyResolution: true,
    compilerOptions: {
      allowJs: true,
      checkJs: false,
      noEmit: true,
      skipLibCheck: true,
    },
  });

  // Add all discovered source files
  for (const sf of sourceFiles) {
    try {
      project.addSourceFileAtPath(sf.path);
    } catch {
      // If a file can't be added (permissions, encoding, etc.) skip it
    }
  }

  const parsed: ParsedFile[] = [];

  for (const sf of sourceFiles) {
    const tsFile = project.getSourceFile(sf.path);
    if (!tsFile) continue;

    const content = tsFile.getFullText();

    // -----------------------------------------------------------------------
    // LOC
    // -----------------------------------------------------------------------
    const loc = countLoc(content);

    // -----------------------------------------------------------------------
    // Function count
    // -----------------------------------------------------------------------
    const functionCount =
      tsFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration).length +
      tsFile.getDescendantsOfKind(SyntaxKind.ArrowFunction).length +
      tsFile.getDescendantsOfKind(SyntaxKind.MethodDeclaration).length +
      tsFile.getDescendantsOfKind(SyntaxKind.FunctionExpression).length;

    // -----------------------------------------------------------------------
    // Class count
    // -----------------------------------------------------------------------
    const classCount = tsFile.getDescendantsOfKind(SyntaxKind.ClassDeclaration).length;

    // -----------------------------------------------------------------------
    // Export count
    // -----------------------------------------------------------------------
    const exportCount = tsFile.getExportedDeclarations().size;

    // -----------------------------------------------------------------------
    // Imports
    // -----------------------------------------------------------------------
    const imports: ImportEdge[] = [];

    for (const importDecl of tsFile.getImportDeclarations()) {
      const specifier = importDecl.getModuleSpecifierValue();
      const to = resolveImportTo(specifier, sf.path);
      imports.push({ from: sf.path, to });
    }

    // Also capture dynamic imports: import('...')
    for (const callExpr of tsFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const expr = callExpr.getExpression();
      if (expr.getKind() === SyntaxKind.ImportKeyword) {
        const args = callExpr.getArguments();
        if (args.length > 0) {
          const firstArg = args[0];
          // Only handle string literal dynamic imports
          if (firstArg.getKind() === SyntaxKind.StringLiteral) {
            const specifier = firstArg.getText().replace(/['"]/g, '');
            const to = resolveImportTo(specifier, sf.path);
            imports.push({ from: sf.path, to });
          }
        }
      }
    }

    parsed.push({
      sourceFile: sf,
      content,
      loc,
      functionCount,
      classCount,
      exportCount,
      imports,
    });
  }

  return parsed;
}
