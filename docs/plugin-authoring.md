# Plugin Authoring Guide

This guide explains how to write, publish, and load a Zaria plugin.

---

## Overview

Zaria's plugin system lets you extend the audit engine with additional rules
specific to frameworks, ORMs, or domain conventions that aren't covered by the
built-in dimensions.

Official plugins published by the Zaria team:

**Framework & ORM plugins**

| Package | Description |
|---------|-------------|
| `zaria-plugin-nextjs` | Next.js–specific rules (image optimisation, data fetching, error boundaries) |
| `zaria-plugin-prisma` | Prisma ORM rules (singleton pattern, connection leaks, SQL injection guards) |

**Language plugins** (extend Zaria's multi-language support with language-specific best-practice rules)

| Package | Language | Rules |
|---------|----------|-------|
| `zaria-plugin-python` | Python | PY001 print() vs logging, PY002 bare except, PY003 mutable defaults |
| `zaria-plugin-go` | Go | GO001 ignored errors, GO002 panic() in production, GO003 fmt.Print* vs logger |
| `zaria-plugin-rust` | Rust | RUST001 .unwrap() panics, RUST002 unsafe blocks, RUST003 .clone() allocation |
| `zaria-plugin-java` | Java | JAVA001 System.out vs logger, JAVA002 empty catch, JAVA003 broad Exception catch |
| `zaria-plugin-c` | C | C001 gets() overflow, C002 sprintf() bounds, C003 malloc NULL check |
| `zaria-plugin-cpp` | C++ | CPP001 using namespace in headers, CPP002 raw new/delete, CPP003 printf vs iostream |
| `zaria-plugin-csharp` | C# | CS001 Console.Write vs ILogger, CS002 empty catch, CS003 Thread.Sleep in async |

---

## Quick Start

### 1. Create the package

```bash
mkdir zaria-plugin-myplugin
cd zaria-plugin-myplugin
npm init -y
```

Set the `name` field to `zaria-plugin-myplugin` (the `zaria-plugin-` prefix is
**required** for automatic discovery).

### 2. Install types

```bash
npm install --save-dev zaria
```

### 3. Implement the plugin

Create `src/index.ts`:

```typescript
import type { ZariaPlugin, PluginContext } from 'zaria/plugin';
import type { Rule, AnalysisContext, Finding } from 'zaria/audit';

// ---------------------------------------------------------------------------
// Rule implementations
// ---------------------------------------------------------------------------

const myRule001: Rule = {
  id: 'MYPLUGIN001',
  name: 'Example rule',
  description: 'Detects something bad in the project.',
  severity: 'medium',
  check(context: AnalysisContext): Finding[] {
    const findings: Finding[] = [];

    for (const file of context.files) {
      if (/badPattern/.test(file.content)) {
        findings.push({
          ruleId: 'MYPLUGIN001',
          severity: 'medium',
          message: 'Bad pattern detected.',
          file: file.sourceFile.path,
          recommendation: 'Replace the bad pattern with a good one.',
        });
      }
    }

    return findings;
  },
};

// ---------------------------------------------------------------------------
// Plugin export
// ---------------------------------------------------------------------------

export const plugin: ZariaPlugin = {
  name: 'zaria-plugin-myplugin',
  version: '1.0.0',
  rules: [myRule001],

  // Optional: runs once before any rules are checked.
  async onInit(context: PluginContext): Promise<void> {
    console.log(`Auditing ${context.projectRoot}`);
  },

  // Optional: runs once after the full audit result is available.
  async onAuditComplete(result): Promise<void> {
    console.log(`Overall score: ${result.overall.weighted}`);
  },
};

export default plugin;
```

---

## The `ZariaPlugin` Interface

```typescript
export interface ZariaPlugin {
  /** Unique plugin name, matching the npm package name. */
  name: string;

  /** Semantic version string, e.g. "1.0.0". */
  version: string;

  /**
   * Array of audit rules contributed by this plugin.
   * Each rule must implement the `Rule` interface from `zaria/audit`.
   */
  rules: Rule[];

  /**
   * Optional hook called once before any rules are run.
   * Use for async setup (e.g. reading extra config, connecting to a service).
   * If this hook throws, the plugin is skipped and a warning is logged.
   */
  onInit?(context: PluginContext): Promise<void>;

  /**
   * Optional hook called once after the full audit has completed.
   * Receives the complete AuditResult for post-processing (e.g. sending to
   * a dashboard or triggering a notification).
   * Errors here are isolated and do not affect the exit code.
   */
  onAuditComplete?(result: AuditResult): Promise<void>;
}
```

---

## The `Rule` Interface

```typescript
export interface Rule {
  /** Unique rule ID, e.g. "MYPLUGIN001". */
  id: string;

  /** Short human-readable name shown in reports. */
  name: string;

  /** Detailed description of what the rule checks. */
  description: string;

  /** Default severity: "critical" | "high" | "medium" | "low". */
  severity: Severity;

  /**
   * Core analysis function.
   *
   * @param context  The AnalysisContext produced by Zaria's static analyser.
   * @returns        Zero or more findings; return [] when no issues are found.
   */
  check(context: AnalysisContext): Finding[];
}
```

### `AnalysisContext` fields

| Field | Type | Description |
|-------|------|-------------|
| `projectRoot` | `string` | Absolute path to the project being audited |
| `files` | `ParsedFile[]` | All parsed source files |
| `totalLoc` | `number` | Total lines of code |
| `languageDistribution` | `Record<string, number>` | Files per language |
| `importGraph` | `ImportEdge[]` | Flattened, deduplicated import graph |

### `ParsedFile` fields

| Field | Type | Description |
|-------|------|-------------|
| `sourceFile.path` | `string` | Absolute file path |
| `content` | `string` | Raw file content |
| `loc` | `number` | Non-empty lines |
| `functionCount` | `number` | Functions + arrow functions + methods |
| `classCount` | `number` | Class declarations |
| `exports` | `number` | Export declarations |
| `imports` | `ImportEdge[]` | Import edges from this file |

---

## Severity Levels

| Level | Score impact | Meaning |
|-------|-------------|---------|
| `critical` | −20 | Must fix before production |
| `high` | −10 | Should fix soon |
| `medium` | −5 | Fix in the next sprint |
| `low` | −2 | Fix when convenient |

---

## Loading Your Plugin

### Option A — Automatic discovery

Install your plugin in the project's `node_modules`:

```bash
npm install --save-dev zaria-plugin-myplugin
```

Zaria automatically discovers any installed package whose name starts with
`zaria-plugin-` when running `zaria audit`.

### Option B — Explicit flag

```bash
zaria audit --plugins zaria-plugin-myplugin
```

### Option C — Config file (`.zariarc.yml`)

```yaml
version: 1
plugins:
  - zaria-plugin-myplugin
```

---

## Plugin Isolation

Zaria runs each plugin in the same Node.js process but isolates failures:

- If a plugin **fails to load** (import error), a warning is logged and the
  plugin is skipped. The audit continues with the remaining plugins and
  built-in rules.
- If a plugin's `onInit` hook **throws**, the plugin is skipped with a warning.
- If a plugin rule's `check` function **throws**, that call returns an empty
  finding array; the exception is caught and does not affect other rules.

This guarantees that a buggy third-party plugin can never crash Zaria.

---

## Publishing

1. Build your TypeScript:
   ```bash
   tsc --outDir dist
   ```

2. Add to `package.json`:
   ```json
   {
     "name": "zaria-plugin-myplugin",
     "version": "1.0.0",
     "main": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "peerDependencies": {
       "zaria": ">=1.0.0"
     }
   }
   ```

3. Publish:
   ```bash
   npm publish --access public
   ```

---

## Rule ID Conventions

Choose a unique prefix for your plugin's rule IDs to avoid collisions with
built-in rules and other plugins:

| Built-in prefix | Dimension |
|----------------|-----------|
| `PERF` | Performance |
| `ARCH` | Architecture |
| `SCALE` | Scalability & Observability |
| `INT` | Data Integrity |
| `MAINT` | Maintenance |
| `EFF` | Efficiency |

Use a short ALL-CAPS prefix followed by a three-digit number, e.g.:

```
NEXTJS001, NEXTJS002, NEXTJS003
PRISMA001, PRISMA002, PRISMA003
MYPLUGIN001, MYPLUGIN002
```

---

## Testing Your Plugin

Zaria's test utilities are re-exported for use in plugin tests:

```typescript
import { describe, it, expect } from 'vitest';
import { plugin } from '../src/index.js';
import type { AnalysisContext } from 'zaria/audit';

function makeContext(content: string): AnalysisContext {
  return {
    projectRoot: '/tmp/test',
    files: [{
      sourceFile: { path: '/tmp/test/pages/index.tsx', language: 'typescript', size: content.length, lastModified: new Date() },
      content,
      loc: content.split('\n').length,
      functionCount: 0,
      classCount: 0,
      exportCount: 0,
      imports: [],
    }],
    totalLoc: content.split('\n').length,
    languageDistribution: { typescript: 1 },
    importGraph: [],
  };
}

describe('zaria-plugin-myplugin', () => {
  it('detects the bad pattern', () => {
    const ctx = makeContext('const x = badPattern;');
    const [rule] = plugin.rules;
    const findings = rule.check(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('MYPLUGIN001');
  });

  it('returns no findings for clean code', () => {
    const ctx = makeContext('const x = goodPattern;');
    const [rule] = plugin.rules;
    expect(rule.check(ctx)).toHaveLength(0);
  });
});
```

---

## Using Plugins on GitHub

### GitHub Actions — quality gate with language plugins

Add the official language plugins to your workflow to enforce language-specific
best practices in CI:

```yaml
# .github/workflows/zaria.yml
name: Zaria Code Audit

on:
  push:
    branches: [main]
  pull_request:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Run Zaria with language plugins for a Python + Go mixed project
      - uses: Zoe-life/zaria@main
        with:
          path: '.'
          threshold: '75'
          plugins: 'zaria-plugin-python,zaria-plugin-go'
          format: 'sarif'
          # Write results to a file so the upload step can read them
        id: audit

      # Optional: upload SARIF to GitHub Code Scanning
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: zaria-report.sarif
```

The SARIF output integrates directly with **GitHub Code Scanning**:

- Findings appear as **annotations on pull request diffs** — reviewers see the
  exact line with the issue highlighted.
- The **Security tab** (`repository → Security → Code scanning`) aggregates all
  findings across runs and tracks when they were introduced and fixed.
- Findings with severity `critical` or `high` can be configured to **block
  merges** via branch protection rules (`Settings → Branches → Require status
  checks`).

#### Generating the SARIF file explicitly

If you prefer to control the file path:

```yaml
- name: Run Zaria (SARIF)
  run: |
    npm install -g zaria zaria-plugin-python zaria-plugin-go
    zaria audit . \
      --plugins zaria-plugin-python,zaria-plugin-go \
      --output sarif \
      --file zaria-report.sarif \
      --threshold 75

- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: zaria-report.sarif
    category: zaria
```

#### Per-language plugin selection

Install only the plugins relevant to your repository's language stack to keep
CI fast:

| Language(s) in repo | Recommended plugins |
|---------------------|---------------------|
| Python | `zaria-plugin-python` |
| Go | `zaria-plugin-go` |
| Rust | `zaria-plugin-rust` |
| Java | `zaria-plugin-java` |
| C | `zaria-plugin-c` |
| C++ | `zaria-plugin-cpp` |
| C# / .NET | `zaria-plugin-csharp` |
| Next.js | `zaria-plugin-nextjs` |
| Prisma ORM | `zaria-plugin-prisma` |
| TypeScript + Next.js + Prisma | `zaria-plugin-nextjs,zaria-plugin-prisma` |

---

## Using Plugins in VS Code

### SARIF Viewer extension

The **SARIF Viewer** extension (`MS-SarifVSCode.sarif-viewer`) renders any
SARIF file produced by Zaria inside VS Code, showing findings as:

- **Problems panel** entries with file, line, severity, and message.
- **Inline editor decorations** — the affected line is underlined and a hover
  tooltip shows the rule description and recommendation.
- **Explorer tree** — findings grouped by rule ID and severity.

**Setup:**

1. Install the extension:
   ```
   ext install MS-SarifVSCode.sarif-viewer
   ```

2. Generate a SARIF report for your project:
   ```bash
   # Install Zaria and the plugins for your language stack
   npm install --save-dev zaria zaria-plugin-python zaria-plugin-go

   # Run the audit and write SARIF output
   npx zaria audit . \
     --plugins zaria-plugin-python,zaria-plugin-go \
     --output sarif \
     --file .zaria/report.sarif
   ```

3. Open the SARIF file in VS Code:
   - Open the Command Palette (`Ctrl+Shift+P` / `⌘+Shift+P`).
   - Run **"SARIF: Show Panel"** or simply open the `.sarif` file — VS Code
     opens the SARIF Viewer automatically.

4. Optional — add `.zaria/` to `.gitignore` so the SARIF file is not committed:
   ```
   # .gitignore
   .zaria/
   ```

### Automating the report on save (VS Code task)

Add a VS Code task that regenerates the SARIF report whenever you trigger it:

```jsonc
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Zaria: audit with plugins",
      "type": "shell",
      "command": "npx zaria audit . --plugins zaria-plugin-python,zaria-plugin-go --output sarif --file .zaria/report.sarif",
      "group": "test",
      "presentation": {
        "reveal": "always",
        "panel": "dedicated"
      },
      "problemMatcher": []
    }
  ]
}
```

Run it with `Terminal → Run Task → Zaria: audit with plugins`.

### Configuring plugins in `.zariarc.yml` (project-wide)

Rather than passing `--plugins` on every invocation, declare plugins in the
project configuration file so both the CLI and the VS Code task pick them up
automatically:

```yaml
# .zariarc.yml
version: 1

plugins:
  - zaria-plugin-python   # Python best-practice rules
  - zaria-plugin-go       # Go error-handling and logging rules

thresholds:
  overall: 75
  performance: 80
```

With this file in place, simply run:

```bash
npx zaria audit .            # plugins are loaded automatically
npx zaria audit . -o sarif -f .zaria/report.sarif
```

---

*Generated by Zaria — Enterprise Codebase Audit CLI*
