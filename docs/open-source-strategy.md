# Commercialisation Strategy — Zaria Monetisation Options

> **Context:** Zaria has **no licence applied yet** and has **not been publicly released**. There is only one contributor: the original author. This document evaluates every realistic monetisation path given that starting position — including fully proprietary options that would no longer be available once an open-source licence is applied or the code is publicised.

---

## Your Current Position (and Why It Matters)

**No licence = "All Rights Reserved" by default.** Under copyright law, code without an explicit licence cannot legally be used, copied, modified, or distributed by anyone other than the author. This is actually the *most commercially powerful* starting point:

- **You retain all rights.** No one can embed Zaria in their product, host it as a service, or resell it without your explicit permission.
- **You are the sole contributor.** There are no co-authors whose consent is needed to adopt any licence — including strong copyleft or dual-licence arrangements that would be legally complex or impossible to adopt retroactively once external contributors exist.
- **You have not yet publicised the project.** You can make the licence decision *before* your first public users form expectations, which is the best possible time to do so.

This document is therefore broader than a typical open-source strategy guide. All options — from fully proprietary to fully permissive — are genuinely available to you right now.

---

## The Core Tension

Open-source drives adoption. Adoption creates the community, trust, and ecosystem that make the tool valuable enough to charge for. The risk is giving everything away and having no lever to monetise. The resolution is to decide *which layer and which rights* you monetise, not simply *whether* you open-source.

---

## Model 0 — Fully Proprietary (Closed Source)

**How it works:**  
Keep the "All Rights Reserved" default that applies right now. Distribute Zaria only as compiled binaries or via a paid SaaS product. No source code is made public. Customers buy a commercial licence to use the software.

**Revenue lever:** Perpetual-licence sales, annual subscriptions, or SaaS pricing — all with no obligation to open-source anything.

**Examples:** JetBrains IDEs, Snyk Enterprise (before partial open-sourcing), many B2B dev-tools before reaching scale.

**Pros:**
- Maximum commercial control — competitors cannot copy, fork, or self-host without paying.
- No split-maintenance burden (community vs enterprise editions).
- Simple legal posture: one licence, one codebase.
- No community contribution management overhead.

**Cons:**
- Developer adoption is slower — the "try before you buy" friction is highest when there is no free or open tier.
- Sales cycle is longer without a free community edition driving word-of-mouth.
- No community contributions to improve the engine.
- Harder to build ecosystem integrations (plugins, IDE extensions) when source is closed.

**Verdict:** A viable choice if you plan to sell directly to enterprises from day one and do not need community adoption to reach your first customers. Harder to build a large developer user base without some open tier. Consider pairing with a free SaaS trial tier.

---

## Model 1 — Open Core (recommended starting point)

**How it works:**  
The community edition (the current CLI) stays open-source under MIT. A separate, closed-source layer adds enterprise capabilities that large organisations need but that individual developers do not.

**Revenue lever:** Sell a licence for the closed enterprise layer.

**What goes in the open core vs the enterprise layer:**

| Capability | Community (MIT) | Enterprise (Paid) |
|---|---|---|
| CLI audit engine (all 6 dimensions) | ✅ | ✅ |
| JSON / Markdown / HTML / SARIF reports | ✅ | ✅ |
| Terminal output with scoring | ✅ | ✅ |
| SRE push adapters (Prometheus, Datadog, Grafana) | ✅ | ✅ |
| Single-project audit | ✅ | ✅ |
| **Multi-repo / monorepo fleet auditing** | ❌ | ✅ |
| **SAML / SSO / LDAP authentication** | ❌ | ✅ |
| **Role-based access control (RBAC)** | ❌ | ✅ |
| **Centralised audit history & trend dashboard** | ❌ | ✅ |
| **Policy-as-code enforcement (CI gate)** | ❌ | ✅ |
| **Custom rule authoring UI** | ❌ | ✅ |
| **Priority support SLA** | ❌ | ✅ |
| **Audit data export (CSV, REST API)** | ❌ | ✅ |

**Examples of companies using this model:**  
GitHub (Actions runners, Codespaces, GHAS are enterprise-only), GitLab, Grafana (Grafana Cloud / enterprise plugins), Metabase, Vault.

