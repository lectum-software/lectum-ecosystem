# TASK-277 - Weekly WhatsApp notification CTA

Status: Done

## Scope
- Strong title and explicit action for the weekly acquired-patient report.
- Reference: user screenshot WhatsApp Image 2026-10-26 at 17.16.04.jpeg.
- Preserve existing notification/report routes, count semantics and response persistence.
- Keep SendNF disabled and its unrelated local changes untouched.

## Acceptance
- [x] Title asks how many patients arrived through Lectum, always bold.
- [x] Description preserves dates/click count and explicitly invites a zero response.
- [x] Primary blue rectangular action uses the existing Button and safe report redirect.
- [x] Answered report shows Ver resposta without prompting a duplicate response.
- [x] Future push copy matches the in-app copy; no resend of previous pushes.
- [x] Checks/builds and mobile/desktop browser verification.

## Validation
Frontend full check and build passed; weekly flow has 20 passing tests.
Backend build passed. Full check: 980/981 passed; optional-auth subprocess timed
out under concurrent build load, then passed on its isolated rerun.
Local backend health/ready returned HTTP 200.
Real local API/PostgreSQL browser validation at 320/390/1440px passed:
keyboard activation, dismiss without answer, zero submission, persisted answer,
Ver resposta, bold title, light/dark layout, no horizontal overflow.
Temporary local test accounts and reports were removed. No mocked API or
production data was used. Screenshots and logs are in .tmp/task277-*.

## Operations
No migration, environment variable, dependency or scheduler activation.
Deploy backend/frontend independently; old notifications use the updated frontend rendering.
Rollback code only. No remote push/deploy in this task.
ADR: 0640.
