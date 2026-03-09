# Zaria — Build Plan

This document outlines the complete, step-by-step build plan for the Zaria enterprise-grade CLI audit tool, from project initialisation through to production release. Each phase is broken into concrete, actionable tasks.

> **Tech Stack:** Option A — Node.js / TypeScript (confirmed).

---

## Phase Overview

| Phase | Name | Outcome |
|---|---|---|
| 1 ✅ | Project Scaffolding & Tooling | Compilable, testable, linted skeleton |
| 2 ✅ | CLI Framework & Command Structure | All commands parse and route correctly |
| 3 ✅ | Configuration System | `.zariarc` / `zaria.config.ts` loading and validation |
| 4 | Static Analysis Foundation | AST parsing and file traversal pipeline |
| 5 | Audit Engine — Performance | Performance dimension rules and scoring |
| 6 | Audit Engine — Architecture | Architecture dimension rules and scoring |
| 7 | Audit Engine — Scalability & Observability | Scalability dimension rules and scoring |
| 8 | Audit Engine — Data Integrity & Race Conditions | Integrity dimension rules and scoring |
| 9 | Audit Engine — Long-Term Maintenance | Maintenance dimension rules and scoring |
| 10 | Scoring & Aggregation | Weighted overall score, dimension scores |
| 11 | Report Output System | Terminal, JSON, HTML, Markdown, SARIF |
| 12 | SRE Tool Integration | Optional Prometheus, Datadog, Grafana, etc. |
| 13 | CI/CD Integration | Quality gates, exit codes, GitHub Actions |
| 14 | Plugin Architecture | Plugin loader, typed interface, registry |
| 15 | Testing & Quality Assurance | Unit, integration, and E2E test suites |
| 16 | Documentation | User docs, API docs, plugin authoring guide |
| 17 | Distribution & Release | npm package, binary releases, Homebrew tap |
| 18 | Enterprise Features | Audit history, dashboards, compliance exports |

---

## Phase 1 — Project Scaffolding & Tooling ✅

**Goal:** A working, compilable project skeleton that all future phases can build on.

### Tasks

1.1. **Initialise repository structure** ✅
  - Created directory layout:
    ```
    zaria/
    ├── src/
    │   ├── cli/           # Command definitions
    │   ├── config/        # Config loading and validation
    │   ├── audit/         # Audit engine (one sub-dir per dimension)
    │   │   ├── performance/
    │   │   ├── architecture/
    │   │   ├── scalability/
    │   │   ├── integrity/
    │   │   └── maintenance/
    │   ├── sre/           # SRE provider adapters
    │   ├── report/        # Report formatters
    │   ├── plugin/        # Plugin loader and registry
    │   ├── scorer/        # Scoring and aggregation
    │   └── index.ts       # Entry point
    ├── tests/
    │   ├── unit/
    │   ├── integration/
    │   └── fixtures/      # Sample project codebases for testing
    ├── docs/
    ├── .zariarc.example.yml
    ├── README.md
    ├── PLAN.md
    └── package.json
    ```

1.2. **Configure the package manager** ✅
  - `package.json` with `"type": "module"`, `"bin": { "zaria": "./dist/index.js" }`, and npm scripts.

1.3. **Configure TypeScript / Go build tooling** ✅
  - `tsconfig.json` with `"module": "NodeNext"`, `"target": "ES2022"`, `"strict": true`.
  - `tsx` for development (`npm run dev`), `tsc` for production builds (`npm run build`).

1.4. **Configure linting and formatting** ✅
  - `eslint.config.js` (flat config) with `@typescript-eslint/eslint-plugin`.
  - `.prettierrc` with consistent formatting rules.
  - `npm run lint` and `npm run format` scripts.

1.5. **Configure the test runner** ✅
  - `vitest.config.ts` with `@vitest/coverage-v8` for coverage.
  - `npm run test` and `npm run test:coverage` scripts.

1.6. **Set up Git hooks** ✅
  - `husky` with `.husky/pre-commit` running `lint-staged`.
  - `lint-staged` runs ESLint + Prettier on staged `.ts` files.
  - `.husky/pre-push` runs the test suite before push.

1.7. **Configure CI/CD pipeline (GitHub Actions)** ✅
  - `.github/workflows/ci.yml` — lint, test, build on PRs and pushes to `main` (Node 20.x, 22.x matrix).
  - `.github/workflows/release.yml` — build and publish to npm on `v*` tags.

1.8. **Write the entry point** ✅
  - `src/index.ts` prints `Zaria v0.0.1` and exits cleanly.

