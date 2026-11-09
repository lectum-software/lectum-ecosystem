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

Baseline frontend is 0.1.793, deployment dpl_5sK9Tz7qWgn84VnrVi12aNZ5wvSH.
Rollback by promoting that frontend deployment; no data rollback is required.
