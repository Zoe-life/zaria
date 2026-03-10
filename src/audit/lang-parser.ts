/**
 * Regex-based parser for non-TypeScript/JavaScript source files — Phase 15.
 *
 * Provides best-effort LOC, function count, class/struct count, and import
 * edge extraction for Python, Go, Rust, Java, C, C++, and C#.
 * These counts are heuristic rather than exact AST-derived values.
 */

import { readFileSync } from 'fs';
import type { SourceFile, ParsedFile, ImportEdge } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count non-blank, non-pure-comment lines. */
function countLoc(lines: string[], commentPrefix: string): number {
  let loc = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith(commentPrefix)) continue;
    loc++;
  }
  return loc;
}

/** Count regex pattern matches across all lines. */
function countMatches(lines: string[], pattern: RegExp): number {
  return lines.filter((l) => pattern.test(l)).length;
}

// ---------------------------------------------------------------------------
// Language-specific parsers
// ---------------------------------------------------------------------------

interface LangStats {
  loc: number;
  functionCount: number;
  classCount: number;
  imports: ImportEdge[];
}

function parsePython(filePath: string, lines: string[]): LangStats {
  const loc = countLoc(lines, '#');
  const functionCount = countMatches(lines, /^\s*(?:async\s+)?def\s+\w+/);
  const classCount = countMatches(lines, /^\s*class\s+\w+/);
  const imports: ImportEdge[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*import\s+([\w.]+)/) ?? line.match(/^\s*from\s+([\w.]+)\s+import/);
    if (m?.[1]) imports.push({ from: filePath, to: m[1] });
  }
  return { loc, functionCount, classCount, imports };
}

function parseGo(filePath: string, lines: string[]): LangStats {
  const loc = countLoc(lines, '//');
  const functionCount = countMatches(lines, /^\s*func\s+/);
  // Go uses structs + interfaces instead of classes
  const classCount = countMatches(lines, /^\s*type\s+\w+\s+(?:struct|interface)\s*\{/);
  const imports: ImportEdge[] = [];
  for (const line of lines) {
    // single-line: import "pkg"
    const single = line.match(/^\s*import\s+"([\w./]+)"/);
    if (single?.[1]) {
      imports.push({ from: filePath, to: single[1] });
      continue;
    }
    // inside import block: "pkg" or pkg "alias"
    const block = line.match(/^\s*(?:\w+\s+)?"([\w./]+)"/);
    if (block?.[1]) imports.push({ from: filePath, to: block[1] });
  }
  return { loc, functionCount, classCount, imports };
}

function parseRust(filePath: string, lines: string[]): LangStats {
  const loc = countLoc(lines, '//');
  const functionCount = countMatches(lines, /^\s*(?:pub\s+)?(?:async\s+)?fn\s+\w+/);
  // structs + enums + traits serve as the "class" concept in Rust
  const classCount = countMatches(lines, /^\s*(?:pub\s+)?(?:struct|enum|trait|impl)\s+\w+/);
  const imports: ImportEdge[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*use\s+([\w:]+)/);
    if (m?.[1]) imports.push({ from: filePath, to: m[1] });
  }
  return { loc, functionCount, classCount, imports };
}

function parseJava(filePath: string, lines: string[]): LangStats {
  const loc = countLoc(lines, '//');
  // Method signatures: visibility + return type + name + (
  const functionCount = countMatches(
    lines,
    /^\s*(?:public|private|protected|static|final|\s)+[\w<>\[\]]+\s+\w+\s*\(/,
  );
  const classCount = countMatches(
    lines,
    /^\s*(?:public|private|protected|abstract|final|\s)*(?:class|interface|enum|record)\s+\w+/,
  );
  const imports: ImportEdge[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*import\s+(?:static\s+)?([\w.]+)/);
    if (m?.[1]) imports.push({ from: filePath, to: m[1] });
  }
  return { loc, functionCount, classCount, imports };
}

