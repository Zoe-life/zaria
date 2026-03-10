# Dependency Decisions — chalk, axios, madge, ESLint API

> **Summary:** One of the four was added (chalk); the other three were deliberately excluded.
> This document gives the full engineering reasoning for each decision, backed by package metrics measured at the time of writing (March 2026).

---

## Context

During phases 10–12, four libraries mentioned in the original tech-stack plan were reconsidered:

| Library | Original plan | Decision | Reason |
|---|---|---|---|
| **chalk** | "Report generation" | ✅ **Added** | ESM-native, zero deps; fixes real correctness gaps |
| **axios** | "SRE HTTP client" | ❌ **Excluded** | Native `fetch` in Node 20 covers 100% of our needs |
| **madge** | "Dependency graph" | ❌ **Excluded** | CJS-only; redundant with ts-morph's import graph |
| **ESLint API** | "Static analysis" | ❌ **Excluded** | ts-morph gives TypeScript-specific AST; ESLint API is a step down |

---

## 1. chalk

### What it does

chalk is the industry-standard terminal string styling library for Node.js. It wraps text in ANSI escape codes and auto-detects the terminal's colour support level.

### Why we added it

The original terminal reporter used hard-coded ANSI escape sequences (e.g. `\x1b[32m`). That approach has real correctness problems:

