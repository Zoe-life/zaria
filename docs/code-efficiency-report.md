# Code Efficiency & Technical Debt — Feature Report

> **Question posed:** Can Zaria check for code efficiency and technical debt, or could this functionality be added? Provide a detailed analysis.

---

## Executive Summary

**Short answer: Zaria already performs significant code efficiency and technical debt analysis.** As of Phase 12, 21 rules across five audit dimensions collectively address runtime efficiency, structural debt, and long-term maintenance burden.

However, dedicated _algorithmic efficiency_ analysis (Big-O complexity detection, data-structure selection auditing, hot-path identification) does **not** yet exist as a standalone dimension. This report details what is currently covered, what is missing, and a concrete proposal for adding a sixth **Efficiency** dimension.

---

## 1. What Zaria Already Detects (Current Coverage)

### 1.1 Code Efficiency — Existing Rules

The following rules directly address runtime inefficiency:

| Rule | Dimension | Severity | What it catches |
|---|---|---|---|
| `PERF001` | Performance | high | **N+1 query patterns** — loop-driven ORM calls that multiply database round-trips (O(n) queries instead of O(1)) |
| `PERF002` | Performance | high | **Synchronous blocking** — `readFileSync`, `execSync` etc. in async contexts; blocks the Node.js event loop |
| `PERF003` | Performance | medium | **Missing pagination** — unbounded result sets; O(rows) memory growth instead of O(page_size) |
| `PERF004` | Performance | medium | **Memory leak patterns** — `addEventListener` without corresponding `removeEventListener`; uncleaned closure captures |
| `SCALE002` | Scalability | high | **Unbounded queries** — ORM queries without `.limit()` / `.take()`; can exhaust memory at scale |
| `SCALE003` | Scalability | medium | **Stateful singletons** — module-level mutable state prevents horizontal scaling without sticky sessions |
| `INT002` | Integrity | high | **Missing transactions** — multiple sequential writes without atomicity; O(failed writes) recovery cost |

### 1.2 Technical Debt — Existing Rules

The following rules are canonical technical debt indicators:

| Rule | Dimension | Severity | What it catches |
|---|---|---|---|
| `MAINT001` | Maintenance | medium | **High cyclomatic complexity** (> 10) — hard-to-test, bug-prone functions; O(branches) test cases required |
| `MAINT002` | Maintenance | low | **Code duplication** — ≥ 6 identical consecutive lines; violates DRY; multiplies bug-fix surface area |
| `MAINT003` | Maintenance | medium | **Deprecated dependencies** — packages marked deprecated in npm; active security and compatibility risk |
| `MAINT004` | Maintenance | low | **Missing test coverage** — source files with no test counterpart; regression risk grows with complexity |
| `MAINT005` | Maintenance | medium | **Outdated dependencies** — packages ≥ 2 major versions behind; upgrade cost grows exponentially over time |
| `ARCH001` | Architecture | high | **Circular dependencies** — create hidden coupling, prevent tree-shaking, and complicate module extraction |
| `ARCH002` | Architecture | medium | **God modules** (> 500 LOC, > 20 exports) — violate SRP; increase merge conflicts and cognitive load |
| `ARCH003` | Architecture | medium | **Missing abstraction layers** — direct ORM imports in routes; tight coupling to persistence layer |
| `ARCH004` | Architecture | low | **High import fan-in** — too many files depend on one; change to that file has high blast radius |

### 1.3 Current Coverage Score

| Category | Rules covered | Gaps |
|---|---|---|
| Runtime memory efficiency | PERF003, PERF004, SCALE002 | No Big-O analysis, no heap profiling hints |
| CPU / algorithmic efficiency | PERF001, PERF002 | No nested-loop detection, no regex complexity |
| I/O efficiency | PERF002, INT002 | No N+1 REST call detection, no redundant HTTP round-trips |
| Structural technical debt | ARCH001–004, MAINT001–005 | No cognitive complexity metric, no duplication threshold config |
| Dependency health | MAINT003, MAINT005 | No CVE / security advisory check (planned) |

**Conclusion: ~65–70 % of efficiency and technical debt concerns are already addressed.** The remaining 30–35 % requires dedicated algorithmic efficiency analysis.

---

## 2. What Is Missing — Gap Analysis

### 2.1 Algorithmic Complexity (Big-O) Detection