1.9. **Verify Phase 1** ✅
  - `npm run build && node dist/index.js` outputs `Zaria v0.0.1`.
  - `npm run lint` passes with zero errors.
  - `npm test` passes (framework verified, skeleton test in place).

---

## Phase 2 — CLI Framework & Command Structure ✅

**Goal:** All documented commands and flags are parsed correctly, with stub handlers.

### Tasks

2.1. **Install and configure the CLI framework** ✅
  - `npm install commander`; root command defined in `src/cli/index.ts`.
  - Ink/React deferred to a later phase — stub handlers emit plain `console.log` output.

2.2. **Define the root command** ✅
  - Name: `zaria`
  - Global flags: `--config`, `-v/--verbose`, `--no-sre`, `--version`
  - Help text matches the README usage section.

2.3. **Define the `audit` command and sub-commands** ✅
  - `audit [path]` — full audit (`src/cli/commands/audit.ts`)
  - `audit:perf [path]`
  - `audit:arch [path]`
  - `audit:scale [path]`
  - `audit:integrity [path]`
  - `audit:maint [path]`
  - Flags: `--output/-o`, `--file/-f`, `--threshold/-t`, `--only`, `--skip`
  - Each handler prints `"Running [dimension] audit on [path]…"`.

2.4. **Define the `report` command** ✅
  - Stub handler in `src/cli/commands/report.ts`; prints "Generating report from last audit run…".

2.5. **Define `config init` and `config validate` commands** ✅
  - `config init` — stub; prints "Scaffolding .zariarc.yml…" (`src/cli/commands/config.ts`).
  - `config validate` — stub; prints "Config valid.".

2.6. **Define `sre connect` and `sre test` commands** ✅
  - `sre connect` — stub; prints "SRE connection wizard — coming soon." (`src/cli/commands/sre.ts`).
  - `sre test` — stub; prints "No SRE providers configured.".

2.7. **Define `plugin list`, `plugin add`, `plugin remove` commands** ✅
  - All stubs in `src/cli/commands/plugin.ts`.

2.8. **Write CLI unit tests** ✅
  - `tests/unit/cli/index.test.ts` — 17 tests covering every command, flag parsing, unknown-command error, and `--version` exit.
  - All 19 tests pass (17 CLI + 2 entry-point); coverage 99.36 %.

2.9. **Verify Phase 2** ✅
  - `node dist/index.js --help` lists all commands and flags.
  - `node dist/index.js audit ./tests/fixtures/sample-app` prints stub output.
  - `npm run lint && npm test && npm run build` all pass.

---

## Phase 3 — Configuration System ✅

**Goal:** Full config loading, merging, and validation pipeline.

### Tasks

3.1. **Define the configuration schema** ✅
  - `src/config/schema.ts` — Zod schema + TypeScript types covering all config sections.
  - Supports project types: web, mobile, desktop, cli, library (any codebase kind).
  - Dependencies: `zod@^3`.

3.2. **Implement config file discovery** ✅
  - `src/config/loader.ts` — `cosmiconfig` explorer searches for `.zariarc`, `.zariarc.json`, `.zariarc.yml`, `.zariarc.yaml`, `zaria.config.json`, or `zaria` key in `package.json`.
  - `zaria.config.ts` deferred to a future phase (requires TypeScript loader).

3.3. **Implement config merging** ✅
  - `src/config/merge.ts` — `mergeConfig()` + `readEnvOverrides()`.
  - Priority order (highest to lowest): CLI flags → `ZARIA_*` env vars → config file → built-in defaults.
  - `src/config/defaults.ts` — centralised built-in default values.

3.4. **Implement config validation** ✅
  - `src/config/validate.ts` — two-pass validation: Zod structural check + semantic check (`ignore.rules` vs. known IDs, empty dimensions list).
  - Returns structured `ValidationError[]` with dot-separated paths and messages.
  - `formatValidationResult()` renders ✅/❌ output for the terminal.

3.5. **Implement `config init` fully** ✅
  - Copies bundled `.zariarc.example.yml` to the target directory.
  - `src/config/detect.ts` — detects project type (web/mobile/desktop/cli/library) and language from file system artefacts.
  - Protects against overwriting an existing file (requires `--force`).

3.6. **Implement `config validate` fully** ✅
  - Loads the config with `cosmiconfig`, validates it, and prints a structured terminal report with file path.
  - Exits with code 1 on validation failure.

3.7. **Write config unit tests** ✅
  - `tests/unit/config/schema.test.ts` — 17 tests for all valid/invalid schema combinations.
  - `tests/unit/config/validate.test.ts` — 16 tests: structural errors, semantic errors, format output.
  - `tests/unit/config/merge.test.ts` — 26 tests: priority order, --only/--skip, env overrides.
  - `tests/unit/config/loader.test.ts` — 9 tests: file discovery, package.json key, error propagation.
  - Updated `tests/unit/cli/index.test.ts` — config init/validate tests updated for real async handlers.

