# Zaria — CLI Reference

> **Phase 9** — All five audit dimension engines implemented. Full static analysis available for Performance, Architecture, Scalability & Observability, Data Integrity & Race Conditions, and Long-Term Maintenance.

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

Run a full audit on the given project path.

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
| `-o, --output <format>` | Output format: `terminal|json|html|markdown|sarif` | `terminal` |
| `-f, --file <path>` | Write report to file instead of stdout | — |
| `-t, --threshold <score>` | Fail with exit code 1 if overall score is below this value (0–100) | — |
| `--only <dimensions>` | Comma-separated list of audit dimensions to run | — |
| `--skip <dimensions>` | Comma-separated list of audit dimensions to skip | — |

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
| `-o, --output <format>` | Output format: `terminal|json|html|markdown|sarif` | `terminal` |
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

Interactively configure an SRE tool connection.

```bash
zaria sre connect
```

---

### `sre test`

Test connectivity to configured SRE tools.

```bash
zaria sre test
```

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

## Examples

```bash
# Full audit of current directory, terminal output
zaria audit

# Audit a specific project, output as JSON to a file
zaria audit ./api-service -o json -f audit-report.json

# CI/CD: fail the pipeline if overall score drops below 70
zaria audit --threshold 70

# Run only architecture and maintenance audits
zaria audit --only arch,maint

# Initialise config for a project
zaria config init

# Validate an existing config
zaria config validate
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
