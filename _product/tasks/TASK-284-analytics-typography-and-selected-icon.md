# TASK-284 - Analytics typography and selected icon

Status: done. Version 0.1.738. Local only, no push/deploy.

## Scope
- Match content legend labels, counts and percentages to profile list text-sm.
- Apply font sizing to the list parent so the global button font inheritance
  does not override the intended size. Do not change global styles.
- Increase overview counter titles to text-base with leading-5; retain widths,
  100px height, values, comparison placement and icon slot dimensions.
- Selected icon uses transparent background and primary foreground; inactive
  icons retain the soft primary circle. Preserve alignment when selecting.

## Acceptance
- [x] Focused regression tests and complete frontend check/build.
- [x] Browser comparison with actual profile typography at 320/390/1440px.
- [x] Every counter fits and preserves icon dimensions through selection.
- [x] Updated read-only preview with actual local captures.

## References
User screenshots and follow-ups from 2026-10-28. PROTO-INVENTORY and architecture
consulted; Builder unavailable. Reuse current components, no new dependency,
API, environment or database changes. Extend ADR-0644. Preserve pending SendNF.

## Validation
- Real local API/database QA uses scoped temporary records and finally cleanup.
  All counter selections preserve 100px height and icon slot width, with no
  title/value overlap. Active glyph color matches its foreground title and
  inactive icons retain their fill.
- Legend computed size matches actual profile rows: 13.125px at 320/390px and
  14px at 1440px. Counter titles are 15px mobile and 16px desktop.
- Sorting, percentages, period changes, keyboard, empty state and dark theme
  remain validated by .tmp/task284-browser.log.
- Read-only preview .tmp/task284-readonly.html contains 12 checked captures.
  Cropped sections are never upscaled beyond their native image width.
- Focused analytics suite: 16 passing tests. Production build passed, including
  types and 93 generated pages. A webpack cache write warning caused by low
  local disk space did not prevent output; only generated cache was removed.
- Initial check overlapped regenerated Next types and failed on missing generated
  files. Repeated full check after generation passed without weakening types or
  lint: .tmp/task284-frontend-check-final.log. Build log:
  .tmp/task284-frontend-build.log.
