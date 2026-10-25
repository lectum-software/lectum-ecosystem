# TASK-275 - Close composer after profile editing

Status: Done

## Scope
Fix the patient post composer reopening profile editing when its close button
uses browser history after returning from the profile editor. Local change only.

## Acceptance
- [x] Canceling profile editing then closing an empty post returns to the feed.
- [x] Repeated edit/return cycles cannot loop through profile editing.
- [x] Text draft restoration and discard confirmation remain intact.
- [x] Community context, ordinary close and authentication return remain intact.
- [x] Frontend checks/build and real local browser checks pass at 390/1440px.

## Decision
ADR-0638. Mark profile return URLs explicitly and replace the returned standalone
composer with its community/feed fallback on close. Embedded modal callbacks and
ordinary history-based navigation retain their existing behavior.
No backend, database migration, dependency or production environment changes.

## Validation
Isolated local Postgres, real API and ephemeral patient test accounts removed
after execution. No posts submitted or production data accessed.

- 24 focused presentation/profile-return tests passed, including URL marker
  idempotence, query/hash preservation and existing draft scope/expiry tests.
- Complete frontend check passed (Biome, ESLint, TypeScript and test suites),
  including existing authentication/navigation regressions.
- Real Chromium at 390/1440px: repeated cancel/return, empty X close, draft
  restoration, cancel discard, confirm discard, community-filter fallback,
  embedded normal close, embedded profile detour and successful profile save.
- Screenshots inspected at both viewports; no layout changes introduced.
- Production frontend build passed with LECTUM_LOW_DISK_MODE=1; no source maps.
- Version bumped once to 0.1.716; version/tasks/ADRs/source-size/source-safety/
  encoding checks passed. Next regenerated its frontend AGENTS heading level.

Evidence: .tmp/task275-browser.ts, task275-browser.log, task275-frontend-check.log,
task275-build.log and task275-{return,closed}-{390,1440}.png.
Early browser runs stopped on hydration timing or ambiguous test selectors;
the final full run passed with real UI/API and no endpoint stubs.
Local commit only; no push, merge or deployment.