function parseC(filePath: string, lines: string[]): LangStats {
  const loc = countLoc(lines, '//');
  // Heuristic: a line that looks like a function definition (return type + name + '(')
  // at the start of a line (not indented, not a macro or cast).
  const functionCount = countMatches(
    lines,
    /^(?:static\s+|inline\s+|extern\s+)?(?:const\s+)?[\w*]+\s+[\w*]+\s*\([^)]*\)\s*(?:\{|$)/,
  );
  // Match both `struct Name {` and `typedef struct {` (anonymous typedef) forms
  const classCount = countMatches(
    lines,
    /^\s*(?:typedef\s+)?(?:struct|union|enum)(?:\s+\w+)?\s*\{/,
  );
  const imports: ImportEdge[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*#include\s+[<"]([\w./]+)[>"]/);
    if (m?.[1]) imports.push({ from: filePath, to: m[1] });
  }
  return { loc, functionCount, classCount, imports };
}

function parseCpp(filePath: string, lines: string[]): LangStats {
  const loc = countLoc(lines, '//');
  const functionCount = countMatches(
    lines,
    /^(?:static\s+|inline\s+|virtual\s+|explicit\s+|constexpr\s+)?(?:const\s+)?[\w:*<>]+\s+[\w:~*]+\s*\([^)]*\)\s*(?:const\s*)?(?:\{|$)/,
  );
  const classCount = countMatches(lines, /^\s*(?:class|struct|enum(?:\s+class)?)\s+\w+/);
  const imports: ImportEdge[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*#include\s+[<"]([\w./]+)[>"]/);
    if (m?.[1]) imports.push({ from: filePath, to: m[1] });
  }
  return { loc, functionCount, classCount, imports };
}

function parseCSharp(filePath: string, lines: string[]): LangStats {
  const loc = countLoc(lines, '//');
  // Methods: visibility + optional modifiers + return type + name + (
  const functionCount = countMatches(
    lines,
    /^\s*(?:public|private|protected|internal|static|virtual|override|async|\s)+[\w<>\[\]?]+\s+\w+\s*\(/,
  );
  const classCount = countMatches(
    lines,
    /^\s*(?:public|private|protected|internal|static|abstract|sealed|\s)*(?:class|interface|struct|enum|record)\s+\w+/,
  );
  const imports: ImportEdge[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*using\s+(?:static\s+)?([\w.]+)\s*;/);
    if (m?.[1]) imports.push({ from: filePath, to: m[1] });
  }
  return { loc, functionCount, classCount, imports };
}

// ---------------------------------------------------------------------------
// Dispatch table
// ---------------------------------------------------------------------------

type LangParser = (filePath: string, lines: string[]) => LangStats;

const PARSERS: Record<string, LangParser> = {
  python: parsePython,
  go: parseGo,
  rust: parseRust,
  java: parseJava,
  c: parseC,
  cpp: parseCpp,
  csharp: parseCSharp,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a collection of non-TypeScript/JavaScript source files using
 * language-specific regex heuristics and return `ParsedFile` objects.
 *
 * Files whose language has no registered parser are skipped.
 *
 * @param sourceFiles  SourceFile descriptors (non-TS/JS) from `traverseFiles`.
 */
export function parseNonTsFiles(sourceFiles: SourceFile[]): ParsedFile[] {
  const parsed: ParsedFile[] = [];

  for (const sf of sourceFiles) {
    const parser = PARSERS[sf.language];
    if (!parser) continue;

    let content: string;
    try {
      content = readFileSync(sf.path, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    const stats = parser(sf.path, lines);

    parsed.push({
      sourceFile: sf,
      content,
      loc: stats.loc,
      functionCount: stats.functionCount,
      classCount: stats.classCount,
      exportCount: 0, // concept not universal outside TS/JS
      imports: stats.imports,
    });
  }

  return parsed;
}