3.8. **Verify Phase 3** ✅
  - `zaria config init` creates `.zariarc.yml`, detects project type, and guards against overwrite.
  - `zaria config validate` reports `✅ Config valid` for a well-formed file.
  - `zaria config validate` reports `❌ … errors` with paths for an invalid file (e.g. `threshold: 999`).
  - All 88 tests pass; `npm run lint && npm run build` both pass.


## Phase 4 — Static Analysis Foundation

**Goal:** A reusable pipeline that parses files and exposes AST/metadata to audit engines.

### Tasks

4.1. **Implement the file traversal engine**
  - Recursively walks a project directory, respecting `.gitignore` and `ignore.paths` config.
  - Returns a list of `SourceFile` objects: `{ path, language, size, lastModified }`.

4.2. **Implement the TypeScript/JavaScript AST parser**
  - Use `ts-morph` to parse `.ts`, `.tsx`, `.js`, `.jsx` files into an AST.
  - Expose a `ParsedFile` type: `{ sourceFile: SourceFile, ast: Node, imports: Import[], exports: Export[] }`.

4.3. **Implement basic metadata extraction**
  - Extract: file LOC, function count, class count, import graph edges.

4.4. **Build the analysis context object**
  - Aggregate all `ParsedFile` instances into an `AnalysisContext` passed to all audit engines.
  - Include project-level metadata: total LOC, language distribution, detected framework.

4.5. **Write unit tests for the file traversal and parser**
  - Use fixture projects in `tests/fixtures/`.

4.6. **Verify Phase 4**
  - Run against `tests/fixtures/sample-ts-app` and confirm parsed file count and import graph.

---

## Phase 5 — Audit Engine — Performance

**Goal:** Performance dimension rules and scoring.

### Tasks

5.1. **Define the `Rule` and `Finding` types**
  - `Rule`: `{ id, name, description, severity, check(context): Finding[] }`
  - `Finding`: `{ ruleId, severity, message, file, line, column, recommendation }`

5.2. **Implement PERF001 — N+1 Query Pattern Detection**
  - Detect database calls (ORM method calls) inside loops.

5.3. **Implement PERF002 — Synchronous Blocking in Async Context**
  - Detect `fs.readFileSync`, `execSync`, etc. inside `async` functions.

5.4. **Implement PERF003 — Missing Caching Strategy**
  - Flag HTTP handlers with no caching headers or cache-control middleware.

5.5. **Implement PERF004 — Memory Leak Patterns**
  - Detect `addEventListener` without corresponding `removeEventListener`.

5.6. **Implement dimension scorer for Performance**
  - Starts at 100, deduct per-severity finding impact.

5.7. **Write unit tests for each Performance rule**
  - Use fixture files that trigger each rule.
  - Use clean fixture files that produce zero findings.

5.8. **Verify Phase 5**
  - Seeded issues in `sample-ts-app` are all caught.
  - `clean-app` produces zero Performance findings.

---

## Phase 6 — Audit Engine — Architecture

**Goal:** Architecture dimension rules and scoring.

### Tasks

6.1. **Implement ARCH001 — Circular Dependency Detection**
  - Use the import graph to detect cycles (DFS with back-edge detection).

6.2. **Implement ARCH002 — God Module Detection**
  - Flag files with >500 LOC and >20 exports as potential god modules.

6.3. **Implement ARCH003 — Missing Abstraction Layer**
  - Detect direct database calls from presentation layer files (e.g., route handlers importing ORM models directly).

6.4. **Implement ARCH004 — Tight Coupling Detection**
  - Flag files with >15 unique imports as highly coupled.

6.5. **Implement dimension scorer for Architecture**

6.6. **Write unit tests for each Architecture rule**

6.7. **Verify Phase 6**

---

## Phase 7 — Audit Engine — Scalability & Observability

**Goal:** Scalability dimension rules and scoring.

### Tasks

7.1. **Implement SCALE001 — Missing Structured Logging**
  - Detect `console.log` usage outside of the logger module.

7.2. **Implement SCALE002 — Unbounded Query**
  - Detect ORM queries without `.limit()` or `.take()`.

7.3. **Implement SCALE003 — Stateful Singleton Pattern**
  - Detect module-level mutable state that prevents horizontal scaling.

7.4. **Implement SCALE004 — Missing Health Check Endpoint**
  - Detect Express/Fastify/Hapi apps without a `/health` or `/healthz` route.

