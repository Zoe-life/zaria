# Licensing & Commercialisation Strategy — Zaria

> **Status (March 2026):** AGPL-3.0-or-later has been applied. This document records the rationale for that decision, defines the two-tier model (AGPL community + Enterprise commercial), and analyses which specific features are candidates for eventual MIT relicensing — and which are not.

---

## Why AGPL First

Zaria was written by a single author and had no licence applied before this decision. That starting position made it legally clean to choose any licence — including strong copyleft — without needing consent from any other contributor or risking community backlash from a retroactive change.

AGPL-3.0 was chosen as the opening licence for three reasons:

1. **Network-copyleft closes the SaaS loophole.** Any company that runs a modified version of Zaria as a networked service must publish their modifications under AGPL. GPL-3.0 would not cover this case; AGPL does. This is the primary commercial protection at this stage.
2. **Full source visibility builds trust.** Developers can read, audit, fork, and self-host Zaria freely. This drives adoption — the community that forms under AGPL becomes the funnel for enterprise sales.
3. **AGPL is the easiest licence to move *from*, selectively.** Moving specific modules from AGPL to MIT is uncontroversial and entirely at the author's discretion as sole copyright holder. Moving in the reverse direction is impossible without unanimous contributor consent. Starting under AGPL keeps all future options open.

---

## Licensing Roadmap

### Phase 1 — AGPL (Now)

The current source code is licensed under **GNU Affero General Public License v3.0 or later**.

Any individual, team, or organisation may use, modify, and redistribute Zaria under AGPL. Organisations that incorporate Zaria into a networked product or service must release their modifications under AGPL, **or** obtain a commercial licence (see Phase 2).

### Phase 2 — Enterprise Tier (next milestone)

A separate **Enterprise Edition** will be released under a commercial licence. It will extend the AGPL community edition with capabilities that large organisations require but that individual developers typically do not need.

Enterprises that cannot or will not comply with AGPL (e.g., because they do not wish to open-source their internal Zaria modifications) purchase an Enterprise licence instead. This is a standard **dual-licensing / open-core** model.

### Phase 3 — Selective MIT Relicensing (future, by module)

Once the Enterprise tier has generated sustainable revenue, **specific modules** of the community edition may be selectively relicensed from AGPL to MIT. This is **not** a wholesale relicensing of the entire product — it is a deliberate, module-by-module decision based on the strategic analysis in the next section.

The deciding question for each module: *Does releasing this under MIT let a commercial competitor embed it in a proprietary product and capture the value without giving anything back — or does it primarily grow the ecosystem without transferring competitive advantage?*

Enterprise features remain proprietary regardless of what happens to the community edition.

---

## Feature Tier Matrix

This table is the canonical definition of what belongs in each tier. Features in the AGPL tier will **never be moved to a paid tier**.

### AGPL Community Edition (Current)

| Feature | Notes |
|---|---|
| **Core audit engine (all 6 dimensions)** | PERF, ARCH, SCALE, INT, MAINT, EFF — all 24 rules |
| **Performance audit** (PERF001–PERF004) | N+1 queries, sync blocking, memory leaks, bundle size |
| **Architecture audit** (ARCH001–ARCH004) | Circular deps, coupling, clean arch evaluation |
| **Scalability & Observability audit** (SCALE001–SCALE004) | Stateful patterns, tracing, health checks, unbounded queries |
| **Data Integrity & Race Conditions audit** (INT001–INT004) | Shared-state mutations, transactions, TOCTOU, idempotency |
| **Long-Term Maintenance audit** (MAINT001–MAINT005) | Complexity, duplication, CVEs, deprecated deps, docs coverage |
| **Code Efficiency audit** (EFF001–EFF003) | Efficiency-focused static rules |
| **Terminal report** | ANSI-coloured, progress bars, A–F grade |
| **JSON report** | Machine-readable structured output |
| **Markdown report** | GitHub / GitLab PR comment format |
| **HTML report** | Self-contained, offline-capable |
| **SARIF report** | GitHub Code Scanning, Azure DevOps, VS Code |
| **Single-project audit** | Audit one repository per invocation |
| **Zero-config usage** | Works out of the box with sensible defaults |
| **YAML / JSON config** (`.zariarc`) | Per-project thresholds, ignore rules, dimension control |
| **CI/CD exit codes & quality gates** | `--threshold` flag; non-zero exit on breach |
| **Community plugin system** | `plugin add / remove / list`; typed plugin interface |
| **`--only` / `--skip` dimension flags** | Selective audit runs |

