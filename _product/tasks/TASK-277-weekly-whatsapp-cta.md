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
- [x] Acquired-patient notification uses the shared Lucide person-plus icon.
- [x] Podium medal images have no colored background, preserving their icon slot.
- [x] Podium uses a bold congratulatory title and the existing achievement as smaller description.
- [x] Podium description identifies the rank as "Top X Mentor da comunidade".
- [x] Pending weekly report action is labeled "Informar pacientes"; answered remains "Ver resposta".
- [x] Notification settings cards share list gutters/radius, hide redundant new-post label accessibly and use plain-language permission copy.
- [x] Top Mentores preference is shown only to psychologists; patient saves preserve any existing hidden preference.
- [x] Billing preference is removed from settings and always enabled in normalization and delivery, including legacy opt-outs.
- [x] Switch thumbs remain vertically centered on their tracks in both states and responsive widths.

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

Celebration follow-up: Top Mentor now has a bold 15px congratulatory title and
the existing achievement as a text-sm muted description. Acquired patients uses
UserRoundPlus. Twenty focused tests and Biome passed; real API screenshots for
both roles were refreshed. Browser assertions checked all three podium titles,
smaller descriptions matching the weekly description, transparent medals, both
person-plus states and no horizontal overflow at 390px.
Frontend production build and its TypeScript check passed.

## Operations
Switch follow-up: 12 preference tests and Biome passed. Real local browser
measurements confirmed thumb/track vertical centers within 0.1px at 320/390/1440px
for both roles, before and after toggling on/off. Control dimensions and horizontal
travel are unchanged. Both read-only previews were refreshed.
Frontend production build and TypeScript validation passed.

Billing follow-up: remove the subscription preference block. Billing notices are
transactional and always enabled, including legacy disabled preferences and
older clients submitting false. Other notification preferences and browser
permission checks remain unchanged. No retroactive resend.
Validation: 12 frontend preference tests, 17 notification tests and four billing
dunning tests passed. Real local database delivery succeeded with a disabled
legacy billing preference while an optional reply notification stayed blocked.
Repository update normalized a submitted billing opt-out to enabled. Browser
checks and save/reload passed for both roles at 320/390/1440px; preview refreshed.
No external push or email was sent during validation.
Frontend production build and backend TypeScript validation passed.

Settings follow-up: six preference tests passed, including hidden-label/accessibility
regression coverage. Real local API browser validation passed for patient and
professional at 320/390/1440px: shared widths, mobile gutters, 12px radius,
screen-reader-only select label, no text/horizontal overflow and preference
save/reload. Desktop sidebar collapse remains route-specific. Permission request
logic is unchanged: activation is offered for supported/default permission with
a configured key; denied permission directs users to browser/device settings.
Native push delivery was not exercised (local push configuration is disabled).
Frontend production build and TypeScript validation passed for the settings changes.

Copy follow-up: podium descriptions use "Top X Mentor da comunidade" for all
three ranks; pending report action uses "Informar pacientes". Twenty focused
tests, Biome and real local API browser assertions passed. Both previews were
refreshed, with no horizontal overflow. Local Next dev needed a restart after
the previous build; preview generation passed after recompilation. No full
production rebuild repeated for these text-only changes.

Role follow-up: eleven preference tests passed, covering psychologist, patient,
unresolved roles and preservation of hidden podium preferences. Real local API
browser validation passed for both roles at 320/390/1440px, including role-specific
visibility and saving/reloading preferences. Both read-only screenshots were
refreshed. No full production rebuild repeated for this role-filtering change.

No migration, environment variable, dependency or scheduler activation.
Deploy backend/frontend independently; old notifications use the updated frontend rendering.
Rollback code only. No remote push/deploy in this task.
ADR: 0640.

## Production release preparation - 2026-10-26

- User approved publishing the notification changes and confirmed all Backend/
  Video autodeploys and frontend/Admin automatic promotions remain disabled.
- Release 0.1.728 incorporates current main (70d62963d), retaining the previously
  published payment diagnostic fixes. Pending SendNF work is excluded.
- Backend check: 972/973 tests passed; optional-auth subprocess timed out under
  load, then passed on its isolated rerun. Backend production build passed.
- Frontend full check and production build passed, including 643 primary tests,
  supplemental suites, 20 weekly report tests and 12 preference tests.
- Dependency audit reported zero known production vulnerabilities in all apps.
  Version, encoding, source safety, source size and import-cycle checks passed.
- Local visual/API validations above remain applicable; native push delivery
  was not exercised. One pre-existing Sentry build deprecation remains.
- Production baseline: backend/admin 0.1.718, frontend 0.1.716; backend health
  and readiness returned HTTP 200. Monitoring: CPU 2.44%, RAM 4.02/7.75 GiB,
  disk 48.67/58.76 GB. Run only one VPS build at a time.
- Deployment pending: reviewed homolog-to-main PR, Backend deploy and health
  verification, then frontend promotion. No Video/Admin functional changes,
  database migration, new variable or SendNF activation are included.
