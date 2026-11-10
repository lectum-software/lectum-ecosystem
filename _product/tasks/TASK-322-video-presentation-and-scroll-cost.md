# TASK-322 - Video presentation and scroll cost

## Scope

Follow-up to the iPhone recording of 2026-11-10 at 13.04.22 (102.75s).
User reports improvement but pauses near snap completion and audio before image.
No device trace was provided, so do not claim proven Safari/compositor causality.

The shared cover could disappear after 120ms of media clock advancement even
without a new frame callback. A regression test reproduces this with no new
displayed frames. The shared scroll controller measured every slide on each
event (1000 layout reads in the regression test).

- [x] Require a new non-dropped frame for the missing-callback fallback.
- [x] Preserve stale callback, seek, pause and activation guards.
- [x] Use ordered binary search for nearest slide, preserving native snap.
- [x] Validate mounted browser tests, frontend check/build and real media.
- [ ] Physical iPhone acceptance; not available on this computer.

Shared by reels and directory; immersive controls unchanged. No dependencies,
environment, database or backend changes. No publication in this task.
Decision: ADR-0686.

## Validation (local 0.1.804)

- Before correction, both new regressions failed: cover removed on clock-only
  advancement and 1000 slide rectangle reads per event.
- After correction, all 38 mounted browser tests passed. Dropped-only frames
  cannot release the cover; a new non-dropped frame can recover missing callbacks.
- Frontend check/build and version/task/ADR guards passed.
- Real-media local navigation: 71 positions at 390px and 71 at 1440px,
  the same two video identities, at most three full slides, no page errors;
  waited for both playback and startup-cover removal on every position.
- Immersive pause/resume, late readiness, sound, seek, exit and transitions passed.
  Real reels playback and next-video transition passed.
- First local route compiled cold after build restarted the dev server; tests
  waited for the route and then completed. No production deployment performed.
- Physical Safari presentation/snap behavior is still unverified; the recording
  alone cannot isolate network, decode, compositor and gesture timing.
