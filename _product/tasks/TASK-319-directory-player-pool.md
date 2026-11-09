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
