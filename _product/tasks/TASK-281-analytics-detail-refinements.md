# TASK-281 - Analytics detail refinements

Status: done. Versions 0.1.733 and 0.1.734. Local only, no push/deploy.

## Scope
- Transparent unselected counters; retain the short Video de apresentacao heading.
- Video origins ordered Explorar, Minha Busca, Perfil, then unknown when present.
- Point date and total are adjacent in one heading, separated by a bullet.
- Reduce lower video/content heading-to-period spacing to 0.25rem.
- Remove redundant Origem headings from video/profile/favorite detail tables.
- Column captions: Visualizacoes for video, Acessos for profile, Total for favorites.
- Preserve all totals, API contracts, People view, periods and comparison placement.
- Keep the selected counter visible after period loading completes.

## Acceptance
- [x] Focused regression tests and full frontend check/build.
- [x] Real local API/database browser QA at 320, 390 and 1440px.
- [x] Updated read-only preview without login or production mutations.

## References
User review of TASK-280 read-only gallery. Existing Lectum components and supplied
screenshots, PROTO-INVENTORY and architecture/package policy retained.
Builder connector unavailable; no Figma or new dependencies.
ADR-0644 refined. No schema/env changes; rollback is previous frontend artifact.
Pending SendNF work isolated for validation and restored separately.

## Validation
- Full frontend check passed (.tmp/task281-frontend-check.log). Final focused
  Biome, ESLint and 11 timeline/component tests passed after the carousel refinement.
- Production build passed (.tmp/task281-frontend-build.log), including TypeScript.
- Real isolated local database/API verified 114 clicks, 26 video views, 26 profile
  accesses and one favorite. No totals changed; temporary fixtures cleaned in finally.
- Mobile 320/390 and desktop 1440: transparent inactive counters, compact video
  title, table headers/order, date and total on one row, period spacing 0.25rem,
  no overflow, custom ranges and selected-counter visibility after period changes.
- Read-only gallery: .tmp/task281-analytics-readonly.html, 21 local captures.
- Additional next-start authenticated smoke could not validate the temporary
  session; no authentication changes made. Authenticated visual QA uses next dev.
- No remote push, deploy, invoice emission or production data changes.

## Inline heading follow-up (0.1.734)
- Date and total now read together as date / decorative bullet / Total, without
  distributing them to opposite ends of the tooltip.
- Twelve focused timeline/component tests passed; final Biome and ESLint passed.
- Real API browser QA repeated at 320/390/1440: adjacent labels on one line, no
  overflow. Keyboard focus indicator retained; pointer capture verified without it.
- Read-only point screenshots now show pointer interaction, not keyboard focus.
- Final build passed: .tmp/task281-bullet-build.log. A nonfatal webpack cache
  ENOSPC warning was followed by successful compilation/typecheck/static generation;
  stopped dev cache removed to recover space. No remote publication.

## Publication preparation (0.1.735)
- User authorized production publication of TASK-278/279/280/281 and reconfirmed
  Dokploy autodeploys and Vercel automatic promotion disabled on 2026-10-28.
- Integrated origin/homolog 759360e00, preserving billing fixes already merged
  in main de01aa619. Only frontend behavior changes relative to that main.
- Renumbered unpublished ADRs to 0645/0646 to preserve remote ADRs 0642/0643.
- Full frontend check and production dependency audit passed (zero findings).
  Evidence: .tmp/release-0735-frontend-check.log and release-0735-audit.json.
- Video browser QA repeated at 320/390/1440, including expanded player,
  contact action and cleanup: .tmp/release-0735-whatsapp-browser.log.
- Analytics browser QA repeated successfully at 320/390/1440, with real isolated
  API/database and fixture cleanup: .tmp/release-0735-analytics-browser-retry.log.
  The first run was interrupted by the local dev restart during integration;
  the clean retry passed, including the acquired-patients deep link.
- Production baseline: frontend/backend 0.1.733, health/ready HTTP 200.
  Rollback: previous frontend production artifact 0.1.733.
- No new dependencies, environment variables, migrations or backend contract.
  Do not deploy Backend, Admin or Video for this batch.
- SendNF pending work remains isolated and excluded from the release.
- Clarified earlier next-start limitation: public asset/API origin policy
  intentionally rejects localhost HTTP in production builds. Local authenticated
  QA uses next dev and the real isolated API/database, without weakening policy.
- Browser automation is unavailable in this desktop session; manual Vercel
  promotion may be required after the reviewed PR and successful deployment.
- Release gates found direct palette classes and two files above the size limit.
  Reused the existing media-foreground token (same white), extracted the player
  bottom overlay/minimal controls and the test renderer without changing behavior.
  All 50 focused player/community tests, source-safety, source-size and cycle
  checks passed; final production build repeated after these changes.
- Final build passed with TypeScript and 93 static pages:
  .tmp/release-0735-frontend-final-build.log. Only the preexisting Sentry import
  deprecation warning remained; source maps removed by the normal build script.
