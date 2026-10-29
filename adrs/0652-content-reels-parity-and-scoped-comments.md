# ADR-0652 - Content reels parity and descendant-scoped comments

Status: Accepted; implemented locally, pending final visual approval.
Date: 2026-10-29. TASK-287. Local-only authorization.

## Context

The user requested content reels to follow the psychologists directory, including
desktop layout and actual vertical scrolling, while retaining the approved
reading overlays and the existing discussion tree/composer.

Sources are the user's screenshots, `.tmp/content-reels-readonly.html`, directory
components/hooks under `frontend/src/app/app/psychologists/`, and the existing
post components. Builder/Quick Copy is unavailable; prototype inventory and these
references are the active fallback.

## Decision

- Expanded content reels use cover-fit, preserving aspect ratio and cropping
  edges as needed. This supersedes ADR-0650's contain-fit only for this viewer.
  Inline videos and presentation playback are unchanged.
- Native overflow/scroll snap owns movement. The nearest page owns playback;
  inactive pages are inert and cannot play. Preserve queue/cursor/recovery rules.
- Reuse directory dimensions and text metrics. At desktop widths >=1024px,
  use its bounded proportional frame, rounded clipping, fixed outside actions
  and arrow navigation. Keep a full-width scroll surface and final-page spacer.
- Separate the thin progress rail from its accessible hit area. Track the primary
  pointer through seeking; secondary touches cannot finish its gesture. Preserve
  keyboard interaction and prior paused/playing state. Explicit sound choices
  use Lectum's shared document-level preference, not a separate reels setting.
- Caption expands upward; parent context expands downward. Gradients cover the
  stage instead of bounded opaque cards. Hidden-scrollbar text fades according
  to actual remaining overflow. Keep identity, collapse and discussion link
  readable. Reading pauses playback, including delayed media callbacks.
- Comments render only descendants of the current video node, including all
  nested levels. Exclude the video, ancestors and siblings. Original videos show
  post replies; video replies show their own subtree.
- Default composition targets the current video; explicit replies target the
  selected descendant. Reuse the real tree, composer, permissions and mutations.
  The displayed direct `replies_count` matches the rail without truncating depth.

## Consequences

Cover-fit intentionally crops, never stretches. Gesture ownership distinguishes
feed navigation, text/comment scrolling and seeking. Late media events require
active/panel/seek guards. Desktop clipping must not clip the external controls.

Comment scoping is based on node ancestry, not a fixed nesting depth or the
visually expanded branch. Empty descendants are valid and still allow composing
a reply to the video. Full-post behavior and professional video permissions remain.

No migration, dependency, API contract or deployment configuration change.
ADR-0650's other authorization, queue and cursor-store decisions remain in force.

## Validation and release

TASK-287 records the exact logs, verified acceptance and device limitations.
Root checks pass with 13 Video tests skipped. Full frontend checks, 82 focused
tests without skips, and the final build pass. Real Chromium/local API tests
cover seven viewport sizes, native scrolling, desktop controls/audio, reading
overlays, pointer cancellation and descendant-only comments with real mutations.
Temporary fixture cleanup is verified. No permanent mocks or production data
were used. Rate limits and local-only API guards were not weakened for QA.

Candidate 0.1.742 was bumped once. The implementation is for a dedicated local
homolog commit; visual approval remains required before a separately authorized
publication. No push, PR/merge or deploy. Preserve unrelated billing work.