### Enterprise Edition (Commercial Licence — Permanent)

| Feature | Notes |
|---|---|
| **Multi-repo / monorepo fleet auditing** | Audit dozens of repos in one run; aggregate scoring and trend comparison across the fleet |
| **Centralised audit history & trend dashboard** | Persistent storage of audit runs; visualise score trends over time; regression alerts |
| **Policy-as-code enforcement** | Organisation-wide quality gates defined in a central policy repo; enforced across all teams' CI pipelines |
| **SAML / SSO / LDAP authentication** | Required for enterprise procurement; integrates with Okta, Azure AD, Google Workspace |
| **Role-based access control (RBAC)** | Team leads see all repos; developers see their own; compliance officers get read-only dashboard access |
| **Custom rule authoring UI** | Browser-based wizard for writing and testing organisation-specific audit rules without touching code |
| **Audit data export** (CSV, REST API) | Pipe findings into JIRA, ServiceNow, Splunk, or any internal compliance system |
| **PDF compliance reports** | Formal, printable reports for auditors, board packs, and compliance submissions |
| **SRE adapter connectivity** (Prometheus, Datadog, Grafana) | Connect Zaria to live observability stacks; read runtime metrics and enrich audit findings with live production signal |
| **Advanced SRE correlation engine** | Maps static findings to runtime error rates, MTTR, and incident frequency; surfaces "high-code-risk + high-production-impact" critical findings |
| **On-premises agent** | Run Zaria behind a firewall with no outbound internet access; results pushed to self-hosted or Zaria-hosted dashboard |
| **Priority support SLA** | Guaranteed response times; private Slack channel; dedicated engineering contact |
| **Zaria Cloud** (hosted SaaS) | Connect repositories via GitHub / GitLab / Bitbucket app; scheduled audits; team dashboards; no CLI required |

---

## SRE Integration Tier Decision

The SRE adapters (`src/sre/` — Prometheus, Datadog, Grafana connectivity) were initially placed in the AGPL community edition as a read-only, opt-in feature. After further consideration, they have been repositioned to the **Enterprise tier**. This section documents the trade-off analysis behind that decision.

### The Case for Keeping SRE in AGPL

- **Drives adoption among SRE practitioners.** Allowing any team to connect Zaria to Prometheus or Grafana for free would put Zaria in front of the exact engineering culture that appreciates open-source tooling and becomes evangelists.
- **The basic HTTP adapters are not complex.** Anyone could independently implement a Prometheus scrape or a Grafana query; the AGPL protection on that code provides limited value.
- **AGPL copyleft still protects against proprietary forks.** Even under AGPL, a company that ships a modified version as a service must open-source it. The basic SRE plumbing is not a huge competitive loss.

### The Case for Moving SRE to Enterprise (the chosen position)

1. **SRE tooling is structurally an enterprise context.** Production observability stacks — Prometheus, Datadog, Grafana, New Relic — are operated by organisations with engineering teams, infrastructure budgets, and uptime requirements. Individual developers and small teams audit code without a live Prometheus endpoint. Placing SRE connectivity in the community edition is giving away a feature whose primary users are enterprise buyers.

2. **SRE integration is Zaria's primary differentiator over pure-static-analysis tools.** The unique value proposition of Zaria is the ability to correlate static code quality scores with runtime production health. This is the feature that makes the product genuinely compelling in a sales conversation. Keeping it entirely in the Enterprise tier ensures the entire SRE story — from basic connectivity to advanced correlation — remains a commercial selling point rather than a free baseline.

3. **Splitting SRE into "basic AGPL" and "advanced Enterprise" weakens the enterprise pitch.** If a team can already read Prometheus metrics for free, the incremental jump to pay for the "advanced correlation engine" is a much harder sell. A clean "all SRE is enterprise" boundary makes the value of the enterprise tier unambiguous.

4. **SRE adapter credentials and endpoint configuration are enterprise security concerns.** Organisations passing Datadog API keys or Prometheus endpoints through a tool expect enterprise-grade credential management, audit logs, and support SLAs — not community-tier error handling. Shipping half-finished credential flows in the community edition creates a support burden and a reputation risk.

5. **No community expectation has been set.** The SRE feature was listed in the community tier during internal planning only — it has not been shipped, marketed, or promised to any community audience. Repositioning it to Enterprise before public launch carries zero trust cost.