**Pros:**
- Core value proposition stays fully open — no bait-and-switch resentment.
- Enterprise features naturally align with enterprise procurement (SSO, SLAs, audit logs).
- Community contributions improve the engine that enterprise customers use, creating a virtuous cycle.
- Low friction for individual adoption → drives word-of-mouth → eventually reaches enterprise buyers.

**Cons:**
- Requires maintaining two codebases (or a mono-repo with feature flags).
- Enterprise features must be genuinely valuable; if the line is drawn too aggressively, you damage community trust.
- Revenue is delayed — you need significant adoption before enterprises buy.

---

## Model 2 — Dual Licensing (AGPL + Commercial)

**How it works:**  
The entire project is released under AGPL-3.0. AGPL is copyleft: any organisation that modifies and deploys Zaria as a networked service must open-source their modifications. Organisations that do not want to comply with AGPL can buy a commercial licence that grants MIT-equivalent rights.

**Revenue lever:** Sell a commercial licence to companies that cannot (or will not) comply with AGPL.

**Examples:** MongoDB (before switching to SSPL), MySQL/MariaDB, Qt, Metasploit.

**Pros:**
- The entire codebase stays in one place — no split maintenance.
- Forces vendors (e.g., SaaS companies embedding Zaria in their own product) to either open-source or pay.
- Philosophically aligned with open-source purists — the source is always visible.

**Cons:**
- AGPL makes many enterprise legal teams uncomfortable, even when they have no intention of modifying the code. Some companies blanket-ban AGPL dependencies.
- Changing from MIT to AGPL retroactively requires consent from every contributor — harder the longer you wait.
- The "pay to escape AGPL" message can feel adversarial to the community.
- Does not fit SaaS-hosted tooling as neatly as the open-core model.

**Verdict:** This model is particularly attractive in your situation. You are the sole contributor — no other authors need to grant you relicensing permission — and no licence has been applied yet, so there is no retroactive conversion to manage. Applying AGPL now, before any public release, is legally clean and straightforward. Changing from MIT to AGPL retroactively would require consent from every contributor and community goodwill; you face neither of those constraints.

---

## Model 2b — Source-Available / Business Source Licence (BSL / BUSL)

**How it works:**  
The source code is publicly visible (so developers can read, audit, and self-host for non-commercial use), but commercial use — especially competing SaaS products — requires a paid licence. The BSL (popularised by MariaDB and adopted by HashiCorp for Terraform) typically includes an automatic conversion clause: after a set period (e.g., four years), the code converts to a fully open-source licence such as Apache 2.0.

**Revenue lever:** Commercial-use licences for companies that embed or host Zaria commercially; the OSI-approved future conversion maintains long-term community goodwill.

**Examples:** HashiCorp Terraform (BSL 1.1 → Apache 2.0 after four years), MariaDB MaxScale, Sentry (BSL), CockroachDB (BSL).

**Pros:**
- Source is visible — developers can inspect, audit, and self-host for development/testing without paying.
- Prevents cloud vendors from reselling your product as a managed service without a licence agreement.
- Simpler than dual-licensing: one public licence text governs non-commercial use.
- The time-delayed open-source conversion signals long-term community commitment.
- As the sole contributor, you can apply BSL today with no consent issues.

