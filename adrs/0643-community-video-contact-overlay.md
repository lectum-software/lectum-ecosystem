# ADR-0643 - Community video contact overlay

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
