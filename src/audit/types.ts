/**
 * Core types shared across the Zaria audit engine.
 * Phases 4–6 (and beyond) all consume these definitions.
 */

// ---------------------------------------------------------------------------
// Severity
// ---------------------------------------------------------------------------

/** Severity level for an individual finding. */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

// ---------------------------------------------------------------------------
// Phase 4 — Static Analysis Foundation
// ---------------------------------------------------------------------------

/**
 * All source-language identifiers Zaria understands.
 * TypeScript and JavaScript are analysed with full AST (ts-morph).
 * All other languages use regex-based heuristics for LOC / function / class counts.
 */
export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'go'
  | 'rust'
  | 'java'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'unknown';

/** A source file discovered during traversal. */
export interface SourceFile {
  /** Absolute path to the file. */
  path: string;
  /** Detected language from file extension. */
  language: SupportedLanguage;
  /** File size in bytes. */
  size: number;
  /** Last-modified timestamp. */
  lastModified: Date;
}

/** A directed import edge in the project's module graph. */
export interface ImportEdge {
  /** Absolute path of the importing file. */
  from: string;
  /** Resolved module specifier (may be a bare specifier or relative path). */
  to: string;
}

/** The result of parsing a single source file. */
export interface ParsedFile {
  /** Raw file metadata from traversal. */
  sourceFile: SourceFile;
  /** Raw file content. */
  content: string;
  /** Number of non-empty lines (lines of code). */
  loc: number;
  /** Number of function declarations + arrow functions + method declarations. */
  functionCount: number;
  /** Number of class declarations. */
  classCount: number;
  /** Number of export declarations. */
  exportCount: number;
  /** Import edges originating from this file. */
  imports: ImportEdge[];
}

/** Aggregated view of the entire project passed to every audit rule. */
export interface AnalysisContext {
  /** Absolute path to the analysed project root. */
  projectRoot: string;
  /** All successfully parsed files. */
  files: ParsedFile[];
  /** Total lines of code across all parsed files. */
  totalLoc: number;
  /** Map of language → number of files in that language. */
  languageDistribution: Record<string, number>;
  /** Flattened, deduplicated import graph for the whole project. */
  importGraph: ImportEdge[];
}

// ---------------------------------------------------------------------------
// Phase 5+ — Audit Engine
// ---------------------------------------------------------------------------

/** A single actionable finding produced by a rule. */
export interface Finding {
  /** Rule ID, e.g. "PERF001". */
  ruleId: string;
  severity: Severity;
  /** Human-readable description of the problem. */
  message: string;
  /** Absolute path to the file where the finding was detected. */
  file: string;
  /** 1-based line number (optional — not all rules can pinpoint a line). */
  line?: number;
  /** 1-based column number (optional). */
  column?: number;
  /** Actionable recommendation for the developer. */
  recommendation: string;
}

/** A single audit rule that produces findings from an AnalysisContext. */
export interface Rule {
  /** Unique rule ID, e.g. "PERF001". */
  id: string;
  /** Short human-readable name. */
  name: string;
  /** Detailed description of what the rule checks. */
  description: string;
  /** Default severity of findings produced by this rule. */
  severity: Severity;
  /** Analyse the context and return zero or more findings. */
  check(context: AnalysisContext): Finding[];
}

/** Result of running all rules for a single audit dimension. */
export interface DimensionResult {
  /** Dimension identifier, e.g. "performance". */
  dimension: string;
  /** Score from 0–100. */
  score: number;
  /** All findings produced by rules in this dimension. */
  findings: Finding[];
}

// ---------------------------------------------------------------------------
// Phase 10 — Scoring & Aggregation
// ---------------------------------------------------------------------------

/** Letter grade derived from the weighted overall score. */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/** Weighted overall score produced by the aggregation scorer. */
export interface OverallScore {
  /** Weighted aggregate score, clamped to [0, 100]. */
  weighted: number;
  /** Letter grade: A (≥90), B (≥80), C (≥70), D (≥60), F (<60). */
  grade: Grade;
  /** Per-dimension breakdown used to compute the weighted score. */
  breakdown: ReadonlyArray<{ dimension: string; score: number; weight: number }>;
}

/** Complete result of a full Zaria audit run. */
export interface AuditResult {
  /** Absolute path to the analysed project root. */
  projectRoot: string;
  /** ISO 8601 timestamp of when the audit was started. */
  timestamp: string;
  /** Results per dimension (always five when a full audit is run). */
  dimensions: DimensionResult[];
  /** Weighted overall score and grade. */
  overall: OverallScore;
}
