# Zaria — CLI Reference

> **Phase 12** — All five audit dimension engines implemented, weighted scoring & aggregation, five report output formats, and SRE integration with Prometheus, Datadog, and Grafana.

---

## Usage

```
zaria <command> [options]
```

---

## Global Options

| Flag | Description | Default |
|---|---|---|
| `--config <path>` | Path to a custom config file | — |
| `-v, --verbose` | Show verbose output | `false` |
| `--no-sre` | Disable SRE data fetching even if configured | `false` |
| `--version` | Show version number | — |
| `-h, --help` | Show help | — |

---

## Commands

### `audit [path]`

Run a full five-dimension audit on the given project path, compute a weighted overall score, and output a report.

```bash
zaria audit [path] [options]
```

**Arguments**

| Argument | Description | Default |
|---|---|---|
| `path` | Path to the project root | current directory |

**Options**

| Flag | Description | Default |
|---|---|---|
| `-o, --output <format>` | Output format: `terminal\|json\|html\|markdown\|sarif` | `terminal` |
| `-f, --file <path>` | Write report to file instead of stdout | — |
| `-t, --threshold <score>` | Exit with code 1 if overall score is below this value (0–100) | — |
| `--only <dimensions>` | Comma-separated list of dimension names to run (e.g. `performance,architecture`) | — |
| `--skip <rules>` | Comma-separated list of rule IDs to skip (e.g. `MAINT001,ARCH002`) | — |
| `-v, --verbose` | Include full finding list in terminal output | `false` |

**Examples**

```bash
# Full audit of current directory, terminal output
zaria audit

# Audit a specific project, output as JSON to a file
zaria audit ./api-service -o json -f audit-report.json

# CI/CD: fail the pipeline if overall score drops below 70
zaria audit --threshold 70

# Self-contained HTML report
zaria audit -o html -f report.html

# SARIF for GitHub Code Scanning
zaria audit -o sarif -f results.sarif

# Run only the performance and architecture dimensions
zaria audit --only performance,architecture

# Skip a noisy rule across all dimensions (use uppercase rule IDs)
zaria audit --skip MAINT002

# Show verbose finding list in terminal
zaria audit -v
```

---

### `audit:perf [path]`

Run only the **Performance** audit.

```bash
zaria audit:perf [path] [options]
```

Accepts the same options as `audit`.

---

### `audit:arch [path]`

Run only the **Architecture** audit.

```bash
zaria audit:arch [path] [options]
```

Accepts the same options as `audit`.

---

### `audit:scale [path]`

Run only the **Scalability & Observability** audit.

```bash
zaria audit:scale [path] [options]
```

Accepts the same options as `audit`.

---

### `audit:integrity [path]`

Run only the **Data Integrity & Race Conditions** audit.

```bash
zaria audit:integrity [path] [options]
```

Accepts the same options as `audit`.

---

### `audit:maint [path]`

Run only the **Long-Term Maintenance** audit.

```bash
zaria audit:maint [path] [options]
```

Accepts the same options as `audit`.

---

### `report`

Generate a report from the last audit run.

```bash
zaria report [options]
```

**Options**

| Flag | Description | Default |
|---|---|---|
| `-o, --output <format>` | Output format: `terminal\|json\|html\|markdown\|sarif` | `terminal` |
| `-f, --file <path>` | Write report to file instead of stdout | — |

---

### `config init`

Scaffold a `.zariarc.yml` configuration file in the current directory (or a specified directory). Zaria auto-detects the project type and primary language from the directory contents.

```bash
zaria config init [options]
```

**Options**

| Flag | Description | Default |
|---|---|---|
| `--dir <path>` | Target directory to scaffold into | current directory |
| `--force` | Overwrite an existing `.zariarc.yml` | `false` |

**Output**

```
✅  Created .zariarc.yml in /my/project
    Detected project: my-app
    Detected type   : web
    Detected language: typescript
```

Exits with code 1 if `.zariarc.yml` already exists and `--force` is not set.

---

### `config validate`

Validate the `.zariarc` configuration file found in the current directory, or a file specified with `--config`.

```bash
zaria config validate [options]
```

**Options**

| Flag | Description |
|---|---|
| `--config <path>` | Path to the config file to validate |

**Output — valid**

```
✅  Config valid (/my/project/.zariarc.yml)
```

**Output — invalid**

```
❌  Config "/my/project/.zariarc.yml" has 2 error(s):

  • audit.thresholds.overall: Too big: expected number to be <=100
  • ignore.rules: Unknown rule ID "NONEXISTENT". Known IDs: PERF001, …
```

Exits with code 1 when the config is invalid.

---

### `sre connect`

Interactively configure an SRE tool connection. In a TTY, prompts for provider selection, base URL, and API credentials. In CI/CD environments, reads from environment variables.

```bash
zaria sre connect [options]
```

**Options**

| Flag | Description |
|---|---|
| `-p, --provider <name>` | Pre-select provider: `prometheus\|datadog\|grafana` |

**Environment Variables (non-TTY / CI mode)**

| Variable | Description |
|---|---|
| `ZARIA_SRE_PROVIDER` | Provider name: `prometheus`, `datadog`, or `grafana` |
| `ZARIA_SRE_BASE_URL` | Base URL of the SRE tool API |
| `ZARIA_SRE_TOKEN` | API token / bearer token (for Prometheus and Grafana, also Datadog API key) |
| `ZARIA_SRE_APP_KEY` | Datadog application key — required for Datadog metric queries (`DD-APPLICATION-KEY`) |

Exits with code 1 if the connectivity test fails.

---

### `sre test`

Test connectivity to a configured SRE provider.

```bash
zaria sre test [options]
```

**Options**

