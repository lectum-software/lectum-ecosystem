# TASK-285 - Content video reels and pending refinements

Approved on 2026-10-28, starting with Analytics counter width. The read-only
content-reels prototype and subsequent user corrections are the visual reference.
Builder is unavailable in this environment.

- [x] Match Analytics counter widths without wrapping the title; gray period text.
- [x] Hide inline profile video contact; keep fixed and expanded contact.
- [x] Keep expanded video uncropped with black spare space and safe controls.
- [x] Content reels in feed, community, post and psychologist publications.
- [x] Finish discussion before next feed post; profile follows its publication order.
- [x] Reuse real comments tree, composer and media entitlement.
- [x] Parent/caption overlays, paused reading, scrubbing and close restoration.
- [x] Remove downvote UI/new votes and historical negative ranking influence.
- [x] Focused tests, checks/builds and responsive local browser validation.
- [ ] Reviewed PR, sequential production release and smoke checks.

Presentation videos are excluded from content queues. Preserve unrelated SendNF/billing work. No schema
migration or new dependency planned. Autodeploys confirmed off by user; auxiliary
agents authorized. Production unchanged until validation gates pass. ADR-0650.

## Release preparation

Candidate: 0.1.740. Validate an isolated staged snapshot, excluding the unrelated
SendNF/billing changes. Backend first, frontend second; no Admin/Video deployment.
The candidate has no database migration or new runtime dependency.

User confirmed all automatic deployment/promotion triggers remain disabled.
On 2026-10-28 the production Dokploy history showed the latest Backend deployment
as Done, PR #138, version 0.1.737, commit
`2ed5f148f4eef1cb3e29ef1c96eac21790465591`. Frontend rollback reference is 0.1.739,
Vercel artifact `8S8sFc2hXyWkkVSBqoZrBECCn8Xh`, merge
`fbd423ec8e20df3983d94a854e736f889d3cb836` (PR #139).
The logged-in deployment panels are being operated by the user because local
publication credentials/browser automation are unavailable. Do not deploy before
the local gates, reviewed PR and required checks pass.

## Local validation

- Clean staged candidate: backend check passed (1,070 tests, no skips). Backend
  and frontend production builds passed with Node 24.22.1/pnpm 10.33.0. Final
  frontend check passed, including cursor recovery and interaction synchronization.
  Final repository-wide pnpm check passed for all four applications and guards.
  Optional browser suites ran with PLAYWRIGHT_MODULE configured; existing Admin
  symlink and Video FFmpeg environment-dependent skips are recorded in test output.
- Real Prisma integration covers 37 videos, deep focus, pagination under changed
  voting, public reads, verified-professional entitlement, presentation exclusion
  and deleted ancestors. UUID-scoped temporary data was removed afterward.
- Browser with real local API/database: post, both feeds and profile publications;
  guest entry; 320/390/1440 px contain-fit layouts; pause/scrub and reading guards;
  nested comment submission; vote/save/undo and retained state on revisit.
- Comments-to-viewer synchronization passed with 1,200 ms network latency: close
  while vote/save is pending, block duplicate actions, then display committed state.
- Video service compatibility check passed with 13 existing FFmpeg-dependent
  cases skipped because FFmpeg is unavailable in this shell. No Video code changed.
- User screenshot of production Backend Advanced / Cluster Settings confirms
  Replicas = 1 on 2026-10-28. No configuration was changed. The bounded process-local
  cursor store requires shared storage before multi-instance deployment without
  sticky routing. Expiry recovery is explicit, never silent concatenation.
- Compiled frontend correctly rejects a localhost API origin in production mode.
  Functional local browser QA uses development mode against the isolated API;
  production origin/CSP guards were not weakened to enable a compiled-local smoke.
- Final candidate browser smoke: 12/12 scenarios passed with the compiled backend
  and development frontend. Presentation contact is hidden inline and visible,
  contained and unclipped in expansion at 320/390 px; absent from content queues.
  No API HTTP failures or page errors occurred in that run. Earlier intermittent
  telemetry 500s were not reproduced, not claimed fixed. Two tracked requests did
  not drain before timeout; browser contexts were closed before fixture cleanup.
  Cleanup confirmed zero fixture users and communities. Mobile QA is browser
  emulation, not a physical iOS/Android-device certification.
