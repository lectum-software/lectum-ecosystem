# TASK-287 - Content reels parity and scoped comments

Status: Implemented locally; final visual approval pending. 2026-10-29.
Depends on TASK-285 and TASK-286. Decision: ADR-0652.

## Sources and boundaries

- Latest user screenshots/decisions override the previous expanded contain-fit
  choice. Inline videos and presentation videos remain unchanged.
- Approved reading reference: `.tmp/content-reels-readonly.html`.
- Directory source: `frontend/src/app/app/psychologists/view/components/` and
  its navigation/progress hooks and `modules/viewport.ts`.
- Real post tree/composer remain the source for comments, typography and actions.
- Prototype inventory consulted; Builder/Quick Copy unavailable. No permanent
  fixtures, new dependencies, schema migrations or deployment changes.
- Preserve unrelated SendNF/billing work and prior post-release notes.

## Implementation

Expanded reels use cover-fit without stretching. Native vertical overflow and
scroll snap move the actual video between pages; only the selected slide plays.
Queue order, pagination and recovery remain unchanged. A thin progress track
has a separate accessible hit area and supports mouse, touch and keyboard.
Pointer ownership prevents secondary touches from ending another pointer's seek.

At 1024px and above, frame dimensions, rounded clipping, outside action rail and
navigation arrows follow the directory. The rail remains fixed while videos
move; an end spacer lets the last short desktop page snap completely. Explicit
audio preference uses the existing shared document-level preference.

Caption opens upward and parent context downward over full-stage transparent
gradients. Text scrolls without visible scrollbars, fading only when more remains.
Reading pauses playback, including late metadata/play events. Collapse stays
beside the author; parent context retains its discussion link.

The comments sheet excludes the current video, ancestors and siblings. It reuses
the real tree at every descendant depth. Default composition targets the video;
explicit nested replies target the selected descendant. The header uses direct
`replies_count`, matching the side rail, without flattening the rendered tree.

## Acceptance

- [x] Cover-fit fills the expanded stage; inline/player behavior is not changed.
- [x] Mobile and desktop progress geometry, mouse/touch/keyboard seeking pass.
- [x] Caption/parent overlays use directional full-stage gradients, readable
  identity/footer, hidden scrollbars and adaptive overflow fade.
- [x] Native touch and desktop wheel movement expose intermediate positions;
  arrows, last-page snap and fixed desktop actions pass browser checks.
- [x] Only active media plays; reading/seek guards and explicit audio persistence
  pass, including late media events and multi-touch cancellation.
- [x] Original and nested videos show only their descendants, including no replies.
- [x] Default/nested submissions and UI deletion update the proper tree/count.
- [x] Modal and inline tree/composer computed typography match in real browser QA.
- [x] Root baseline, full frontend checks, focused tests and final build pass.
- [x] Direct rendered directory/reels comparison passes at both desktop sizes.
- [ ] User's final visual approval on the target device before publication.

## Evidence

- `.tmp/task287-root-check.log`: root check exit 0; Video suite has 13 skips.
- `.tmp/task287-desktop-check.log`: full frontend check exit 0; 82 focused
  content tests pass, no skips. Fourteen layout/source guards also pass.
- `.tmp/task287-verified-build.log`: final build exit 0 after the touch-cancel fix.
  Existing `LECTUM_LOW_DISK_MODE=1` avoids cache growth; no configuration change.
- `.tmp/task287-directory-comparison.log`: actual directory and reels match at
  1440x1000 (506x900 frame) and 1024x768 (385.875x686 frame), with 10px top inset,
  22px radius and Manrope 18px/700/22px author typography. Native wheel, fixed
  actions and audio pass again. Fixture cleanup and pending requests are zero.
- `.tmp/task287-desktop-browser.log`: base checks at 320x844, 390x844, 430x932,
  1440x1000, 1024x768, 844x390 and 932x430; five reading-overlay viewports,
  native touch scrolling and late-playback regression checks pass.
- `.tmp/task287-desktop-final-retest.log`: both desktop sizes pass wheel/arrows,
  fixed rail, last snap and audio persistence; two-finger cancellation and scoped
  comment submission/deletion pass. Temporary fixture cleanup reports `0 0`.
- Initial mouse-seek and cancelled-touch findings were fixed. The deletion test
  was corrected to verify the existing soft-delete contract. Desktop wheel QA
  uses a continuous native gesture instead of separate small gestures that snap
  back. API rate limiting was respected and never disabled for tests.
- Browser checks use Chromium with real local media/API and temporary isolated
  database fixtures. Actual iOS Safari and separate non-9:16 source files have
  not been tested; viewport aspect ratios were varied. Local analytics requests
  can return pre-existing 500 responses; no production analytics claim is made.

## Release

Candidate 0.1.742 has received its single synchronized version bump. A dedicated
local homolog commit records this implementation after validation; no repeat bump.
No push, PR/merge or deploy is authorized for this task. Production is unchanged.
Future publication requires visual approval and `LOCAL-TO-PRODUCTION.md` gates.