### Decision

**All SRE integration is Enterprise-only.** Both the basic adapter connectivity (Prometheus, Datadog, Grafana `sre connect`) and the advanced correlation engine are commercial features. This boundary is permanent.

The community edition retains full audit capability across all six static-analysis dimensions. The SRE tier is the commercial upsell for organisations that want runtime enrichment.

---

## Audit Intelligence Tier Decision

The audit detection rules (`src/audit/*/rules/` — all 24 rules across PERF, ARCH, SCALE, INT, MAINT, EFF) and the dimension scorers (`src/audit/*/scorer.ts`) are currently placed in the **AGPL community edition** as the core capability of Zaria. This section records the explicit analysis behind that decision.

### The Case for Moving Audit Intelligence to Enterprise

- **The detection rules are Zaria's hardest-to-replicate asset.** The 24 rules encode accumulated knowledge of real-world code quality patterns, AST traversal strategies, and heuristics. Locking them in a commercial tier is the most aggressive form of protection.
- **Competitors cannot freely copy a proprietary rule set.** Under AGPL, contributors who improve a rule and deploy it as a service must open-source it — but a community fork could still study and reimplement the logic. Proprietary closure removes that possibility entirely.
- **Enterprise buyers pay for the rules more than anything else.** The detection engine is what makes the audit findings trustworthy and actionable; it is the primary reason an enterprise procurement team would justify the cost.

### The Case for Keeping Audit Intelligence in AGPL (the chosen position)

1. **Without detection rules, the community edition has no value whatsoever.** If the open-source package contains only a CLI skeleton, configuration parser, and reporters — but produces zero findings — no developer will install it, no community will form around it, and no enterprise sales funnel exists. The community edition must be genuinely useful on its own; otherwise the open-core model collapses into vaporware.

2. **AGPL is already strong protection for the rule logic.** The network-copyleft clause ensures that any organisation that improves the detection rules and deploys a modified Zaria as a service must publish those improvements under AGPL. This covers the primary threat scenario (a cloud vendor forking Zaria into a competing SaaS). Proprietary closure adds only marginal additional protection while destroying community adoption.

3. **The open-core model that works always opens the engine.** Grafana (AGPL), SonarQube (LGPL), Semgrep (LGPL), ESLint (MIT) — every successful open-core static-analysis or observability tool makes its detection engine freely available. Enterprise upsells are built on orchestration, scale, compliance, and auth — never on gating the core capability. Moving the rules to Enterprise would put Zaria in a category with no successful precedent in the developer tooling market.

4. **Community engagement sharpens the detection rules.** The AGPL community around the audit engine is the primary mechanism by which detection logic improves over time. Bug reports, edge-case discoveries, and community-contributed improvements make the rules better. A proprietary rule set is maintained only by internal engineering capacity; an AGPL rule set benefits from thousands of real-world users encountering real-world codebases.

5. **Adoption loss at the community tier is permanent.** If Zaria launches with proprietary rules, developers will evaluate the open edition, find it produces no findings, and move on. Reputation in the developer-tools market is set within the first months of a product's availability; it is almost impossible to recover from an initial perception of "not actually open source." The cost of getting this wrong is irreversible.

### Decision

**Audit intelligence stays in AGPL permanently.** All 24 detection rules and all dimension scorers are, and will remain, open-source features available to every user under the AGPL licence.

The AGPL community edition is a fully capable static-analysis tool. The Enterprise tier provides the operational layer — fleet management, runtime correlation, compliance tooling, and authentication — that organisations need once the tool is embedded in their engineering culture. That sequence (open capability → enterprise adoption → enterprise tier) is the only sequence that works.

---

## Plugin System Tier Decision

The plugin system (`src/plugin/`, the `zaria plugin` CLI command, the `ZariaPlugin`
interface, and the official plugin packages such as `zaria-plugin-nextjs`) is
currently placed in the **AGPL community edition**.  This section documents the
trade-off analysis behind that decision, including the explicit case that could
be made for moving it to Enterprise.

### The Case for Moving the Plugin System to Enterprise

1. **Plugin authoring is a commercial lever.** Organisations that need
   company-specific audit rules — e.g., "flag use of our deprecated internal
   SDK", "enforce our service-mesh naming convention" — must pay for the custom
   rule authoring UI that is already in the Enterprise tier.  Locking the
   programmatic plugin API behind the same paywall creates an unambiguous forcing
   function: organisations that write TypeScript rules either pay for Enterprise
   or they don't get to extend Zaria at all.

