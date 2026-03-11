# How Zaria Compares to Similar Tools

> This document gives an honest, factual comparison of Zaria against the most
> commonly used codebase-audit and static-analysis tools.  The goal is to help
> you understand where Zaria fits, where it overlaps with existing tools, and
> where each tool is genuinely stronger.

---

## Table of Contents

1. [Tools Compared](#tools-compared)
2. [Feature Matrix](#feature-matrix)
3. [Dimension-by-Dimension Comparison](#dimension-by-dimension-comparison)
   - [SonarQube / SonarCloud](#1-sonarqube--sonarcloud)
   - [CodeClimate](#2-codeclimate)
   - [ESLint / Pylint / golint / RuboCop](#3-eslint--pylint--golint--rubocop)
   - [Semgrep](#4-semgrep)
   - [DeepSource](#5-deepsource)
   - [Codacy](#6-codacy)
4. [Where Zaria is Ahead](#where-zaria-is-ahead)
5. [Where Competitors are Ahead](#where-competitors-are-ahead)
6. [How to Use Zaria Alongside Other Tools](#how-to-use-zaria-alongside-other-tools)

---

## Tools Compared

| Tool | Category | Pricing model | Primary delivery |
|---|---|---|---|
| **Zaria** | Multi-dimensional codebase auditor | AGPL open-core / commercial | CLI (`npx zaria`) |
| **SonarQube** | Static analysis platform | LGPL Community / commercial | Self-hosted server or SonarCloud SaaS |
| **CodeClimate** | Quality metrics SaaS | Commercial SaaS (free for OSS) | SaaS, CI integration |
| **ESLint / Pylint / golint / RuboCop** | Language-specific linters | MIT / LGPL (free) | CLI, CI integration |
| **Semgrep** | Pattern-matching static analysis | LGPL OSS / commercial SaaS | CLI, SaaS |
| **DeepSource** | Automated code review | Commercial SaaS (free tier) | SaaS, PR comments |
| **Codacy** | Aggregated linting SaaS | Commercial SaaS (free for OSS) | SaaS, PR comments |

---

## Feature Matrix

| Feature | Zaria | SonarQube | CodeClimate | ESLint/Pylint | Semgrep | DeepSource | Codacy |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Zero-config CLI** | ✅ | ❌ (server) | ❌ (SaaS) | ✅ | ✅ | ❌ (SaaS) | ❌ (SaaS) |
| **Weighted A–F overall score** | ✅ | ⚠️ (per-metric ratings) | ✅ (GPA-style) | ❌ | ❌ | ⚠️ (issue count) | ⚠️ (grade per repo) |
| **Per-dimension score breakdown** | ✅ | ⚠️ (separate dashboards) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Performance dimension** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Architecture / dependency analysis** | ✅ | ⚠️ (complexity only) | ✅ (churn/complexity) | ❌ | ❌ | ❌ | ❌ |
| **Scalability & Observability** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Data Integrity & Race Conditions** | ✅ | ⚠️ (some security rules) | ❌ | ❌ | ✅ (custom patterns) | ⚠️ (security focused) | ⚠️ (via plugins) |
| **Long-term Maintenance** | ✅ | ✅ | ✅ | ⚠️ (partial) | ❌ | ⚠️ (partial) | ⚠️ (partial) |
| **SRE / runtime data enrichment** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CI quality gates** | ✅ | ✅ | ✅ | ⚠️ (exit codes only) | ✅ | ✅ | ✅ |
| **Per-dimension CI thresholds** | ✅ | ⚠️ (quality gates) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **SARIF output** | ✅ | ✅ | ❌ | ✅ (via plugin) | ✅ | ❌ | ❌ |
| **JSON / Markdown / HTML output** | ✅ | ⚠️ (JSON API) | ⚠️ (JSON API) | ⚠️ (JSON only) | ✅ | ❌ | ❌ |
| **Multi-language support** | ✅ (9 languages) | ✅ (30+ languages) | ✅ (many) | ⚠️ (one each) | ✅ (30+ languages) | ✅ (many) | ✅ (many) |
| **Plugin / custom rules** | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| **Actionable recommendation on every finding** | ✅ | ❌ (rule description only) | ❌ | ❌ | ❌ | ⚠️ (some) | ❌ |
| **Self-hosted, no data leaves your machine** | ✅ | ✅ (self-hosted edition) | ❌ | ✅ | ✅ (CLI) | ❌ | ❌ |
| **Open-source core** | ✅ (AGPL) | ✅ (LGPL Community) | ❌ | ✅ | ✅ (LGPL) | ❌ | ❌ |

> ✅ Full support  ⚠️ Partial / indirect support  ❌ Not supported

---

## Dimension-by-Dimension Comparison

### 1. SonarQube / SonarCloud

SonarQube is the most widely deployed static analysis platform and the closest
in spirit to what Zaria is building.

**Where SonarQube is stronger:**
- Supports 30+ programming languages with deep AST analysis in all of them.
- Has hundreds of built-in rules accumulated over 15+ years, with a very large
  community rule ecosystem.
- The SonarQube server provides a rich web UI with historical trend tracking,
  leak period detection, and portfolio views.
- SonarCloud integrates directly into GitHub/GitLab/Bitbucket pull requests with
  inline code annotations.

**Where Zaria is different:**
- **No server required.** Zaria runs entirely as a local CLI with `npx zaria audit`.
  SonarQube requires a server (self-hosted or SonarCloud) with a scanner agent;
  the setup for a first project takes 30–60 minutes.
- **Holistic weighted score.** Zaria produces a single A–F grade from six weighted
  dimensions. SonarQube has separate ratings per metric (Reliability, Security,
  Maintainability, Coverage, Duplications) that do not roll up into a single score.
- **Performance dimension.** Zaria explicitly audits runtime performance patterns
  (N+1 queries, synchronous blocking, missing pagination, memory leak patterns).
  SonarQube has no equivalent audit of runtime performance characteristics.
- **Scalability dimension.** Zaria audits stateful singleton patterns, missing health
  checks, and unbounded queries that prevent horizontal scaling. SonarQube has no
  equivalent.
- **SRE enrichment.** Zaria can connect to Prometheus, Datadog, and Grafana to
  correlate static findings with real production metrics. SonarQube has no
  equivalent.
- **Actionable recommendations.** Every Zaria finding includes a concrete
  recommendation explaining exactly what to change. SonarQube findings link to
  a rule description page.

**In one sentence:** SonarQube has breadth and history; Zaria has a holistic score,
a performance/scalability/SRE lens, and zero-setup operation.

---

### 2. CodeClimate

CodeClimate Quality is a SaaS product that analyses GitHub repositories and reports
on maintainability, test coverage, and technical debt.

**Where CodeClimate is stronger:**
- Deep GitHub integration: PR check annotations, branch diffs, and trend graphs
  are built into the SaaS product.
- Technical debt time estimate (e.g., "3 hours to fix") based on issue counts and
  severity.
- Broad language support via its engine plugin system.

**Where Zaria is different:**
- **Runs locally.** Zaria requires no external service; it works offline and inside
  air-gapped environments. CodeClimate requires internet connectivity to its SaaS.
- **Five additional dimensions.** CodeClimate focuses on maintainability and
  duplication. Zaria additionally audits Performance, Architecture (circular
  dependencies, god modules), Scalability, Data Integrity, and Efficiency.
- **SRE enrichment.** Not available in CodeClimate.
- **Per-dimension CI thresholds.** Zaria lets you fail CI specifically when the
  Performance or Integrity score drops below a threshold, independently of the
  overall score.

**In one sentence:** CodeClimate is excellent for maintainability trend tracking in
a SaaS; Zaria covers more dimensions, runs locally, and links to runtime health.

---

### 3. ESLint / Pylint / golint / RuboCop

Language-specific linters are the baseline static analysis layer present in most
projects. They operate at the syntax and style level within a single language.

**Where linters are stronger:**
- Thousands of community rules available (e.g., `eslint-plugin-react`,
  `eslint-plugin-security`, Pylint checkers).
- Inline editor integration via LSP; developers see violations while typing.
- Auto-fixable rules — many linting errors can be corrected with `--fix`.
- Extremely fast, as they operate file-by-file with simple pattern rules.

**Where Zaria is different:**
- **Cross-file, cross-dimension analysis.** Linters work file-by-file. Zaria builds
  a full import graph across the entire project and detects patterns that only
  appear when you look at the whole codebase (e.g., circular dependency chains,
  god modules, missing transaction boundaries across multiple files).
- **Holistic score.** Linters produce a list of violations with no rollup score.
  Zaria produces a weighted A–F grade that can gate CI.
- **Different finding types.** Linters detect style, correctness, and some security
  issues. Zaria detects architectural problems, scalability bottlenecks, and
  performance anti-patterns that linters do not model.
- **No language lock-in.** Zaria uses a single tool for all nine supported languages
  through a unified scoring model; you do not need to configure and maintain a
  separate linter for each language in a polyglot repo.

**Zaria and linters are complementary, not competing.** A good project uses both:
linters for fast per-file style/correctness feedback, and Zaria for periodic
holistic architecture and performance audits.

---

### 4. Semgrep

Semgrep is a pattern-matching engine for finding security vulnerabilities and custom
code patterns across many languages.

**Where Semgrep is stronger:**
- Extremely powerful custom pattern language (structural matching with metavariables,
  taint tracking in the paid tier).
- Best-in-class for security vulnerability detection and compliance checking.
- Large registry of community rules (OWASP, CWE mappings, framework-specific).
- Supports 30+ languages with accurate AST-level matching.

**Where Zaria is different:**
- **Holistic audit, not pattern matching.** Semgrep's model is "write a pattern,
  find all instances of it". Zaria's model is "score the whole codebase across
  six dimensions and explain the overall health". These are fundamentally different
  questions.
- **Architecture and scalability awareness.** Semgrep has no concept of circular
  imports, coupling metrics, horizontal scaling patterns, or SRE enrichment.
- **Aggregated score.** Semgrep outputs a list of findings with no rollup score
  or grade.
- **Zero custom pattern authoring required.** Zaria works out of the box with
  built-in rules; Semgrep's value scales with the time invested in writing or
  curating patterns.

**In one sentence:** Semgrep is the best tool for targeted security pattern matching;
Zaria is the right tool for understanding overall codebase health.

---

### 5. DeepSource

DeepSource is a SaaS automated code review tool that runs on every pull request
and flags issues across security, performance, anti-patterns, and style.

**Where DeepSource is stronger:**
- Auto-fix suggestions that can be applied directly in GitHub with one click.
- Tight PR review integration with inline comments.
- Broad language support and a growing rule library.
- Transforms code quality into PR review workflow.

**Where Zaria is different:**
- **Local, privacy-first.** Zaria does not send your source code to any external
  service. DeepSource requires your repository to be connected to its SaaS.
- **SRE enrichment.** DeepSource has no runtime data integration.
- **Scalability and performance dimensions.** DeepSource focuses on correctness,
  security, and anti-patterns; it does not audit horizontal scaling readiness or
  runtime performance characteristics.
- **Weighted multi-dimensional score.** DeepSource reports issue counts by category;
  it does not produce a single weighted health score.

---

### 6. Codacy

Codacy is a SaaS code quality platform that aggregates results from a large number
of open-source linters and presents them in a unified dashboard.

**Where Codacy is stronger:**
- Aggregates dozens of existing linting tools (ESLint, Pylint, Checkstyle, PMD,
  SpotBugs, etc.) so that teams do not need to configure each linter individually.
- Historical trend graphs and repository comparison within an organisation.
- PR gate integration with GitHub/GitLab/Bitbucket.

**Where Zaria is different:**
- **Original analysis engine.** Codacy delegates to external linters and aggregates
  their output. Zaria implements its own cross-file analysis engine that detects
  patterns no individual linter can see (import cycles, god modules with cross-file
  coupling, cross-file transaction boundaries, etc.).
- **SRE enrichment.** Not available in Codacy.
- **Weighted score across six dimensions.** Codacy produces a grade per repository
  based on issue counts; it does not have a concept of Performance, Scalability,
  or Data Integrity as distinct scoreable dimensions.
- **Local / offline operation.** Codacy requires SaaS connectivity.

---

## Where Zaria is Ahead

The following capabilities are **unique to Zaria** among the tools compared above:

1. **SRE runtime enrichment** — The only static-analysis tool that can correlate
   code quality findings with live production metrics from Prometheus, Datadog, or
   Grafana. Static analysis tells you what the code looks like; SRE data tells you
   how it behaves. Combining both gives a uniquely complete picture.

2. **Performance dimension** — Explicit, scored audit of runtime performance
   anti-patterns (N+1 queries, synchronous I/O blocking, unbounded result sets,
   memory leak patterns). No other general-purpose audit tool models this as a
   scoreable dimension.

3. **Scalability & Observability dimension** — Explicit audit of horizontal scaling
   readiness: stateful singletons, missing health-check endpoints, hard-coded
   limits. No other tool surfaces these as a distinct scoreable dimension.

4. **Single weighted A–F grade across all dimensions** — One number that answers
   "how healthy is this codebase overall?" with a transparent, auditable breakdown.
   No other tool combines Performance, Architecture, Scalability, Integrity,
   Maintenance, and Efficiency into a single weighted grade.

5. **Per-dimension CI thresholds** — You can fail CI when the Performance score
   drops below 80, independently of whether the overall score has changed. No other
   CLI tool supports this level of granularity.

6. **Actionable recommendation on every finding** — Every finding includes a
   concrete, specific recommendation (not just a link to documentation). This
   makes Zaria suitable for teams without a dedicated security or architecture
   champion who can interpret raw violation reports.

7. **Zero-setup local operation** — `npx zaria audit` runs with no server, no SaaS
   account, no configuration file. Works offline and inside air-gapped environments.

---

## Where Competitors are Ahead

An honest comparison must acknowledge where other tools are currently stronger:

| Gap | Which tool is ahead | Notes |
|---|---|---|
| **Language depth** | SonarQube, Semgrep | 30+ languages with deep AST analysis vs Zaria's full-AST only for TS/JS; the other 7 languages (Python, Go, Rust, Java, C, C++, C#) use regex heuristics |
| **Security vulnerability rules** | Semgrep, SonarQube | Semgrep has an OWASP/CWE-mapped rule registry; Zaria currently has no dedicated security dimension |
| **Auto-fix** | DeepSource, ESLint | Zaria identifies problems; it does not yet apply fixes |
| **Inline PR annotations** | SonarCloud, CodeClimate, Codacy | Zaria's SARIF output enables GitHub Code Scanning annotations as a workaround, but there is no native PR comment integration |
| **Historical trend tracking** | SonarQube, CodeClimate, Codacy | Zaria does not yet persist audit history or show score trends over time |
| **Rule volume** | SonarQube, ESLint | Zaria has 21 built-in rules across 6 dimensions; SonarQube has hundreds per language |
| **Editor integration** | ESLint, Pylint | Linters integrate with VSCode/JetBrains/Neovim via LSP; Zaria is CLI-only |

---

## How to Use Zaria Alongside Other Tools

Zaria is designed to be **complementary, not a replacement**, for the tools above.
A recommended stack for a production TypeScript project might look like this:

| Tool | Role | When it runs |
|---|---|---|
| **ESLint** | Per-file style, correctness, and import rules | On every file save (editor LSP) + pre-commit hook |
| **Zaria** | Holistic codebase health score across 6 dimensions | On every PR (`zaria audit --threshold 75`) |
| **Semgrep** | Security vulnerability pattern matching | On every PR (separate CI job) |
| **SonarCloud** | Deep language-specific rule coverage + trend history | Nightly or on release branches |

The unique value of Zaria in this stack is the holistic score gate and the
SRE-enriched view that no other tool in the stack provides.
