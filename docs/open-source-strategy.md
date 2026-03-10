# Open-Source Strategy — Zaria Monetisation Options

> **Context:** Zaria is currently published under the MIT licence. This document explores how to keep the project genuinely open-source while building a sustainable revenue stream, using models proven by companies such as GitHub, HashiCorp, GitLab, and Grafana Labs.

---

## The Core Tension

Open-source drives adoption. Adoption creates the community, trust, and ecosystem that make the tool valuable enough to charge for. The risk is giving everything away and having no lever to monetise. The resolution is to decide *which layer* you monetise, not *whether* you open-source.

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

**Verdict:** This model is worth considering if you have very few contributors today (making the re-licensing consent manageable) and your primary concern is preventing cloud vendors from hosting Zaria without contributing back.

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

For Zaria at its current stage, the optimal path is a **staged combination**:

### Stage 1 — Now (Adoption phase)
- Keep the current MIT licence and full open-source CLI.
- Add a GitHub Sponsors page to signal sustainability and collect early supporters.
- Begin designing the fleet-auditing and dashboard features as enterprise candidates (do not release them yet).

### Stage 2 — First revenue (~500 active users)
- Introduce **Zaria Cloud** as a hosted SaaS with a free tier.
- The free tier generates adoption data and word-of-mouth; paid tiers (Pro/Team) convert active users.
- This requires minimal product changes — the SRE push adapters in `src/sre/` are the architectural hook.

### Stage 3 — Enterprise sales (~2,000 active users, or first inbound enterprise enquiry)
- Introduce the **Enterprise** tier: SSO, RBAC, on-prem agent, fleet auditing, custom rules UI, SLA.
- This is the open-core model applied to the SaaS: Community Cloud (limited) + Enterprise Cloud (paid) + on-prem (Enterprise licence).
- Begin offering **support contracts** to the first enterprise customers to fund early growth.

### Licence strategy
- **Keep MIT for the CLI.** Changing to AGPL retroactively is legally complex and community-damaging. MIT is the right choice for a developer tool competing for ecosystem adoption.
- **Use a separate proprietary licence for the enterprise server** (the SaaS backend and on-prem agent are not part of the open-source repo). This is exactly what GitHub, GitLab, and Grafana do.

---

## Competitive Reference Points

| Company | Open-source | Enterprise/SaaS | Revenue model |
|---|---|---|---|
| **GitHub** | Open-source ecosystem tools | GitHub Enterprise, Actions runners, Copilot, GHAS | SaaS + seat licence |
| **GitLab** | GitLab CE (MIT) | GitLab EE + GitLab.com | Open core + SaaS |
| **Grafana** | Grafana OSS (AGPL) | Grafana Cloud, Enterprise plugins | SaaS + plugin licences |
| **Snyk** | CLI open-source | Snyk platform (SaaS) | SaaS freemium |
| **SonarQube** | Community edition | Enterprise/Developer editions | Open core |
| **HashiCorp (Terraform)** | Terraform OSS (MPL) | Terraform Cloud/Enterprise | SaaS + BSL licence |

---

## Key Principles to Preserve Community Trust

1. **Never remove open-source features.** Once something is in the MIT release, it stays there. Regressions in openness destroy community trust irreparably.
2. **Document the open/enterprise boundary clearly.** Publish a features comparison table (like the one in Model 1 above) so there are no surprises.
3. **Enterprise features should be genuinely enterprise.** SSO, RBAC, fleet management, and SLAs are things individual developers don't need. Locking core functionality behind a paywall is what poisons communities.
4. **Respond publicly to the community.** Issues, PRs, and roadmap discussions in the open build the trust that drives adoption, which drives enterprise leads.
5. **Move fast on open bugs, slower on enterprise features.** This signals that open-source is not a marketing tool.

---

_Last updated: March 2026._
