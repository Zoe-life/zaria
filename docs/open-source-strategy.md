# Licensing & Commercialisation Strategy — Zaria

> **Status (March 2026):** AGPL-3.0-or-later has been applied. This document records the rationale for that decision and defines the three-phase licensing roadmap: **AGPL → Enterprise → MIT**.

---

## Why AGPL First

Zaria was written by a single author and had no licence applied before this decision. That starting position made it legally clean to choose any licence — including strong copyleft — without needing consent from any other contributor or risking community backlash from a retroactive change.

AGPL-3.0 was chosen as the Phase 1 licence for three reasons:

1. **Network-copyleft closes the SaaS loophole.** Any company that runs a modified version of Zaria as a networked service must publish their modifications under AGPL. GPL-3.0 would not cover this case; AGPL does. This is the primary commercial protection at this stage.
2. **Full source visibility builds trust.** Developers can read, audit, fork, and self-host Zaria freely. This drives adoption — the community that forms under AGPL becomes the funnel for enterprise sales.
3. **AGPL is the easiest licence to move *from*.** Moving from restrictive (AGPL) to permissive (MIT) is uncontroversial; the reverse is impossible without unanimous contributor consent. Applying AGPL now and relaxing later is the correct direction of travel.

---

## Three-Phase Roadmap

### Phase 1 — AGPL (Now)

The current source code is licensed under **GNU Affero General Public License v3.0 or later**.

Any individual, team, or organisation may use, modify, and redistribute Zaria under AGPL. Organisations that incorporate Zaria into a networked product or service must release their modifications under AGPL, **or** obtain a commercial licence (see Phase 2).

### Phase 2 — Enterprise Tier (next milestone)

A separate **Enterprise Edition** will be released under a commercial licence. It will extend the AGPL community edition with capabilities that large organisations require but that individual developers typically do not need.

Enterprises that cannot or will not comply with AGPL (e.g., because they do not wish to open-source their internal Zaria modifications) purchase an Enterprise licence instead. This is a standard **dual-licensing / open-core** model.

### Phase 3 — MIT (future)

Once the Enterprise tier has generated sustainable revenue, the community edition will be relicensed from AGPL to **MIT**. This is the long-term commitment to the open-source community: the core audit engine will eventually be fully permissively licensed.

The MIT relicensing timeline is intentionally left open — it is tied to business sustainability, not a fixed date. Enterprise features will remain proprietary after the community edition moves to MIT.

---

## Feature Tier Matrix

This table is the canonical definition of what belongs in each tier. It is the contract with the community: features in the AGPL tier will **never be moved to a paid tier**.

### AGPL Community Edition

| Feature | Status | Notes |
|---|---|---|
| **Core audit engine (all 6 dimensions)** | ✅ Included | PERF, ARCH, SCALE, INT, MAINT, EFF — all 24 rules |
| **Performance audit** (PERF001–PERF004) | ✅ Included | N+1 queries, sync blocking, memory leaks, bundle size |
| **Architecture audit** (ARCH001–ARCH004) | ✅ Included | Circular deps, coupling, clean arch evaluation |
| **Scalability & Observability audit** (SCALE001–SCALE004) | ✅ Included | Stateful patterns, tracing, health checks, unbounded queries |
| **Data Integrity & Race Conditions audit** (INT001–INT004) | ✅ Included | Shared-state mutations, transactions, TOCTOU, idempotency |
| **Long-Term Maintenance audit** (MAINT001–MAINT005) | ✅ Included | Complexity, duplication, CVEs, deprecated deps, docs coverage |
| **Code Efficiency audit** (EFF001–EFF003) | ✅ Included | Efficiency-focused static rules |
| **Terminal report** | ✅ Included | ANSI-coloured, progress bars, A–F grade |
| **JSON report** | ✅ Included | Machine-readable structured output |
| **Markdown report** | ✅ Included | GitHub / GitLab PR comment format |
| **HTML report** | ✅ Included | Self-contained, offline-capable |
| **SARIF report** | ✅ Included | GitHub Code Scanning, Azure DevOps, VS Code |
| **Single-project audit** | ✅ Included | Audit one repository per invocation |
| **Zero-config usage** | ✅ Included | Works out of the box with sensible defaults |
| **YAML / JSON config** (`.zariarc`) | ✅ Included | Per-project thresholds, ignore rules, dimension control |
| **CI/CD exit codes & quality gates** | ✅ Included | `--threshold` flag; non-zero exit on breach |
| **SRE integrations** (Prometheus, Datadog, Grafana) | ✅ Included | Read-only, opt-in, configures via `sre connect` |
| **Community plugin system** | ✅ Included | `plugin add / remove / list`; typed plugin interface |
| **`--only` / `--skip` dimension flags** | ✅ Included | Selective audit runs |

### Enterprise Edition (Commercial Licence)

| Feature | Notes |
|---|---|
| **Multi-repo / monorepo fleet auditing** | Audit dozens of repos in one run; aggregate scoring and trend comparison across the fleet |
| **Centralized audit history & trend dashboard** | Persistent storage of audit runs; visualise score trends over time; regression alerts |
| **Policy-as-code enforcement** | Organisation-wide quality gates defined in a central policy repo; enforced across all teams' CI pipelines |
| **SAML / SSO / LDAP authentication** | Required for enterprise procurement; integrates with Okta, Azure AD, Google Workspace |
| **Role-based access control (RBAC)** | Team leads see all repos; developers see their own; compliance officers get read-only dashboard access |
| **Custom rule authoring UI** | Browser-based wizard for writing and testing organisation-specific audit rules without touching code |
| **Audit data export** (CSV, REST API) | Pipe findings into JIRA, ServiceNow, Splunk, or any internal compliance system |
| **PDF compliance reports** | Formal, printable reports for auditors, board packs, and compliance submissions |
| **Advanced SRE correlation engine** | Maps static findings to runtime error rates, MTTR, and incident frequency from Prometheus / Datadog / Grafana; surfaces "high-code-risk + high-production-impact" critical findings |
| **On-premises agent** | Run Zaria behind a firewall with no outbound internet access; results pushed to self-hosted or Zaria-hosted dashboard |
| **Priority support SLA** | Guaranteed response times; private Slack channel; dedicated engineering contact |
| **Zaria Cloud** (hosted SaaS) | Connect repositories via GitHub / GitLab / Bitbucket app; scheduled audits; team dashboards; no CLI required |

### MIT Community Edition (Phase 3 — Future)

When the community edition is relicensed to MIT, the AGPL feature set above transfers verbatim to MIT. No features will be removed or moved to enterprise at the point of the MIT relicensing.

Enterprise features remain proprietary after the relicensing event.

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

1. **The AGPL feature set is frozen against paywall regressions.** Features listed in the "AGPL Community Edition" table above will never be moved behind the enterprise tier. This is a permanent, public commitment.
2. **The MIT transition is a one-way door.** Once the community edition moves to MIT, it will not revert to a more restrictive licence.
3. **The enterprise/community boundary is documented here.** Any change to this table will be announced publicly with at least 90 days' notice.
4. **Enterprise features are genuinely enterprise.** SSO, RBAC, fleet management, and SLAs are things individual developers do not need. Core audit capability stays in the open.

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

_Last updated: March 2026. AGPL-3.0-or-later applied. Enterprise tier and Zaria Cloud in planning._
