# ADR-0682: Bounded standby media and startup cover

Date: 2026-11-08
Status: Accepted for implementation; production validation pending

## Evidence

The supplied iPhone directory report (0.1.792) contains 21 selections. Sixteen
already had readyState 4, with playing in 9-80 ms. Cold starts reached 1.70 s and
1.61 s. The recording contains a central black interval of about 1.03 s.
Observed-frame callback latency is not a measure of black-screen duration.
Native HLS segment timings are unavailable; no network/decode attribution is made.

## Decision

- Preserve directory players and their existing 300px source activation window.
  Request auto preload for the current and next slide; other slides retain metadata.
- Add an incoming-poster overlay until decoded current-frame data is available.
  It must reset on source/element changes and never reuse the previous item's image.
- Content reels retain a bounded pool of two media elements: one active, one paused
  standby. Promote the same prepared element without resetting its source.
- Start standby only after the active source emits playing. Bind next-source
  preparation to its owning current source to avoid overwriting the standby while
  React is changing active slide. Skip preparation for save-data/2g when exposed.
- Standby receives no analytics owner or slide callbacks and cannot autoplay.
  Detach old ownership before resetting time/source. Preserve sound preference,
  manual pause, modal guards, captions, seek and late-event protections.
- If standby metadata, native media or the HLS adapter failed, retry once when
  its slot becomes active. Healthy buffers are never reattached for activation;
  repeated active renders must not create a retry loop.
- hls.js standby buffer targets 3 seconds (maximum target 6); activation restores
  30/60 without recreating the adapter. Native Safari chooses its own buffering;
  preload is a hint, not a byte or duration guarantee.

## Trade-offs and rollout

One extra paused decoder/cache can reduce startup but consumes memory and bandwidth.
Do not migrate the directory to one shared element yet: measured readiness already
works well, and replacing it without equivalent standby can regress startup.
No API, database, cloud encoding or environment changes. Frontend-only rollout.
Diagnostics remain opt-in and local, allowing comparison with the supplied baseline.
User explicitly approved a real production test; validate locally and required CI
before promotion. Physical iPhone and weak-network results remain post-deploy gates
for declaring a performance improvement, not assumptions of success.

Rollback: promote the previous frontend deployment. Backend/admin/video unchanged.
Do not alter automatic deployment or domain-assignment settings.

## Local validation dependency

The user authorized a temporary PostgreSQL instance to resolve unavailable local
database dependencies in existing route tests. Use the pinned portable binary
package @embedded-postgres/windows-x64@18.6.0-beta.19 in an ignored .tmp directory,
not as an application dependency. Bind only loopback on a dedicated test port,
use a new empty database and existing migrations, and stop it after validation.
Do not copy production data, install a persistent service or modify published
database configuration. Test runtime is Node 24.22.1, scoped to this session.
