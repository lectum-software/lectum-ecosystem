# ADR-0651 - Compact contact overlay and independent inline audio control

Status: accepted; frontend locally validated, publication pending.

Use the existing WhatsApp redirect component for the approved compact capsule.
The visual surface is shorter than the accessible touch target. Keep the original
display-name helper, destination validation and attribution; do not replace these
with hardcoded links or names. Long labels remain constrained by the video width
and keep their full accessible label.

The overlay container must not intercept empty-space clicks beside the smaller
button. Only its children accept pointer events. Reels entry remains attached to
the video surface, while the mute control consumes its own pointer/click events.
Volume state is observed even when traditional playback controls are disabled.

Use the dedicated whatsapp-contact token, constant #15803d, for the compact CTA
background in both themes. The shared success token is too bright for 13px white
text, especially in dark mode. Use media-foreground for its white content.

No shared schema or API change. User confirmed setting Ignored Build Step to
Don't build anything on frontend and Admin to resolve the automatic deployment
deviation from TASK-285. Only frontend requires manual publication after reviewed
merge. Backend/Admin/Video deployments remain unchanged. TASK-286.
