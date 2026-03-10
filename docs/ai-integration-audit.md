# AI Integration Audit — Claude (Anthropic) & Qodo APIs

**Status:** Audit complete — recommendation: **do not integrate at this time** (see [Recommendation](#recommendation)).  
**Date:** March 2026  
**Author:** Zaria core team  
**Scope:** Evaluate adding AI-powered analysis to the Zaria CLI using the Anthropic Claude API and/or the Qodo AI API.

---

## Table of Contents

1. [Background](#background)
2. [Candidates Under Evaluation](#candidates-under-evaluation)
3. [What AI Could Add to Zaria](#what-ai-could-add-to-zaria)
4. [Anthropic Claude API](#anthropic-claude-api)
   - [Pros](#claude-pros)
   - [Cons](#claude-cons)
5. [Qodo AI API](#qodo-ai-api)
   - [Pros](#qodo-pros)
   - [Cons](#qodo-cons)
6. [Common Risks for Both](#common-risks-for-both)
7. [Side-by-Side Comparison](#side-by-side-comparison)
8. [Recommendation](#recommendation)
9. [Conditions That Would Change the Recommendation](#conditions-that-would-change-the-recommendation)

---

## Background

Zaria is a deterministic, static-analysis CLI tool. Every finding it emits is
reproducible: run the same audit on the same codebase and you get identical
output. This reproducibility is a core feature — it enables quality gates in
CI/CD pipelines, diff-based tracking, and SARIF ingestion by security tooling.

The question is whether adding a large-language-model (LLM) layer on top of —
or alongside — the rule engine would meaningfully improve Zaria's value
proposition without compromising its guarantees.

---

## Candidates Under Evaluation

| Candidate | Provider | Primary strength |
|---|---|---|
| **Claude 3.x / Claude 4** | Anthropic | Long-context code understanding, nuanced natural-language explanations |
| **Qodo AI** (formerly CodiumAI) | Qodo | Code-review and test-generation assistant; deeply code-focused |

---

## What AI Could Add to Zaria

Before evaluating specific products, it is worth listing the concrete
capabilities that LLM integration could unlock:

1. **Natural-language explanations** — turn terse rule findings into contextual,
   developer-friendly prose tailored to the exact code snippet.
2. **Severity re-ranking** — use the model to re-assess whether a heuristic hit
   is a real problem in context (e.g. a "god module" that is intentionally a
   facade layer).
3. **Fix suggestions** — generate concrete, copy-pasteable refactoring suggestions.
4. **Novel pattern detection** — catch anti-patterns that are hard to express as
   deterministic regex or AST rules (e.g. subtle logic bugs, misleading variable
   names, inconsistent error-handling strategy across a module).
5. **Multi-language parity** — for languages where Zaria currently uses only
   regex heuristics (Python, Go, Rust, C, …), an LLM could provide richer
   analysis without requiring language-specific AST parsers.
6. **Documentation quality scoring** — assess whether public APIs have adequate
   docstrings/comments.

---

## Anthropic Claude API

### Claude Pros

| # | Benefit | Detail |
|---|---|---|
| 1 | **Large context window** | Claude 3.5 / 4 supports 200 k tokens, making it feasible to pass entire files or even small projects in a single prompt. |
| 2 | **Code quality** | Anthropic trains Claude heavily on code. It produces accurate, idiomatic refactoring suggestions across all languages Zaria supports. |
| 3 | **Constitutional AI** | Anthropic's safety work reduces the risk of the model producing harmful content or leaking data from the context window into training (with the right API contract). |
| 4 | **Streaming support** | The API supports streaming responses, keeping CLI latency perceived as lower. |
| 5 | **Structured output (tool use)** | Claude's tool-use / function-calling mode can emit findings as structured JSON, reducing the need for fragile output parsing. |
| 6 | **Established enterprise offering** | Anthropic offers a commercial API with SLAs, data-processing agreements (DPAs), and SOC 2 Type II certification. |
| 7 | **Prompt caching** | The API supports prompt caching, reducing costs for repeated audit runs on the same codebase. |

### Claude Cons

| # | Risk / Drawback | Detail |
|---|---|---|
| 1 | **Cost** | At current pricing (~$3 / M input tokens, ~$15 / M output tokens for Sonnet), a single audit of a 100 k-LOC codebase passing all files to the API could cost **$5–$30 per run**. This makes it unsuitable for free or self-hosted use cases. |
| 2 | **Non-determinism** | LLM outputs are not deterministic even at `temperature=0`. Two identical runs may produce different findings, breaking reproducibility guarantees and CI quality gates. |
| 3 | **Latency** | Even with streaming, a full-codebase analysis via an external API adds **10–120 seconds** of network latency per audit. This makes it impractical for pre-commit hooks. |
| 4 | **Data privacy** | Source code is sensitive IP. Sending it to a third-party API — even under a DPA — is a blocker for air-gapped, regulated, or security-sensitive environments. |
| 5 | **Rate limits** | The API has per-minute and per-day token limits. Large mono-repos or high-frequency CI pipelines can exhaust these quickly. |
| 6 | **Availability dependency** | A network outage or Anthropic API downtime would silently degrade or halt Zaria audits. |
| 7 | **Hallucination** | The model may confidently suggest fixes that are incorrect or introduce new bugs. Each suggestion requires human review, reducing the automation value. |
| 8 | **No offline / on-prem option** | Anthropic does not offer a self-hosted model. Enterprises with air-gap requirements cannot use it. |

---

## Qodo AI API

### Qodo Pros

| # | Benefit | Detail |
|---|---|---|
| 1 | **Code-review focused** | Qodo is purpose-built for code review and test generation, making its prompts and output formats more directly applicable to Zaria's use case than a general LLM. |
| 2 | **IDE + CI integration** | Qodo already integrates with GitHub PRs and VS Code; a Zaria plugin could align with a workflow users already have. |
| 3 | **Test generation** | Qodo can auto-generate unit tests — a direct complement to Zaria's `MAINT004` (missing test coverage) rule. |
| 4 | **Smaller surface area** | Its API is narrower and more opinionated than Claude's, potentially reducing integration complexity. |

### Qodo Cons

| # | Risk / Drawback | Detail |
|---|---|---|
| 1 | **Less mature API** | Qodo's public API is less documented and has fewer guarantees than Anthropic's. Stability for programmatic use (rather than IDE plugin use) is unclear. |
| 2 | **Context window constraints** | Current Qodo models have smaller context windows than Claude 3.5+, limiting per-file analysis depth. |
| 3 | **Same non-determinism problem** | Like all LLMs, Qodo output is non-deterministic. |
| 4 | **Same privacy risk** | Source code leaves the user's environment. |
| 5 | **Same cost structure** | Token-based pricing applies. |
| 6 | **Narrower language support** | Qodo's strongest analysis is for Python, JavaScript, and TypeScript. Coverage of Rust, Go, C, C++, and C# is less proven. |
| 7 | **Vendor longevity risk** | Qodo is a startup. API stability and long-term availability carry higher uncertainty than an established hyperscaler. |

---

## Common Risks for Both

The following risks apply regardless of which AI provider is chosen:

| Risk | Impact | Likelihood |
|---|---|---|
| **Broken reproducibility** | CI quality gates produce non-deterministic pass/fail results; diff-based tracking becomes unreliable. | High |
| **Increased attack surface** | Network egress of source code creates a new exfiltration vector. | Medium |
| **Dependency lock-in** | Zaria's value proposition becomes tied to a third-party API; price increases or breaking changes can disrupt users. | Medium |
| **Regulatory non-compliance** | Users in HIPAA, GDPR, or government-regulated environments cannot send code to third-party APIs. | High (for enterprise) |
| **Test complexity** | Non-deterministic components are hard to unit-test; integration tests require mocking or real API calls. | Medium |
| **Prompt injection** | Malicious comments or string literals in the analysed codebase could manipulate model output. | Medium |

---

## Side-by-Side Comparison

| Criterion | Claude API | Qodo API |
|---|---|---|
| Context window | ✅ Very large (200 k tokens) | ⚠️ Moderate |
| Code quality | ✅ Excellent across all languages | ✅ Excellent for Python/JS/TS |
| Structured output | ✅ Tool-use / JSON mode | ⚠️ Limited |
| Determinism | ❌ Non-deterministic | ❌ Non-deterministic |
| Data privacy | ❌ Code leaves environment | ❌ Code leaves environment |
| Self-hosting | ❌ No | ❌ No |
| Cost at scale | ❌ $5–$30/audit at 100 k LOC | ❌ Similar magnitude |
| API maturity | ✅ Stable, SLA, SOC 2 | ⚠️ Less mature |
| Vendor longevity | ✅ Well-funded | ⚠️ Startup risk |
| Latency | ⚠️ 10–120 s (streaming) | ⚠️ 10–60 s |
| Air-gap support | ❌ No | ❌ No |
| Open-source friendly | ⚠️ Commercial API | ⚠️ Commercial API |

---

## Recommendation

**Do not integrate Claude or Qodo at this time.**

The core value of Zaria is deterministic, reproducible, privacy-preserving
static analysis that can run fully offline in CI pipelines, pre-commit hooks,
and air-gapped environments. Integrating an LLM API would compromise all three
of these properties.

The specific blockers are:

1. **Non-determinism** breaks quality gates and audit history tracking — two
   features central to Zaria's enterprise value proposition.
2. **Source-code egress** is a hard blocker for the security-conscious and
   regulated enterprise customers Zaria targets.
3. **Cost** makes it impractical for the free / open-source tier of users.
4. **Latency** makes it incompatible with pre-commit hooks (the most common
   developer touchpoint for a linting-style tool).

### What to do instead

| Short-term action | Rationale |
|---|---|
| Expand deterministic rules (Phases 5–13) | More rules → more signal, zero new dependencies or cost. |
| Improve fix-suggestion text in `Finding.recommendation` | AI-quality guidance, deterministically authored. |
| Expand multi-language AST parsing (e.g. tree-sitter) | Richer analysis for Python/Go/Rust without API calls. |
| Document how users can pipe Zaria SARIF output to AI tools | Lets users opt-in to AI augmentation on their own terms without Zaria taking on the dependency. |

---

## Conditions That Would Change the Recommendation

The recommendation should be revisited if **all** of the following are true:

- [ ] A self-hostable, open-weight model (e.g. via Ollama or vLLM) delivers
      accuracy comparable to Claude 3.5 on code-review tasks.
- [ ] The AI analysis is **additive and optional** — gated behind an explicit
      `--ai` flag and never run by default.
- [ ] The feature is clearly documented as non-deterministic so users understand
      it cannot be used in quality gates.
- [ ] No source code leaves the user's machine (local inference only).
- [ ] The feature has zero effect on audit runtime when not enabled.

If a future phase revisits AI integration, it should be implemented as an **opt-in
plugin** (`zaria-plugin-ai`) so that it can be developed, tested, and versioned
independently of the core Zaria tool.
