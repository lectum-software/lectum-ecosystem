# TASK-319: Directory player pool experiment

Date: 2026-11-09
Status: In Progress
Decision: ADR-0683

## Scope

User approved comparing an active player plus one prepared player against the
existing directory model. User subsequently authorized an opt-in production test;
no default rollout in this batch.
Reuse the existing presentation UI, captions, controls and playback hooks.

## Acceptance

- [x] URL `directoryPlayer=pooled` enables the two-player model; default unchanged.
- [x] Pure allocation tests cover promotion, skips, reverse, empty and duplicates.
- [x] Final frontend check and build passed after the Strict Mode cleanup fix.
- [x] Local Chrome mobile smoke with real API/media responses: four consecutive
  videos playing, two elements, standby paused/muted, no page errors.
- [x] Browser mobile/desktop layout and navigation smoke after the cleanup change.
- [x] Immersive pause/resume and sound smoke: pause true, resume true, one audible
  player, two media elements and no page errors.
- [x] Filter and analytics-owner browser checks: three active owners, three reported
  owners, no standby reports; search preserves experiment flags and one result
  displays one player. All analytics requests blocked by the local read-only proxy.
- [ ] Physical iPhone comparison, including weak network, before performance claims.

The first smoke exposed an initial pause caused by effect cleanup during Strict
Mode replay. Cleanup now distinguishes disconnected hosts from replay, and owner
changes flush/pause the outgoing video separately. Repeated smoke passed.

Local API reads were fulfilled from actual remote responses to accommodate CORS;
all non-read requests were blocked. No synthetic directory data and no production
analytics writes were used. This is not an isolated backend test. No backend,
admin, video-service, database, environment or dependency changes.

The local preview is at http://localhost:3136/psicologos?directoryPlayer=pooled&videoDiagnostics=1.
A temporary loopback-only read proxy on port 3137 permits only directory, public
video metadata and public files GET/HEAD requests, without forwarding credentials.
All writes are rejected. This helper is ignored and not part of the application.
Publication authorized on 2026-11-09; global checks, build, PR and deployment tracked
below. Do not mark the device gate complete from Chrome.

## Release validation

- Version 0.1.794: full root check and final frontend production build passed.
- Backend tests used the temporary loopback PostgreSQL development database;
  production database and external side effects were not used.
- Final filter/analytics browser smoke passed with real read-only API responses.
- Reviewed scope: frontend opt-in only. Backend, Admin and Video are not deployed.
- Production deployment and rollback identifiers will be recorded in the PR.

## Follow-up: stable host placement (0.1.795)

The user supplied the 0.1.794 iPhone recording and report, then requested alignment
with reels placement. Reconcile slide destinations without appending hosts already
in the correct parent. This preserves callback-ref replacement handling while
removing DOM mutations during ordinary progress/control updates.

- [x] Regression contract protects the parent-identity guard.
- [x] Full frontend check passed.
- [x] Final frontend production build passed for 0.1.795.
- [x] Real-media read-only Chrome smoke at 390x844 and 1440x900: three active videos
  per viewport, at most two players, paused/muted standby, zero redundant host
  insertions and no page errors. Five necessary placements per viewport.
- [ ] Retest black flashes on physical iPhone after an authorized deployment.

This correction does not change the default model or deploy automatically.

## Follow-up: reuse the reels engine (0.1.796)

- [x] Extract the working reels player/provider into one shared UI implementation.
- [x] Replace the independent directory pool with an adapter to that implementation.
- [x] Preserve directory captions, immersive controls, progress and analytics.
- [x] Shared source-policy regression tests and full frontend check pass.
- [x] Real-media browser checks pass for reels opening and next-video playback.
- [x] Directory immersive pause/resume, audio, seeking, exit and transition pass.
- [x] Filter smoke preserves pooled mode; three active owners report metrics and
  standby reports none. Requests are intercepted, not written to production.
- [ ] Physical iPhone comparison after a separately authorized deployment.

