# TASK-321 - Bounded directory playback by default

## Evidence and scope

User reported progressive stutter after many directory videos and supplied
WhatsApp Video 2026-11-10 at 00.45.30.mp4 (206.64 seconds). Sampled frames show
repeated pauses later in the recording. No device memory trace was supplied;
do not claim proof of Safari memory exhaustion from the recording alone.

Production 0.1.802 normal access still used individual playback. Read-only
browser measurement found 20 video elements (2 with a current source), versus
2 elements in pooled mode. Individual mode renders every full slide; loops and
pagination can add more. The shared reels provider bounds players to two and
full slides to the selected index and neighbors. Pausing offscreen media alone
does not remove those players and component subscriptions.

- [x] Use the existing reels provider by default, including the server snapshot.
- [x] Preserve immersive controls, caption defaults and reels tap-to-pause.
- [x] Preserve explicit directoryPlayer=individual through filter navigation.
- [x] Validate long forward/reverse navigation with real media at mobile/desktop sizes.
- [x] Validate focused tests, frontend check/build and existing reels/control checks.
- [ ] Physical iPhone acceptance after a separately authorized production release.

No new playback engine, dependencies, environment or migrations. No deployment
requested in this turn. Prior TASK-319 default deferral is superseded for local
implementation only by the user's request to diagnose and correct this report.
The previously documented brief startup flash is not claimed fixed here.

Decision: ADR-0685. Rollback: explicit individual mode or previous frontend.

## Local validation

- Ten focused policy/ownership tests passed; frontend check and build passed.
- Real media immersive pause/resume, seek, sound, exit, ended advancement and
  reverse navigation passed. Reels real playback passed without page errors.
- Default-mode search/filter passed without directoryPlayer in the URL; three
  active analytics owners and three intercepted reports, no standby reports.
- Rapid 71-position traversal passed at 390px and 1440px. A subsequent playback
  run was invalidated by the concurrent build removing the Next dev cache and
  restarting the server (recorded in task321-dev-error.log). Rerun only after
  both check/build completed; do not interpret that empty page as media failure.
- Playback soak at both 390px and 1440px completed 71 positions each (forward and reverse), waiting
  for playback on each: maximum two video elements, exactly two identities
  reused, at most three full slide components, at most one playing, standby
  paused/muted. Immersive CC remained usable at the end; no page errors.
- The anonymous signup invitation was dismissed with its normal Continue
  exploring action before the final interaction (not removed from the DOM).