| Flag | Description |
|---|---|
| `-p, --provider <name>` | Provider: `prometheus\|datadog\|grafana` |
| `--url <url>` | Base URL of the provider |
| `--token <token>` | API token / API key |
| `--app-key <key>` | Datadog application key (required for Datadog metric queries) |

**Examples**

```bash
# Test Prometheus connectivity
zaria sre test --provider prometheus --url https://prom.example.com --token mytoken

# Test Datadog connectivity (both API key and application key required for full access)
zaria sre test --provider datadog --url https://api.datadoghq.com --token myapikey --app-key myappkey

# Test Grafana connectivity
zaria sre test --provider grafana --url https://grafana.example.com --token glsa_xxx
```

Exits with code 0 on success, code 1 on failure.

---

### `plugin list`

List installed Zaria plugins.

```bash
zaria plugin list
```

---

### `plugin add <name>`

Install a Zaria plugin.

```bash
zaria plugin add <name>
```

---

### `plugin remove <name>`

Remove an installed Zaria plugin.

```bash
zaria plugin remove <name>
```

---

## Report Formats

| Format | Flag | Description |
|---|---|---|
| `terminal` | `-o terminal` | ANSI-coloured output with progress bars and grade badge |
| `json` | `-o json` | Machine-readable JSON (full `AuditResult` structure) |
| `markdown` | `-o markdown` | GitHub / GitLab PR-comment format with emoji severity badges |
| `html` | `-o html` | Self-contained, offline-capable HTML report |
| `sarif` | `-o sarif` | SARIF 2.1.0 for GitHub Code Scanning, Azure DevOps, VS Code |

All formats can be written to a file with `-f <path>`.

---

## Scoring

Zaria computes a **weighted overall score** from five dimension scores (each 0–100):

| Dimension | Weight |
|---|---|
| Performance | 25 % |
| Architecture | 25 % |
| Scalability & Observability | 20 % |
| Data Integrity & Race Conditions | 20 % |
| Long-Term Maintenance | 10 % |

**Grade thresholds:**

| Grade | Score range |
|---|---|
| **A** | 90–100 |
| **B** | 80–89 |
| **C** | 70–79 |
| **D** | 60–69 |
| **F** | 0–59 |

---

## Examples

```bash
# Full audit of current directory, terminal output
zaria audit

# Audit a specific project, output as JSON to a file
zaria audit ./api-service -o json -f audit-report.json

# CI/CD: fail the pipeline if overall score drops below 70
zaria audit --threshold 70

# Run only architecture and maintenance audits (use full dimension names)
zaria audit --only architecture,maintenance

# Generate a self-contained HTML report
zaria audit -o html -f report.html

# Generate SARIF for GitHub Code Scanning
zaria audit -o sarif -f results.sarif

# Initialise config for a project
zaria config init

# Validate an existing config
zaria config validate

# Connect a Prometheus SRE provider
zaria sre connect --provider prometheus

# Connect a Datadog SRE provider (wizard will prompt for both API key and application key)
zaria sre connect --provider datadog

# Test Datadog connectivity
zaria sre test --provider datadog --url https://api.datadoghq.com --token myapikey --app-key myappkey
```

---

## Audit Rules Reference

### Performance (PERF)

| Rule ID | Name | Severity | Description |
|---|---|---|---|
| `PERF001` | N+1 Query Pattern | high | Detects ORM calls inside loops |
| `PERF002` | Synchronous Blocking in Async Context | high | Detects sync I/O inside async functions |
| `PERF003` | Missing Pagination | medium | Detects unbounded queries returning full result sets |
| `PERF004` | Memory Leak Patterns | medium | Detects event listeners not cleaned up |

### Architecture (ARCH)

| Rule ID | Name | Severity | Description |
|---|---|---|---|
| `ARCH001` | Circular Dependency | high | Detects circular import chains |
| `ARCH002` | God Module | medium | Flags files with >500 LOC and >20 exports |
| `ARCH003` | Missing Abstraction Layer | medium | Detects route files importing ORM models directly |
| `ARCH004` | High Import Fan-In | low | Detects files with too many inbound imports |

### Scalability & Observability (SCALE)

| Rule ID | Name | Severity | Description |
|---|---|---|---|
| `SCALE001` | Missing Structured Logging | medium | Detects raw `console.*` calls in application code |
| `SCALE002` | Unbounded Query | high | Detects ORM queries without `.limit()` / `.take()` |
| `SCALE003` | Stateful Singleton Pattern | medium | Detects module-level mutable state |
| `SCALE004` | Missing Health Check Endpoint | medium | Detects HTTP apps without a `/health` route |

### Data Integrity & Race Conditions (INT)

| Rule ID | Name | Severity | Description |
|---|---|---|---|
| `INT001` | Missing Input Validation | high | Detects route handlers reading request data without validation |
| `INT002` | Missing Transaction Boundary | high | Detects multiple ORM writes outside a transaction |
| `INT003` | TOCTOU Vulnerability Pattern | high | Detects check-then-act race conditions |
| `INT004` | Non-Idempotent Write Operation | medium | Detects POST handlers that don't guard against duplicate creation |

### Long-Term Maintenance (MAINT)

| Rule ID | Name | Severity | Description |
|---|---|---|---|
| `MAINT001` | High Cyclomatic Complexity | medium | Flags functions with cyclomatic complexity > 10 |
| `MAINT002` | Code Duplication | low | Detects copy-pasted code blocks (≥6 identical consecutive lines) |
| `MAINT003` | Deprecated Dependency | medium | Flags officially deprecated packages in `package.json` |
| `MAINT004` | Missing Test Coverage | low | Detects source files with no corresponding test file |
| `MAINT005` | Outdated Dependency | medium | Flags dependencies more than 2 major versions behind the latest release |
