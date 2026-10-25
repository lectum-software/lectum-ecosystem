# ADR-0638 - Close post composer after profile detour

Status: Accepted
Date: 2026-10-25
Task: TASK-275

## Context
Profile editing is reached from the patient's anonymous-post tooltip. Canceling
pushes a canonical composer URL, while saving replaces the editor with that URL.
Browser history can therefore contain the editor or an earlier composer. Calling
back on close reopens one of them instead of dismissing the flow.

## Decision
Add the idempotent profileReturn=1 query marker to the profile return URL, keeping
the existing community/query/hash context and draft identity. On standalone
composer close, after the existing authentication-return handling, replace the
marked route with the existing community/feed fallback. Keep embedded modal
callbacks, ordinary close behavior and discard confirmation unchanged.

## Consequences
The fix does not rely on session storage being available to recognize the
navigation detour. The marker grants no permission and carries no personal data.
Browser Back remains native; closing this flow explicitly exits to the feed.
No global navigation helper, API, schema or public layout change.
