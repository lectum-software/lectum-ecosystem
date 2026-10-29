# TASK-289 - Reels sound continuity and action spacing

Status: Validated locally; production publication authorized. 2026-10-29.
Depends on TASK-287 and TASK-288. Decision: ADR-0654.

## Scope

Reels must honor explicit sound preference when entered from the feed and when
moving between slides, while respecting browser autoplay policy. Keep Favorite
beside the author's complete name; allow the name to wrap inside its own flex
item. Equalize visible gaps between icon/text groups without enlarging icons.
Prototype inventory consulted; Builder unavailable. Current user screenshots
and existing directory/reels UI are the visual references.

Approved upvote revision: count only in both states; selected arrow has a stronger
stroke and selected count is bold blue. Keep accessible naming, without a tooltip.
Upvote background was rejected. WhatsApp expansion is now approved: icon first,
label after three seconds of visible playback, once per mounted video, retaining
contact access and reduced-motion support. Mandatory following remains discussion.
Preview refinement: normal-weight contact label and 800 ms ease-in-out expansion;
the three-second watched threshold is unchanged. Browser computed styles verified
font-weight 400 and transition-duration 0.8s; all 58 focused tests still pass.
The overlay WhatsApp SVG has a padded viewBox and visible overflow to protect its
antialiased edge at fractional display scales, retaining the 15px icon box.
All green contact actions use the user's preferred favorites green (#16a34a), including
directory, profile, reels, favorites, mentor contact and redirect fallback. Neutral
actions and availability/success indicators retain their existing visual roles.
No database, API contract or new runtime dependency.

## Acceptance

- [x] Reels honor the existing explicit audio choice and recover without changing intent.
- [x] Favorite stays beside long names, including at 320px.
- [x] Visible action gaps are equal for labeled and unlabeled actions.
- [x] Existing icon sizes and mobile touch targets are preserved.
- [x] Upvote uses only the count in both states; selected styling is stronger, without tooltip.
- [x] Feed WhatsApp expands after three watched seconds, excluding pauses, hidden media and seeking.
- [x] Contact icon moves left with expansion, stays before the label, and preserves the right anchor.
- [x] Focused audio/layout regression tests and full frontend check.
- [x] Local browser verification and frontend production build.

## Evidence

Release 0.1.744: full frontend check and production build passed with the existing
LECTUM_LOW_DISK_MODE=1 option. The 84 content-video tests and 19 additional mounted
audio/contact-color tests passed. One unrelated source-map symlink test is skipped
by the Windows environment. Repository version, encoding, ADR/task, source-safety,
size and cycle checks passed. Test-only monotonic clock substitution is explicitly
recognized by the existing clock-control exception, without relaxing runtime rules.
User reconfirmed Vercel frontend/Admin Don't build anything and all Dokploy
autodeploys disabled. Only frontend is to be deployed; production preflight:
frontend 0.1.743, backend 0.1.740, health/ready HTTP 200. No API/database changes.
Browser access to Vercel is unavailable and no CLI/API authentication is configured;
the final manual frontend redeploy may require the user's action after PR integration.

Contact-color regression: 11 token/surface tests pass in addition to the 58
feed/control tests. Browser checks confirm #16a34a in light and dark modes.
The overlay SVG was inspected at 100%, 125%, 150% and 200% display scales with
visible overflow and a 0.676 viewBox-unit right margin. Biome, source-size and
diff-whitespace checks pass. The standalone read-only preview was regenerated.

WhatsApp revision: 58 focused feed/control tests passed with no skips. TypeScript,
targeted ESLint/Biome and source-size checks passed. Browser validation used the
real CTA markup, compiled app styles, production observer and real local video:
pause time excluded; reveal at 3057 ms watched; button height stayed 44px; right
edge stayed at 374px while icon moved from 349.5px to 231.2px. Reduced-motion
transition removal and 320px containment passed. No contact was sent or opened.

The approved count-only upvote revision passed 33 focused audio, layout and vote
tests (no skips), including selected/unselected count weight at four widths.
Targeted Biome and ESLint passed. The earlier low-disk build blocker was resolved
by authorized cache cleanup; release preparation uses version 0.1.744.

Layout geometry tested in Chromium at 320, 390, 430 and 1440px. Actual iOS Safari
is not available here; hardware audio behavior remains a required user check.
Local validation reuses the isolated TASK-287 community and real local media.
No local test media or test data are included in the release. Publication was
explicitly authorized by the user, restricted to frontend.

The compiled server responds with version 0.1.744. Its existing public-asset
security policy rejects localhost API URLs in production mode; end-to-end local
video checks therefore use the development server and isolated local database.
No production security policy was relaxed to make the local smoke pass.