2. **A proprietary plugin SDK protects against unbundled competitors.** An
   open-source CLI plugin system can be copied and made the basis of a rival
   product.  A proprietary SDK cannot.

3. **Alignment with the "Custom rule authoring UI" Enterprise feature.** The
   browser-based rule wizard is already in the Enterprise tier.  One could argue
   that all rule-extension capabilities — whether no-code (the UI) or code-first
   (the SDK) — should live at the same tier for consistency.

### The Case for Keeping the Plugin System in AGPL (the chosen position)

1. **No successful open-core developer tool has a proprietary plugin system.**
   ESLint's competitive dominance is built entirely on `npm install eslint-plugin-*`.
   VS Code's market position is built on its open extensions API.  Babel,
   Webpack, Rollup, Prettier — every developer tool that has achieved ecosystem
   dominance has done so by making plugin authoring free and frictionless.  The
   pattern of "pay to extend the tool" has no successful precedent in the
   developer-tooling market.  Zaria would be entering an already-competitive
   space with a structural disadvantage baked in from launch.

2. **A locked plugin system permanently caps the community edition's utility.**
   Without plugins, the community edition can only audit TypeScript and JavaScript
   projects using Zaria's 24 built-in rules.  With an open plugin system,
   `zaria-plugin-python`, `zaria-plugin-go`, `zaria-plugin-nextjs`, and
   `zaria-plugin-prisma` extend Zaria into a general-purpose, multi-language
   audit platform.  Locking the plugin API behind Enterprise makes the community
   edition a narrow-purpose tool that competes against free specialist linters
   (ESLint, Pylint, golint) rather than complementing them.

3. **Plugin authoring is the primary contribution pathway.**  The developers
   most likely to contribute to Zaria are those who want to add rules for their
   framework, ORM, or language.  Closing the plugin API closes that pathway
   completely.  The community that forms around the open plugin ecosystem — plugin
   authors, framework evangelists, language-specific contributors — is exactly the
   community that introduces Zaria to enterprise engineering teams.  Removing that
   community removes the enterprise sales funnel.

4. **AGPL already protects the plugin architecture against proprietary forks.**
   Under AGPL, anyone who improves the plugin loader, discovery mechanism, or
   sandboxing model and deploys that improvement as a networked service must
   publish those improvements.  This is precisely the protection AGPL was chosen
   to provide.  A proprietary plugin system adds marginal additional protection
   while destroying adoption.

5. **The "Custom rule authoring UI" Enterprise feature already monetises the
   plugin concept at the correct boundary.**  The AGPL CLI plugin SDK targets
   developers who write TypeScript and use a terminal.  The Enterprise rule
   authoring UI targets compliance officers, team leads, and organisations that
   need rules but do not have engineers to write them.  These are genuinely
   different buyer personas at genuinely different price points.  There is no
   need to collapse them into a single Enterprise gate.

6. **A closed plugin SDK is trivially circumvented.**  Because Zaria's audit
   engine is AGPL-licensed, a determined competitor can call the same analysis
   functions directly from their own code without using the plugin interface at
   all.  The plugin API provides a *convenience contract*, not a unique capability
   that can serve as an effective commercial moat.

7. **Official plugin packages are adoption drivers, not give-aways.**  The first-
   party plugins (`zaria-plugin-nextjs`, `zaria-plugin-prisma`, etc.) are how
   Zaria enters framework-specific communities.  A Next.js developer who installs
   `zaria-plugin-nextjs` because it catches real Next.js anti-patterns becomes an
   organic advocate for Zaria Cloud when their company scales.  Charging for those
   plugins at the plugin-system level is the equivalent of ESLint charging for
   `eslint-plugin-react` — it would simply not happen.

### Decision

**The plugin system stays in AGPL permanently.**  This includes the plugin
loader (`src/plugin/`), the discovery mechanism, the `ZariaPlugin` and `Rule`
TypeScript interfaces, the `zaria plugin` CLI commands, and all official
first-party plugin packages published under the `zaria-plugin-*` namespace.

The correct monetisation boundary for rule-extension capabilities is:

