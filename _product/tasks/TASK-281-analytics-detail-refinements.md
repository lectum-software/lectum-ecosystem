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
