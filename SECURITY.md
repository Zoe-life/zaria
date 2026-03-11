# Security Policy

## Supported Versions

The table below shows which versions of Zaria currently receive security fixes.

| Version | Supported |
|---|---|
| Latest (`main`) | ✅ Yes |
| `0.0.x` pre-release | ✅ Yes (until v1.0.0) |
| Older pre-release tags | ❌ No |

Once v1.0.0 is released, only the two most recent minor versions will receive security patches.

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

If you discover a security issue in Zaria, please disclose it responsibly:

1. **Email** the maintainers at **security@zoe-life.dev** *(replace with your actual address before publishing)*.
2. Include as much detail as possible:
   - A description of the vulnerability and its potential impact.
   - Steps to reproduce or a proof-of-concept (PoC).
   - The version of Zaria you tested against.
   - Any suggested mitigations, if you have them.
3. **Encrypt your report** using our PGP key (available on [keys.openpgp.org](https://keys.openpgp.org)) if the report contains sensitive details.

### What to expect

| Timeline | Action |
|---|---|
| Within **2 business days** | Acknowledgement of your report. |
| Within **7 business days** | Initial assessment — confirmed or not a vulnerability. |
| Within **30 days** | Patch released (or a clear timeline communicated). |
| After patch | Public disclosure coordinated with you. |

We follow a **coordinated disclosure** model. We will credit reporters in the release notes unless you prefer to remain anonymous.

---

## Scope

### In scope

- Arbitrary code execution via the Zaria CLI or its configuration loading.
- Path traversal / directory traversal in `traverseFiles` or report file output.
- Secrets or tokens leaked through log output or report files.
- Dependency vulnerabilities in `dependencies` (not `devDependencies`) that have a public CVE.
- SARIF output that could be used for supply-chain attacks when ingested by downstream tooling.

### Out of scope

- Vulnerabilities in `devDependencies` that are not reachable at runtime.
- Social engineering attacks targeting Zaria maintainers.
- Bugs that require physical access to the machine running Zaria.
- Theoretical issues with no practical exploit path.

---

## Security Best Practices for Users

- **Pin dependency versions** in your project to avoid supply-chain surprises.
- **Run Zaria with least privilege** — it only needs read access to the source directory being audited.
- **Review `.zariarc` carefully** — the `plugins` field loads external packages; only reference packages you trust.
- **Do not pipe untrusted output** from `zaria audit` to `eval` or similar shell constructs.
- **Keep Zaria up to date** — run `npm update zaria` regularly to pick up security patches.

---

## Vulnerability Disclosure History

| Date | Severity | CVE | Description | Fixed in |
|---|---|---|---|---|
| *(none yet)* | | | | |

---

## Acknowledgements

We thank all security researchers who responsibly disclose vulnerabilities to us.
