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

Keep author, verification badge and Favorite in one flex row. Only the name may
wrap within its shrinking item, without truncating the complete name or pushing
Favorite onto a row of its own.

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
