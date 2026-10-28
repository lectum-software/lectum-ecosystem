# TASK-279 - WhatsApp over community video

Status: Done locally, version 0.1.731. No push or deployment.

## Scope

Move the existing contact footer onto portrait community videos. Preserve the
same action in expanded playback, independently of control auto-hide.
Keep images, carousels, horizontal video and text-only contact presentations.

## Acceptance

- [x] White border, white icon/text/arrow, translucent white fill; no black CTA fill.
- [x] Remove the separate WhatsApp heading only in the video overlay.
- [x] Reuse contact identity, access flow and analytics attribution.
- [x] Preserve video sizing and object-contain; remove external contact footer.
- [x] Share the action across post, reply, feed and detail media surfaces.
- [x] Validate visible contact with expanded/hidden controls and return to inline.
- [x] Validate 320/390/1440 layouts, contact action and control separation.
- [x] Frontend check/build and synchronized version.

## Sources and Decision

User's screenshot and request are the visual reference. Existing local component
patterns and prototype inventory were consulted; Builder is unavailable.
ADR-0646 records the shared player slot and scoped presentation.

Temporary local database records must be removed after browser QA. No real
WhatsApp message is sent and no production data is changed.

## Browser Evidence

Local API/database post and reply, with temporary professional and community;
records removed in finally. At 320/390/1440px the contact was inside the player,
44px high, without horizontal overflow. One contact remained after expansion
and after return to inline. The action opened the existing redirect modal,
including Enter at 320px. Visible playback controls did not overlap the CTA.
The outgoing WhatsApp navigation was aborted in the final QA run.

Evidence: .tmp/task279-browser.log and task279-inline/expanded/contact screenshots.
The existing local QA video is a short color-pattern clip; it is not a published
professional video. Portrait player dimensions and contain behavior were preserved.

Full frontend check and production build passed. Version policy passed for all
five manifests. Cleanup also removed 10 temporary action events and 14 page views;
no temporary users or communities remained. Logs: .tmp/task279-frontend-check.log
and .tmp/task279-frontend-build.log. SendNF remains outside this change.
