# TASK-283 - Content legend and retention radius

Status: done. Version 0.1.737. Local only, no push/deploy.

## Scope
- Full-width content-origin rows with subtle dividers and count (percentage).
- Descending click totals with canonical tie ordering and zero rows retained.
- Stable blue, sky, lilac, indigo and blue-gray semantic colors in list and donut.
- Preserve period calculations, origin selection, keyboard and locked state.
- Retention panel, inner white surface, player/placeholder and dropoff notice
  reuse the outer card radius token.

## Acceptance
- [x] Focused and full frontend tests/checks.
- [x] Production build.
- [x] Real local API/database browser QA on mobile and desktop.
- [x] Read-only preview with populated and empty states.

## References and constraints
User screenshots WhatsApp Image 2026-10-28 at 09.25.46.jpeg, 09.25.37.jpeg
(TikTok row reference) and 09.33.41.jpeg (radius marks), plus follow-up requesting
the dropoff notice match the white surface too. PROTO-INVENTORY consulted;
Builder unavailable. Reuse existing components, no new dependency or API.
ADR-0644 extended. No migrations/env changes. Rollback: prior frontend artifact.
Pending SendNF is excluded and preserved separately.

## Validation
- Full check and build passed: .tmp/task283-frontend-check.log and
  .tmp/task283-frontend-build.log (types and 93 generated pages).
- Community/timeline regression suite: 16 tests, covering nonmutating sorting,
  stable ties, zero/single/locked data, fractional percentages and matching radii.
- Real local API/database browser QA: .tmp/task283-browser-final.log.
  Temporary records produced 60 clicks across five origins; cleaned in finally.
  Verified order and shares, period-driven reordering, color identity, keyboard
  selection, zeros, dark theme and no overflow at 320/390/1440px.
- Computed radius of outer card, tinted panel, white panel, player and dropoff
  notice matches at 12px. Preview: .tmp/task283-readonly.html; all nine captures
  loaded and inspected, including mobile layout.
- Existing mutable donut offset triggered the React immutability rule after
  legend reuse; replaced it with a pure preceding-count calculation. No API
  changes or lint exceptions. Final browser run repeated after this refinement.
- Source-safety, source-size, version synchronization and diff checks passed.
  Existing Sentry import deprecation warning remains unchanged.