7.5. **Implement dimension scorer for Scalability**

7.6. **Write unit tests for each Scalability rule**

7.7. **Verify Phase 7**

---

## Phase 8 — Audit Engine — Data Integrity & Race Conditions

**Goal:** Data integrity dimension rules and scoring.

### Tasks

8.1. **Implement INT001 — Missing Input Validation**
  - Detect route handlers that read `req.body` or `req.query` without validation middleware.

8.2. **Implement INT002 — Missing Transaction Boundary**
  - Detect multi-step ORM write operations outside a transaction.

8.3. **Implement INT003 — TOCTOU Vulnerability Pattern**
  - Detect check-then-act patterns on file system or database without atomic operations.

8.4. **Implement INT004 — Non-Idempotent Write Endpoint**
  - Detect POST handlers that do not check for existing resources before creating.

8.5. **Implement dimension scorer for Data Integrity**

8.6. **Write unit tests for each Data Integrity rule**

8.7. **Verify Phase 8**

---

## Phase 9 — Audit Engine — Long-Term Maintenance

**Goal:** Maintenance dimension rules and scoring.

### Tasks

9.1. **Implement MAINT001 — High Cyclomatic Complexity**
  - Flag functions with cyclomatic complexity > 10.

9.2. **Implement MAINT002 — Code Duplication**
  - Detect duplicate code blocks using token-based hashing.

9.3. **Implement MAINT003 — Deprecated Dependency**
  - Cross-reference `package.json` dependencies against npm deprecation notices.

9.4. **Implement MAINT004 — Missing Test Coverage**
  - Detect source files with no corresponding test file.

9.5. **Implement MAINT005 — Outdated Dependency**
  - Flag dependencies more than 2 major versions behind latest.

9.6. **Implement dimension scorer for Maintenance**

9.7. **Write unit tests for each Maintenance rule**

9.8. **Verify Phase 9**

---

## Phase 10 — Scoring & Aggregation

**Goal:** Weighted overall score, dimension scores.

### Tasks

10.1. **Define scoring weights**
  - Performance: 25%, Architecture: 25%, Scalability: 20%, Integrity: 20%, Maintenance: 10%.

10.2. **Implement `scorer/aggregate.ts`**
  - Accept all five dimension scores and produce a weighted overall score (0–100).

10.3. **Implement grade thresholds**
  - A: 90–100, B: 80–89, C: 70–79, D: 60–69, F: 0–59.

10.4. **Write unit tests for the scorer**

10.5. **Verify Phase 10**

---

## Phase 11 — Report Output System

**Goal:** Terminal, JSON, HTML, Markdown, SARIF.

### Tasks

11.1. **Implement `report/terminal.ts`** — colourised, tabular terminal output using `chalk` and `cli-table3`.

11.2. **Implement `report/json.ts`** — machine-readable JSON output.

11.3. **Implement `report/markdown.ts`** — GitHub/GitLab PR comment format.

11.4. **Implement `report/html.ts`** — self-contained HTML report.

11.5. **Implement `report/sarif.ts`** — SARIF 2.1.0 format for GitHub Code Scanning.

11.6. **Implement `report/index.ts`** — factory that picks the correct formatter based on config.

11.7. **Write unit tests for each reporter**

11.8. **Verify Phase 11**

---

## Phase 12 — SRE Tool Integration

**Goal:** Optional Prometheus, Datadog, Grafana, etc.

### Tasks

12.1. **Define the `SreProvider` interface** — `{ name, test(): Promise<boolean>, fetchMetrics(query): Promise<Metric[]> }`.

12.2. **Implement `sre/prometheus.ts`** — PromQL query adapter.

12.3. **Implement `sre/datadog.ts`** — Datadog Metrics API adapter.

12.4. **Implement `sre/grafana.ts`** — Grafana HTTP API adapter.

12.5. **Implement `sre/connect.ts`** — interactive provider setup wizard.

12.6. **Integrate SRE data into audit engines** — enrich static findings with runtime error rates and latency data.

12.7. **Write unit tests with mocked SRE providers**

12.8. **Verify Phase 12**

---

## Phase 13 — CI/CD Integration

**Goal:** Quality gates, exit codes, GitHub Actions.

### Tasks

13.1. **Implement exit code logic** — exit 1 if overall score < `--threshold`.

13.2. **Implement `--threshold` per-dimension** — exit 1 if any dimension breaches its configured threshold.

13.3. **Create GitHub Actions action.yml** — `uses: zoe-life/zaria@v1` for zero-config CI integration.

13.4. **Create example workflow** — `.github/zaria-example.yml` for users to copy.

