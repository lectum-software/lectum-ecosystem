# TASK-277 - Weekly WhatsApp notification CTA

Status: Done

## Scope
- Strong title and explicit action for the weekly acquired-patient report.
- Reference: user screenshot WhatsApp Image 2026-10-26 at 17.16.04.jpeg.
- Preserve existing notification/report routes, count semantics and response persistence.
- Keep SendNF disabled and its unrelated local changes untouched.

## Acceptance
- [x] Short title "Pacientes adquiridos", always bold.
- [x] Description preserves dates/click count and asks how many booked a consultation.
- [x] Primary blue rectangular action uses the existing Button and safe report redirect.
- [x] Answered report shows Ver resposta without prompting a duplicate response.
- [x] Future push copy matches the in-app copy; no resend of previous pushes.
- [x] Checks/builds and mobile/desktop browser verification.
- [x] Mobile white notification block uses the same outer margins and 430px cap
  as profile cards, without changing internal spacing or desktop width.
- [x] White notification surface shares the profile card radius token (12px).
- [x] Acquired-patient notification uses the shared Lucide person icon.
- [x] Podium medal images have no colored background, preserving their icon slot.

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

Copy refinement on 2026-10-26: title shortened and explicit zero-response prompt
removed. Revalidated 20 focused tests and the real browser flow at 320/390/1440px,
including zero submission and answered state. Full builds were not repeated for
this text-only refinement.

Mobile width trial: browser measurements at 320/390/600px confirmed identical
profile and notification surface x/width. At 390px both use 18.75px gutters and
352.5px surface width. Desktop styles remain unchanged. Real report interactions
and light/dark overflow checks were repeated.
Frontend production build, 20 focused tests and Biome passed for the width trial.

Radius follow-up: reuse the existing 12px token. Focused tests (20), Biome and
browser comparison against the profile at 320/390/600/1440px passed; margins and
report behavior remain unchanged. No full build repeated for this single-class
styling adjustment.

Icon follow-up: 20 focused tests and Biome passed. Real local API screenshots
were refreshed for both roles. Browser assertions confirm two UserRound icons
(pending/answered), all three medal slots transparent, and Top Mentor typography
equal to other standard notifications: 15px / 18.75px line height / weight 400.
No typography change or full production rebuild for this icon-only refinement.

## Operations
No migration, environment variable, dependency or scheduler activation.
Deploy backend/frontend independently; old notifications use the updated frontend rendering.
Rollback code only. No remote push/deploy in this task.
ADR: 0640.
