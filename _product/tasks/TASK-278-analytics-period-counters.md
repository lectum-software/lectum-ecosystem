# TASK-278 - Analytics period selector and counters

Status: Done (local only)

## Scope

Frontend-only refinement requested on 2026-10-27. Use the supplied Spotify screenshot
as a hierarchy reference while retaining Lectum tokens and existing card widths.
Builder Quick Copy is unavailable in this client; local product code and the supplied
Lectum screenshots are the implementation references.

## Acceptance

- [x] Neutral full-width period dropdown replaces the scrolling tabs.
- [x] Applied custom dates remain visible; reopening/canceling does not change the query.
- [x] Metric cards retain 46% / 30% / 20% widths, with larger titles/numbers and height.
- [x] Selected card is filled blue; comparison remains at bottom-right with readable contrast.
- [x] Favorites origin is absent only from Favoritado, including legend, plot and tooltip.
- [x] Mobile 390px, narrow 320px and desktop 1440px verified against local API/database.
- [x] Frontend checks/build pass; no remote push or deployment.

## Evidence

- Frontend check (Biome, ESLint, TypeScript and all configured test suites) passed.
- Frontend production build and version policy passed, release 0.1.730.
- 41 focused tests passed. Browser QA used temporary local users, courtesy subscription,
  favorite and contact records; cleanup completed in finally.
- Cards measured 112px high, labels 15px and values 28px. No title overflow or
  value/comparison overlap at 320, 390 and 1440px.
- Custom invalid range, cancel, apply, reopen, focus return and comparison dialog verified.
- Read-only gallery: .tmp/task278-analytics-readonly.html, nine real screenshots.

## Isolation

No database, billing, SendNF, backend or dependency changes. Temporary QA users and
records must be removed after browser verification. See ADR-0645.
