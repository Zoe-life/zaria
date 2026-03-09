# Zaria — CLI Reference

> **Phase 2** — All commands and flags parse correctly. Handlers are stubs that will be replaced in subsequent phases.

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

Scaffold a `.zariarc.yml` configuration file in the current directory.

```bash
zaria config init
```

---

### `config validate`

Validate the current `.zariarc` configuration file.

```bash
zaria config validate
```

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