13.5. **Write integration tests for exit codes**

13.6. **Verify Phase 13**

---

## Phase 14 — Plugin Architecture

**Goal:** Plugin loader, typed interface, registry.

### Tasks

14.1. **Define the Plugin API interface**
  ```typescript
  export interface ZariaPlugin {
    name: string;
    version: string;
    rules: Rule[];
    onInit?(context: PluginContext): Promise<void>;
    onAuditComplete?(result: AuditResult): Promise<void>;
  }
  ```

14.2. **Implement the plugin loader**
  - Load plugins listed in `.zariarc` via dynamic import.
  - Validate each plugin against the Plugin API interface.
  - Isolate plugin failures — a crashing plugin must not crash Zaria.

14.3. **Implement plugin discovery**
  - Scan `node_modules` for packages prefixed `zaria-plugin-`.
  - Display loaded plugins in `--verbose` output.

14.4. **Build the first official plugin: `zaria-plugin-nextjs`**
  - Additional rules specific to Next.js.

14.5. **Build the first official plugin: `zaria-plugin-prisma`**
  - Rules specific to Prisma ORM.

14.6. **Document the plugin authoring guide**
  - Create `docs/plugin-authoring.md`.

---

## Phase 15 — Testing & Quality Assurance

**Goal:** Comprehensive test coverage before v1.0 release.

### Tasks

15.1. **Achieve ≥ 80% unit test coverage** across all modules.

15.2. **Write integration tests** for each audit dimension using the fixture projects.

15.3. **Write E2E tests** — spawn the `zaria` binary and verify stdout, exit codes, and output files.

15.4. **Set up mutation testing** (`stryker`).

15.5. **Set up performance benchmarks** against a 100k-line TypeScript codebase.

15.6. **Conduct a security review**.

---

## Phase 16 — Documentation

**Goal:** Full user documentation, API reference, and contribution guide.

### Tasks

16.1. **Write user documentation site** (using VitePress).

16.2. **Write `CONTRIBUTING.md`**.

16.3. **Write `CHANGELOG.md`** following Keep a Changelog format.

16.4. **Write `SECURITY.md`** with vulnerability reporting process.

16.5. **Generate API reference documentation** (TypeDoc).

---

## Phase 17 — Distribution & Release

**Goal:** Zaria is easily installable by all target audiences.

### Tasks

17.1. **Publish to npm** — configure `package.json`, set up automated publish on git tag.

17.2. **Compile to single binary** — use `pkg` or `@yao-pkg/pkg`.

17.3. **Set up GitHub Releases** with binaries as release assets.

17.4. **Set up Homebrew tap** (macOS/Linux).

17.5. **Set up Windows Scoop manifest** _(stretch goal)_.

17.6. **Set up Docker image** for CI use cases.

17.7. **Set up release signing** with `cosign` and SBOM in SPDX format.

---

## Phase 18 — Enterprise Features

**Goal:** Features required for enterprise adoption beyond the CLI.

### Tasks

18.1. **Implement audit history and trending**.

18.2. **Implement shared team configuration**.

18.3. **Implement compliance report export** (PDF).

18.4. **Design the Zaria Dashboard** _(future: separate service)_.

18.5. **Implement custom rule registry** _(enterprise tier)_.

---

## Immediate Next Steps

1. ✅ Complete Phase 1 — Project Scaffolding (Node.js/TypeScript)
2. Complete Phase 2 — CLI Framework
3. Complete Phase 3 — Configuration System
4. Complete Phase 4 — Static Analysis Foundation
5. Complete Phases 5–9 in parallel workstreams
6. Complete Phase 10 — Scoring
7. Complete Phase 11 — Reporting
8. Tag and release `v0.1.0-alpha` for internal testing
9. Continue with Phases 12–18 iteratively.

---

## Appendix: Rule ID Registry

All rule IDs follow the format `[DIMENSION][NNN]`:

| Prefix | Dimension |
|---|---|
| `PERF` | Performance |
| `ARCH` | Architecture |
| `SCALE` | Scalability & Observability |
| `INT` | Data Integrity & Race Conditions |
| `MAINT` | Long-Term Maintenance |

Rules will be documented individually in `docs/rules/` as they are implemented.

---

## Appendix: Severity Levels

| Level | Score Impact | Meaning |
|---|---|---|
| `critical` | −20 | Must fix before production. Severe risk. |
| `high` | −10 | Should fix soon. Significant risk or debt. |
| `medium` | −5 | Fix in the next sprint. Moderate risk. |
| `low` | −2 | Fix when convenient. Minor improvement. |
| `info` | 0 | Informational only. No score impact. |