| Capability | Tier | Rationale |
|---|---|---|
| **Plugin SDK** (TypeScript `ZariaPlugin` interface, `--plugins` flag, auto-discovery) | AGPL | Developer-facing extension; drives ecosystem and adoption |
| **Official plugin packages** (`zaria-plugin-nextjs`, etc.) | AGPL (free on npm) | Adoption drivers; grow the funnel into enterprise sales |
| **Custom rule authoring UI** (browser-based, no-code wizard) | Enterprise | Compliance-officer / non-developer persona; justifies commercial pricing |
| **Private enterprise plugin development** (Zaria team authors bespoke rules under contract) | Enterprise service | Professional services revenue; not a product feature |

Moving the plugin SDK to Enterprise would destroy the community edition's
extensibility, eliminate the primary contributor pathway, and put Zaria in
direct conflict with the playbook that has produced every successful
developer-tool open-core business.  The "Custom rule authoring UI" is already
the right commercial monetisation of rule extensibility for the buyer who needs
it — the enterprise compliance officer — without taxing the developer who simply
wants to write a rule.

---

## Selective MIT Candidate Analysis

Not all AGPL features are equal candidates for eventual MIT relicensing. The test for each feature is: **does releasing it under MIT primarily grow the ecosystem, or does it primarily hand competitive advantage to commercial actors who would not give improvements back?**

Features are classified below into three categories:

### ✅ MIT Candidates — Infrastructure / Plumbing Layer

These modules have low standalone commercial value. They are the plumbing that makes the audit engine run, not the intelligence inside it. Releasing them under MIT helps IDE extension authors, CI system integrators, and framework maintainers build on Zaria's foundations without being forced to open-source their own tools — and without giving away anything an embeder could exploit commercially on its own.

| Module / Feature | Location | Rationale for MIT candidacy |
|---|---|---|
| **AST parser** | `src/audit/parser.ts` | Infrastructure: wraps ts-morph; no audit logic; useless without rules |
| **File traversal engine** | `src/audit/traversal.ts` | Infrastructure: discovers files; no detection value alone |
| **Analysis context builder** | `src/audit/context.ts` | Infrastructure: assembles shared state; no findings produced |
| **Type definitions & interfaces** | `src/audit/types.ts` | Interface contracts; no logic; needed to build compatible plugins |
| **CLI skeleton** (command routing, argument parsing) | `src/cli/index.ts`, `src/cli/commands/*.ts` | Scaffolding; the value is in what the commands invoke, not the routing |
| **Configuration schema & loader** | `src/config/` | Standardised config format; helpful for plugin/tooling authors |
| **Scoring aggregation maths** | `src/scorer/aggregate.ts` | The weighted A–F calculation is a simple algorithm, not a competitive asset |
| **Terminal reporter** | `src/report/terminal.ts` | Text-to-console formatting; no competitive value without the rules driving it |
| **JSON reporter** | `src/report/json.ts` | Serialises findings to JSON; trivial without the detection logic |

**Condition:** These are MIT candidates only as a group — the plumbing is not useful without the rules, so releasing it under MIT does not transfer audit capability to a competitor. They would be relicensed together once the Enterprise tier is established and there is no risk of the infrastructure alone becoming the basis of a commercial fork.

### ❌ Stays AGPL — Audit Intelligence Layer

These are the modules that **are** Zaria. They represent the accumulated detection logic: the patterns, heuristics, and AST traversal strategies that identify real problems in real codebases. This is the intellectual core of the product.

Releasing these under MIT would allow any company — including cloud vendors and competitors — to embed, improve, and ship this detection logic in proprietary products without contributing improvements back. AGPL ensures that if someone makes a detection rule better and deploys it as a service, that improvement returns to the community. That protection is the primary reason AGPL was chosen, and it applies most forcefully here.

| Module / Feature | Location | Rationale for staying AGPL |
|---|---|---|
| **Performance rules** (PERF001–PERF004) | `src/audit/performance/rules/` | Core detection intelligence; high reuse value for commercial actors |
| **Architecture rules** (ARCH001–ARCH004) | `src/audit/architecture/rules/` | Core detection intelligence |
| **Scalability rules** (SCALE001–SCALE004) | `src/audit/scalability/rules/` | Core detection intelligence |
| **Integrity rules** (INT001–INT004) | `src/audit/integrity/rules/` | Core detection intelligence; security-adjacent value |
| **Maintenance rules** (MAINT001–MAINT005) | `src/audit/maintenance/rules/` | Core detection intelligence |
| **Efficiency rules** (EFF001–EFF003) | `src/audit/efficiency/rules/` | Core detection intelligence |
| **Dimension scorers** | `src/audit/*/scorer.ts` | Aggregation logic specific to each dimension's weighting strategy |
| **HTML reporter** | `src/report/html.ts` | Polished stakeholder output; part of Zaria's product presentation, not generic infrastructure |
| **Markdown reporter** | `src/report/markdown.ts` | CI/CD PR integration; a product feature, not a utility |
| **SARIF reporter** | `src/report/sarif.ts` | Enterprise CI/CD toolchain integration; valuable enough to protect |
| **Community plugin system** | `src/cli/commands/plugin.ts` | Plugin loader architecture; keeping it AGPL ensures plugin improvements flow back |