The architecture is shared; page-specific actions and presentation stay separate.
No new dependencies, backend contracts, environment variables or production changes.

## Follow-up: presentation-gated cover (0.1.797)

- [x] Keep the cover during standby and require a fresh presented frame on promotion.
- [x] Reject queued callbacks from an older activation and reset on emptied/loadstart.
- [x] Provide a playback-gated fallback when frame callbacks are unavailable.
- [x] Update the browser harness to import the shared player rather than its old module.
- [x] Mounted browser regression tests cover readiness, promotion, stale callbacks,
  source reset and the fallback path.
- [ ] Retest recorded blank transitions on a physical iPhone after authorized release.

Released via PR #167 as 0.1.797. The subsequent iPhone test still showed a black
incoming slot and a prolonged static image while captions advanced; not accepted
as the default directory model.

## Follow-up: incoming posters and callback recovery (0.1.798)

- [x] Shared reel/directory slots subscribe to cached playback thumbnails even
  before activation, without enabling additional playback requests or players.
- [x] Forward the directory's optional custom cover as a fallback.
- [x] Recover a missing frame callback only after visible, unpaused, non-seeking
  playback advances, then wait two paints; reset progress on seek/source changes.
- [x] Browser regressions cover missing callbacks, seek rejection, stale callback
  cancellation and prepared slot posters (27 tests with real-media checks).
- [ ] Confirm visual behavior on a physical iPhone after authorized publication.

Released as 0.1.798 via PR #168. The subsequent iPhone recording showed Julia
moving again, but a roughly 0.4s black interval remained on Diana -> Rousel.
All eleven warm directory selections reported readyState 4. Physical acceptance
remains pending; the experiment must not become the default yet.

## Follow-up: activation ownership and prepared-frame rejection (0.1.799)

- [x] Compare directory activation with reels: the directory analytics effect was
  still resetting/playing shared elements in addition to the shared engine.
- [x] Keep legacy media control for individual mode only; pooled pause, volume,
  rate and resume belong to its current owner's adapter, as in reels.
- [x] Reject paused/non-advancing frame callbacks and invalidate queued callbacks
  on seek/pause before revealing the startup cover.
- [x] Full root check and final frontend production build passed. Browser coverage:
  27 playback tests with real media, six directory policy/ownership contracts,
  read-only mobile/desktop transitions, immersive pause/resume/audio and reels.
- [ ] Confirm the remaining black interval on a physical iPhone after authorization.

These are locally reproducible lifecycle defects, not proof of the exact Safari
compositor cause. Production and the default directory mode remain unchanged.

## Follow-up: shared reels controllers (0.1.800)

The 0.1.799 physical test found warm media on all sixteen directory transitions,
but did not establish visual equivalence with reels. The user requested reuse of
the working controllers, not further parallel tuning.

- [x] Extract the reels native scroll/selection/resize/lock controller and use it
  for the pooled directory; preserve directory filtering and circular pagination.
- [x] Extract the reels activation, sound preference and autoplay-denial policy;
  both surfaces consume the same hook rather than copies.
- [x] Share prepared-element handoff, metadata synchronization and startup scheduling.
- [x] Disable legacy directory attention/audio mutations for pooled playback.
- [x] Keep presentation controls, captions and owner-scoped analytics adapters.
- [x] Focused regression suite: 45 passed, including mounted real media and directory
  selection/lock/resize through the shared scroll controller.
- [x] Read-only real-media mobile/desktop transitions: at most two players,
  paused/muted standby, zero redundant placements, no page errors.
- [x] Repository guards and frontend check passed; complete backend/admin/video
  checks passed separately after correcting the isolated test database port.
- [x] Frontend production build passed. Immersive pause/resume/audio/seek/exit,
  reels transitions and directory search passed; three watched owners, three
  reported owners, zero standby reports. Browser checks used read-only access.
- [ ] Physical iPhone acceptance after separately authorized publication.

