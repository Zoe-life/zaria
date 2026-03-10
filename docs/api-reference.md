# Zaria API Reference

This document describes the public TypeScript API exposed by the `zaria` package.
All symbols are re-exported from the package root (`import { ... } from 'zaria'`).

> **Generated from source** — `src/audit/index.ts`, `src/config/index.ts`, `src/scorer/index.ts`, `src/report/index.ts`, `src/sre/index.ts`, `src/plugin/index.ts`.
> Run `npx typedoc --out docs/api src/index.ts` to regenerate the HTML version.

---

## Table of Contents

1. [Types](#types)
2. [Traversal](#traversal)
3. [Parsing](#parsing)
4. [Audit Context](#audit-context)
5. [Audit Rules & Scorers](#audit-rules--scorers)
6. [Scoring & Aggregation](#scoring--aggregation)
7. [Report Formatters](#report-formatters)
8. [SRE Integration](#sre-integration)
9. [Plugin System](#plugin-system)
10. [Configuration](#configuration)
11. [Logger](#logger)

---

## Types

### `SupportedLanguage`

```typescript
type SupportedLanguage =
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
```

Identifies the source language of a file discovered during traversal.
TypeScript and JavaScript files are parsed with full AST support (ts-morph).
All other supported languages use regex-based heuristics.

---

### `Severity`

```typescript
type Severity = 'critical' | 'high' | 'medium' | 'low';
```

Severity level for an individual finding.

---

### `SourceFile`

```typescript
interface SourceFile {
  path: string;           // Absolute path to the file
  language: SupportedLanguage;
  size: number;           // File size in bytes
  lastModified: Date;
}
```

A source file descriptor returned by `traverseFiles`.

---

### `ImportEdge`

```typescript
interface ImportEdge {
  from: string; // Absolute path of the importing file
  to: string;   // Resolved module specifier or absolute path
}
```

A directed edge in the project's module import graph.

---

### `ParsedFile`

```typescript
interface ParsedFile {
  sourceFile: SourceFile;
  content: string;
  loc: number;           // Non-blank lines of code
  functionCount: number;
  classCount: number;
  exportCount: number;   // Always 0 for non-TS/JS languages
  imports: ImportEdge[];
}
```

Enriched file metadata returned by `parseFiles` / `parseNonTsFiles`.

---

### `AnalysisContext`

```typescript
interface AnalysisContext {
  projectRoot: string;
  files: ParsedFile[];
  totalLoc: number;
  languageDistribution: Record<string, number>;
  importGraph: ImportEdge[];
}
```

The single shared context passed to every audit rule.

---

### `Finding`

```typescript
interface Finding {
  ruleId: string;
  severity: Severity;
  message: string;
  file: string;
  line?: number;
  column?: number;
  recommendation: string;
}
```

An actionable finding produced by a rule.

---

### `Rule`

```typescript
interface Rule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  check(context: AnalysisContext): Finding[];
}
```

A single audit rule. Implement this interface to create custom rules.

---

### `DimensionResult`

```typescript
interface DimensionResult {
  dimension: string; // e.g. "performance"
  score: number;     // 0–100
  findings: Finding[];
}
```

---

### `Grade`

```typescript
type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
```

Letter grade derived from the weighted overall score:
A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, F < 60.

---

### `OverallScore`

```typescript
interface OverallScore {
  weighted: number;    // Clamped to [0, 100]
  grade: Grade;
  breakdown: ReadonlyArray<{ dimension: string; score: number; weight: number }>;
}
```

---

### `AuditResult`

```typescript
interface AuditResult {
  projectRoot: string;
  timestamp: string;     // ISO 8601
  dimensions: DimensionResult[];
  overall: OverallScore;
}
```

Complete result of a full Zaria audit run.

---

## Traversal

### `traverseFiles(projectRoot, ignorePaths?)`

```typescript
function traverseFiles(projectRoot: string, ignorePaths?: string[]): SourceFile[]
```

Recursively walks `projectRoot` and returns a `SourceFile` descriptor for every
recognised source file. Supports TypeScript, JavaScript, Python, Go, Rust, Java,
C, C++, and C#. Skips `node_modules`, `dist`, `.git`, and other common noise
directories by default.

**Parameters**

| Name | Type | Default | Description |
|---|---|---|---|
| `projectRoot` | `string` | — | Absolute path to the root directory to analyse. |
| `ignorePaths` | `string[]` | `[]` | Additional path segments or prefixes to skip. |

**Returns** `SourceFile[]` — may be empty if the directory is empty or unreadable.

---

## Parsing

### `parseFiles(sourceFiles)`

```typescript
function parseFiles(sourceFiles: SourceFile[]): ParsedFile[]
```

Parses all source files and returns enriched `ParsedFile` objects. Routes
TypeScript and JavaScript files through ts-morph (full AST) and all other
supported languages through `parseNonTsFiles` (regex heuristics).

---

### `parseNonTsFiles(sourceFiles)`

```typescript
function parseNonTsFiles(sourceFiles: SourceFile[]): ParsedFile[]
```

Regex-based parser for Python, Go, Rust, Java, C, C++, and C# files.
Returns best-effort LOC, function count, class/struct count, and import edges.
Files with an unrecognised language are silently skipped.

---

## Audit Context

### `buildAnalysisContext(projectRoot, files)`

```typescript
function buildAnalysisContext(projectRoot: string, files: ParsedFile[]): AnalysisContext
```

Aggregates parsed file metadata into the single `AnalysisContext` consumed by
every audit rule: total LOC, language distribution map, and deduplicated import graph.

---

## Audit Rules & Scorers

Each dimension exposes its rule array and scorer function:

| Export | Type | Description |
|---|---|---|
| `PERFORMANCE_RULES` | `Rule[]` | PERF001–PERF004 |
| `scorePerformance(ctx)` | `DimensionResult` | Run all performance rules |
| `ARCHITECTURE_RULES` | `Rule[]` | ARCH001–ARCH004 |
| `scoreArchitecture(ctx)` | `DimensionResult` | Run all architecture rules |
| `SCALABILITY_RULES` | `Rule[]` | SCALE001–SCALE004 |
| `scoreScalability(ctx)` | `DimensionResult` | Run all scalability rules |
| `INTEGRITY_RULES` | `Rule[]` | INT001–INT004 |
| `scoreIntegrity(ctx)` | `DimensionResult` | Run all integrity rules |
| `MAINTENANCE_RULES` | `Rule[]` | MAINT001–MAINT005 |
| `scoreMaintenance(ctx)` | `DimensionResult` | Run all maintenance rules |
| `EFFICIENCY_RULES` | `Rule[]` | EFF001–EFF003 |
| `scoreEfficiency(ctx)` | `DimensionResult` | Run all efficiency rules |

---

## Scoring & Aggregation

### `aggregateScore(dimensionResults)`

```typescript
function aggregateScore(dimensionResults: DimensionResult[]): OverallScore
```

Computes the weighted overall score from a list of dimension results using the
following weights:

| Dimension | Weight |
|---|---|
| Performance | 22 % |
| Architecture | 22 % |
| Scalability | 18 % |
| Integrity | 18 % |
| Maintenance | 10 % |
| Efficiency | 10 % |

Returns an `OverallScore` with `weighted` score clamped to [0, 100] and a
letter grade.

---

## Report Formatters

### `renderReport(result, format, options?)`

```typescript
function renderReport(
  result: AuditResult,
  format: OutputFormat,
  options?: RenderOptions,
): string
```

Renders an `AuditResult` to the chosen output format. `OutputFormat` is one of
`'terminal' | 'json' | 'html' | 'markdown' | 'sarif'`.

Alias exports for individual formatters:

```typescript
import { renderTerminal, renderJson, renderHtml, renderMarkdown, renderSarif } from 'zaria';
```

---

## SRE Integration

### `connectSre(providers)`

```typescript
async function connectSre(providers: SreProvider[]): Promise<SreConnectionResult[]>
```

Validates connectivity to each configured SRE provider (Prometheus, Datadog,
Grafana, or custom HTTP). Returns one `SreConnectionResult` per provider with
`success: boolean` and an optional `error` string.

---

## Plugin System

### `loadPlugin(packageName)`

```typescript
async function loadPlugin(packageName: string): Promise<ZariaPlugin>
```

Dynamically imports a Zaria plugin package and returns the validated plugin
object. Throws `PluginLoadError` if the package cannot be found or does not
export a valid `ZariaPlugin`.

### `ZariaPlugin` interface

```typescript
interface ZariaPlugin {
  id: string;
  name: string;
  version: string;
  performanceRules?: Rule[];
  architectureRules?: Rule[];
  scalabilityRules?: Rule[];
  integrityRules?: Rule[];
  maintenanceRules?: Rule[];
  efficiencyRules?: Rule[];
}
```

---

## Configuration

### `loadConfig(searchFrom?)`

```typescript
async function loadConfig(searchFrom?: string): Promise<ZariaConfig | null>
```

Searches for a Zaria configuration file starting at `searchFrom` (defaults to
`process.cwd()`). Supports `.zariarc`, `.zariarc.json`, `.zariarc.yml`, and
the `"zaria"` key in `package.json`.

### `resolveConfig(partial, cliFlags?)`

```typescript
function resolveConfig(partial: ZariaConfig | null, cliFlags?: Partial<ResolvedConfig>): ResolvedConfig
```

Merges a (possibly null) loaded config with CLI flags and built-in defaults,
returning a fully-resolved `ResolvedConfig` where no field is undefined.

### `validateConfig(config)`

```typescript
function validateConfig(config: unknown): ValidationError[]
```

Runs structural (Zod) and semantic validation on a raw config object. Returns an
array of `ValidationError` objects (empty array means valid).

---

## Logger

### `logger`

```typescript
import { logger } from 'zaria';

logger.info('message');
logger.warn({ context: 'audit' }, 'message with metadata');
logger.error(err, 'unexpected error');
```

A [Pino](https://getpino.io) logger instance. Outputs human-readable (`pino-pretty`) when stdout is a TTY, JSON otherwise. Log level is controlled by the `ZARIA_LOG_LEVEL` environment variable (default: `'info'`).