### 🔒 Enterprise — Permanent Commercial Tier

All features in the Enterprise Edition remain under a commercial licence permanently, regardless of any future changes to the community edition's licence. These features will never move to AGPL or MIT.

---

## Summary: What Would and Would Not Move to MIT

| Category | MIT future? | Features |
|---|---|---|
| **Infrastructure / plumbing** | ✅ Yes (as a group, when conditions are met) | Parser, traversal, context builder, types, CLI skeleton, config, scorer maths, terminal/JSON reporters |
| **Audit intelligence** | ❌ No — stays AGPL | All 24 detection rules, dimension scorers, HTML/Markdown/SARIF reporters, plugin system |
| **Enterprise tier** | ❌ No — stays commercial | All SRE integrations (basic adapter connectivity + advanced correlation engine), fleet auditing, SSO, RBAC, dashboards, policy-as-code, PDF reports, REST API, on-prem agent, Zaria Cloud |

---

## The Dual-Licensing Mechanism

Zaria operates under a **dual-licence model**:

- **AGPL-3.0-or-later** — for individuals, teams, and organisations that are willing to comply with AGPL's terms (i.e., they release their modifications to Zaria under AGPL when deploying it as a networked service).
- **Zaria Enterprise Licence** — for organisations that need to embed or deploy Zaria without AGPL obligations, or that need the enterprise features listed above.

To obtain an Enterprise licence, contact: **enterprise@zaria.dev**

---

## What AGPL Requires (Plain-English Summary)

You **can** freely:
- Use Zaria to audit your own codebases (internal or commercial projects).
- Modify Zaria for your own use.
- Self-host Zaria internally.
- Redistribute Zaria or your modified version under AGPL.

You **must**, if you distribute or network-deploy a modified version:
- Make the modified source code available under AGPL.
- Include a prominent notice that the software has been modified.
- Preserve all copyright and licence notices.

You **must** purchase a commercial licence if:
- You want to embed Zaria in a product or service and **not** open-source your modifications.
- You want the Enterprise features listed above.

---

## Community Commitments

1. **The AGPL feature set is frozen against paywall regressions.** Features listed in the "AGPL Community Edition" table above will never be moved behind the enterprise tier. This is a permanent, public commitment. *(Note: SRE integrations were repositioned to Enterprise during pre-launch internal planning, before any public release or community adoption. The current AGPL table reflects the definitive community feature set.)*
2. **The plugin system stays in AGPL permanently.** The plugin SDK, plugin loader, `ZariaPlugin` interface, `zaria plugin` CLI commands, and all official `zaria-plugin-*` packages are, and will remain, free for all AGPL-compliant users. See the Plugin System Tier Decision section for the full analysis behind this commitment.
3. **Selective MIT relicensing is additive, not reductive.** If a module is moved from AGPL to MIT, no functionality is removed — the change only relaxes the licence on that module. Nothing already open will be closed.
4. **The enterprise/community boundary is documented here.** Any change to this table will be announced publicly with at least 90 days' notice.
5. **Enterprise features are genuinely enterprise.** SSO, RBAC, fleet management, SRE integrations, and SLAs are things individual developers do not need. Core static-analysis audit capability — including the plugin system — stays in the open.

---

## Competitive Context

| Project | Community Licence | Enterprise/SaaS Model |
|---|---|---|
| **Grafana** | AGPL-3.0 | Grafana Cloud + Enterprise plugins (proprietary) |
| **GitLab** | MIT (CE) | GitLab EE (proprietary) + GitLab.com SaaS |
| **SonarQube** | LGPL-3.0 (Community) | Developer / Enterprise / Datacenter editions |
| **Metasploit** | BSD-3 (Framework) | Metasploit Pro (proprietary) |
| **HashiCorp Vault** | BSL 1.1 | HCP Vault (SaaS) + Enterprise |
| **Sentry** | BSL | Sentry Cloud (SaaS) |
| **Zaria** | **AGPL-3.0-or-later** | **Zaria Enterprise + Zaria Cloud (planned)** |

