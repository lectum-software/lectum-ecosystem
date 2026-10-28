# TASK-280 - Analytics total and origins

Status: done. Version 0.1.732. Local only, no push/deploy.

## Scope
- One summed action-count curve for WhatsApp, video views, profile views and favorites.
- Tap/keyboard details retain total and every origin for that observation.
- Origin table under chart; WhatsApp selector Origin/People preserves aggregate people metrics.
- Wider, shorter metric carousel inside white chart surface, icons in card headings,
  no duplicated chart heading, active blue card and unchanged comparison placement.
- Smooth bounded curve and subtle blue-to-transparent fill.
- Period menu: last 7 days, last 30 days (default), last 12 months, custom dates.
- Lower video/content section descriptions replaced by selected period.

## Acceptance
- [x] Unit/component checks and frontend build.
- [x] Local real API/database validation at 320, 390 and 1440px.
- [x] Total/origin reconciliation, People selector, keyboard, custom dates and empty/locked states.
- [x] Read-only preview without login or API mutations.

## References and delivery
User WhatsApp screenshots dated 21/10 and 27/10 and TASK-278/279 local previews.
PROTO-INVENTORY consulted; Builder connector unavailable, use supplied screenshots and existing components.
ADR-0644. Frontend-only; existing 365d API contract retained. No migration/env/dependency changes.
Pending SendNF work isolated and restored after validation. Rollback: previous frontend artifact.

## Validation evidence
- Frontend full check passed: .tmp/task280-frontend-check.log (pre-existing Biome info only).
- Frontend production build and source-map cleanup passed: .tmp/task280-frontend-build.log.
- Ten timeline tests cover summed observations, zero days, bounded cubic interpolation,
  all four metric tables, hidden restricted data, period labels, and keyboard index clamping.
- Real local PostgreSQL/API QA: 114 actions by one person, 26 video views,
  26 profile views, one favorite. Origin table totals reconcile with each metric.
- Counters measured 100px mobile / 102px desktop; title 15px, value 28px, no overflow.
- Period defaults/12-month selection/custom dates and two lower section labels verified.
- Point tooltip and focus restoration verified; patient acquisition shortcut reveals its card.
- Temporary users, plan and tracking events removed in finally; no production data touched.
- 21 read-only screenshots in .tmp/task280-analytics-readonly.html, all gallery states
  loaded and verified at desktop/mobile without page errors or horizontal overflow.
