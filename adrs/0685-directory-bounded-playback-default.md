# ADR-0685: Default directory playback to the bounded reels provider

Date: 2026-11-10
Status: Accepted

## Decision

Use the existing shared reels player provider for normal directory access.
Only explicit directoryPlayer=individual selects the legacy rollback path.
Unknown parameters must not accidentally restore the unbounded path. Preserve
both supported values through filtering. The server snapshot also chooses the
bounded provider so initial rendering does not mount the legacy player list.

The two existing players, slide window, source cleanup, scroll and activation
controllers remain shared with reels. Directory controls remain a UI adapter.
No copied buffering or playback implementation is introduced.

## Evidence and limitations

In production 0.1.802 the normal directory rendered 20 video elements versus
2 for pooled mode. Only 2 of the 20 had current sources at measurement time;
this is not evidence of 20 simultaneous streams. Full offscreen components
still remain mounted and grow with loaded slides. Bounded reuse removes that
resource disparity, but physical Safari acceptance remains required. No claim
is made that this alone proves or fixes every device-specific pause or flash.
