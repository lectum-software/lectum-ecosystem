# ADR-0637 - Security updates before feedback rollout

Status: Accepted

## Decision
Do not publish the new authenticated upload flow with known dependency alerts.
Use fixed versions verified against npm metadata and upstream advisories,
preserving independent application lockfiles and existing overrides.
Nodemailer 10 requires Node >=20; production backend uses Node 22. Upstream
retains CommonJS and Transporter type compatibility. Validate compilation of
real application templates with a stream transport, without SMTP delivery.
The handlebars plugin still declares the old @types/nodemailer Mail shape;
adapt only the compile-plugin type boundary to the bundled v10 type. The
real stream transport regression verifies this runtime contract and template
escaping; no compiler checks or transport security options are disabled.
Next 16.4.1 fixes security issues; align eslint-config-next. Upgrade Sentry,
Axios, Zod, Sharp and vulnerable transitive dependencies in affected apps.
Do not broadly update unrelated packages or include pending SendNF code.
Final audit gate also found affected dependencies in root tooling and video.
Apply the same patched lines there, validate video separately and deploy it
sequentially to avoid concurrent builds on the VPS.

## Verification and rollback
Full audits, checks, builds and isolated authenticated browser/API tests are
release gates. Do not suppress security checks. Retain previous deploys for
rollback; never reverse the additive feedback migration by deleting data.

## Sources
- https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md
- https://github.com/vercel/next.js/releases/tag/v16.4.1
- https://github.com/advisories/GHSA-jqcg-44mw-7w3h
- https://github.com/advisories/GHSA-q7qp-rjg7-q26m
- https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