Grafana is the closest structural parallel: AGPL community edition, proprietary enterprise plugins, hosted SaaS. That model has generated hundreds of millions in revenue while maintaining one of the strongest open-source communities in the observability space.

---

_Last updated: March 2026. AGPL-3.0-or-later applied. Selective MIT candidate analysis added. SRE integrations repositioned to Enterprise tier (see SRE Tier Decision section). Audit intelligence confirmed as AGPL-permanent (see Audit Intelligence Tier Decision section). Plugin system confirmed as AGPL-permanent (see Plugin System Tier Decision section). Enterprise tier and Zaria Cloud in planning._

---

## Licensing FAQ

This section answers common questions about the order in which Zaria's licences were applied and the risks of alternative approaches.

### "Why not launch under 'all rights reserved', publicise the project, then switch to AGPL?"

Under copyright law, publishing code without an explicit licence does **not** mean anyone is free to use it — it means the code is implicitly "all rights reserved" (full copyright). In practice, however, the developer-tools community treats unlicensed open-source code as ambiguous: many developers will avoid it, and some will copy it, because the legal situation is unclear.

More critically, this sequencing introduces a **window of competitive risk** that AGPL-from-the-start avoids:

1. **The copy window.** During the period between public announcement (e.g., LinkedIn posts) and the application of the AGPL licence, anyone who downloaded or forked the repository received a copy under whatever terms existed at that moment — which, without an explicit licence, is legally murky.  Applying AGPL *after the fact* does **not** retroactively bind those earlier copies.  A competitor who downloaded the code during that window could argue they have a copy with no binding licence restriction (or, conversely, that your copyright claim means they need to seek permission — which benefits you but requires litigation to enforce).

2. **No community protection.** AGPL's copyleft clause — the mechanism that forces any network-deployed fork to publish its modifications — only applies from the moment the AGPL licence is applied.  Improvements a competitor made during the unlicensed window are not covered.

3. **Trust cost.** Applying a restrictive licence *after* publicising a project is sometimes perceived as a bait-and-switch even when it is legally clean.  Starting with AGPL from day one establishes trust with the community immediately.

**The verdict:** Starting under AGPL (the chosen approach) is strictly better.  It closes the window immediately, establishes community expectations clearly, and requires no subsequent licence-change announcement.

### "Doesn't applying AGPL *after* an 'all rights reserved' period still present a loophole?"

Yes — and this is exactly why Zaria applied AGPL before any public code release.  If you were to:

1. Publish the code publicly without a licence (or under "all rights reserved"),
2. Promote it (LinkedIn, Hacker News, etc.), and
3. Apply AGPL some days or weeks later,

then anyone who copied the repository during steps 1–2 would have a copy that predates the AGPL.  Whether they could legally *use* that copy is a separate copyright question, but you would face difficulty enforcing copyleft obligations against them because you had not yet granted those obligations at the time of copying.

**In summary:** the window is real, the risk is real, and applying AGPL from day one is the correct mitigation — which is exactly what Zaria did.

### "What about moving from AGPL to MIT for some modules later — does that create a loophole?"

Selective relicensing from AGPL to MIT (see the Selective MIT Candidate Analysis above) is an **additive** change — it grants users more freedom, not less.  It does not create a loophole for competitors because:

- MIT-licensed code can be used in proprietary products, **but** the audit-intelligence modules (the rules and scorers) remain AGPL permanently.  The infrastructure plumbing that might move to MIT has no standalone commercial value without the rules.
- Any company that builds on MIT-licensed Zaria infrastructure still cannot copy the AGPL-licensed detection engine into a proprietary product.
- The selective relicensing is done module by module, under conditions described in the Selective MIT Candidate Analysis, only after the Enterprise tier generates sustainable revenue.

The risk of a competitor exploiting an MIT-licensed module is low precisely because infrastructure without intelligence is not a product.

### "Should I create a Zaria GitHub organisation, dedicated email addresses, and other operational accounts before building enterprise features?"

See [`docs/startup-operational-checklist.md`](./startup-operational-checklist.md) for the complete list of pre-enterprise operational tasks, including email infrastructure, brand identity, legal entity, community channels, and technical infrastructure.
