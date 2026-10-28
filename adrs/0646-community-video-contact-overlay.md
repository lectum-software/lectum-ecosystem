# ADR-0646 - Community video contact overlay

Status: Accepted locally, 2026-10-27.

## Context

The community contact footer adds height outside a portrait video. The user
wants a translucent white action over the lower part of the video, retained
when expanded and when playback controls hide.

## Decision

CommunityMediaBlock recognizes its existing CommunityWhatsAppCta footer for
portrait video and clones that same element with overVideo enabled. This keeps
all props, identity and tracking and covers every existing community surface
without rebuilding contact actions in callers. Other footer types are unchanged.

VerticalVideoPlayer accepts an optional bottomOverlay ReactNode inside its
shell. The existing expansion portal carries it into the expanded view.
Visibility does not depend on controls; bottom spacing does, reserving space
above visible controls and safe-area padding. Width is bounded on large screens.

Release preparation uses the existing media-foreground semantic token for the
white CTA. Bottom-overlay and minimal-controls rendering live in small player
components, preserving the existing controls and keeping the composition file
within the repository size limit.

The CTA uses the current redirect component with propagation stopped. No new
contact endpoint, permission bypass, analytics event or dependency is added.
Horizontal videos retain their external footer to avoid crowding short players.
Native OS fullscreen is not used by this community content expansion.

## Consequences

Video aspect ratio and contain behavior remain unchanged. The card becomes
shorter by the former footer height. White content on very bright video may
have lower contrast; the explicitly requested translucent white style is kept
for this visual trial, without adding a black panel.

Rollback is frontend-only. There are no migrations or environment changes.

## Visual trial refinement (2026-10-28)

Per user request, remove both fill and backdrop blur from the video contact,
including hover. Preserve the white semantic border, icon, label and focus outline.
With controls hidden, use the same responsive spacing token for bottom and sides.
Do not inherit the page navigation's fixed-bottom padding in that state.
Visible controls retain their prior clearance; expanded playback retains the CTA.
Bright footage can reduce contrast further; this is an explicit transparent trial,
not a change to contact permissions, typography or tracking.
