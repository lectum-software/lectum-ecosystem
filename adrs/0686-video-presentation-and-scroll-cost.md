# ADR-0686: Frame-aware startup fallback and bounded layout measurements

Date: 2026-11-10
Status: Accepted

Do not treat currentTime advancement as proof of visible video: audio can
advance while presentation is delayed. Preserve requestVideoFrameCallback and
its stale-owner/media-time guards. If callbacks are omitted, require both
playback progress and an increase in totalVideoFrames minus droppedVideoFrames
since activation/reset/seek. Retain the clock-only legacy fallback only when
neither frame API exists. This avoids replacing missing callbacks with an
indefinitely stuck cover when quality counters are available.

Native scroll/snap remains the motion owner. Ordered rendered slide geometry
permits binary search of the closest top; measure the container once per event
and O(log n) slide rectangles instead of every item. DOM selection remains O(n).
No fixed-height assumption or additional player implementation is introduced.

These address reproduced code paths, not proof that every physical iPhone
stall is resolved. Broken/missing posters and browser-specific frame reporting
remain limitations. No changes to autoplay audio policy or immersive controls.

References:
- https://developer.mozilla.org/en-US/docs/Web/API/VideoPlaybackQuality/totalVideoFrames
- https://developer.mozilla.org/en-US/docs/Web/API/VideoPlaybackQuality/droppedVideoFrames
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback
