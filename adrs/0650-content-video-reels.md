# ADR-0650 - Content video reels and useful-only voting

Status: accepted; locally validated, production release pending

## Decision

Reuse the adaptive video player, interaction mutations, contact tracking and post
comment components. A paginated additive endpoint exposes published discussion
videos including deep replies, using the existing professional verification policy.
Feed queues finish each discussion before following feed order. Profile queues
contain only that professional's publications. Keep the origin page mounted.

Freeze each discussion's eligible video IDs in a bounded, opaque-cursor snapshot
when pagination begins. Later requests recheck visibility, media eligibility and
current interaction values but do not recalculate the queue order after votes.
Snapshots contain IDs only, expire after 30 minutes and are limited to 500 queues
and 100,000 IDs per backend process. A lost/expired cursor returns 410 explicitly;
the client must offer recovery without appending a restarted queue to old items.
This process-local store requires a single backend instance or sticky routing;
use a shared snapshot store before horizontally scaling this endpoint.

After closing comments, wait for in-flight interactions and refresh the canonical
post/reply before re-enabling vote/save. Apply that result to the queue so revisits
and explicit undo operate on the latest committed state.

Remove negative vote actions and reject new negative votes server-side. Preserve
historical records but exclude them from relevance and mentor scores. Keep upvote
undo and moderation unchanged. No database migration required.

## Consequences

Deploy the backend before frontend promotion. Keep video uncropped and undistorted
with black spare space, safe controls and paused reading overlays. Errors must be
visible/retryable, not silently skip discussions. TASK-285.

## Validation

Backend and frontend production builds passed. Real API/database browser smoke
passed all 12 scenarios across four entry points plus visitor access, including
native nested comments, contact placement, contain fit and interaction recovery.
Frontend checks and backend focused/integration tests passed. Final repository-wide
checks passed for all four applications and guards. Reviewed PR, normal publication
hooks and production smoke remain release gates in TASK-285.

The user's production Dokploy screenshot confirms Replicas = 1. No infrastructure
setting was changed. A future replica increase requires the snapshot-storage
decision above. Local browser QA uses development frontend mode because production
origin/CSP guards intentionally reject localhost APIs; those guards are unchanged.

## Content author experience (2026-10-30)

Content-video and community/post feed authors expose optional `formation_years`
and `show_experience_tag`. Existing author selections fetch the CRP registration
date, visibility preference and entitlement timestamps in bulk; no profile query
per reel is added. The initial/focused item uses the same content-video serializer.

Only active, nondeleted psychologists with a published presentation profile and
verified professional entitlement can expose experience. Reuse the directory's
visibility resolver: a free-profile default before entitlement can become visible,
while an explicit opt-out after entitlement stays hidden. Missing visibility
evidence fails closed. Hidden/ineligible authors return null years, so other API
consumers cannot recover hidden experience from this new metadata. Registration
dates and entitlement timestamps stay internal.

The reel keeps `type_label` (including gender and patient labels), appending the
existing singular/plural experience formatter only for an explicitly enabled flag
and positive integer years. Old backend responses retain the base label without
inventing zero years. No CSS, schema, dependency or configuration change is needed.
Backend deployment is required to supply the fields; frontend may deploy first
with the safe base-label fallback. Rollback either application independently.