**Gap:** Zaria cannot statically infer Big-O complexity of an algorithm. For example:
- A function with a nested `for` loop over the same array is O(n²) — not currently flagged.
- Using `Array.find()` inside a `for` loop is O(n²) when `Map.get()` would be O(1).
- Recursive functions without memoisation may be exponential.

**What would be needed:**
- AST visitor that detects nested iteration over the same data source.
- Heuristic: if a loop body contains another loop/`filter`/`find`/`indexOf`/`includes` over the same or a related array, emit a `PERF` or `EFF` finding.
- Limitation: precise Big-O inference requires data-flow analysis, which is NP-hard in the general case. Static heuristics can catch the most common anti-patterns.

### 2.2 Data Structure Selection Auditing

**Gap:** Zaria cannot detect when an inefficient data structure is used where a better one exists. Examples:
- Using `Array.includes()` in a hot path when a `Set` would give O(1) lookup.
- Using plain `Object.keys().forEach()` instead of `Map.forEach()` for key-value iteration.
- Accumulating into an array with `push` inside a reduce when a `Map` is appropriate.

### 2.3 Regex Complexity (ReDoS Risk)

**Gap:** Catastrophically backtracking regular expressions (ReDoS) are not detected.
- Patterns like `/(a+)+b/` are exponential on adversarial input.
- These are a known security and efficiency vulnerability class.

### 2.4 Cognitive Complexity

**Gap:** Cyclomatic complexity (`MAINT001`) counts branching paths but does not measure _cognitive_ difficulty. Cognitive complexity (as defined by SonarSource) adds extra weight for nested conditions, breaks, continues, and short-circuit logic.
- A function with cyclomatic complexity 5 but 4 levels of nesting is harder to understand than one with complexity 10 and flat structure.

### 2.5 Bundle and Build Efficiency

**Gap:** No analysis of:
- Re-exported barrel files that defeat tree-shaking.
- Dynamic `require()` calls that prevent static analysis.
- Excessive `...spread` operations on large objects in hot paths.

---

## 3. Proposal — New "Efficiency" Dimension (Phase 10.x / v0.7)

### 3.1 Design

Add a sixth audit dimension: **`efficiency`** with rule prefix `EFF`.

This keeps the concern cleanly separated from the existing Performance dimension (which focusses on I/O and async patterns) and the Maintenance dimension (which focusses on sustainability).

**Scoring weight (proposed):**

Adjust the aggregation to sum to 100 %:

| Dimension | Current weight | Proposed weight |
|---|---|---|
| Performance | 25 % | 22 % |
| Architecture | 25 % | 22 % |
| Scalability | 20 % | 18 % |
| Integrity | 20 % | 18 % |
| Maintenance | 10 % | 10 % |
| **Efficiency** | — | **10 %** |

### 3.2 Proposed Rules

#### EFF001 — Quadratic Iteration Pattern
- **Severity:** high
- **Detection:** AST traversal finds a `for`/`while`/`forEach` whose body contains another iteration (`for`, `Array.find`, `Array.includes`, `Array.indexOf`, `Array.filter`) over a variable that shares scope with the outer loop.
- **Recommendation:** Use a `Map` or `Set` to reduce inner-loop lookup to O(1).
- **Example:**
  ```ts
  // ❌ O(n²)
  for (const user of users) {
    if (orders.find((o) => o.userId === user.id)) { ... }
  }
  // ✅ O(n)
  const orderSet = new Set(orders.map((o) => o.userId));
  for (const user of users) {
    if (orderSet.has(user.id)) { ... }
  }
  ```

#### EFF002 — Linear Search in Hot Path
- **Severity:** medium
- **Detection:** `Array.includes()`, `Array.indexOf()`, or `Array.find()` called inside a function that is itself called inside a loop (two-level analysis via import graph).
- **Recommendation:** Hoist the array into a `Set` / `Map` before the loop.

#### EFF003 — ReDoS-Susceptible Pattern
- **Severity:** high
- **Detection:** Regex literals containing quantified groups with quantifiers on the group itself: `/(x+)+/`, `/(\w|\d)+/`, `/(a|b)+/`. Uses a lightweight structural heuristic (not a full regex analyser).
- **Recommendation:** Rewrite regex to avoid nested quantifiers, or use a dedicated safe-regex library.

