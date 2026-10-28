# ADR-0644 - Total curve with origin details

Date: 2026-10-28. Status: accepted.

## Decision
Sum the aligned origin observations for the daily chart. Preserve action counts,
not unique-person sums. Keep the API origin series and per-period totals unchanged.
Show origin contributions in the point tooltip and period totals in a table.
Only WhatsApp exposes the People view, with its existing total/unique/average aggregates.
Unknown origins remain when nonzero. The Favorites surface remains excluded only for Favoritado.

Use bounded monotone cubic tangents in the existing SVG renderer, with controls inside
adjacent observations. This preserves real extrema and avoids negative artificial counts.
Use a unique SVG gradient id, 22% blue fading to transparent. Keyboard/scrubbing retained.

Counters belong inside the chart surface and provide its accessible label. Mobile widths
show one card plus a portion of the next; desktop still shows multiple counters.
Retain the current rolling 365d API for Last 12 months; no backend breaking changes.
Legacy year/all values remain accepted by API but are not offered in this menu.

## Consequences
No dependency, migration or env changes. Frontend-only rollback. Local screenshots
for a read-only gallery come from a real isolated database fixture, removed after QA.