| Problem | Impact |
|---|---|
| **`NO_COLOR` ignored** | The [W3C `NO_COLOR` standard](https://no-color.org/) specifies that any tool producing terminal colour output should honour the `NO_COLOR` env var. Raw escape codes are emitted unconditionally; chalk v5 checks `NO_COLOR` at startup and strips colours. |
| **`FORCE_COLOR` ignored** | CI systems often set `FORCE_COLOR=1` to keep colour in logs. Raw codes always emit colour; chalk correctly upgrades the colour level when `FORCE_COLOR` is set. |
| **Pipe detection missing** | When output is piped (e.g. `zaria audit \| tee report.txt`), stdout is not a TTY. chalk v5 detects this and strips ANSI codes so the file doesn't contain raw escape sequences. The hand-rolled approach emits codes regardless. |
| **Windows compatibility** | Old Windows `cmd.exe` (pre-Win10 Anniversary Update) does not interpret ANSI codes. chalk v5 uses the `COLORTERM`/`TERM` env vars and Windows build version to decide whether ANSI codes will render correctly. |
| **Maintainability** | 11 raw string constants + 3 helper functions replaced by a single `import chalk from 'chalk'`. chaining (`chalk.bold.cyan(...)`) is type-safe and self-documenting. |

### Package metrics

| Metric | Value |
|---|---|
| Version | 5.6.2 |
| Module type | ESM (native — `"type": "module"`) |
| Dependencies | **0** |
| Unpacked size | 43 KB |
| Weekly npm downloads | ~260 million |
| Security advisories | 0 |

chalk v5 being zero-dependency and ESM-native is significant: it does not add any transitive dependencies and integrates without any CJS-interop friction in our `"type":"module"` project.

### Code comparison

**Before (hand-rolled ANSI, ~50 lines of boilerplate):**
```ts
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const RED   = '\x1b[31m';
// ... 8 more constants ...

function bold(s: string) { return `${BOLD}${s}${RESET}`; }
function dim(s: string)  { return `${DIM}${s}${RESET}`;  }
function color(s: string, c: string) { return `${c}${s}${RESET}`; }

// NO_COLOR env var? Not checked. Pipe detection? Not done.
lines.push(bold(color('  ╔═══╗', CYAN)));
```

**After (chalk, ~3 lines of setup):**
```ts
import chalk from 'chalk';

// Automatically respects NO_COLOR, FORCE_COLOR, pipe detection, Windows
lines.push(chalk.bold.cyan('  ╔═══╗'));
```

### Verdict: ✅ Added

chalk is the correct library for this job. The cost (43 KB, 0 transitive deps) is trivially small; the benefit (standards-compliant colour handling) is real and observable.

---

## 2. axios

### What it does

axios is an HTTP client library with a Promise-based API, support for request/response interceptors, automatic JSON transformation, progress events, and cross-environment compatibility (browser + Node.js).

### Package metrics

| Metric | Value |
|---|---|
| Version | 1.13.6 |
| Module type | CJS (CommonJS) |
| Dependencies | 3 (`follow-redirects`, `form-data`, `proxy-from-env`) |
| Unpacked size | **2,367 KB** |
| Security advisories (historical) | Multiple CVEs in `follow-redirects` (SSRF, open redirect) in 2023–2024 |

### Why native `fetch` is sufficient

Zaria requires Node.js ≥ 20 (`"engines": { "node": ">=20.0.0" }`). Node 20 ships stable `fetch` that provides everything our SRE adapters need:

| Feature needed | Native `fetch` (Node 20) | axios |
|---|---|---|
| HTTP GET/POST | ✅ | ✅ |
| JSON request body | ✅ `JSON.stringify` + `Content-Type` header | ✅ auto |
| JSON response parsing | ✅ `await res.json()` | ✅ auto |
| Request timeout | ✅ `AbortSignal.timeout(ms)` | ✅ `timeout` option |
| Custom headers | ✅ `headers` option | ✅ |
| Basic auth | ✅ `Authorization: Basic …` header | ✅ `auth` option |
| Bearer token | ✅ `Authorization: Bearer …` header | ✅ |
| HTTP error handling | ✅ `if (!res.ok) throw …` | ✅ auto-throws |
| Browser support | Not needed (CLI tool) | ✅ (wasted) |
| Request interceptors | Not needed | ✅ (wasted) |
| Progress events | Not needed | ✅ (wasted) |

Every feature our three SRE adapters use (Prometheus, Datadog, Grafana) is covered natively. The automatic behaviours axios provides (JSON transformation, auto-throw on non-2xx) are two lines of code in our adapters and add zero ambiguity.

### The cost of axios

Adding axios would have:
- Added **2,367 KB** to the published package (55× larger than chalk).
- Added **3 transitive dependencies** with their own release cadences and CVE surface area. The `follow-redirects` package alone has had [multiple CVEs](https://github.com/advisories?query=follow-redirects) related to open redirects and SSRF.
- Introduced a **CJS module** into an otherwise pure-ESM build, requiring interop machinery.
- Made the `package-lock.json` significantly larger and harder to audit.

### Verdict: ❌ Excluded — native `fetch` is sufficient and safer

---

## 3. madge

### What it does

madge builds a JavaScript/TypeScript module dependency graph and can detect circular dependencies, generate Graphviz visualisations, and produce JSON adjacency lists.

### Package metrics

| Metric | Value |
|---|---|
| Version | 8.0.0 |
| Module type | **CJS only** |
| Dependencies | 12 (`chalk`, `commander`, `commondir`, `debug`, `dependency-tree`, `ora`, `pluralize`, `pretty-ms`, `rc`, `stream-to-array`, `ts-graphviz`, `walkdir`) |
| Unpacked size | 103 KB (+ significant transitive tree) |

### Why ts-morph is sufficient

ARCH001 (Circular Dependency Detection) already uses the import graph built by `src/audit/context.ts` via ts-morph. The ts-morph import graph:

- Is built **once** during `buildAnalysisContext()` — O(N) traversal, no redundant passes.
- Includes **all TypeScript import edges** (relative and aliased paths), resolved using the project's `tsconfig.json`.
- Is stored as a `Map<string, Set<string>>` — O(1) edge lookup, O(N+E) total space.
- Powers **all five audit dimensions** in one shared context — no duplicate parsing.
- Is **type-aware** — ts-morph resolves TypeScript path aliases and conditional exports that text-based tools like madge may miss.

madge would add:
- A **CJS module** into our ESM build, requiring dynamic `import()` wrappers and a `createRequire` shim — non-trivial interop friction.
- **12 transitive dependencies**, many of which overlap (madge itself depends on chalk, already a direct dep now).
- **No new capability**: ARCH001 already detects cycles. If visual graph output is needed in the future, it can be added via `ts-graphviz` (already in madge's dep tree) with a direct, lightweight integration.
- **Slower startup**: madge's `dependency-tree` package uses `precinct` + `filing-cabinet` which spawn child processes for some file types — adding latency to every audit run.

### What about graph visualisation?

The only feature madge provides that ts-morph does not is **Graphviz `.dot` / SVG diagram generation**. This is a valuable feature but can be added independently:

```ts
// Hypothetical future: export import graph as .dot without madge
import { stringify } from 'ts-graphviz'; // 1 dep, ESM-native

function exportDot(ctx: AnalysisContext): string {
  // O(N+E) — already have the graph
  return stringify(digraph('G', (g) => {
    for (const [from, targets] of ctx.importGraph) {
      for (const to of targets) g.edge([from, to]);
    }
  }));
}
```

This approach re-uses the already-built import graph and adds one ESM-native dependency instead of twelve CJS ones.

### Verdict: ❌ Excluded — CJS-only, redundant with ts-morph's import graph

---

## 4. ESLint API (`Linter` / `ESLint` class)

### What it does

ESLint exposes a Node.js API (`new Linter()`, `new ESLint()`) that allows running ESLint rules programmatically, accessing the AST, and collecting diagnostics without a CLI.

### Package metrics

| Metric | Value |
|---|---|
| Version | 9.x |
| Dependencies | **30** |
| Unpacked size | **2,821 KB** |
| AST format | ESTree (generic JavaScript) |
| TypeScript support | Via `@typescript-eslint/parser` (additional dep) |

### Why ts-morph is superior for our use case

Zaria audits TypeScript codebases. The analysis we perform requires:

| Capability needed | ts-morph | ESLint API |
|---|---|---|
| **TypeScript-specific AST** | ✅ Native TypeScript compiler API | ⚠️ Generic ESTree via @typescript-eslint/parser |
| **Type information** | ✅ Full type checker access (`getType()`, `getTypeAtLocation()`) | ❌ No type information without complex `tsserver` integration |
| **Cross-file analysis** | ✅ `Project` class analyses all files together | ⚠️ Each file linted independently; cross-file sharing is manual |
| **Import graph** | ✅ Built-in `getImportDeclarations()` | ❌ Not available; must be built separately |
| **Symbol references** | ✅ `findReferences()` | ❌ Not available in ESLint AST |
| **Cyclomatic complexity** | ✅ Node counting via AST | ✅ Via `complexity` rule |
| **Startup cost** | ~2–3s (TypeScript project parse) | ~0.5s (faster, but shallower) |
| **Memory footprint** | Higher (full type graph) | Lower (AST only) |

For rules like MAINT001 (cyclomatic complexity), ESLint's built-in `complexity` rule could have been reused. But the incremental benefit of reusing one rule does not justify adding 30 dependencies and 2.8 MB to the package — especially when ts-morph already parses every file for other rules.

### When the ESLint API *would* make sense

If Zaria ever needed to:
1. Lint **JavaScript files** (not TypeScript) where type information is irrelevant.
2. Reuse the **existing ESLint rule ecosystem** (hundreds of community rules).
3. Process files with **ESLint plugins** already configured in the user's project.

For example, a future `zaria audit:lint` command that runs a user's own ESLint config and aggregates the results into Zaria's scoring model. In that case, the ESLint API is the correct tool. We have left that door open via the plugin architecture (Phase 14).

### Verdict: ❌ Excluded — ts-morph provides a superset of what we need for TypeScript analysis

---

## Summary Table

| Library | Size | Deps | ESM? | Added? | Reason |
|---|---|---|---|---|---|
| **chalk v5** | 43 KB | **0** | ✅ | ✅ Yes | Fixes `NO_COLOR`/`FORCE_COLOR`/pipe detection; cleaner code |
| **axios** | 2,367 KB | 3 | ⚠️ CJS | ❌ No | Native `fetch` in Node 20 is sufficient; 55× smaller alternative |
| **madge** | 103 KB + tree | 12 | ❌ CJS | ❌ No | CJS-only; ts-morph's import graph is richer and already built |
| **ESLint API** | 2,821 KB | 30 | ✅ | ❌ No | ts-morph provides TypeScript-specific superset; ESLint lacks type info |

The total dependency cost of adding axios + madge + ESLint API would have been approximately **+7.6 MB unpacked** and **+45 transitive dependencies** — for capabilities already covered natively or by ts-morph. chalk adds **+43 KB and 0 dependencies** and eliminates a class of correctness bugs.

---

## How to Re-evaluate These Decisions

Each decision should be revisited if the project's requirements change:

- **Add axios** if: you need browser-compatible HTTP (e.g. a future Zaria browser extension or web service), request interceptors, or file upload streams.
- **Add madge** if: you need Graphviz/SVG dependency visualisation output and want to avoid implementing the DOT serialisation manually. (Evaluate a lightweight ESM alternative like `ts-graphviz` first.)
- **Add ESLint API** if: implementing a `zaria audit:lint` integration that runs users' existing ESLint configs and pipes findings into the scoring model. The plugin architecture (Phase 14) is the right place for this.

---

_Last updated: Phase 12 completion (March 2026). Reviewed by: Zaria maintainers._
