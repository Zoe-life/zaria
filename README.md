# Zaria — Codebase Audit CLI

> **Zaria** is an open-source CLI tool that audits application codebases across five critical dimensions: Performance, Architecture, Scalability & Observability, Data Integrity & Race Conditions, and Long-Term Maintenance Costs. It is designed to serve developers, small organisations, and large enterprises alike — with optional integration into SRE tooling for deeper, runtime-informed analysis.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Audit Dimensions](#audit-dimensions)
4. [Tech Stack](#tech-stack)
5. [Quick Start](#quick-start)
6. [CLI Usage](#cli-usage)
7. [Configuration](#configuration)
8. [SRE Tool Integration (Optional)](#sre-tool-integration-optional)
9. [Report Formats](#report-formats)
10. [Architecture Overview](#architecture-overview)
11. [Roadmap](#roadmap)
12. [Contributing](#contributing)
13. [License](#license)

---

## Overview

Modern software teams move fast. Technical debt accumulates, architectural decisions drift, and performance regressions go unnoticed until they cost the business. **Zaria** brings automated, structured, and actionable audits directly into your development workflow — from a single `zaria audit` command.

Zaria analyses static code, project structure, dependency graphs, and configuration files. When connected to SRE tooling (Prometheus, Datadog, Grafana, PagerDuty, etc.), it enriches its analysis with real runtime telemetry, giving organisations the most complete picture of their codebase health.

---

## Key Features

- **Five-dimensional audit engine** covering Performance, Architecture, Scalability & Observability, Data Integrity & Race Conditions, and Long-Term Maintenance.
- **Zero-config static analysis** — works out of the box on any web application codebase.
- **Optional SRE integration** — connect to Prometheus, Datadog, Grafana, Loki, New Relic, or custom log sources for runtime-informed scoring.
- **Severity-ranked findings** — every finding is classified as `critical`, `high`, `medium`, or `low` with an actionable recommendation.
- **Multiple report formats** — interactive terminal output (colourised, tabular), JSON, HTML, Markdown, and SARIF (for CI/CD integration).
- **CI/CD ready** — non-zero exit codes on threshold breaches, configurable quality gates.
- **Language support** — initial support for JavaScript, TypeScript, Python, and Go web application codebases; expanding to mobile and desktop.
- **Plugin architecture** — extend Zaria with custom audit rules for your organisation's standards.
- **Enterprise features** — role-based access for shared dashboards, audit history, and compliance report exports.

---

## Audit Dimensions

### 1. Performance
- Identifies N+1 query patterns, missing database indices, and synchronous blocking in async contexts.
- Detects bundle size issues, unoptimised assets, and missing caching strategies.
- Flags memory leak patterns (event listeners not cleaned up, closure captures, etc.).
- Analyses algorithmic complexity hotspots.

### 2. Architecture
- Maps actual dependency relationships and flags circular dependencies.
- Evaluates adherence to layered/hexagonal/clean architecture principles.
- Detects tight coupling, missing abstraction layers, and god objects/modules.
- Checks separation of concerns between business logic, data access, and presentation layers.
- Reviews API design consistency (REST, GraphQL, gRPC conventions).

### 3. Scalability & Observability
- Flags stateful patterns that prevent horizontal scaling.
- Identifies missing or insufficient distributed tracing, metrics, and structured logging.
- Reviews message queue and async job patterns for durability.
- Evaluates health-check endpoints and readiness/liveness probes.
- Checks for hard-coded limits, missing pagination, and unbounded queries.

### 4. Data Integrity & Race Conditions
- Detects unguarded shared-state mutations in concurrent contexts.
- Reviews transaction boundaries and missing rollback logic.
- Flags optimistic locking omissions and TOCTOU (Time-Of-Check-Time-Of-Use) vulnerabilities.
- Checks input validation and sanitisation completeness.
- Analyses idempotency of critical write operations.

### 5. Long-Term Maintenance Costs
- Measures cyclomatic complexity, cognitive complexity, and code duplication.
- Audits test coverage distribution and the quality of test types (unit, integration, E2E).
- Flags deprecated dependencies, known CVEs, and outdated language runtimes.
- Reviews inline documentation completeness and consistency.
- Estimates onboarding friction from missing architectural decision records (ADRs).

---

## Tech Stack

Zaria is built with **Node.js / TypeScript** — chosen for its best-in-class JS/TS AST tooling, vast npm ecosystem, and easy `npx` distribution.

| Concern | Choice |
|---|---|
| Language | TypeScript 5.x |
| CLI framework | [Commander.js](https://github.com/tj/commander.js) |
| Static analysis | [ts-morph](https://ts-morph.com/) |
| SRE HTTP client | Native `fetch` (Node.js ≥ 20) |
| Config parsing | [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) |
| Schema validation | [Zod](https://zod.dev/) |
| Logging | [pino](https://getpino.io/) + pino-pretty |
| Testing | [Vitest](https://vitest.dev/) |
| Distribution | npm / `npx zaria` |
| Plugin system | ESM dynamic `import()` with a typed plugin interface |

---

## Quick Start

> _The following commands will be available once the CLI is built. This section documents the intended developer experience._

```bash
# Install globally via npm (Option A)
npm install -g zaria

# Or run without installing
npx zaria audit ./my-project

# Or install the Go binary (Option B)
brew install zoe-life/tap/zaria    # macOS
curl -sSL https://zaria.dev/install.sh | sh   # Linux / WSL
```

---

## CLI Usage

```
zaria <command> [options]

Commands:
  audit [path]          Run a full audit on the given project path (default: current directory)
  audit:perf [path]     Run only the Performance audit
  audit:arch [path]     Run only the Architecture audit
  audit:scale [path]    Run only the Scalability & Observability audit
  audit:integrity [path] Run only the Data Integrity & Race Conditions audit
  audit:maint [path]    Run only the Long-Term Maintenance audit
  report                Generate a report from the last audit run
  config init           Scaffold a .zariarc config file
  config validate       Validate the current .zariarc file
  sre connect           Interactively configure an SRE tool connection
  sre test              Test connectivity to configured SRE tools
  plugin list           List installed plugins
  plugin add <name>     Install a Zaria plugin
  plugin remove <name>  Remove a Zaria plugin

Options:
  -o, --output <format>   Output format: terminal|json|html|markdown|sarif (default: terminal)
  -f, --file <path>       Write report to file instead of stdout
  -t, --threshold <score> Fail with exit code 1 if overall score is below this value (0-100)
  --no-sre                Disable SRE data fetching even if configured
  --only <dimensions>     Comma-separated list of audit dimensions to run
  --skip <dimensions>     Comma-separated list of audit dimensions to skip
  --config <path>         Path to a custom config file
  -v, --verbose           Show verbose output
  --version               Show version number
  -h, --help              Show help
```

### Examples

```bash
# Full audit of current directory, terminal output
zaria audit

# Audit a specific project, output as JSON to a file
zaria audit ./api-service -o json -f audit-report.json

# CI/CD: fail the pipeline if overall score drops below 70
zaria audit --threshold 70

# Run only architecture and maintenance audits
zaria audit --only arch,maint

# Full audit with SRE data fetching disabled
zaria audit --no-sre

# Initialise config for a project
zaria config init
```

---

## Configuration

Zaria supports zero-config usage out of the box. For fine-grained control, create a `.zariarc` (JSON/YAML) or `zaria.config.ts` file in your project root.

```yaml
# .zariarc.yml — example configuration
version: 1

project:
  name: "My Web API"
  type: web          # web | mobile | desktop | library
  language: typescript

audit:
  dimensions:
    - performance
    - architecture
    - scalability
    - integrity
    - maintenance
  thresholds:
    overall: 75
    performance: 70
    architecture: 80

ignore:
  paths:
    - node_modules
    - dist
    - .next
    - coverage
  rules:
    - PERF001   # Disable a specific rule by ID

plugins:
  - zaria-plugin-nextjs
  - zaria-plugin-prisma

sre:
  enabled: false   # Set to true and configure below to enable
  # providers:
  #   - type: prometheus
  #     url: https://prometheus.internal.example.com
  #     auth:
  #       type: bearer
  #       token: ${PROMETHEUS_TOKEN}
  #   - type: datadog
  #     apiKey: ${DATADOG_API_KEY}
  #     appKey: ${DATADOG_APP_KEY}

output:
  format: terminal
  colors: true
  detail: standard   # minimal | standard | verbose
```

---

## SRE Tool Integration (Optional)

Zaria can optionally connect to your organisation's SRE tooling to enrich static analysis with runtime data. This is **entirely opt-in** and Zaria works fully without it.

### Supported Providers (Planned)

| Provider | Data Available |
|---|---|
| **Prometheus** | Error rates, latency percentiles, resource utilisation, alert firing history |
| **Datadog** | APM traces, log anomalies, infrastructure metrics, SLO compliance |
| **Grafana / Loki** | Log stream queries, dashboard alert history |
| **New Relic** | Transaction traces, error analytics, deployment markers |
| **PagerDuty** | Incident history, MTTR, on-call load |
| **Custom HTTP** | Any provider exposing a JSON API via a configurable adapter |

### What SRE Data Adds

- Correlates static findings with real error rates (e.g., flagging a code path as `critical` if it is both complex _and_ responsible for 40% of production errors).
- Provides MTTR and incident frequency context for maintenance scoring.
- Validates that observability gaps found in code actually result in blind spots at runtime.
- Offers trend data to distinguish new regressions from long-standing issues.

### Security & Privacy

- Credentials are stored in the system keychain (macOS Keychain, Linux `libsecret`, Windows Credential Manager) — never in plain text files.
- All SRE queries are read-only.
- An audit log of every external query made is written locally.

---

## Report Formats

| Format | Use Case |
|---|---|
| **Terminal** | Interactive developer workflow — colourised, summary + details |
| **JSON** | Machine-readable output for custom dashboards or CI artefacts |
| **HTML** | Shareable self-contained report for stakeholders |
| **Markdown** | GitHub/GitLab PR comment integration |
| **SARIF** | GitHub Code Scanning, Azure DevOps, VS Code integration |
| **PDF** _(planned)_ | Formal enterprise compliance reports |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Zaria CLI                               │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  CLI Parser │  │  Config      │  │  Plugin Loader        │  │
│  │ (Commander/ │  │  Resolver    │  │  (ESM / gRPC)         │  │
│  │  Cobra)     │  │ (cosmiconfig/│  │                       │  │
│  └──────┬──────┘  │  Viper)      │  └───────────┬───────────┘  │
│         │         └──────┬───────┘              │              │
│         └────────────────┴──────────────────────┘              │
│                          │                                       │
│                   ┌──────▼──────┐                               │
│                   │ Audit       │                               │
│                   │ Orchestrator│                               │
│                   └──────┬──────┘                               │
│                          │                                       │
│        ┌─────────────────┼──────────────────┐                  │
│        │                 │                  │                   │
│  ┌─────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐          │
│  │  Static    │  │  SRE Data    │  │  Dependency  │          │
│  │  Analyser  │  │  Fetcher     │  │  Graph       │          │
│  │            │  │  (optional)  │  │  Analyser    │          │
│  └─────┬──────┘  └───────┬──────┘  └───────┬──────┘          │
│        │                 │                  │                   │
│        └─────────────────┼──────────────────┘                  │
│                          │                                       │
│            ┌─────────────▼──────────────┐                      │
│            │   Dimension Engines        │                      │
│            │  ┌──────┐ ┌──────┐        │                      │
│            │  │Perf  │ │Arch  │ ...    │                      │
│            │  └──────┘ └──────┘        │                      │
│            └─────────────┬──────────────┘                      │
│                          │                                       │
│                   ┌──────▼──────┐                               │
│                   │  Scorer &   │                               │
│                   │  Reporter   │                               │
│                   └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### Audit Dimensions Implemented (Phases 4–9)

| Dimension | Engine Location | Rules |
|---|---|---|
| **Performance** | `src/audit/performance/` | PERF001–PERF004 |
| **Architecture** | `src/audit/architecture/` | ARCH001–ARCH004 |
| **Scalability & Observability** | `src/audit/scalability/` | SCALE001–SCALE004 |
| **Data Integrity & Race Conditions** | `src/audit/integrity/` | INT001–INT004 |
| **Long-Term Maintenance** | `src/audit/maintenance/` | MAINT001–MAINT005 |

### Scoring & Reporting (Phases 10–11)

| Module | Location | Description |
|---|---|---|
| **Aggregation scorer** | `src/scorer/aggregate.ts` | Weighted overall score (0–100) + letter grade (A–F) |
| **Terminal reporter** | `src/report/terminal.ts` | ANSI-coloured TTY output with progress bars |
| **JSON reporter** | `src/report/json.ts` | Machine-readable structured JSON |
| **Markdown reporter** | `src/report/markdown.ts` | GitHub/GitLab PR-comment format with emoji badges |
| **HTML reporter** | `src/report/html.ts` | Self-contained, offline-capable HTML report |
| **SARIF reporter** | `src/report/sarif.ts` | SARIF 2.1.0 for GitHub Code Scanning / Azure DevOps |

**Scoring weights:** Performance 25 % · Architecture 25 % · Scalability 20 % · Integrity 20 % · Maintenance 10 %

**Grade thresholds:** A (≥ 90) · B (≥ 80) · C (≥ 70) · D (≥ 60) · F (< 60)

### SRE Integration (Phase 12)

| Adapter | Location | Auth |
|---|---|---|
| **Prometheus** | `src/sre/prometheus.ts` | Bearer token / HTTP Basic |
| **Datadog** | `src/sre/datadog.ts` | `DD-API-KEY` + `DD-APPLICATION-KEY` |
| **Grafana** | `src/sre/grafana.ts` | Service-account Bearer token / HTTP Basic |

Configure via interactive wizard (`zaria sre connect`) or env vars (`ZARIA_SRE_PROVIDER`, `ZARIA_SRE_BASE_URL`, `ZARIA_SRE_TOKEN`).

---

## Roadmap

| Milestone | Target | Description |
|---|---|---|
| **v0.1** | Phase 1–3 | Core CLI skeleton, configuration, basic static analysis |
| **v0.2** | Phase 4–6 | Full five-dimension audit engine for JS/TS web apps |
| **v0.3** | Phase 7–8 | Scalability & Observability + Data Integrity & Race Conditions engines |
| **v0.4** ✅ | Phase 9 | Long-Term Maintenance engine — cyclomatic complexity, code duplication, deprecated/outdated dependencies, missing test coverage |
| **v0.5** ✅ | Phase 10–11 | Weighted scoring & aggregation, five report formats, real audit pipeline |
| **v0.6** ✅ | Phase 12 | Prometheus, Datadog, and Grafana SRE adapters; interactive `sre connect` wizard |
| **v1.0** | Phase 13–14 | CI quality gates, plugin architecture, npm publish |
| **v1.x** | Phase 15+ | Python support, mobile auditing, enterprise dashboard |

---

## Contributing

Contributions are welcome! Please read `CONTRIBUTING.md` (coming soon) for guidelines on:

- Filing bug reports and feature requests
- Writing and submitting audit rules as plugins
- Code style and commit conventions
- Running the test suite locally

---

## License

[MIT](./LICENSE) — © 2026 Zoe-life contributors.
