# ADR-0684: Caption presentation and controls

Date: 2026-11-09
Status: Accepted

## Decision

Separate transcript width from the constrained video frame in community media.
Keep video dimensions and its attached footer unchanged. Transcript follows the
available parent content width, with existing mobile text wrapping.

Remove directory CC from both action rails, preserving the immersive control
next to volume for individual and pooled players. Preserve explicit saved
preferences and caption rendering. Default directory captions to enabled,
independently of audio, while preserving an explicit saved on/off choice.
The shared CC mask subtracts only the center letter region,
not the decorative outline, so selected fill has no curved gaps. Reuse the
existing icon asset. Edit-caption links use the standard foreground token.

## Consequences

No playback, API, data or default-mode changes. Shared icon and menu appearance
also improve other existing consumers. Validate mobile/desktop and transparent
letters with browser pixel tests. Publication is deferred.
