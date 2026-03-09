# Zaria — Build Plan

This document outlines the complete, step-by-step build plan for the Zaria enterprise-grade CLI audit tool, from project initialisation through to production release. Each phase is broken into concrete, actionable tasks.

> **Prerequisite:** A tech stack must be confirmed before Phase 1 begins. See the [Proposed Tech Stacks](./README.md#proposed-tech-stacks) section in the README and provide your preference (Option A: Node.js/TypeScript or Option B: Go).

---

## Phase Overview

| Phase | Name | Outcome |
|---|---|---|
| 1 | Project Scaffolding & Tooling | Compilable, testable, linted skeleton |
| 2 | CLI Framework & Command Structure | All commands parse and route correctly |
| 3 | Configuration System | `.zariarc` / `zaria.config.ts` loading and validation |
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

## Phase 1 — Project Scaffolding & Tooling

**Goal:** A working, compilable project skeleton that all future phases can build on.

### Tasks

1.1. **Initialise repository structure**
  - Create the top-level directory layout:
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
    │   └── index.ts       # Entry point (Option A) / main.go (Option B)
    ├── tests/
    │   ├── unit/
    │   ├── integration/
    │   └── fixtures/      # Sample project codebases for testing
    ├── docs/
    ├── .zariarc.example.yml
    ├── README.md
    ├── PLAN.md
    └── package.json / go.mod
    ```

1.2. **Configure the package manager**
  - **Option A:** `npm init`, set `"type": "module"`, configure `"bin": { "zaria": "./dist/index.js" }`
  - **Option B:** `go mod init github.com/zoe-life/zaria`

1.3. **Configure TypeScript / Go build tooling**
  - **Option A:** Install and configure TypeScript (`tsconfig.json` with `"module": "NodeNext"`, `"target": "ES2022"`, `"strict": true`), configure `tsx` for development and `tsc` for production builds.
  - **Option B:** Configure `Makefile` with `build`, `test`, `lint` targets; set up `goreleaser.yml` stub.

1.4. **Configure linting and formatting**
  - **Option A:** ESLint (with `@typescript-eslint/eslint-plugin`) + Prettier. Add `.eslintrc.json` and `.prettierrc`.
  - **Option B:** `golangci-lint` with `.golangci.yml`; `gofmt` enforced in CI.

1.5. **Configure the test runner**
  - **Option A:** Vitest — `vitest.config.ts` with coverage via `@vitest/coverage-v8`. Add `test`, `test:coverage` npm scripts.
  - **Option B:** Built-in `go test` with `testify`; configure `go test ./...` in Makefile.

1.6. **Set up Git hooks**
  - **Option A:** `husky` + `lint-staged` — run ESLint and Prettier on staged files pre-commit; run tests pre-push.
  - **Option B:** `pre-commit` hook via a shell script invoking `golangci-lint`.

1.7. **Configure CI/CD pipeline (GitHub Actions)**
  - Create `.github/workflows/ci.yml`:
    - Trigger on pull requests and pushes to `main`.
    - Jobs: `lint`, `test`, `build`.
    - Use matrix strategy for Node LTS versions (Option A) or Go versions (Option B).
  - Create `.github/workflows/release.yml`:
    - Trigger on version tags (`v*`).
    - Build and publish to npm or GitHub Releases + Homebrew tap.

1.8. **Write the entry point**
  - Create a minimal `src/index.ts` (or `main.go`) that prints `Zaria v0.0.1` and exits cleanly.
  - Verify it builds and runs.

1.9. **Verify Phase 1**
  - `npm run build && node dist/index.js` outputs version (Option A).
  - `go build ./... && ./zaria` outputs version (Option B).
  - `npm run lint` / `golangci-lint run` passes with zero errors.
  - `npm test` / `go test ./...` passes (zero tests, but setup is verified).

---

## Phase 2 — CLI Framework & Command Structure

**Goal:** All documented commands and flags are parsed correctly, with stub handlers.

### Tasks

2.1. **Install and configure the CLI framework**
  - **Option A:** `npm install commander ink react`; create `src/cli/app.tsx` as the Ink root component.
  - **Option B:** `go get github.com/spf13/cobra github.com/charmbracelet/bubbletea`; create `cmd/root.go`.

2.2. **Define the root command**
  - Name: `zaria`
  - Global flags: `--config`, `--verbose`, `--no-sre`, `--version`
  - Display help text matching the README usage section.

2.3. **Define the `audit` command and sub-commands**
  - `audit [path]` — full audit
  - `audit:perf [path]`
  - `audit:arch [path]`
  - `audit:scale [path]`
  - `audit:integrity [path]`
  - `audit:maint [path]`
  - Flags: `--output/-o`, `--file/-f`, `--threshold/-t`, `--only`, `--skip`
  - Each handler calls a stub audit runner and prints `"Running [dimension] audit on [path]…"`.

2.4. **Define the `report` command**
  - Reads the most recent saved audit result from disk and re-renders it in the chosen format.

2.5. **Define `config init` and `config validate` commands**
  - `config init` — scaffolds a `.zariarc.yml` from the bundled example template.
  - `config validate` — loads and validates the config file (stub: always prints "Config valid").

2.6. **Define `sre connect` and `sre test` commands**
  - `sre connect` — interactive wizard (stub: prints "SRE connection wizard — coming soon").
  - `sre test` — pings configured SRE providers (stub: prints "No SRE providers configured").

2.7. **Define `plugin list`, `plugin add`, `plugin remove` commands**
  - All stubs at this stage.

2.8. **Write CLI unit tests**
  - Test that each command parses flags correctly.
  - Test that unknown commands produce a helpful error and exit code 1.
  - Test that `--help` outputs the usage string.

2.9. **Verify Phase 2**
  - Run `zaria --help` and confirm all commands and flags are listed.
  - Run `zaria audit ./tests/fixtures/sample-app` and confirm stub output.

---

## Phase 3 — Configuration System

**Goal:** Full config loading, merging, and validation pipeline.

### Tasks

3.1. **Define the configuration schema**
  - Create a TypeScript interface / Go struct for the full config object (project, audit dimensions, thresholds, ignore lists, plugins, sre, output).
  - Use a schema validation library (Zod for Option A, `go-playground/validator` for Option B).

3.2. **Implement config file discovery**
  - **Option A:** Use `cosmiconfig` to search for `.zariarc`, `.zariarc.json`, `.zariarc.yml`, `.zariarc.yaml`, `zaria.config.ts`, or `zaria` key in `package.json`.
  - **Option B:** Use Viper to search for `.zariarc.yaml`, `.zariarc.toml`, environment variables prefixed `ZARIA_`.

3.3. **Implement config merging**
  - Priority order (highest to lowest): CLI flags → environment variables → config file → built-in defaults.
  - Write a `mergeConfig()` function that produces a resolved, fully-typed config object.

3.4. **Implement config validation**
  - Validate types, required fields, and value ranges (e.g., thresholds must be 0–100).
  - Validate that `ignore.rules` reference real rule IDs.
  - Return structured validation errors with file location hints.

3.5. **Implement `config init` fully**
  - Copy the bundled `.zariarc.example.yml` into the project root.
  - Detect the project type and language and pre-fill defaults.

3.6. **Implement `config validate` fully**
  - Load config and display validation results in a structured terminal format.

3.7. **Write config unit tests**
  - Test config discovery (file found / not found).
  - Test merging priority order.
  - Test validation errors for invalid values.
  - Test `config init` creates the expected file.

3.8. **Verify Phase 3**
  - `zaria config init` creates `.zariarc.yml` in the working directory.
  - `zaria config validate` reports "Config valid" for the generated file.
  - `zaria config validate` reports specific errors for an invalid config fixture.

---

## Phase 4 — Static Analysis Foundation

**Goal:** File traversal, language detection, and AST parsing pipeline that all audit dimensions will use.

### Tasks

4.1. **Implement project file walker**
  - Recursively walk the project path.
  - Respect `.gitignore` and the `ignore.paths` config.
  - Classify files by type: source, test, config, asset, documentation.
  - Build a `FileManifest` object: list of file entries with path, language, size, and last-modified date.

4.2. **Implement language detection**
  - Detect: JavaScript, TypeScript, Python, Go, CSS/SCSS, HTML, JSON/YAML (config files).
  - Use file extension + optional shebang/content sniffing.

4.3. **Implement AST parser adapter**
  - **Option A:** Use `ts-morph` for TypeScript/JavaScript; `@babel/parser` as fallback for complex JSX.
  - **Option B:** Use `tree-sitter` with language grammars for JS/TS, Python, Go.
  - Define a normalised `ParsedFile` interface that wraps the raw AST with helper methods (e.g., `findFunctions()`, `findImports()`, `findCallExpressions()`).

4.4. **Implement dependency graph builder**
  - Parse all import/require statements across the codebase.
  - Build a directed graph of module dependencies.
  - Detect and report circular dependency chains.
  - **Option A:** Integrate with `madge` for additional analysis.

4.5. **Implement a rule runner framework**
  - Define a `Rule` interface: `{ id, name, dimension, severity, check(parsedFile, context) => Finding[] }`.
  - Define a `Finding` interface: `{ ruleId, severity, filePath, line, column, message, recommendation, learnMoreUrl }`.
  - Implement a `RuleRunner` that: loads rules for the requested dimensions, runs them against each parsed file in parallel, collects all findings.

4.6. **Implement finding deduplication and suppression**
  - Deduplicate identical findings across files.
  - Support inline suppression comments (e.g., `// zaria-ignore PERF001`).
  - Support file-level and project-level suppression via config.

4.7. **Write foundation unit tests**
  - Test file walker with mock filesystem.
  - Test language detection for all supported extensions.
  - Test AST parsing produces expected node types for fixture files.
  - Test rule runner calls rules and collects findings correctly.

4.8. **Create test fixtures**
  - Add `tests/fixtures/sample-ts-app/` — a small but representative TypeScript web app with known issues seeded for each dimension.
  - Add `tests/fixtures/clean-app/` — a well-structured app that should produce zero or minimal findings.

4.9. **Verify Phase 4**
  - Run the file walker on a real project and inspect the manifest.
  - Parse a TypeScript file and print the discovered function names.

---

## Phase 5 — Audit Engine: Performance

**Goal:** Implement all planned Performance audit rules.

### Tasks

5.1. **Implement rule PERF001 — N+1 Query Detection**
  - Detect database queries inside loops (ORM call patterns within `for`/`while`/`Array.forEach`).
  - Support: Prisma, TypeORM, Sequelize, Mongoose, raw SQL template literals (Option A); GORM, database/sql (Option B).

5.2. **Implement rule PERF002 — Missing Database Index Hints**
  - Detect queries that filter or sort on fields not decorated with `@Index` / migration index definitions.
  - Flag when `findMany`/`findAll` calls use fields with no corresponding index in schema files.

5.3. **Implement rule PERF003 — Synchronous Blocking in Async Context**
  - Detect `fs.readFileSync`, `execSync`, `JSON.parse` on large data, synchronous crypto in async functions / event loop.
  - Flag `time.Sleep` in request handlers (Option B).

5.4. **Implement rule PERF004 — Memory Leak Patterns**
  - Detect event listeners added without corresponding removal (e.g., `addEventListener` without `removeEventListener` in cleanup).
  - Detect subscriptions/intervals created in component mount without cleanup.
  - Flag growing in-memory caches with no eviction policy.

5.5. **Implement rule PERF005 — Missing Caching Strategy**
  - Detect expensive computations or API calls with no memoisation or cache layer.
  - Flag database reads in hot paths with no Redis/in-memory cache.

5.6. **Implement rule PERF006 — Unbounded Data Fetching**
  - Detect queries with no `LIMIT`/`take`/`limit` clause.
  - Flag `findAll()` / `SELECT *` without pagination.

5.7. **Implement rule PERF007 — Large Bundle / Import Side Effects** _(frontend projects)_
  - Detect full library imports where tree-shakeable sub-imports are available (e.g., `import _ from 'lodash'` vs `import debounce from 'lodash/debounce'`).

5.8. **Write Performance audit tests**
  - Unit test each rule with minimal AST fixtures that trigger and do not trigger the rule.
  - Integration test the full Performance engine against the seeded `sample-ts-app` fixture.

5.9. **Verify Phase 5**
  - Run `zaria audit:perf ./tests/fixtures/sample-ts-app` and confirm expected findings appear.
  - Run `zaria audit:perf ./tests/fixtures/clean-app` and confirm zero or low findings.

---

## Phase 6 — Audit Engine: Architecture

**Goal:** Implement all planned Architecture audit rules.

### Tasks

6.1. **Implement rule ARCH001 — Circular Dependencies**
  - Use the dependency graph built in Phase 4.
  - Report each cycle with the full import chain.

6.2. **Implement rule ARCH002 — God Module / Large File**
  - Flag files exceeding a configurable line count threshold (default: 500 lines).
  - Flag modules with more than a configurable number of exports (default: 20).

6.3. **Implement rule ARCH003 — Layer Boundary Violations**
  - Detect direct database calls in route/controller layer without a service/repository intermediary.
  - Detect business logic in data access layer.
  - Configurable: user defines layer mapping in `.zariarc`.

6.4. **Implement rule ARCH004 — Tight Coupling / Missing Abstraction**
  - Detect `new ConcreteClass()` inside business logic where an interface/factory should be used.
  - Flag direct module-to-module imports that bypass the intended public API.

6.5. **Implement rule ARCH005 — API Design Inconsistency**
  - For REST APIs: detect mixed HTTP verb usage (e.g., GET used for state-mutating actions), inconsistent URL naming conventions.
  - For GraphQL: detect resolvers with no error handling, N+1 in resolvers without DataLoader.

6.6. **Implement rule ARCH006 — Missing Error Boundary**
  - Detect async functions that do not have try/catch or `.catch()`.
  - Detect express/fastify route handlers with no error propagation to the next middleware.

6.7. **Write Architecture audit tests**
  - Unit test each rule.
  - Integration test against fixtures.

6.8. **Verify Phase 6**
  - Run `zaria audit:arch` on the seeded fixture and confirm all seeded architecture issues are detected.

---

## Phase 7 — Audit Engine: Scalability & Observability

**Goal:** Implement all planned Scalability & Observability audit rules.

### Tasks

7.1. **Implement rule SCALE001 — Stateful Singleton Patterns**
  - Detect in-memory state stored in module-level variables that would not survive horizontal scaling.
  - Flag session state not backed by a distributed store.

7.2. **Implement rule SCALE002 — Missing Structured Logging**
  - Detect `console.log` / `fmt.Println` used in place of a structured logger.
  - Verify log statements include correlation IDs / request IDs in web request handlers.

7.3. **Implement rule SCALE003 — Missing Distributed Tracing**
  - Detect HTTP client calls and database calls with no trace span instrumentation.
  - Check for OpenTelemetry or equivalent SDK initialisation.

7.4. **Implement rule SCALE004 — Missing Health Check Endpoints**
  - Detect express/fastify/gin/echo/FastAPI apps with no `/health`, `/ready`, or `/live` route.

7.5. **Implement rule SCALE005 — Unbounded Queue / Job Processing**
  - Detect job queue consumers with no concurrency limit or backpressure mechanism.
  - Flag missing dead-letter queue configuration.

7.6. **Implement rule SCALE006 — Hard-Coded Configuration**
  - Detect hard-coded URLs, ports, credentials, feature flags.
  - Flag values that should come from environment variables or a config service.

7.7. **Write Scalability & Observability audit tests**

7.8. **Verify Phase 7**

---

## Phase 8 — Audit Engine: Data Integrity & Race Conditions

**Goal:** Implement all planned Data Integrity & Race Conditions audit rules.

### Tasks

8.1. **Implement rule INT001 — Unguarded Shared State Mutation**
  - Detect writes to shared module-level variables from multiple async contexts without synchronisation.
  - Flag missing mutex/lock patterns around shared data structures (Option B: `sync.Mutex`).

8.2. **Implement rule INT002 — Missing Transaction Boundaries**
  - Detect sequences of two or more write operations (DB insert/update/delete) with no enclosing transaction.
  - Flag Prisma `$transaction`, TypeORM `QueryRunner`, or raw `BEGIN/COMMIT` patterns.

8.3. **Implement rule INT003 — Missing Rollback Logic**
  - Detect transactions that have no explicit rollback in error paths.

8.4. **Implement rule INT004 — TOCTOU Vulnerabilities**
  - Detect patterns where a resource is checked for existence and then used in separate operations without an atomic guarantee (e.g., check-then-act on file system or DB row).

8.5. **Implement rule INT005 — Missing Input Validation**
  - Detect route handlers that use request body / query params without schema validation (Zod, Joi, class-validator, Pydantic, etc.).

8.6. **Implement rule INT006 — Non-Idempotent Critical Writes**
  - Detect API endpoints that create resources without idempotency keys.
  - Flag payment / order mutation endpoints missing idempotency handling.

8.7. **Write Data Integrity audit tests**

8.8. **Verify Phase 8**

---

## Phase 9 — Audit Engine: Long-Term Maintenance

**Goal:** Implement all planned Long-Term Maintenance audit rules.

### Tasks

9.1. **Implement rule MAINT001 — High Cyclomatic Complexity**
  - Calculate cyclomatic complexity for every function/method.
  - Flag functions exceeding a configurable threshold (default: 10).

9.2. **Implement rule MAINT002 — High Cognitive Complexity**
  - Implement cognitive complexity scoring (nesting depth weighted by construct type).
  - Flag functions exceeding a configurable threshold (default: 15).

9.3. **Implement rule MAINT003 — Code Duplication**
  - Detect copy-pasted code blocks (token-based similarity matching).
  - Report duplication percentage and exact locations.

9.4. **Implement rule MAINT004 — Low Test Coverage**
  - Parse coverage reports (Istanbul/V8 for JS/TS; `go test -coverprofile` for Go) if available.
  - Flag files and functions with coverage below configurable thresholds.
  - If no coverage data exists, flag the absence of a coverage setup.

9.5. **Implement rule MAINT005 — Missing or Inadequate Tests**
  - Detect source files with no corresponding test file.
  - Detect test files with no assertions (empty tests).
  - Flag imbalance between unit and integration tests.

9.6. **Implement rule MAINT006 — Outdated Dependencies**
  - Read `package.json` / `go.mod` / `requirements.txt`.
  - Query npm registry / Go proxy / PyPI for latest versions.
  - Flag dependencies that are more than one major version behind.

9.7. **Implement rule MAINT007 — Known CVEs in Dependencies**
  - Run `npm audit` / `go vuln` / `pip-audit` as a subprocess and parse output.
  - Map CVE findings to Zaria findings with severity mapping.

9.8. **Implement rule MAINT008 — Missing Documentation**
  - Detect exported functions/classes/types without JSDoc / GoDoc / docstring comments.
  - Flag missing `README.md` in packages/modules that expose a public API.

9.9. **Implement rule MAINT009 — No Architectural Decision Records**
  - Check for the presence of an `docs/adr/` or `adr/` directory.
  - Flag its absence as a low-severity finding with a recommendation.

9.10. **Write Maintenance audit tests**

9.11. **Verify Phase 9**
  - Run the full five-dimension audit on `sample-ts-app` and confirm an overall score that reflects the seeded issues.

---

## Phase 10 — Scoring & Aggregation

**Goal:** Produce a deterministic, weighted overall score and per-dimension scores.

### Tasks

10.1. **Define the scoring model**
  - Each finding reduces a dimension's score: `critical = -20`, `high = -10`, `medium = -5`, `low = -2` (configurable).
  - Dimension score is clamped to [0, 100].
  - Overall score = weighted average of dimension scores (default weights configurable in `.zariarc`).
  - Default weights: Performance 20%, Architecture 25%, Scalability 20%, Integrity 20%, Maintenance 15%.

10.2. **Implement the Scorer module**
  - Input: list of `Finding[]` and config.
  - Output: `AuditResult` — per-dimension scores, overall score, grade (A–F), finding summary.

10.3. **Implement score trend tracking**
  - Persist `AuditResult` to `~/.zaria/history/<project-hash>/<timestamp>.json`.
  - Calculate score delta vs. previous run.
  - Display trend arrows (↑ ↓ →) in terminal output.

10.4. **Write Scorer unit tests**
  - Test score calculation with known finding sets.
  - Test boundary cases (zero findings = 100, catastrophic findings = 0).

---

## Phase 11 — Report Output System

**Goal:** All documented report formats implemented and tested.

### Tasks

11.1. **Implement Terminal Reporter**
  - Header: project name, overall score, grade, trend.
  - Per-dimension section: score bar, finding count by severity.
  - Findings table: sorted by severity, with file path, line, message, recommendation.
  - Footer: total run time, SRE data status, config path.
  - **Option A:** Use Ink + `cli-table3` + `chalk`.
  - **Option B:** Use `lipgloss` + `bubbletea`.

11.2. **Implement JSON Reporter**
  - Output the full `AuditResult` object as pretty-printed JSON.
  - Include metadata: version, timestamp, project path, config used.

11.3. **Implement Markdown Reporter**
  - GitHub-flavoured Markdown with collapsible sections per dimension.
  - Suitable for automated PR comment posting.

11.4. **Implement HTML Reporter**
  - Self-contained single-file HTML with embedded CSS.
  - Interactive: collapsible sections, severity filter, search.
  - No external CDN dependencies (works offline).

11.5. **Implement SARIF Reporter**
  - SARIF 2.1.0 schema compliant output.
  - Map Zaria findings to SARIF `result` objects with `location`, `level`, and `message`.
  - Enable GitHub Code Scanning integration.

11.6. **Implement `report` command**
  - Load the most recent `AuditResult` from history.
  - Re-render in any requested output format.

11.7. **Implement `--file` output flag**
  - Write report to a specified file path instead of stdout.

11.8. **Write Reporter tests**
  - Test each reporter with a known `AuditResult` fixture.
  - Validate JSON output against schema.
  - Validate SARIF output against the SARIF schema.

---

## Phase 12 — SRE Tool Integration

**Goal:** Optional connectivity to SRE providers that enriches audit findings with runtime data.

### Tasks

12.1. **Define the SRE Provider interface**
  - `SreProvider { connect(), testConnection(), fetchErrorRate(endpoint), fetchLatencyP99(endpoint), fetchIncidentHistory(dateRange) }`

12.2. **Implement SRE credential storage**
  - Use the system keychain to store tokens/API keys.
  - **Option A:** `keytar` npm package.
  - **Option B:** `zalando/go-keyring`.
  - Never write credentials to disk in plaintext.

12.3. **Implement the `sre connect` interactive wizard**
  - Select provider type.
  - Enter URL and authentication details.
  - Test connection immediately.
  - Store credentials in keychain.
  - Write non-sensitive config to `.zariarc`.

12.4. **Implement Prometheus adapter**
  - Authenticate via bearer token or basic auth.
  - Query: error rate per endpoint (5xx / total), p50/p95/p99 latency, CPU/memory saturation.
  - Map Prometheus metric labels to source code files via configured label selectors.

12.5. **Implement Datadog adapter**
  - Authenticate via API key + App key.
  - Query: APM service error rate, trace latency, log error stream, SLO burn rate.

12.6. **Implement Grafana / Loki adapter**
  - Query Grafana datasources via the HTTP API.
  - Run LogQL queries on Loki for error log streams.

12.7. **Implement SRE data correlator**
  - Match SRE metrics to static findings by endpoint path, service name, or file path.
  - Boost finding severity when the flagged code path has high error rates or is in active incident blast radius.
  - Add an `sreContext` field to enriched findings.

12.8. **Implement audit log for SRE queries**
  - Write every external API call to `~/.zaria/sre-audit.log` with timestamp, provider, query, response status.
  - Never log response bodies that may contain sensitive data.

12.9. **Write SRE integration tests**
  - Mock the HTTP calls for each provider.
  - Test correlation logic with known metric + finding fixtures.
  - Test that `--no-sre` flag completely disables all SRE calls.

---

## Phase 13 — CI/CD Integration

**Goal:** Zaria works as a first-class citizen in CI/CD pipelines.

### Tasks

13.1. **Implement exit code logic**
  - Exit `0` — audit passed (score ≥ threshold).
  - Exit `1` — audit failed (score < threshold or critical findings present).
  - Exit `2` — Zaria internal error (configuration error, parse failure, etc.).

13.2. **Implement the `--threshold` flag**
  - Compare overall score against the threshold.
  - Print a clear pass/fail banner in terminal output.

13.3. **Publish a GitHub Action**
  - Create `.github/actions/zaria-audit/action.yml`.
  - Inputs: `path`, `threshold`, `output`, `sre-enabled`.
  - Outputs: `score`, `grade`, `passed`.
  - Post a Markdown summary to the GitHub Actions job summary page.

13.4. **Publish GitLab CI template** _(stretch goal)_
  - Create a `.gitlab-ci.yml` template snippet.

13.5. **Document CI integration**
  - Add `docs/ci-integration.md` with examples for GitHub Actions, GitLab CI, CircleCI, and Jenkins.

---

## Phase 14 — Plugin Architecture

**Goal:** Third parties can extend Zaria with custom audit rules without forking the project.

### Tasks

14.1. **Define the Plugin API**
  - **Option A:** TypeScript interface published as `@zaria/plugin-api` npm package.
    ```typescript
    export interface ZariaPlugin {
      name: string;
      version: string;
      rules: Rule[];
      onInit?(context: PluginContext): Promise<void>;
      onAuditComplete?(result: AuditResult): Promise<void>;
    }
    ```
  - **Option B:** Go interface defined in a shared module; plugins compiled as `.so` or run as gRPC subprocess.

14.2. **Implement the plugin loader**
  - Load plugins listed in `.zariarc` via dynamic import (Option A) or plugin host (Option B).
  - Validate each plugin against the Plugin API interface.
  - Isolate plugin failures — a crashing plugin must not crash Zaria.

14.3. **Implement plugin discovery**
  - Scan `node_modules` for packages prefixed `zaria-plugin-` (Option A).
  - Display loaded plugins in `--verbose` output.

14.4. **Build the first official plugin: `zaria-plugin-nextjs`**
  - Additional rules specific to Next.js: missing `getStaticProps`/ISR for static-eligible pages, large `_app.tsx` with no code splitting, missing Image component usage.

14.5. **Build the first official plugin: `zaria-plugin-prisma`**
  - Rules specific to Prisma ORM: missing `select` fields (over-fetching), missing `include` guard for sensitive relations, N+1 specific to Prisma patterns.

14.6. **Document the plugin authoring guide**
  - Create `docs/plugin-authoring.md`.
  - Include a starter template repository link.

---

## Phase 15 — Testing & Quality Assurance

**Goal:** Comprehensive test coverage before v1.0 release.

### Tasks

15.1. **Achieve ≥ 80% unit test coverage** across all modules.

15.2. **Write integration tests** for each audit dimension using the fixture projects.
  - Each seeded issue in `sample-ts-app` must be caught by the corresponding rule.
  - `clean-app` must produce zero `critical` or `high` findings.

15.3. **Write E2E tests** — spawn the `zaria` binary and verify stdout, exit codes, and output files.
  - Test full audit with terminal, JSON, Markdown, HTML, SARIF outputs.
  - Test CI mode with `--threshold`.

15.4. **Set up mutation testing** to validate test quality.
  - **Option A:** `stryker` Mutant testing framework.
  - **Option B:** `go-mutesting`.

15.5. **Set up performance benchmarks** to detect regressions in audit speed.
  - Benchmark against a 100k-line TypeScript codebase.
  - Target: full audit completes in < 60 seconds on developer hardware.

15.6. **Conduct a security review**
  - Ensure no credentials are logged.
  - Ensure output file writes do not follow symlinks outside the project root.
  - Ensure SRE queries are read-only and cannot be used for SSRF.

---

## Phase 16 — Documentation

**Goal:** Full user documentation, API reference, and contribution guide.

### Tasks

16.1. **Write user documentation site** (using Docusaurus or VitePress)
  - Getting Started guide.
  - Full CLI reference (auto-generated from command definitions).
  - Configuration reference (auto-generated from schema).
  - Rule catalogue — one page per rule with description, example triggering code, and recommendation.
  - SRE Integration guide.
  - Plugin authoring guide.

16.2. **Write `CONTRIBUTING.md`**
  - Code of conduct.
  - Development setup steps.
  - How to add a new rule.
  - Pull request process and review checklist.

16.3. **Write `CHANGELOG.md`** following Keep a Changelog format.

16.4. **Write `SECURITY.md`** with vulnerability reporting process.

16.5. **Generate API reference documentation**
  - **Option A:** TypeDoc.
  - **Option B:** `godoc`.

---

## Phase 17 — Distribution & Release

**Goal:** Zaria is easily installable by all target audiences.

### Tasks

17.1. **Publish to npm (Option A)**
  - Configure `package.json` with correct `bin`, `main`, `types`, `files` fields.
  - Set up automated publish on git tag via GitHub Actions.
  - Publish `@zaria/plugin-api` as a separate package.

17.2. **Compile to single binary (both options)**
  - **Option A:** Use `pkg` or `@yao-pkg/pkg` to compile Node.js app to binary for Linux x64/arm64, macOS x64/arm64, Windows x64.
  - **Option B:** Use `goreleaser` to cross-compile and produce binaries + checksums.

17.3. **Set up GitHub Releases**
  - Attach binaries as release assets.
  - Auto-generate release notes from commits since last tag.

17.4. **Set up Homebrew tap** (macOS/Linux)
  - Create `zoe-life/homebrew-tap` repository.
  - Auto-update formula on release via GitHub Actions.

17.5. **Set up Windows Scoop manifest** _(stretch goal)_

17.6. **Set up Docker image** _(for CI use cases)_
  - `zoe-life/zaria:latest` and `zoe-life/zaria:X.Y.Z` tags.
  - Publish to GitHub Container Registry (ghcr.io).

17.7. **Set up release signing**
  - Sign binaries with `cosign`.
  - Publish SBOM (Software Bill of Materials) in SPDX format.

---

## Phase 18 — Enterprise Features

**Goal:** Features required for enterprise adoption beyond the CLI.

### Tasks

18.1. **Implement audit history and trending**
  - Store structured audit history per project.
  - CLI command `zaria history` to view score trends over time.
  - Export history as CSV or JSON.

18.2. **Implement shared team configuration**
  - Support fetching `.zariarc` from a remote URL (HTTP/S3) for organisation-wide policy.
  - Authenticated config fetch for private URLs.

18.3. **Implement compliance report export**
  - Generate a PDF report suitable for security audits or compliance documentation.
  - Include executive summary, detailed findings, remediation roadmap.

18.4. **Design the Zaria Dashboard** _(future: separate service)_
  - Web dashboard aggregating audit results across multiple projects.
  - Role-based access control.
  - API key management for CI/CD integration.
  - Webhook notifications (Slack, Teams, PagerDuty) on score threshold breach.

18.5. **Implement custom rule registry** _(enterprise tier)_
  - Organisation-scoped private rule packages.
  - Rule versioning and rollout control.

---

## Immediate Next Steps (Post-Confirmation)

Once the tech stack is confirmed, the following should happen **in order**:

1. ✅ Complete Phase 1 — Project Scaffolding (2–3 days)
2. ✅ Complete Phase 2 — CLI Framework (1–2 days)
3. ✅ Complete Phase 3 — Configuration System (2 days)
4. ✅ Complete Phase 4 — Static Analysis Foundation (3–5 days)
5. ✅ Complete Phases 5–9 in parallel workstreams (1–2 weeks)
6. ✅ Complete Phase 10 — Scoring (1 day)
7. ✅ Complete Phase 11 — Reporting (2–3 days)
8. ✅ Tag and release `v0.1.0-alpha` for internal testing
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