#### EFF004 — Cognitive Complexity Threshold
- **Severity:** medium
- **Detection:** Walk the AST of each function and compute cognitive complexity (SonarSource formula): +1 per branch, +nesting level per nested branch, +1 per break/continue, +1 per logical operator sequence (`&&`, `||`). Flag functions with cognitive complexity > 15.
- **Recommendation:** Extract nested conditions into named helper functions.

#### EFF005 — String Concatenation in Loop
- **Severity:** low
- **Detection:** `+=` with string type (inferred from variable name heuristics or initialiser) inside a loop body.
- **Recommendation:** Accumulate into a string array and join with `Array.join('')` after the loop; reduces O(n²) string copying to O(n).

### 3.3 Implementation Approach

Each rule follows the established pattern in `src/audit/<dimension>/rules/<id>.ts`:

```typescript
// src/audit/efficiency/rules/eff001.ts
import type { Rule, Finding, AnalysisContext } from '../../types.js';

export const eff001: Rule = {
  id: 'EFF001',
  name: 'Quadratic Iteration Pattern',
  description: 'Detects nested iteration that produces O(n²) or worse complexity.',
  severity: 'high',
  check(context: AnalysisContext): Finding[] {
    // Walk each parsed file's AST looking for nested loops
    // Time O(N × D) where N = nodes in file, D = max nesting depth
    // Space O(1) auxiliary — no intermediate collections
    ...
  },
};
```

All rules must follow the efficiency-first design constraint already embedded in Zaria:
- **Time:** O(N) traversal of AST nodes, no quadratic re-scanning.
- **Space:** O(1) auxiliary state per rule where possible; O(F) for findings accumulation.

### 3.4 Estimated Effort

| Task | Estimated time |
|---|---|
| `src/audit/efficiency/rules/eff001.ts` (quadratic loop) | 4 h |
| `src/audit/efficiency/rules/eff002.ts` (linear search) | 3 h |
| `src/audit/efficiency/rules/eff003.ts` (ReDoS) | 3 h |
| `src/audit/efficiency/rules/eff004.ts` (cognitive complexity) | 6 h |
| `src/audit/efficiency/rules/eff005.ts` (string concat) | 2 h |
| `src/audit/efficiency/scorer.ts` | 1 h |
| Fixture seeding + unit tests (≥ 5 tests per rule) | 6 h |
| Update `DIMENSION_WEIGHTS` in `src/scorer/aggregate.ts` | 0.5 h |
| Update docs | 1 h |
| **Total** | **~26 hours** |

---

## 4. Comparison with Third-Party Tools

| Tool | Algorithmic complexity | Technical debt | Integrated scoring | SRE enrichment |
|---|---|---|---|---|
| **Zaria** (current) | Partial (N+1, sync block) | ✅ Full (MAINT + ARCH) | ✅ Weighted A–F grade | ✅ Prometheus/Datadog/Grafana |
| **SonarQube** | ❌ | ✅ Full | ✅ | ❌ |
| **CodeClimate** | ❌ | ✅ Partial | ✅ | ❌ |
| **ESLint** | ❌ | ❌ | ❌ | ❌ |
| **Semgrep** | ❌ | ❌ | ❌ | ❌ |

**Zaria's unique position:** the combination of multi-dimensional weighted scoring, real-time SRE enrichment, and actionable findings makes it complementary to (not a replacement for) static analysis tools like SonarQube. Adding EFF001–005 would match SonarQube's complexity coverage while retaining Zaria's runtime correlation advantage.

---

## 5. Conclusion & Recommendation

1. **Deploy the current set immediately** — 21 rules already cover the most impactful efficiency and technical debt patterns.
2. **Implement EFF001 (quadratic loops) and EFF003 (ReDoS) in the next sprint** — high-severity, high-ROI, relatively straightforward AST analysis.
3. **Implement EFF004 (cognitive complexity) as a MAINT001 enhancement** — cognitive complexity is a superset of cyclomatic complexity; upgrading MAINT001 to use the SonarSource formula is lower effort than a new rule.
4. **Defer EFF002 and EFF005** — medium/low severity; implement in a later phase alongside plugin architecture (Phase 14) to allow community rule contributions.

---

_This report was authored as part of Phase 12 completion. Implementation of the Efficiency dimension is planned for Phase 14 (Plugin Architecture)._
