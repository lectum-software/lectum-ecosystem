# TASK-274 - Security prerequisite for feedback rollout

Status: Done

## Scope
User approved dependency remediation before publishing TASK-273 on 2026-10-25.
Update affected backend, frontend, Admin, video and root packages/lockfiles.
Keep unrelated local SendNF work out of the release; no fiscal activation.

## Acceptance
- [x] Dependency audits contain no known vulnerabilities in all five scopes.
- [x] Checks and production builds pass with supported Node runtimes.
- [x] Real local feedback flow, authorization and email compilation pass.
- [x] Release diff reviewed and ordered production rollout documented.

## Preflight
Autodeploys for homolog Backend/Video and automatic frontend/Admin promotion
confirmed disabled by user. Monitoring: CPU 3.70%, RAM 3.82/7.75 GiB,
disk 40.14/58.76 GB (18.62 GB free). No deploy started.
Baseline full audits: backend 42 findings (3 critical), frontend/Admin 39 each
(4 critical each). Counts overlap; not unique vulnerabilities.

## Rollout
TASK-273 additive migration and backend first; verify health/readiness before
frontend/Admin promotion. Rollback code only, preserving feedback tables/data.
No new required variables or external actions during local validation.
Video also has affected dependencies and requires a separate sequential deploy.

## Evidence
Full audits: .tmp/task274-audit-{root,backend,frontend,admin,video}-final.json,
all exit 0. Nodemailer real stream transport/template compilation passes,
including confirmation/recovery content, HTML escaping and envelope.

All app checks passed. Root check stopped at the Nodemailer plugin type
boundary; after the compatibility fix, backend/Admin/video checks passed
individually (frontend had already passed). Backend: 964 passed, no failures.
Video: 92 passed, 13 existing conditional FFmpeg skips. Four builds passed.
Admin's first build found inline maps in stale .next/dev; only that generated
directory was removed with the dev server stopped, then full build passed.
No source map guard was disabled.

Logs: .tmp/task274-check-root.log, task274-check-{backend,admin,video}.log,
task274-build-{frontend,backend,video}.log, task274-build-admin-final.log.
Real Postgres and HTTP integration tests passed (task274-feedback-{db,http}.log).
Production Next builds served locally through a loopback-only HTTPS relay:
reserved *.lectum-qa.invalid names resolved to 127.0.0.1 only in test Chromium.
Self-signed certificate accepted only by that browser context. Real API/database,
no mocked endpoints and no production CSP/auth changes. This handles the
published frontend's intentional rejection of HTTP/localhost API origins.
Early local runs did not complete; final reruns after /ping readiness passed.

task274-refinement.log and task274-browser.log: 390/1440px, patient/professional,
real submit/attachment, offline retry retaining draft, private Admin download
and triage, light/dark layout, legal/support links and no overflow.
Temporary test users, feedback and Admin audit fixtures removed.
Before publication: API 0.1.712 healthy/ready, frontend 0.1.711, Admin 0.1.712.
Actual production deploy remains pending; successful builds are not deployment.
