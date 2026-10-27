# ADR-0640 - Explicit weekly WhatsApp report action

Use a dedicated presentation component for weekly report notifications, with
an always-bold title "Pacientes adquiridos", factual click counts and a primary rectangular link
styled by the existing Button. The container is not interactive, avoiding nested
links/buttons. The existing safe redirect opens the report modal.

Preserve weekly notification read semantics: viewing is not answering; only the
existing report submission marks it answered. Answered items retain the bold title
and offer Ver resposta. Other notifications and their click behavior are unchanged.

Update future push copy without generating notifications or resending old pushes.
No data model, fiscal integration or deployment configuration changes.

Copy refinement: remove the explicit zero-response prompt from the notification.
Zero remains a valid intentional answer in the existing report form.

Mobile width trial: reuse the profile's 430px content cap and PageShell gutters,
removing only the duplicate horizontal padding around the notification surface.
Keep header inset, surface styling, internal spacing and desktop width unchanged.

Follow-up: use --lectum-card-radius (12px) on the notification surface, matching
profile cards. Keep the approved margins and other surface styling unchanged.

Icon refinement: use Lucide UserRoundPlus for acquired patients, retaining WhatsApp
branding only for WhatsApp contact notifications. Podium medal images keep the
same fixed slot but omit the colored icon tone. Other icons retain their tone.

Podium hierarchy: separate a short congratulatory title (15px, bold) from the
existing position/community text (text-sm, muted), matching the weekly report
hierarchy. Preserve notification links, read behavior and transparent medal slots.

Podium copy: describe the position as "Top X Mentor da comunidade", using the
stored podium position (1/2/3) and community name, without changing ranking rules.

Weekly action copy: use "Informar pacientes" for pending reports, keeping
"Ver resposta" for answered reports and the existing consultation count semantics.

Settings follow-up: reuse the list's responsive wrapper and card-radius token.
Hide only the redundant select label visually, preserving its accessible name.
Permission explanations use plain language; native permission requests, blocked
permission handling and preference persistence remain unchanged.

Role correction: show the podium preference only for psychologists. Patients
(and unresolved roles) do not see the control. Their form submission preserves
any previously stored podium preference instead of overwriting a hidden setting.

Billing notices are transactional account communications, not optional content.
Remove the subscription switch and normalize its retained API key to enabled.
Delivery checks ignore legacy billing opt-outs, so no data backfill is required.
Existing browser permission/subscription checks and email delivery safeguards
remain unchanged. No historical notice replay or changes to collection timing.
