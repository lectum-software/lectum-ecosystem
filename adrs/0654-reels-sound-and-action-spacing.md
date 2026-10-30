# ADR-0654 - Reels sound continuity and visible action spacing

Date: 2026-10-29
Status: Accepted; publication authorized 2026-10-29

## Context

The user reports muted reels despite having enabled sound in the feed, isolated
Favorite labels under long names, and uneven optical spacing in the action rail.

## Decision

Use the existing document-wide explicit sound preference, not a separate reels
preference. Browser refusal must not overwrite user intent. Preserve attention,
modal and inactive-slide playback guards.

Measure action spacing using visible icon/label groups. Remove empty label
placeholders; give each mobile action equal vertical padding and retain minimum
touch height. Desktop action circles retain their size; labeled actions include
their actual label height. Keep original icon dimensions.

Follow-up after release 0.1.744: use an inline author name instead of a separate
flex column. Allow wrapping only inside the name; a word joiner attaches its final
word to the inline badge/Favorite group. Preserve one full-name profile link and
the independent favorite button, including the expanded caption header.
Upvote, comments and save retain identical 20px boxes (18px below 359px). Reduce
only the share glyph optically to 90% within its unchanged box and touch target.
This follow-up is local only until separately authorized for publication.

The user superseded the proposed 24px mobile gap with the directory reference:
28px below 360px, 30px through 390px and 32px above 390px. Measure from the bottom
of the whole icon/count group to the next visible action, including the WhatsApp
disc. Keep 13px internal vertical padding and use 2/4/6px rail gaps so even tiny
screens retain 44px touch targets. The share optical adjustment adds at most 1px
per adjacent edge. Desktop spacing and the directory itself remain unchanged.

## Consequences

The rail is taller where labels need room, so mobile and desktop geometry must
be tested. No new dependency, API, schema or deployment setting. The approved
upvote style removes the visible label in both states and emphasizes selection
with a thicker blue arrow and bold blue count, without a filled background or
tooltip. Accessible name and pressed state remain. The approved inline feed CTA
reveals its label once after three seconds of visible playback. Pauses, buffering,
seeking, hidden documents and modal-blocked playback do not advance the threshold.
The CTA stays clickable with its full accessible name from the start; reduced
motion disables transitions. Expansion is right-anchored; the icon travels left
with the pill and stays before the label. Only feed overlays receive the animation.
All green WhatsApp contact accents share --lectum-whatsapp-contact (#16a34a), the
user's preferred original favorites green, not
the theme-dependent success token. Neutral backgrounds and success indicators are
unchanged; directory/profile/reels contact behavior is preserved.
Following requirements remain an unapproved proposal.
