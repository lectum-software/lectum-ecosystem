# TASK-282 - Transparent video contact and consistent analytics counters

Status: done. Version 0.1.736. Local only, no push/deploy.

## Scope
- Video contact has no fill or backdrop blur, including hover.
- Hidden controls use matching bottom/side inset spacing; visible controls retain clearance.
- Keep the contact inside the expanded player, preserving identity and tracking.
- Top analytics counters reuse lower video metric badge, label, border and radius styles.
- Preserve current top counter dimensions, selected blue fill and comparison placement.
- No metric calculations, periods, contracts or billing changes.

## Acceptance
- [x] Focused regression suite: 62 tests passed.
- [x] Real local browser checks at 320, 390 and 1440px.
- [x] Full frontend check and production build.
- [x] Read-only captures for visual review.

## References and risks
User screenshots WhatsApp Image 2026-10-28 at 09.03.24.jpeg, 09.03.17.jpeg and
09.02.43.jpeg. PROTO-INVENTORY consulted; Builder unavailable. Existing Lectum
components supply the styles; no new package or design system.
ADR-0645 and ADR-0646 refined. Fully transparent contact may lose contrast on
bright video, as accepted for this visual trial. No migrations or environment
changes. Rollback is the previous frontend artifact. No push or deploy.
Pending SendNF isolated and restored separately; no invoice emission.

## Evidence
- .tmp/task282-frontend-check.log and task282-frontend-build.log: full check and
  optimized build passed, including types and all 93 generated pages.
- .tmp/task282-analytics-browser.log: real isolated API/database, temporary
  records removed in finally; matched computed badge/label/border/radius styles
  against lower counters, preserved 100px height and 78% mobile width.
- .tmp/task282-whatsapp-browser.log: transparent background and no backdrop filter,
  matching hidden-control insets, visible-control clearance, inline/expanded
  contact, keyboard activation, no horizontal overflow, fixture cleanup.
- QA scripts retried after fixing test-only callback serialization and a
  compact-screen coordinate outside the expanded player. No product workaround.
- .tmp/task282-readonly.html: 27 local captures, verified loading and mobile fit.
- Source safety/size, task index, version synchronization and diff checks passed.
- Existing nonfatal Sentry import deprecation warning remains unchanged.
