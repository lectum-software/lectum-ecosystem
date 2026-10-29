# TASK-288 - Feed audio recovery and contact icon refinement

Status: Implemented locally; iOS confirmation pending. 2026-10-29.
Depends on TASK-286 and TASK-287. Decision: ADR-0653.

## Scope

Preserve the explicit document-level audio choice across feed videos. A browser
autoplay denial must not permanently pin one video to mute. Keep browser policy,
manual pauses, document attention and modal suspension protections. No change to
the reverted reels/directory action sizes, backend, database or production.

Reduce only the compact over-video WhatsApp icon from 17px to 15px. Preserve
position, pill padding, label and touch target. White border is read-only preview
only: `.tmp/whatsapp-white-border-readonly.html`. Prototype inventory consulted;
Builder unavailable; current approved local preview and user screenshot are the
visual references. No new dependencies or permanent fixtures.

## Acceptance

- [x] Regression test reproduces sticky mute on returning to a previously denied video.
- [x] A new activation retries the explicit preference; the same activation does
  not repeatedly retry a browser denial through metadata/canplay/volume events.
- [x] Explicit unmute calls play within the gesture for the active eligible video;
  manual pauses stay paused and stale pause events do not change user intent.
- [x] The compact contact icon is 15px, without changing other WhatsApp controls.
- [x] Read-only border preview rendered and checked at 390px.
- [x] Local browser verification, repository guards, full frontend checks and build.
- [ ] Target iOS Safari confirmation before publication.

## Release

Local 0.1.743, single synchronized version bump. No push, merge or deployment.
Browser autoplay policies may still
require an explicit sound gesture per media element; never promise to bypass them.

## Evidence and limitations

- Before the fix, the regression failed with the previously blocked video still
  muted on re-entry. Seven autoplay tests and 43 controls tests pass after the fix.
- `.tmp/task288-frontend-check.log`: complete frontend check exit 0, including
  lint, types and 82 mounted content-video tests with no skips in that final suite.
- `.tmp/task288-build.log`: frontend production build exit 0, low-disk cache mode.
- `.tmp/task288-audio-browser.cjs`: Chromium 393x852 with real local media/API;
  initial mute, explicit sound without opening reels, four transitions including
  return, and one active player pass. No new database fixtures were created.
- Root check passed guards through import cycles, then was interrupted during
  frontend lint when the disk filled. Full frontend check was rerun successfully;
  ADR/task/source-size guards were rerun after documentation changes. The other
  unchanged applications were not rechecked in this task.
- Generated inactive builds and browser caches were cleared, without touching
  cookies, credentials, user media or project sources. An empty temporary QA
  script from the full disk was restored. An initial browser transition timeout
  during that period was followed by a successful complete rerun.
- Actual iOS Safari remains untested. Autoplay fallback still respects browser
  policy: https://webkit.org/blog/6784/new-video-policies-for-ios/.
