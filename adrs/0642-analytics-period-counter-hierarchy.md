# ADR-0642 - Analytics period and counter hierarchy

Date: 2026-10-27
Status: Accepted

## Decision

Reuse the existing SelectController and form foundation for a neutral, full-width
period selector. The selected metric, rather than the period, receives the blue
fill. Preserve counter widths and the comparison action at bottom-right; increase
height, title and number sizing without changing analytics calculations.

Keep the existing custom-period modal and validation. Selecting Custom opens a draft;
only Apply changes the range. The applied dates remain in the selector, and selecting
Custom again allows editing. Escape/close restores focus to the period trigger.

Omit the Favorites origin from the Favoritado presentation only. Users cannot add a
favorite from that surface. Do not modify stored events, API contracts, aggregate
counter values or Favorites origins for other metrics. This is a presentation filter,
not a historical attribution rewrite.

## Consequences

No new package, endpoint or migration. The comparison action remains separate from
the metric button to avoid nested interactive controls. A neutral surface behind the
selected card's comparison preserves its existing positive/negative colors.

Verification uses the local real API/database with temporary records and cleanup;
screenshots can be shared in a standalone read-only gallery without exposing sessions.
