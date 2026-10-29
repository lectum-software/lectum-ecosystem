# ADR-0653 - Activation-scoped feed audio recovery

Date: 2026-10-29
Status: Accepted
Related: TASK-288, ADR-0652

## Context

Feed audio consent already belongs to the document. However, a per-element
NotAllowedError was cached for the entire preference revision. Returning to that
video kept it muted while others honored the same explicit sound choice. Changing
muted alone also did not retry playback inside the volume-control gesture.

## Decision

Keep explicit audio preference shared and never infer consent from autoplay,
volumechange or scrolling. Reset local denial markers only on a new activation,
not canplay/playing events in the current activation. Retry active eligible media
synchronously during explicit unmute, respecting manual pause, ended media,
document attention and modal suspension. Ignore queued pause events when the
element is already playing. Existing attempt/revision guards reject stale results.

The contact icon reduction is production-source styling only. The experimental
white border exists solely in a static read-only preview and needs user approval.

## Consequences

Transient browser denial no longer permanently diverges a video from the user's
choice. A fresh browser denial still falls back to muted playback with an explicit
sound control; no autoplay-policy bypass or global consent reset is introduced.
Regression tests cover re-entry, gesture recovery, manual pause and stale events.
No schema, dependency, environment or deployment change is required.
