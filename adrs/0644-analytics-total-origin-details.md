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

## TASK-281 refinement
Unselected counters are transparent on the shared white surface. Keep the short
video counter label to preserve compact sizing. Video origins follow a stable
Explorar / Minha Busca / Perfil order; other metric origins retain volume order.
Remove repeated Origem headings but retain semantic table headers. Use metric-specific
Visualizacoes and Acessos columns; preserve Total for favorites and Cliques for WhatsApp.
Date and total are adjacent in the tooltip heading, separated by a bullet,
wrapping only when necessary.
Lower section period labels have a 0.25rem gap. All changes are presentation-only.

## TASK-283 content breakdown and retention refinement

Render community content origins as full-width rows with a color dot, label and
count (share of total clicks). Sort a derived array by descending count, then
canonical category order for ties; keep zero rows. Use the same derived order
for donut segments, preserving selection and colors by category ID.
Percentages use pt-BR formatting with up to one decimal; zero totals show 0%,
and positive shares under 0.1% show <0,1% rather than suggesting zero activity.
Rounded percentages may not sum to exactly 100%; counts and segment shares
remain unchanged. Palette tokens are categorical, not success/warning signals,
and have light/dark variants.

The retention outer tinted panel, inner white panel, player/empty placeholder
and dropoff notice reuse the enclosing card radius. This is local presentation
consistency, without changing the shared video player or any metrics/controls.

## TASK-284 typography and selected icon

Content legend text inherits text-sm from the list, matching profile rows.
Applying the size directly to buttons is ineffective because the unlayered
global form-control reset uses font: inherit. Keep the correction local.
Counter titles use text-base/leading-5 because they also name the chart.
Preserve the icon slot dimensions, but remove its fill when selected and use
primary foreground for the glyph. Inactive icons retain their soft circle.
No changes to counters, sorting, percentages or any API contract.
