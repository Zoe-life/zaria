# Plugin Authoring Guide

This guide explains how to write, publish, and load a Zaria plugin.

---

## Overview

Zaria's plugin system lets you extend the audit engine with additional rules
specific to frameworks, ORMs, or domain conventions that aren't covered by the
built-in dimensions.

Official plugins published by the Zaria team:

| Package | Description |
|---------|-------------|
| `zaria-plugin-nextjs` | Next.js–specific rules (image optimisation, data fetching, error boundaries) |
| `zaria-plugin-prisma` | Prisma ORM rules (singleton pattern, connection leaks, SQL injection guards) |

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

*Generated by Zaria — Enterprise Codebase Audit CLI*
