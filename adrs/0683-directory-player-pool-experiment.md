# ADR-0683: Opt-in directory player pool

Date: 2026-11-09
Status: Accepted for opt-in production test; physical-device comparison pending

## Decision

Keep the current directory architecture as the default. The query parameter
`directoryPlayer=pooled` enables two reusable VerticalVideoPlayer instances:
one foreground and one paused standby. Stable portal hosts relocate the existing
players into slide slots, preserving the same controls, captions and layout.

Prepare the next source only after foreground playback starts; skip preparation
when save-data or a 2g connection is exposed. Promote an existing prepared source
without replacing its media element. On a cold skip, preserve the previous
foreground until the incoming player begins playback. Standby has no analytics
owner or directory selector and cannot play. Flush the outgoing owner on change.

Reuse the existing adaptive source hook and its bounded standby buffers. Native
Safari controls its own preload behavior; this is not a guarantee of buffering.
Retry a failed preparation once on promotion. Default visible-mode playback
remains unchanged for all other VerticalVideoPlayer consumers.

## Acceptance

- [x] Pure allocation tests cover startup, promotion, cold skips, backward travel,
  duplicate next entries and empty results.
- [x] Full frontend checks and production build pass.
- [x] Browser verification confirms at most two players, one audible source,
  preserved controls, captions, analytics and empty/filter behavior.
- [ ] Compare both modes on the same physical iPhone and network before adopting
  pooled mode as the default or claiming a measurable performance improvement.

No new dependency, environment setting, API, database or cloud change.
Builder is unavailable; preserve the existing UI.

## Controlled rollout

On 2026-11-09 the user authorized a real production test and reconfirmed disabled
Backend/Video autodeploys and disabled frontend/admin automatic domain assignment.
Deploy frontend only, with `directoryPlayer=pooled` required. Default remains the
individual-player model. Preserve both test flags when applying directory filters.
No claims of iPhone performance improvement before comparing measurements.

## iPhone follow-up

The 0.1.794 report confirmed two reused media elements, but the recording showed
black flashes. Warm first-observed-frame median was 672 ms versus 408.5 ms in the
previous report; separate sessions do not establish causation. The directory
layout effect reinserted hosts on every render, unlike the reels' change-scoped
placement. Placement is now idempotent: append only when the actual parent differs.
Keep reconciliation on each commit to handle callback-ref slot replacements, but
never mutate an already correct host location. Preserve the existing standby,
analytics and controls behavior. Physical iPhone retest is still required before
claiming this resolves the flashes or enabling the experiment by default.

Baseline frontend is 0.1.793, deployment dpl_5sK9Tz7qWgn84VnrVi12aNZ5wvSH.
Rollback by promoting that frontend deployment; no data rollback is required.

## Shared reels engine (0.1.796)

The user requested reuse of the working reels implementation, not another pool
with similar behavior. Extract the reels provider and player into
`components/ui/persistent-feed-video-player.tsx`; keep the community entry point
as compatibility re-exports. Both surfaces now consume this implementation and
the same source allocation policy. The shared placement effect is change-scoped
and parent-identity guarded, superseding the directory-only reconciliation above.

The directory adapter owns only page integration: active selection, controls,
caption preference, progress and analytics. It hands off the active media element
and requests playback on readiness; standby media remain paused and muted.
An overlay context exposes media/captions without duplicating the media lifecycle.

Keep the opt-in query flag and the individual-player default. No deployment is
part of this change. Shared code does not establish equal iPhone performance;
a physical-device retest remains necessary.

## Presentation-gated cover (0.1.797)

The 0.1.796 iPhone recording still shows blank transitions. Fourteen of fifteen
incoming players were already ready at selection. Available first-frame samples
improved from a 672 ms median to 444 ms, but separate sessions do not establish
causation, and two transitions lack a frame sample.

Keep the shared startup cover while parked. Pass active ownership and its revision
from the common player into the cover, and wait for a new requestVideoFrameCallback
after activation rather than treating loadeddata or playing as presentation.
Cancel pending callbacks on source reset, ownership change and unmount; reject
already queued callbacks from previous generations. Without this browser API,
fall back to active playback plus two animation frames, not readiness alone.

No layout, source-loading, buffer, API or deployment changes. A real iPhone retest
is required before claiming the recorded flashes are resolved.

## Incoming slot posters and recovery (0.1.798)

The 0.1.797 iPhone recording still showed a black incoming slot during a scroll
and a static image while captions advanced. Sharing the media engine alone did
not establish equivalent presentation on both surfaces.

Keep a thumbnail in each shared slot, using the disabled playback-query observer
to reuse metadata fetched by active/standby playback. This adds no media players
or metadata requests for distant slides. The directory forwards its custom poster
as a fallback instead of owning a separate poster implementation.

A fresh frame callback remains the preferred cover-release signal. If the browser
does not deliver it, visible unpaused playback must advance at least 120 ms without
a seek before a two-paint fallback releases the cover. Readiness, elapsed wall time,
and seeks alone never release it. Cleanup invalidates both callback paths.
This fallback is evidence of playback progress, not proof of physical presentation;
the new Safari recording remains the final acceptance gate. No publication in this
change, no API/DB contract or new dependency.

## Single activation owner and advancing frames

The 0.1.798 recording improved the static-image case but still has a black interval
after a visible incoming poster. The directory retained its legacy analytics effect
that paused/reset/played all background videos, including the shared player's active
element. Reels has no equivalent second controller. Exclude pooled mode from those
media mutations while retaining progress/analytics state resets. The directory
adapter applies user pause, seek, volume and rate to its owned element only.

The common cover also accepted callbacks for paused prepared frames. Require an
unpaused, non-seeking advancing frame timestamp (`metadata.mediaTime`), not merely
an advancing playback clock, and two paints for that callback path;
invalidate pending callbacks on pause/seek. This closes a reproducible lifecycle
gap without increasing a timer. It does not establish that Safari will never show
a compositor gap: physical iPhone acceptance is still required. Individual mode,
the two-player limit and source/buffer preparation policy are unchanged.