**Cons:**
- BSL/BUSL is not OSI-approved; some developers (and some organisations' procurement policies) treat it as proprietary.
- "Source available" is often perceived negatively by the open-source community — expect some pushback.
- HashiCorp's switch from MPL to BSL caused a community fork (OpenTofu); be aware of this precedent if you later try to shift an established user base.
- Does not fit neatly into open-source package registries (npm may flag it).

**Verdict:** An excellent choice if your main concern is preventing AWS/GCP/Azure from hosting Zaria Cloud as a managed service and undercutting you. Easier to adopt than AGPL (no "pay to escape copyleft" optics) and less aggressive than full proprietary. **Particularly compelling here because you are the sole contributor and have not yet publicised the project — adopting BSL now avoids any retroactive relicensing controversy.**

---

## Model 3 — Managed SaaS (Zaria Cloud)

**How it works:**  
The CLI stays open-source. You run a hosted version of Zaria as a web service — `app.zaria.dev` — where teams connect their repositories, see dashboards, configure thresholds, and receive scheduled audit reports without installing anything locally.

**Revenue lever:** Subscription tiers (per-seat or per-repository-count).

**Example tiers:**

| Tier | Price | Limits |
|---|---|---|
| Free | $0 | 3 repos, community support, 7-day history |
| Pro | $29/month | 25 repos, email support, 90-day history, PDF reports |
| Team | $99/month | Unlimited repos, Slack/Teams alerts, 1-year history |
| Enterprise | Custom | SSO, RBAC, on-prem agent, SLA, custom retention |

**Examples:** Grafana Cloud, Codecov, Snyk, SonarCloud.

**Pros:**
- No enterprise feature "split" — you monetise convenience, not capability.
- Works with MIT licence — users can self-host for free, but most won't bother.
- Recurring subscription revenue is highly predictable and investable.
- Data from the SaaS platform generates insights (aggregate benchmarks, trend analysis) that you can productise.

**Cons:**
- High operational cost: you must maintain cloud infrastructure, security, GDPR compliance, uptime SLAs.
- The CLI must be architected to push data to a backend — requires non-trivial changes to the current design (the SRE adapters in `src/sre/` are the closest existing hook).
- "If I can self-host it for free, why pay?" requires a compelling answer — usually convenience, support, and aggregate benchmarking data.

---

## Model 4 — Support Contracts & Professional Services

**How it works:**  
The software is free; the expertise costs money. You sell:
- **Priority support** (guaranteed SLA, private Slack channel).
- **Implementation services** (help an enterprise integrate Zaria into their CI/CD, tune thresholds, write custom rules).
- **Training** (workshops for engineering teams on interpreting audit results).
- **Retainer audits** (you audit their codebase quarterly and deliver a human-curated report).

**Examples:** Red Hat (Linux support), Elastic, Confluent (early stage).

**Pros:**
- Zero product split — everything remains MIT.
- Enterprises often have procurement requirements that mandate a support contract even when they don't use it heavily.
- Builds deep relationships with anchor customers who shape the roadmap.

**Cons:**
- Does not scale — revenue is directly proportional to the number of people you can employ.
- Hard to hire for: requires technical depth AND consulting skills.
- Not suitable as a primary model for a developer tool unless combined with one of the above.

---

## Model 5 — GitHub Sponsors / Open Collective (Community Funding)

**How it works:**  
Individual developers, companies, and foundations sponsor the project financially via GitHub Sponsors or Open Collective in exchange for recognition, early access, or governance influence.

**Examples:** curl, ESLint, Vue.js (Open Collective), Babel.

**Pros:**
- Zero friction — no enterprise sales cycle, no pricing page.
- GitHub Sponsors integrates directly into the repo.
- Builds goodwill and signals health to potential enterprise buyers.

**Cons:**
- Revenue ceiling is low ($5k–$50k/year for most projects, with rare exceptions).
- Not a substitute for a commercial model — use as a supplement.
- Requires maintaining a public roadmap and sponsor-tier perks that take time to manage.

---

## Recommendation

For Zaria at its current stage — **no licence applied, sole contributor, not yet publicised** — you are in the best possible position to make a strategic licence decision. Every option in this document is fully available to you without any legal complexity or community backlash risk. Once you publish the code under a licence and acquire contributors or a user base, many of these options close or become far harder to exercise.

### Choosing Your Starting Licence

Use this decision tree before any public release:

| Goal | Recommended licence |
|---|---|
| Maximum commercial control, direct enterprise sales | **Proprietary** (Model 0) |
| Community-driven adoption + prevent cloud competitors | **AGPL + Commercial dual licence** (Model 2) |
| Visible source, prevent commercial hosting, future OSS | **BSL / BUSL** (Model 2b) |
| Broadest developer adoption, SaaS revenue later | **MIT + Managed SaaS** (Model 1 + 3 staged) |
| Quick, simple OSS presence + community funding | **MIT + Sponsors** (Model 1 + 5) |

### Staged Path (if choosing an open tier)

#### Stage 1 — Before first public release (Now)
- **Choose and apply your licence before pushing code publicly.** This is the single most important action. Once code is public without a licence, users will assume they can use it; once it is public under MIT, you cannot add restrictions without community backlash.
- If commercialisation is a priority, consider **AGPL + commercial dual licence** or **BSL** rather than MIT. Both are far easier to adopt today than after the project has contributors and users.
- Add a GitHub Sponsors page (works with any licence) to signal sustainability from day one.
- Begin designing fleet-auditing and dashboard features as enterprise candidates — do not release them yet.

#### Stage 2 — First revenue (~500 active users)
- Introduce **Zaria Cloud** as a hosted SaaS with a free tier.
- The free tier generates adoption data and word-of-mouth; paid tiers (Pro/Team) convert active users.
- This requires minimal product changes — the SRE push adapters in `src/sre/` are the architectural hook.

#### Stage 3 — Enterprise sales (~2,000 active users, or first inbound enterprise enquiry)
- Introduce the **Enterprise** tier: SSO, RBAC, on-prem agent, fleet auditing, custom rules UI, SLA.
- This is the open-core model applied to the SaaS: Community Cloud (limited) + Enterprise Cloud (paid) + on-prem (Enterprise licence).
- Begin offering **support contracts** to the first enterprise customers to fund early growth.

### Licence Strategy Summary

- **If you choose MIT:** Keep MIT for the CLI. Use a separate proprietary licence for any enterprise server layer (the SaaS backend and on-prem agent are not part of the open-source repo). This is exactly what GitHub, GitLab, and Grafana do.
- **If you choose AGPL:** Apply it now while you are the sole contributor — no consent from others needed, no retroactive controversy. Sell commercial licences to companies that cannot comply with AGPL. This is the simplest form of dual licensing and the cleanest it will ever be.
- **If you choose BSL:** Apply it now for the same reason. Configure the commercial-use exclusions and the conversion date (e.g., four years from release → Apache 2.0). This is the lowest-friction way to prevent SaaS competitors.
- **Proprietary is not a trap.** Starting proprietary does not prevent you from open-sourcing later (many companies do this). Open-sourcing under MIT does prevent you from going proprietary later (without breaking community trust irreparably).

---

## Competitive Reference Points

| Company | Open-source | Enterprise/SaaS | Revenue model |
|---|---|---|---|
| **GitHub** | Open-source ecosystem tools | GitHub Enterprise, Actions runners, Copilot, GHAS | SaaS + seat licence |
| **GitLab** | GitLab CE (MIT) | GitLab EE + GitLab.com | Open core + SaaS |
| **Grafana** | Grafana OSS (AGPL) | Grafana Cloud, Enterprise plugins | SaaS + plugin licences |
| **Snyk** | CLI open-source | Snyk platform (SaaS) | SaaS freemium |
| **SonarQube** | Community edition | Enterprise/Developer editions | Open core |
| **HashiCorp (Terraform)** | Terraform OSS (BSL → Apache) | Terraform Cloud/Enterprise | SaaS + BSL licence |
| **Sentry** | Self-hosted (BSL) | Sentry Cloud (SaaS) | BSL + SaaS freemium |
| **CockroachDB** | CockroachDB Core (BSL) | CockroachDB Dedicated/Serverless | BSL + SaaS |
| **MongoDB** | Community (SSPL) | Atlas (SaaS) | SSPL + SaaS |
| **JetBrains** | Some tools MIT/Apache | Paid IDEs, Toolbox | Proprietary |

---

## Key Principles to Preserve Community Trust (if you choose an open-source route)

1. **Decide your licence before your first public commit.** It is vastly easier to move from restrictive (AGPL, BSL) to permissive (MIT) than the reverse. Once users, contributors, and integrations exist, any licence tightening is seen as a betrayal.
2. **Never remove open-source features.** Once something is in the open release, it stays there. Regressions in openness destroy community trust irreparably.
3. **Document the open/enterprise boundary clearly.** Publish a features comparison table (like the one in Model 1 above) so there are no surprises.
4. **Enterprise features should be genuinely enterprise.** SSO, RBAC, fleet management, and SLAs are things individual developers don't need. Locking core functionality behind a paywall is what poisons communities.
5. **Respond publicly to the community.** Issues, PRs, and roadmap discussions in the open build the trust that drives adoption, which drives enterprise leads.
6. **Move fast on open bugs, slower on enterprise features.** This signals that open-source is not a marketing tool.

---

_Last updated: March 2026. Revised to reflect actual project state: no licence applied, sole contributor, not yet publicised._
