# Changelog

All notable changes to Zaria are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- **Phase 15 — Multi-Language Support**: Zaria can now traverse, parse, and report on codebases written in Python, Go, Rust, Java, C, C++, and C# in addition to TypeScript and JavaScript.
  - New `SupportedLanguage` type covering all nine recognised languages.
  - `src/audit/lang-parser.ts` — regex-based heuristic parser (LOC, function count, class/struct count, import edges) for non-TS/JS files.
  - `parseFiles()` now routes TS/JS files through ts-morph and all other languages through the lang-parser.
  - `traverseFiles()` extended with extension maps for `.py`, `.go`, `.rs`, `.java`, `.c`, `.h`, `.cpp`, `.cxx`, `.cc`, `.hpp`, `.hxx`, `.cs`.
  - `ProjectLanguageSchema` extended with `'c'`, `'cpp'`, `'csharp'` values.
  - `detectProject()` now detects C# (`.sln`/`.csproj`), C++ (CMakeLists.txt), and C (Makefile + `.c` file) projects.
  - 21 new unit tests across `multilang-traversal.test.ts` and `lang-parser.test.ts`.

- **Phase 16 — Documentation**:
  - `CONTRIBUTING.md` — developer onboarding, coding standards, rule authoring guide, PR process.
  - `CHANGELOG.md` — this file; Keep a Changelog format.
  - `SECURITY.md` — vulnerability reporting process and supported versions.
  - `docs/api-reference.md` — TypeDoc-generated API surface reference.

- **AI Integration Audit** (`docs/ai-integration-audit.md`): detailed analysis of integrating Claude (Anthropic) or Qodo AI APIs into Zaria, with pros, cons, and a clear recommendation.

---

## [0.0.1] — 2025-xx-xx *(pre-release scaffolding)*

### Added

- **Phase 1** — Project scaffolding: TypeScript strict-mode skeleton, ESLint flat config, Vitest, Husky, GitHub Actions CI/CD.
- **Phase 2** — CLI framework: `commander`-based commands — `audit`, `report`, `config`, `sre`, `plugin`.
- **Phase 3** — Configuration system: cosmiconfig discovery, Zod schema, merging, validation, `config init` / `config validate`.
- **Phase 4** — Static analysis foundation: `traverseFiles`, `parseFiles` (ts-morph), `buildAnalysisContext`.
- **Phase 5** — Performance audit: PERF001 (N+1 query), PERF002 (synchronous blocking), PERF003 (unindexed sort), PERF004 (memory leak).
- **Phase 6** — Architecture audit: ARCH001 (circular dependency), ARCH002 (god module), ARCH003 (missing abstraction layer), ARCH004 (layer violation).
- **Phase 7** — Scalability audit: SCALE001 (missing pagination), SCALE002 (unbounded query), SCALE003 (no rate limiting), SCALE004 (missing caching).
- **Phase 8** — Data integrity audit: INT001 (missing input validation), INT002 (missing transaction), INT003 (raw query), INT004 (missing optimistic locking).
- **Phase 9** — Maintenance audit: MAINT001 (high cyclomatic complexity), MAINT002 (code duplication), MAINT003 (deprecated dependency), MAINT004 (missing test coverage), MAINT005 (outdated dependency).
- **Phase 10** — Scoring & aggregation: weighted overall score, letter grade (A–F), per-dimension breakdown.
- **Phase 11** — Report output: terminal (coloured), JSON, HTML, Markdown, SARIF.
- **Phase 12** — SRE tool integration: Prometheus, Datadog, Grafana, custom HTTP provider.
- **Phase 13** — Code efficiency audit: EFF001 (expensive loop body), EFF002 (unnecessary re-render), EFF003 (sync-in-loop).
- **Phase 14** — Plugin architecture: plugin loader, typed `ZariaPlugin` interface, registry, first-party Next.js and Prisma plugins.

[Unreleased]: https://github.com/Zoe-life/zaria/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/Zoe-life/zaria/releases/tag/v0.0.1