Default individual playback and all production services remain unchanged. This
unifies playback mechanisms; profile actions and content discussions remain
different product views. No claim of identical latency across media/network.

## Follow-up: one command path, distinct immersive UI (0.1.801)

- [x] Keep directory tap-to-immerse and its play/pause, audio and caption controls;
  reels retain tap-to-pause.
- [x] Move manual pause intent into the shared playback hook. Media pause events
  update display state but do not become a user request to block future readiness.
- [x] Route pooled directory resume, sound-enabled resume and long-press pause
  through the active owner's shared commands, including immersive buttons and
  resume after search. Search/filter eligibility blocks late readiness.
- [x] Route arrows and ended advancement through the shared scroll controller;
  restore the selected index through its existing external-index alignment.
- [x] Mount full directory slides only at the active index and its neighbors,
  retaining fixed-size snap shells for the remainder, as in reels.
- [x] Focused mounted playback/scroll and ownership contracts: 47 passed, no skips.
- [x] Real-media mobile/desktop transitions: six placements per viewport, no
  redundant placements or page errors. Immersive pause/resume, readiness after
  technical pause, audio, seek, exit, ended advancement and reverse navigation pass.
- [x] Filter reset and analytics: three active owners, three reported owners,
  zero standby reports; filtered feed retains pooled mode.
- [x] Frontend production build and type validation passed.
- [x] Complete repository-wide check; final frontend check repeated after search
  integration. Final build passed. Real filter test rejects late readiness behind
  the open panel and confirms playback after applying the search.
- [ ] Physical Safari acceptance after separately authorized publication.

No deployment or environment changes. Individual fallback stays unchanged.
Rollback: keep the individual mode or restore the previous frontend deployment.

## Deferred rollout decision (2026-11-09, iPhone test 0.1.801)

This supersedes the local-only status above: frontend 0.1.801 was published
through PR #170. Directory pooled playback remains opt-in through
`directoryPlayer=pooled`; backend, admin and video were not deployed.

Evidence analyzed on this date (download filenames may later be overwritten):
`C:/Users/tulio/Downloads/lectum-video-test (1).json` and
`C:/Users/tulio/Downloads/WhatsApp Video 2026-11-09 at 17.45.48.mp4`.

- Diagnostic confirmed 0.1.801, pooled mode, 17 directory selections, no dropped
  entries. All 16 subsequent selections had readyState 4, without waiting events
  during their transitions. Playing latency: 11-201 ms. First observed frame:
  194-745 ms, median 502 ms. Callback latency is NOT black-screen duration.
- Visual inspection confirmed black intervals at opening (about 0.23 s) and
  Custodio -> Alessandra (about 0.13 s near 55.43 s). Durations were measured
  in a central image crop, not every screen pixel.
- Shared startup cover fallback permits reveal after 120 ms of playback
  advancement plus two animation frames, even without a new frame callback.
  This could uncover video before Safari visibly presents it; causation is
  NOT proven. Reels use the same cover logic. Initial poster availability is
  another possible opening limitation, not a proven network/Cloudflare defect.
- Final focused playback/cover suite: 28 passed, zero skipped. This does not
  establish perfect visual behavior in physical Safari.

User requested recording these findings and deferring implementation to discuss
other adjustments. No further playback rewrite is requested now.

- [ ] Resume promotion of pooled playback to the directory default in a later
  authorized batch, accepting the documented brief visual limitation.
- [ ] Preserve directory tap-to-immerse and play/pause, volume and CC controls;
  preserve reels tap-to-pause and a usable individual-player rollback option.
- [ ] Validate default selection, explicit fallback, filters/navigation and reels;
  follow the reviewed PR/frontend-only publication workflow.
- [ ] Reconfirm publication authorization and provider triggers at that time.

Do not claim the flash is fixed or publish the default switch while implementing
unrelated adjustments. Normal directory access still uses individual playback;
the shared mode is available through the test URL. No production changes were
made during this final analysis or deferral.
