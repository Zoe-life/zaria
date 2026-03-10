# Contributing to Zaria

Thank you for your interest in contributing to Zaria! This document explains how to get started, our coding standards, and the process for submitting changes.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Project Structure](#project-structure)
5. [Coding Standards](#coding-standards)
6. [Writing Tests](#writing-tests)
7. [Adding Audit Rules](#adding-audit-rules)
8. [Writing Plugins](#writing-plugins)
9. [Submitting a Pull Request](#submitting-a-pull-request)
10. [Release Process](#release-process)

---

## Code of Conduct

All contributors are expected to be respectful and constructive. Harassment, discrimination, or abusive behaviour of any kind will not be tolerated. Please treat every participant the way you would want to be treated.

---

## Getting Started

### Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 20.x |
| npm | 10.x |
| git | 2.x |

### Fork and clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/<your-fork>/zaria.git
cd zaria
npm install
```

### Verify setup

```bash
npm run build   # TypeScript compile
npm run lint    # ESLint
npm test        # Vitest
```

All three commands must pass before you start making changes.

---

## Development Workflow

```
main          ← protected; merged via PR only
  └── feat/<short-description>   ← your feature branch
  └── fix/<issue-number>-<desc>  ← your bug-fix branch
```

1. Create a branch from `main`.
2. Make your changes in small, focused commits.
3. Run `npm run lint && npm test` locally before pushing.
4. Open a PR against `main`; the CI pipeline will run automatically.

---

## Project Structure

```
zaria/
├── src/
│   ├── audit/            # Audit engine — traversal, parser, dimension rules
│   │   ├── architecture/ # ARCH rules
│   │   ├── efficiency/   # EFF rules
│   │   ├── integrity/    # INT rules
│   │   ├── maintenance/  # MAINT rules
│   │   ├── performance/  # PERF rules
│   │   ├── scalability/  # SCALE rules
│   │   ├── lang-parser.ts  # Regex-based parser (Python/Go/Rust/Java/C/C++/C#)
│   │   ├── parser.ts     # ts-morph AST parser (TypeScript / JavaScript)
│   │   ├── traversal.ts  # File-system walker
│   │   ├── context.ts    # AnalysisContext builder
│   │   ├── types.ts      # Shared type definitions
│   │   └── index.ts      # Public barrel exports
│   ├── cli/              # commander CLI + sub-commands
│   ├── config/           # Config loading, merging, validation, detection
│   ├── plugin/           # Plugin loader and registry
│   ├── report/           # Report formatters (terminal, JSON, HTML, Markdown, SARIF)
│   ├── scorer/           # Weighted aggregation scorer
│   ├── sre/              # SRE provider adapters
│   ├── logger.ts         # Pino structured logger
│   └── index.ts          # Entry point
├── tests/
│   ├── unit/             # Vitest unit tests (mirror src/ layout)
│   ├── integration/      # Integration test suites
│   └── fixtures/         # Sample codebases used in tests
├── docs/                 # User and developer documentation
├── plugins/              # First-party plugin packages
└── PLAN.md               # Phased build plan
```

---

## Coding Standards

### TypeScript

- **Strict mode** is enabled (`"strict": true` in `tsconfig.json`). All code must type-check cleanly.
- All public functions and exported types **must** have JSDoc comments.
- Prefer `unknown` over `any`; use `as` casts only when unavoidable and add a comment explaining why.
- Use `import type` for type-only imports.

### Style

- Formatting is enforced by **Prettier** (`.prettierrc`). Run `npm run format` before committing.
- Linting is enforced by **ESLint** (flat config, `eslint.config.js`). Run `npm run lint` to check.
- Git hooks (`husky` + `lint-staged`) auto-run `eslint --fix` and `prettier --write` on staged `.ts` files.

### Logging

- Use the project logger (`src/logger.ts`) — **never** use `console.log` in `src/`.
- The logger is TTY-aware: human-readable output for terminals, JSON for piped output.
- Log level is controlled by the `ZARIA_LOG_LEVEL` environment variable.

### Error handling

- Throw typed errors where possible; catch-all `catch` blocks should re-throw or log at `warn` / `error`.
- CLI commands should exit with code `1` on failure.

---

## Writing Tests

Zaria uses **Vitest** with `@vitest/coverage-v8`. The coverage threshold is **80%**.

### Test location

Unit tests live in `tests/unit/` and mirror the `src/` directory layout:

```
src/audit/lang-parser.ts  →  tests/unit/audit/lang-parser.test.ts
src/config/schema.ts      →  tests/unit/config/schema.test.ts
```

### Conventions

- Use `describe` + `it` (not `test`) for consistent style.
- Use `beforeAll` (not `beforeEach`) for expensive setup like ts-morph parsing.
- Fixture files live in `tests/fixtures/`; the `vitest.config.ts` `exclude` list prevents them from being picked up as test suites.
- Fixture file comments must **not** contain the rule's trigger keywords (the regex patterns would false-positive match comment text).
- Do not `console.log` inside tests; assert on return values instead.

### Running tests

```bash
npm test                        # all tests (watch mode off)
npm run test:watch              # watch mode
npm run test:coverage           # with coverage report
npx vitest run path/to/test.ts  # single file
```

---

## Adding Audit Rules

Each audit dimension lives in `src/audit/<dimension>/`. To add a new rule:

1. **Create the rule file** — `src/audit/<dimension>/<RULEID>.ts`

   ```typescript
   import type { Rule } from '../types.js';

   export const MYXX001: Rule = {
     id: 'MYXX001',
     name: 'Short descriptive name',
     description: 'Detailed explanation of what this rule checks.',
     severity: 'high',
     check(context) {
       const findings = [];
       // ... inspect context.files ...
       return findings;
     },
   };
   ```

2. **Register the rule** in the dimension's `scorer.ts` — add `MYXX001` to the `RULES` array.

3. **Write tests** in `tests/unit/audit/<dimension>/myxx001.test.ts`.

4. **Add a fixture** if required — `tests/fixtures/sample-ts-app/<dimension>.ts`.

5. **Register the rule ID** in `src/config/validate.ts` → `KNOWN_RULE_IDS` so it can be mentioned in `.zariarc` `ignore.rules`.

### Rule ID conventions

| Prefix | Dimension |
|---|---|
| `PERF` | Performance |
| `ARCH` | Architecture |
| `SCALE` | Scalability |
| `INT` | Data Integrity |
| `MAINT` | Long-Term Maintenance |
| `EFF` | Code Efficiency |

---

## Writing Plugins

See [`docs/plugin-authoring.md`](docs/plugin-authoring.md) for the full guide. In brief:

1. Create an npm package exporting a default `ZariaPlugin` object.
2. Implement `id`, `name`, `version`, and one or more rule arrays (`performanceRules`, `architectureRules`, …).
3. Add the package name to `plugins` in your `.zariarc.yml`.
4. Zaria discovers and loads it automatically.

---

## Submitting a Pull Request

1. Ensure `npm run lint && npm test && npm run build` all pass locally.
2. Write a clear PR title: `feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`, `test: ...`.
3. Fill in the PR description — link to the issue, describe *what* and *why*.
4. Keep PRs focused; one logical change per PR is preferred.
5. A maintainer will review within a few business days. Please respond to review comments promptly.

### Commit message format

```
<type>(<scope>): <short summary>

[optional body]

[optional footer — e.g. Closes #123]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`.

---

## Release Process

Releases are managed by maintainers:

1. Update `CHANGELOG.md` with the new version under `[Unreleased]`.
2. Bump `version` in `package.json`.
3. Commit: `chore(release): v<X.Y.Z>`.
4. Tag: `git tag v<X.Y.Z>` and push with `--tags`.
5. GitHub Actions (`.github/workflows/release.yml`) publishes to npm automatically.
