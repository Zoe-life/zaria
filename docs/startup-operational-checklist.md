# Zaria Startup Operational Checklist

> This document lists the operational, legal, community, and infrastructure tasks
> that should be completed **before** or **alongside** building the Enterprise
> feature tier.  It answers the question: *"What do I need to set up as a startup
> before I begin building enterprise features?"*
>
> Items are grouped by category and roughly ordered by priority.  Tick each box
> as it is completed.

---

## 1. Legal Entity & Intellectual Property

- [ ] **Register a legal entity** — Incorporate a company (LLC, Ltd., or equivalent)
  in the jurisdiction where you operate.  This is required before signing
  enterprise contracts, receiving payments, or employing staff.  Use a registered
  agent or legal counsel to ensure the filing is correct.

- [ ] **Trademark "Zaria"** — File a trademark application for the name *Zaria* and
  the Zaria logo in your primary market(s) (USPTO for the US, EUIPO for the EU,
  and UKIPO for the UK are the most important three).  A registered trademark
  prevents competitors from using the name and is a prerequisite for brand
  enforcement.

- [ ] **Contributor Licence Agreement (CLA)** — Set up a CLA (or Developer
  Certificate of Origin, DCO) that all external contributors must sign before
  their code is merged.  A CLA ensures that you, as the copyright holder, retain
  the right to relicense contributions (including selective MIT relicensing and
  the issuance of commercial licences).  Tools: [CLA Assistant](https://cla-assistant.io),
  [Contributor Covenant](https://www.contributor-covenant.org).

- [ ] **Register `zaria.dev`** (and `.com`, `.io` defensively) — Own the canonical
  domain before it is taken.  Configure DNS, set up HTTPS, and point it to a
  landing page.

- [ ] **Engage IP counsel** — Get at least one legal review of the AGPL dual-licence
  model, the CLA, and the enterprise licence agreement before signing any
  commercial customer.

---

## 2. Email & Communication Infrastructure

- [ ] **Register a Google Workspace (or equivalent) account** for the `@zaria.dev`
  domain.  Do **not** use personal Gmail accounts for business correspondence —
  they cannot be transferred and create brand inconsistency.

- [ ] **Create functional email addresses:**

  | Address | Purpose |
  |---|---|
  | `hello@zaria.dev` | General enquiries, press, partnerships |
  | `enterprise@zaria.dev` | Enterprise licence and sales enquiries (already referenced in COMMERCIAL-LICENSE.md) |
  | `contribute@zaria.dev` | Contributor queries, CLA questions |
  | `security@zaria.dev` | Responsible disclosure of security vulnerabilities |
  | `legal@zaria.dev` | Licence compliance, DMCA, legal requests |

- [ ] **Configure email routing** — Point each functional address to the appropriate
  person or shared inbox.  Use aliases or groups rather than individual accounts
  so that responsibility can be transferred without changing public-facing
  addresses.

- [ ] **Set up a CRM or help-desk** (e.g., HubSpot free tier, Freshdesk, or Linear)
  to track enterprise enquiries so that leads are never lost in a personal inbox.

---

## 3. GitHub Organisation

- [ ] **Create a `zaria-dev` GitHub organisation** (or use the existing `Zoe-life`
  org with a renamed repo — verify which is the right long-term brand).  A
  dedicated organisation separates the project's identity from the founding
  individual's personal account, which is essential for:
  - Onboarding contributors without giving personal-account access.
  - Managing teams (maintainers, triagers, enterprise support).
  - Publishing official packages under the organisation namespace.

- [ ] **Transfer the repository** from the personal/founder account to the
  organisation.  GitHub preserves all stars, issues, PRs, and redirect traffic
  automatically.

- [ ] **Configure branch protection on `main`:**
  - Require PR reviews (minimum 1 approving review from a code owner).
  - Require CI to pass before merge.
  - Require linear history (no merge commits).
  - Restrict force pushes.

- [ ] **Set up `CODEOWNERS`** — assign review responsibility by directory so that
  the right maintainer is automatically requested for each area.

- [ ] **Enable GitHub Discussions** — this becomes the primary community Q&A and
  announcement channel, reducing noise in the issue tracker.

- [ ] **Create a `zaria-community` repository** (or use Discussions) for community
  RFCs, plugin showcases, and announcements that are not bugs or feature requests.

- [ ] **Set up GitHub Sponsors** to allow individuals and companies to financially
  support the project before the commercial tier launches.

---

## 4. npm Package

- [ ] **Create an `@zaria` npm organisation** (scoped packages: `@zaria/core`,
  `@zaria/plugin-nextjs`, etc.) — or publish as `zaria` under the existing
  account.  Resolve this before the first public release; renaming after adoption
  is painful.

- [ ] **Claim the `zaria` package name on npm** immediately if not already done.
  Even publishing a placeholder `0.0.1` with a README pointing to the GitHub
  repo is enough to reserve the name.

- [ ] **Set up npm provenance** (GitHub Actions OIDC → npm `--provenance` flag) so
  that every published package is cryptographically linked to the CI run that
  built it.

- [ ] **Configure `.github/workflows/release.yml`** to publish to npm automatically
  on a version tag (`v*`), using a scoped npm token stored as a GitHub secret.

---

## 5. Community

- [ ] **Create a Discord server** (or a Slack workspace, or both).  Discord is the
  standard for open-source developer-tool communities.  Create channels for
  `#announcements`, `#general`, `#help`, `#plugins`, `#enterprise`, and
  `#contributing`.

- [ ] **Write a Code of Conduct** — `CODE_OF_CONDUCT.md` already exists in skeleton
  form in `CONTRIBUTING.md`; expand it or add a separate file following the
  [Contributor Covenant](https://www.contributor-covenant.org).

- [ ] **Create a public roadmap** — a GitHub Project board (or a `ROADMAP.md`) that
  shows what is planned for the Community, Enterprise, and Cloud tiers so that
  users can align their expectations and contributions.

- [ ] **Set up a status page** (e.g., Instatus, Betterstack) for Zaria Cloud and the
  telemetry endpoint once they are live.

- [ ] **Write the plugin registry** — a `PLUGINS.md` or a webpage listing official
  and community plugins so that users can discover the ecosystem.

---

## 6. Usage Telemetry & Analytics

Zaria now includes an opt-out anonymous telemetry module (`src/telemetry/`).
The following infrastructure tasks must be completed before telemetry data has
any value:

- [ ] **Provision the telemetry endpoint** — deploy a lightweight HTTP service at
  `https://telemetry.zaria.dev/v1/events` that accepts POST requests with the
  `TelemetryEvent` JSON payload and writes them to a time-series store.

  Recommended stack (low-cost, self-hostable):
  - **Ingestion:** [Plausible](https://plausible.io) (privacy-friendly, EU-hosted),
    [PostHog](https://posthog.com) (self-hostable, generous free tier), or a
    lightweight custom endpoint that writes to ClickHouse or BigQuery.
  - **Dashboard:** PostHog, Grafana + ClickHouse, or Metabase.

- [ ] **Write a privacy policy** at `https://zaria.dev/privacy` that explains
  exactly what is collected, how long it is retained, and how users opt out.
  Reference this URL in the telemetry module's JSDoc (already done) and in the
  README.

- [ ] **Add a telemetry notice to the README** — one paragraph explaining what is
  collected and how to set `ZARIA_TELEMETRY=0`.

- [ ] **Add a first-run notice** — display a one-time message when the telemetry ID
  file does not yet exist (i.e., the first `zaria audit` on a new installation)
  telling the user that anonymous usage data is collected and how to opt out.

- [ ] **Instrument plugin telemetry separately** — the plugin `name` and `version`
  are already included in `audit_run` events.  Once the plugin ecosystem grows,
  consider tracking plugin-specific events so that plugin authors receive usage
  feedback.

---

## 7. Brand & Marketing

- [ ] **Design a logo** — hire a designer or use a tool like Figma to create a
  wordmark and icon that work at favicon size (16×16 px) and banner size.
  Register the logo as a trademark alongside the name.

- [ ] **Create a landing page** at `zaria.dev` — minimum content:
  - What Zaria does (one sentence).
  - A live demo or screenshot of the terminal output.
  - Install command (`npm install -g zaria`).
  - Links to GitHub, docs, Discord, and the enterprise contact.

- [ ] **Create social media accounts** on LinkedIn, Twitter/X, and Bluesky under
  the `@zariadev` or `@zaria_dev` handle.  Post consistently; 3 LinkedIn posts
  is a start, but a sustained cadence (weekly updates, release announcements,
  community highlights) is needed for organic growth.

- [ ] **Submit to Product Hunt** — time the launch for maximum impact (Tuesday–
  Thursday, early morning US Eastern time).  Prepare a maker comment explaining
  the AGPL + commercial model.

- [ ] **Write a launch blog post** explaining: what Zaria is, why you built it,
  what AGPL means for users, and how the Enterprise tier works.  Publish on the
  Zaria website and cross-post to dev.to, Hashnode, and Medium.

- [ ] **Create a `zaria` topic on GitHub** and add it to the repository topics so
  that developers searching GitHub for audit tools discover the project.

---

## 8. Security

- [ ] **Set up a responsible disclosure policy** — `SECURITY.md` already exists;
  verify that `security@zaria.dev` is active and monitored, and that it links to
  the GitHub private security advisory feature.

- [ ] **Enable GitHub secret scanning** and **Dependabot** on the repository to
  catch leaked credentials and vulnerable dependencies automatically.

- [ ] **Run CodeQL** on every PR — already configured in `.github/workflows/`.
  Ensure the results are reviewed, not silently dismissed.

- [ ] **Publish a CVE policy** — commit to notifying users within 48 hours of a
  confirmed vulnerability, and to publishing a CVE for any CVSS ≥ 7.0 finding.

---

## 9. Enterprise Sales Readiness

- [ ] **Draft an Enterprise Licence Agreement (ELA)** — work with IP counsel to
  produce a template agreement that covers: AGPL exemption, Enterprise feature
  access, support SLA, pricing model (per-seat, per-repo, or per-org), and
  confidentiality.

- [ ] **Set up Stripe** (or Paddle for international tax compliance) to accept
  enterprise licence payments.  Automate licence key issuance on payment.

- [ ] **Create a pricing page** — even a simple "Contact us for pricing" page with
  a form is enough at this stage.  Clearly separate Community (free, AGPL) from
  Enterprise (paid, commercial licence).

- [ ] **Build a sales CRM pipeline** (HubSpot, Pipedrive) to track enterprise leads
  from first contact through contract signing.

- [ ] **Write customer-facing Enterprise documentation** — a private docs site (or
  a gated section of the public docs) covering Enterprise-only features: fleet
  auditing, SSO configuration, RBAC setup, SRE adapter credentials, and the
  REST API.

- [ ] **Establish a support SLA process** — define response-time targets (e.g.,
  P1: 4 hours, P2: 1 business day), set up a private Slack channel for paying
  customers, and assign a dedicated engineering contact.

---

## 10. Financial & Operational

- [ ] **Open a business bank account** for the legal entity.  Do not commingle
  personal and business funds.

- [ ] **Set up accounting software** (QuickBooks, Xero, or Wave) from day one.
  Retroactively categorising transactions is expensive.

- [ ] **Register for VAT/GST** if selling to EU or UK customers (thresholds vary by
  country; Paddle handles this automatically if used as the payment processor).

- [ ] **Purchase Directors & Officers (D&O) liability insurance** once you bring on
  a co-founder, advisors, or employees.

- [ ] **Define equity and vesting** — if there are co-founders, formalise equity
  splits and 4-year vesting with a 1-year cliff before writing a line of
  enterprise code.

---

*This checklist will be updated as the project progresses.  Items are not
exhaustive — consult legal, financial, and tax professionals for jurisdiction-
specific requirements.*
