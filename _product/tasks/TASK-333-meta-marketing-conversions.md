# TASK-333 - Meta marketing conversions

## User Event Contract and Email Consent Continuity (2026-11-19)

Owner-requested external names are now CompleteRegistration, Contact and forum_post.
Contact measures only the WhatsApp button click, never a delivered message or
conversation. This supersedes earlier WhatsAppClick/PublicationCreated names.
Legacy patient_* storage keys remain unchanged to preserve queue identity and retries.
The strict CAPI serializer still excludes user type, professional identity, phone,
forum topic/content and arbitrary custom data.

Email signup now carries the existing explicitly authorized guest token in the POST
body. The server prepares a reference before account creation, removes the token
from user persistence, then claims it inside the new-account transaction. The
shared claim checks the exact provider (manual or google), original grant/version,
expiry, revocation and single ownership. The original grant time and expiry are
preserved; no terms checkbox is treated as marketing consent. Registration queues
atomically only with a reviewed observed source URL. Existing professional behavior
and Google-only claim entry point are preserved. No schema or dependency change.

- [x] Align the three user event names with the owner's requested contract.
- [x] Wire email registration to existing server-recorded guest consent.
- [x] Verify email persistence/queue, provider isolation and consent revocation in local PostgreSQL.
- [ ] Configure a user-specific notice and actual per-action source URL allowlists.
- [ ] Validate user notice/capture and delivery through a real browser and Meta Test Events.
- [ ] Activate external transmission after those prerequisites are configured.

Validation of this update: 44 focused policy/serializer/hook tests passed and three
real local PostgreSQL tests passed with no skips. The database tests cover email
account persistence, one-time claim, provider isolation, minimal payload evidence
and revocation; they ran again under Node 24.22.3. Frontend typecheck and full
frontend check passed. Backend build passed under Node 24.22.3; final TypeScript
emit/alias resolution includes the request-header forwarding fix. Changed-file
Biome and git diff --check passed.

The root pnpm check ran under the system Node 24.16.0 (below the declared engine)
and stopped in backend tests: 1524 passed, 56 skipped, one existing optional-auth
subprocess test timed out at 30 seconds. That exact test passed separately under
Node 24.22.3 in 13 seconds. Do not claim root check passed; admin/video stages were
not reached. No browser E2E, health/readiness smoke or real Meta delivery was run.
The started local PostgreSQL test instance was stopped after scoped fixture cleanup.

Draft notice for owner review (not activated or represented as accepted consent):
“Autorizo o envio à Meta de eventos de cadastro, clique no botão de WhatsApp e
publicação no fórum para medir o desempenho de anúncios. O envio pode incluir
identificadores técnicos do navegador e a URL da página, desde que ela não revele
conteúdo, tema ou identidade do profissional. Não serão enviados o texto das
publicações, seu tipo de usuário ou os dados do profissional. Esta autorização é
opcional e pode ser retirada nas preferências de privacidade.”

Activation remains incomplete: USER_DELIVERY_POLICY.documentVersion is null,
sourceUrls is empty, guest capture is disabled, and metaTransmissionDecision
returns allowed=false. Configuring credentials alone cannot enable these events.
No live Meta request, push or deployment. Changes remain local alongside existing
uncommitted TASK-333 work; the task is not ready for a completion commit.
Rollback: revert this event-name/email-bridge change; no migration is required.
Production deployment must still account for previously pending TASK-333 migrations.


## User Delivery Evidence Wiring (2026-11-19)

Connected user action hooks and worker dispatch to canonical source validation,
live consent, guest-grant lineage and browser identifier evidence. Persist the
observed, exactly reviewed source URL in nullable marketing_delivery_jobs.source_url.
Retries cannot replace it; missing historical context is not backfilled with a
neutral URL. Google consent preparation carries the reviewed observed URL in
private state and claim queues registration in the account transaction.
Contact and publication hooks execute after persistence. Anonymous posts remain
ineligible. All external gates remain closed; the user document version is null
and the action URL allowlists remain empty.

Applied migration 20261119190000_marketing_user_source_url only to the existing
local PostgreSQL test database and regenerated Prisma. The additive migration
is required before deploying this backend. No remote migration or deployment.
Twenty-two focused tests passed, including local database integration, OAuth
state, payload minimization and blocked hooks. Backend pnpm build also passed
(Prisma generation, TypeScript and alias resolution). No real Meta request was made.

Still pending: a user-specific notice/capture configuration for the isolated
browser test, email registration consent continuity, and genuine browser-to-Meta
validation. Existing UI/provider screenshots do not establish those paths.


## User Google Consent Continuity (2026-11-19)

The user registration frontend can submit an existing explicitly authorized
guest transfer token in the preparation POST body, never navigation parameters.
The server reads the current guest grant only when USER_DELIVERY_POLICY has a
matching document version (still null by default). It stores only a hash/version/
deadline reference in the private encrypted OAuth state, outside the callback
query. Untrusted query/body fields cannot populate this private state directly.
The original ten-minute deadline is preserved across preparation and login.
Legacy signed states and login/professional intents cannot carry this reference.

Only newly created Google user accounts claim the evidence, inside their account
transaction. Claim rechecks role, provider, creation time, version, revocation,
expiry and one-time ownership; existing accounts are not silently opted in.
The account retains the original server-recorded grant time and expiry, with an
audit event. It does not create a retrospective consent or extend retention.
Existing valid browser evidence can transfer after timestamp validation, without
generating an identifier. Campaign values are not copied to the user account.
Guest revocation also revokes the linked user consent, records an audit event and
removes attribution/browser evidence. Professional claim behavior is unchanged.

Validation: 49 tests passed with database test files run sequentially, zero skips,
including encrypted state, canonical queueing, concurrent one-time claim,
revocation and professional consent regression. Backend and frontend TypeScript
checks passed. Biome checked the changed files. An earlier combined test run
exposed an old global queue claim in the professional regression; claim now has
an optional user scope and that test uses its own user. The earlier failed run
leased an existing local row but made no external request; no shared rows were
deleted or reset to force success. The lease remains recoverable by expiry.

Still pending: the user-specific reviewed notice/capture configuration, browser
evidence delivery resolver, user action hook activation and full browser/Meta
delivery validation. No real Google login was exercised in this round. The null
user policy, disabled acquisition and external transmission gates remain closed;
there is no deployment or ready manual test yet. Earlier notes saying OAuth has
no reference transport are superseded by this implementation, not by activation.

## Local User Serialization (2026-11-19)

The pure CAPI serializer now supports CompleteRegistration, WhatsAppClick and
PublicationCreated for the three legacy user conversion keys. This supersedes
the older professional-only serializer statement below. It does not activate
delivery, product hooks, consent collection or a production configuration.

User serialization requires both the shared exact URL allowlist and a separate
per-conversion reviewed URL map (empty by default). No URL rewriting is performed.
Strict input rejects extra fields including content, community, professional
identity, user role, phone and arbitrary custom data. Consent must match the
reviewed document and be valid at the action time and at delivery time.

Validation: 38 serializer/policy tests passed; TypeScript --noEmit passed.
Tests use synthetic browser identifiers and URLs, with no Meta transmission.
OAuth inspection confirms the current user flow does not preserve marketing
consent: registration state has no server-side grant reference, callback query
forwarding would need care to avoid exposing one, and the existing guest claim
and registration consent bridge are professional-only. These remain pending,
along with browser evidence resolution and end-to-end delivery tests. No manual
test is ready yet; no production deployment or external gate activation occurred.

## Owner-Supplied Meta Help Response (2026-11-19)

The owner supplied three screenshots of a conversation at facebook.com/business/help.
The displayed response supports registration, WhatsApp clicks and forum posts
conditionally on excluding content, topic, community, professional identity and
phone, and sensitive URL paths. It mentions technical event/browser identifiers.
Treat this as supplied support guidance, not proof of a human account-specific
review or an exception to platform terms. Do not infer approval from UI receipt.
Do not implement its suggestion to use CompleteRegistration for forum posts:
registration and publication must remain semantically distinct. Do not invent a
neutral source URL unrelated to the real action. No external activation occurred.

Local preparation validation completed: 43 tests passed across the two test runs
(11 queue/CAPI/integration regressions and 32 policy/scheduler/preview tests),
TypeScript --noEmit passed after making canonical-source return fields explicit,
and Biome passed for the five changed implementation/test files.

## Local User Queue Preparation (2026-11-19)

Following the owner's request to prepare locally without assuming external
approval, the existing queue now supports the three legacy user conversion kinds
behind a separate USER_DELIVERY_POLICY.documentVersion, default null. No env
toggle, product hook or CAPI serializer was enabled. This supersedes the earlier
statement that queue input accepts only professionals.

persistUserEvent reads canonical active user ownership and server timestamps.
Registration uses account creation; WhatsApp uses stored action receipt time
(not the browser timestamp or proof of a conversation); publication requires a
published, nondeleted, nonanonymous post. Selects omit text, community, profile,
phone, path and destination. Queue rows retain only existing internal references,
consent revision, random event identity and lifecycle fields.

Consent lookup and role-based purge support both account roles. User preparation
requires the separate exact notice version, an unrevoked grant at/before the action
and unexpired consent. No retrospective grant or Google consent bridging was
added; registrationConsentStart remains professional-only. No historical events
were backfilled. Sources are revalidated before delivery; external gates and
the professional-only CAPI serializer remain closed to user events.

Validation: 11 tests passed, zero skipped, including scoped real PostgreSQL user
queue concurrency (three requests per action), stable identity, canonical time,
refusal/revocation/late regrant, deleted clicks, anonymous/blocked posts and
professional registration regression. Fixtures and their jobs were removed by
exact IDs; no global queue processing or purge was run. No requests to Meta.

Still pending: actual user notice/context approval, real OAuth consent continuity,
browser evidence and source-URL review, full user delivery lifecycle tests and
product-hook activation. This is local storage preparation, not complete delivery.

## User Delivery Queue Boundary (2026-11-19)

The existing queue is professional-only at input validation, consent lookup and
retention cleanup. registrationConsentStart also requires a professional account.
Adding only user event names would not implement delivery: consent resolution
would reject them and cleanup would remove their jobs. Do not enqueue user events
in this queue until the role-aware lifecycle and reviewed consent purpose are
implemented together. No alternate queue or synthetic source URL was introduced.
Added regression coverage for all three legacy user kinds and generic names:
untyped insertion must fail before any database access; blocked hooks must neither
resolve user identity nor contact Meta. External activation remains incomplete.

## User Flow Context Audit (2026-11-19)

Validation: 40 tests passed, zero skipped, including real local PostgreSQL
registration/posting and WhatsApp consent/isolation tests with disposable scoped
fixtures. External fetch is guarded in these integration tests; no provider E2E
or Google OAuth interaction was performed. Biome passed on the four policy/preview
files. PostgreSQL emitted a concurrent-query deprecation warning, not a test failure.

- Registration: email and Google hooks run after persistence, but user delivery
  has no evidence resolver/outbox. Google deliberately drops user measurement
  identity because browser choice may change during OAuth. Do not bypass this.
- WhatsApp: the internal action endpoint stores path, page kind and target;
  the contact repository knows the destination professional and phone. Neither
  record is an external payload. A click is not proof of a conversation.
  Analytics deduplicates a supplied event ID per visitor, not distinct requests
  with new IDs, and there is no external user delivery deduplication yet.
- Publication: the hook follows persistence and rejection handling; source data
  contains community, content and anonymous-publication state. Anonymous public
  presentation does not make an account-linked marketing event anonymous.
- Existing hooks pass only a conversion literal and all transmission stays blocked.
  Replace categorical health-context classification with pending_context_review
  for legacy patient_* keys. This is a terminology/evidence correction, not approval.
- Generic descriptors remain disconnected. Do not substitute an unrelated root
  URL to hide an action source or forward internal analytics records to Meta.

Pending before external activation: per-flow eligibility decision, reviewed notice
and purpose, current consent across OAuth, canonical persisted event evidence,
durable delivery identity and actual source URL review. No new manual signup or
Meta test is requested until these dependencies are resolved.

## Minimal User Action Preview (2026-11-19)

The owner clarified that community members are users, not established patients.
Added a pure local review descriptor for registration, WhatsApp button clicks and
publication creation. Names do not assert treatment, a conversation or a clinical
relationship. Strict input rejects content, community, professional details,
destination, URLs and identifiers; it does not silently rename real contextual data.
This is not a CAPI payload, is not wired to product hooks and cannot transmit.
Actual source context, consent and provider eligibility remain pending review.
Legacy patient_* keys remain compatible; no schema migration or production change.

The owner's latest screenshot confirms Processado for the renewed registration
event prefix f0afb2 at 16:22:05. This supersedes the pending UI receipt below,
but does not establish production readiness or authorize additional retries.

## Renewed Session Explicit Retry (2026-11-19)

Owner confirmed the 16:22 registration was absent from Test Events and explicitly
authorized one additional attempt for session 84b5463d-d0fc-418e-803b-9cac53c6321d.
The sender revalidated current evidence and required identical event_id and payload
hash, preserving the original registration time. Meta returned HTTP 200,
events_received=1, messages=[] and no error. The second exclusive attempt marker
prevents repetition. UI receipt is still pending; this manually authorized retry
does not change the fact that the first attempt was automatically triggered.
No production configuration, push or deployment changed.

## Automatic Registration Attempt Observed (2026-11-19)

After the unused prior session expired, the owner requested renewal and completed
the new professional signup in session .tmp/manual-capi-84b5463d-d0fc-418e-803b-9cac53c6321d.
The isolated observer automatically verified prior consent/browser evidence and
sent exactly one CompleteRegistration at 16:22:22 America/Sao_Paulo (19:22:22Z).
The worker exited successfully. Meta returned HTTP 200 and events_received=1,
but warned that TEST10505 did not match an active Site test session and the event
would not appear in Test Events. This proves the sandbox automatic attempt/API
receipt, not visual receipt or production-hook activation. No automatic retry.
Any further attempt requires confirming the active Site session/code and separate
authorization, preserving the same event identity. Production remains disabled.

## Automatic Registration Sandbox Preparation (2026-11-19)

Owner screenshot confirmed Concluir inscricao / Processado / Servidor for the
previous CompleteRegistration test (event prefix b921e, displayed time 12:24:28).
This closes visual receipt for that controlled manual attempt only.

Prepared a fresh expiring restricted session with a local automatic observer
scoped to its exclusive disposable professional email. It uses the canonical
registration resolver before invoking the one-shot sender, which revalidates
evidence, preserves durable event identity and exclusively creates an attempt
marker. No automatic retries, old-account scans, patient events or billing calls.
This is an isolated test observer, NOT validation or enablement of the gated
production scheduler/hooks. A new human email signup is still required.

Added a scoped PostgreSQL regression for refusal/no consent, revoked guest/account
consent, late regrant, patient role and repeated/concurrent registration observation.
It uses disposable rows and does not claim or purge the shared local queue.
34 focused tests passed, zero skips, including two real PostgreSQL tests; none
transmitted to Meta. Fresh session: .tmp/manual-capi-5bcb55a1-d7f7-4b2f-bd16-a833a3c6e5de.
The previous test supervisor was stopped without stopping the shared local DB.
Backend TypeScript and the new test's Biome check passed. Playwright mobile smoke
confirmed restricted access, blocked billing/patient activity, default consent off,
the current notice and the working email signup form without submitting an account.
The automatic observer remains waiting_for_new_registration with zero requests.
No production enablement, push or deployment.

## Authorized Second Registration Attempt (2026-11-19)

After the owner confirmed Site TEST10505 in a screenshot and explicitly authorized
one additional attempt, current consent/browser evidence was revalidated. The
second request preserved the original event_id and exact payload SHA-256, including
the original registration time. Meta returned HTTP 200, events_received=1 and
messages=[] with no error. Visual receipt remains pending; API acceptance alone
does not prove UI receipt or deduplication. Separate exclusive-create second-attempt
and result files preserve the first attempt and prevent further automatic retries.
Production remains disabled; no push or deployment.

## Registration Single Attempt Result (2026-11-19)

Owner completed the fresh email psychologist signup. Canonical local verification
confirmed an active professional account from this session, prior guest consent
under the registration notice, claimed attribution and a valid pre-signup browser
identifier. One explicitly authorized CompleteRegistration request was sent for
dataset 1606598847399888 with TEST10505; user_data contained only fbp and there
was no custom_data, name, email, phone, clinical data or payment value.

Meta returned HTTP 200 and events_received=1, but explicitly warned that TEST10505
does not match an active Test Events session for this dataset/action source and
that this event will NOT appear in Test Events. API receipt is confirmed; visual
test validation remains pending. No automatic retry is permitted. Before any
further attempt, obtain the code from an active Site session and fresh explicit
authorization. Durable attempt/result files are in the session directory above
described below, with an exclusive-create attempt marker. Production remains
disabled; no commit, push or deployment. Plans fail in this sandbox because the
gateway deliberately blocks billing routes.

## Authorized Fresh Registration Session (2026-11-19)

Owner authorized a new restricted HTTPS test and one CompleteRegistration event.
Started an expiring local supervisor with access-cookie protection, private local
SMTP/code control and a dedicated disposable email. This round uses email signup;
the validated local Google client is not changed. The existing local database is
reused without reset and is not stopped by this supervisor. Payment routes and
patient activity routes are blocked at the gateway; Meta runtime remains disabled.
Only synthetic campaign capture/browser evidence is enabled inside the isolated
test process. Test-only legal version 3 explains the single registration attempt.

Session directory: .tmp/manual-capi-1034ac42-085b-4acf-a763-7706c960154f.
At preparation there is no new signup or Meta request. Receipt remains pending
the owner's prior cookie acceptance, new account and separate evidence checks.

## Controlled Registration Preview (2026-11-19)

Added a pure, local-owner-only CompleteRegistration test preview. It accepts the
resolved evidence, reviewed URL/notice and test code, but has no transport or
credential access. It rejects purchase values, click IDs, extra profile fields,
other conversions and non-test contexts; its output explicitly denies sending.
Fifteen focused preview/CAPI tests passed with zero skips and zero network calls.

Read-only disposable database audit confirmed one active Google patient account
and one active Google psychologist account created today. No names, emails or
identifiers were printed. There are zero current registration-notice consents;
those prior registrations cannot be sent retroactively. A fresh HTTPS test and
one external owner conversion were requested for explicit authorization. No new
tunnel, signup, external event, production enablement or deployment occurred.

## Registration Preference Notice (2026-11-19)

Updated the detailed preferences to cover psychologist account creation separately
from the first paid professional subscription. Purchase value/currency apply only
to Subscribe. Signup requires prior consent; login is not a new signup and later
acceptance cannot retroactively authorize account creation. Patient/clinical/card
data remain excluded. The compact banner and its white-text button are unchanged.

Frontend and backend now use lectum-meta-measurement-2026-11-19-registration.
Old Subscribe-only choices are invalidated rather than silently broadened. Ten
frontend policy assertions and two local PostgreSQL integration tests passed.
Production policy and local OAuth runtime still do not send to Meta. The running
OAuth API must load this version before any fresh test; no user test signup is
requested yet. Fresh provider receipt remains pending, not implied by UI checks.

## Professional Registration Delivery Resolver (2026-11-19)

- [x] Add a dedicated CompleteRegistration evidence resolver to the existing worker.
- [x] Re-read canonical active psychologist creation, claimed pre-registration guest
  consent, current account consent/revision and the linked browser identifier.
- [x] Keep the durable job ID/time; omit purchase value, email, name and profile data.
- [x] Verify rejection of patients, late browser capture, changed source/time/revision,
  obsolete notice, expired evidence and revoked guest consent in local PostgreSQL.
- [ ] Approve a registration-specific notice/source URL and run a fresh consenting
  owner test signup followed by receipt confirmation in Meta Events Manager.

Ten focused tests passed with zero skips, including PostgreSQL integration. This
is not Meta receipt evidence. Existing production policy remains blocked and the
new resolver's document/source policy defaults to null. No prior registration is
sent retroactively; the previous Subscribe-only test notice does not cover it.
No migration, external send, push or deploy was performed.

The owner reported successful real Google patient and professional registrations
and supplied screenshots. These are user/browser evidence, not an independent
database audit or proof that either registration was sent to Meta. The local
Google runner's login URL was corrected to the API-origin login endpoint.

## Local Release Validation And PR Draft (2026-11-19)

Local OAuth follow-up: user supplied a separate Google web client from
`lectum-ecosystem-homolog`. Its JSON was validated without logging the secret:
origin `http://127.0.0.1:3140`, callback
`http://127.0.0.1:4140/api/public/google/callback`. The ignored local runner
loads credentials from the user-provided file into memory, clears inherited
provider environment variables, uses only the disposable loopback database and
keeps Meta disabled. API readiness, local registration page HTTP 200 and the
Google authorization redirect/callback configuration passed. Real Google login
and account persistence still await the user's interaction; no success claimed.
No existing cloud OAuth client was modified by the agent.

Draft title: Preserve consent boundaries for patient registration, posts and WhatsApp.

Draft summary: keep patient Meta events disabled; preserve account creation and
posting independently of optional measurement; require current consent for internal
WhatsApp measurement; retain the approved compact cookie notice and detailed
preferences. Google patient attribution remains off rather than trusting an OAuth
consent snapshot. This draft does not authorize production tracking or deployment.

Validation in this round:
- Frontend and backend production builds completed locally. Frontend build used
  blank provider configuration, loopback API URLs and disabled Sentry uploads.
- Frontend full check passed; the 32 privacy/Pixel tests also passed explicitly.
- All 17 focused HTTP/PostgreSQL, registration, posting and consent tests passed
  with the disposable loopback database and scoped fixture cleanup.
- Eight WhatsApp browser scenarios passed (390/1440 widths, accept/refuse/revoke/
  unavailable). These are UI contract tests with synthetic API responses, not a
  live-provider or browser-to-database end-to-end claim.
- Cookie notice/preferences browser checks passed on mobile and desktop, including
  opaque background and white button text. Screenshots were visually inspected.
- Backend test prerequisites include a local JWT key of at least 32 characters
  and the disposable PostgreSQL service: legacy media-route tests query it.
- Admin installed dependencies were synchronized offline to its existing lockfile.
  Its Glob tests now normalize platform paths, matching the frontend test strategy.

Release checklist:
- [x] Preserve patient Meta blocking and avoid external event transmission.
- [x] Document local-only QA variables; exclude them from production configuration.
- [x] Use semantic cookie colors without changing the approved appearance.
- [x] Final combined root `pnpm check` passed for frontend, backend, admin and
      video. Backend: 1513 passed, 51 skipped, zero failures. Video: 100 passed,
      16 skipped, zero failures. Skipped cases are not claimed as validated.
      Final frontend production build also passed after the last code change.
- [ ] Complete real browser registration (email delivery and Google OAuth) and
      authenticated post publication against the isolated backend.
- [ ] Configure a dedicated test OAuth client and approved local callback. No
      Google client credentials exist in the inspected local backend env files;
      the user does not know whether a dedicated test client already exists.
- [ ] Review the complete accumulated TASK-333 diff, migrations and rollout before
      committing/pushing. No remote PR, commit, push or deployment in this round.

The current local preview at http://127.0.0.1:3140 is for UI inspection, not a
working OAuth test environment. Mocked browser coverage and repository-level
registration tests do not close the real-provider checklist above.

## Patient registration and posting review (2026-11-19)

- [x] Separate account/post persistence, legal/adult declarations, moderation and
  product notifications from optional marketing measurement.
- [x] Gate patient email signup attribution before browser identifier access and
  require explicit boolean measurement_allowed at the backend persistence boundary.
- [x] Keep patient Google registration functional without carrying optional
  analytics identifiers through OAuth, whose duration can outlive browser consent.
- [x] Verify patient posting with absent, accepted and revoked optional consent,
  retaining moderation and eligible recipient notifications.
- [x] Keep patient registration and post conversions blocked from Meta.

The email registration handler reads the current local choice at submission time.
Missing, refused, expired or revoked choice does not create/read an analytics
identity there. The backend ignores supplied patient signup analytics IDs unless
measurement_allowed is exactly true. This is a guest declaration, not proof of
authenticated account consent. Older clients remain able to register without
attribution. Existing professional attribution behavior is unchanged.

The Google patient persistence path ignores analytics IDs even if injected by a
client. No stale OAuth snapshot is treated as current consent. This intentionally
reduces optional attribution for that registration path; it does not affect login.

Posting already separates requested product operations from advertising. No new
post tracker was introduced. Source review and local PostgreSQL tests confirmed
that three posts (no choice/accepted/revoked) persist and notify an eligible
professional, while a moderated external-link post is blocked and not notified.
Anonymous presentation still retains the operational author ID; this is not an
anonymous database. Patient-to-patient notification filtering is unchanged.

Evidence: patient-flows.integration.test.ts exercises both real registration
repositories, real post service/moderation and notification dispatcher with scoped
disposable fixtures. Six registrations cover missing/refused/accepted declarations.
signup-identity.test.ts rejects nonboolean acceptance and preserves professional
behavior. Frontend source-contract and privacy-policy tests cover the submission
guard and refusal/expiry/revocation. No live Google login, email delivery, push,
Meta request or production deploy was performed. These tests do not establish
global analytics retention, historical erasure or consent coverage outside these
creation flows. Historical records were not deleted.

## Internal WhatsApp measurement boundary (2026-11-19)

Contact HTTP/notification verification: the authenticated integration test now
mounts the real directory router and invokes its controller, repository and
notification dispatcher against disposable PostgreSQL fixtures. A consented click
persists one contact and its correctly addressed in-app notification/delivery.
Repeated dispatch of the same contact does not duplicate the notification. Missing,
refused or revoked consent, wrong device, removed token and self-click create no
new contact/notification while preserving the contact URL. Unpublished profiles
return 404. Disabling recipient notifications preserves a consented contact record
but skips the in-app delivery with preference_disabled. The socket server remains
uninitialized; the recipient has zero push subscriptions and no push was sent.
This proves local persistence/dispatch decisions, not browser receipt, push-provider
delivery, concurrent notification deduplication or production readiness.

HTTP identity hardening: both measurement routes now run a scoped guard after
optional authentication. Unresolved Authorization headers or user-session cookies
force measurement_allowed=false instead of inheriting anonymous consent. Contact
access remains available; global optional-auth behavior is unchanged.
`backend/scripts/optional-auth-failure.test.mjs` passed with real Passport and
Express in an isolated process pointing only to an unavailable loopback database.
Eleven HTTP identity cases cover guests, unrelated cookies, malformed credentials,
expired JWTs and cookie capability. Nine denied cases also exercised both WhatsApp
action types through the real router/validator/controller: HTTP 200, tracked=false,
without database access. The existing unavailable-auth checks still return 503.
Twelve focused consent/CAPI tests passed; no production validation implied.

Authenticated HTTP/PostgreSQL verification now passes in
`backend/src/modules/marketing/whatsapp-auth-http.integration.test.ts`. It mounts
the real important-action router, validator, Passport and controller with two
disposable accounts and persisted JWT sessions in loopback-only PostgreSQL.
Bearer and cookie authentication record only with current consent. Refusal,
missing consent, revocation, expiry, wrong/missing device and removed session tokens
do not add records. A second consented account cannot reuse the first account's
analytics session. Repeated event IDs remain idempotent. Both WhatsApp action types
are covered; fixture cleanup is scoped to generated IDs. Fourteen focused tests
passed together, including the existing contact repository integration. No external
fetch was attempted. External notification delivery, broader analytics coverage
and production rollout are not established by this test.

PostgreSQL verification: `backend/src/modules/marketing/whatsapp-consent.integration.test.ts`
passed against loopback-only `lectum_stripe_test` on port 55443. Three disposable
accounts verified missing/refused/absent server consent, acceptance, event retry
idempotency, revocation, expiry, obsolete notice version, unavailable professional,
account/session ownership and preservation of prior anonymous records. Services
and repositories executed against real PostgreSQL; this is not an HTTP auth test.
Contact availability still returned a URL when measurement was denied. Fixture
cleanup was restricted to generated IDs and visitor ID; no reset or shared purge.
No notification service was invoked and the fetch guard recorded zero calls.

Browser verification: `frontend/scripts/whatsapp-consent-browser-smoke.mjs`
passed all eight combinations (390px/1440px; refuse, accept, revoke, unavailable).
Real cookie controls and profile CTA were exercised with synthetic API responses.
Refusal/revocation: contact lookup allowed, no WhatsApp analytics request; accept:
one WhatsApp analytics request; unavailable: no analytics or WhatsApp navigation.
Navigation was intercepted with HTTP 204; no real contact or provider request was
sent. No browser runtime errors. Screenshots are in `.tmp/whatsapp-consent-qa`.
This verifies the browser contract, not database persistence or authenticated
account isolation. Transition copy now describes preparation, not recording.

The contact-click endpoint still validates availability and returns the WhatsApp
URL when optional measurement is refused. It creates no contact_request (and thus
no click notification) without an explicit browser choice. Authenticated requests
also require current server consent; lookup failures deny measurement, not contact.
Guest requests use an explicit browser declaration, not verified account consent.
Older clients omitting the new optional field remain functional but unmeasured.

The important-action endpoint applies the same boundary to both WhatsApp event
types before session writes. These clicks no longer bulk-link past anonymous
actions/sessions to an account. The current consented session can still be linked;
this is not anonymous analytics. Other analytics endpoints are outside this change.
The UI records the action only after successful contact validation and rechecks
the local choice after the response. This is a validated click, not proof of an
opened app, conversation or appointment. No patient Meta event was enabled.

Retention policy and broader analytics consent coverage remain open.
No historical deletion, schema migration, deployment or live
event transmission is part of this change.

## Compact notice revision (2026-11-19)

Owner requested a maximum-three-line initial notice with only Accept cookies and
Preferences. Detailed Meta disclosure, the privacy-policy link and optional refusal
remain inside Preferences. Accept-all semantics and default-off optional switches
are unchanged. This supersedes the prior direct-refusal banner layout, not the
production transmission gates or the pending privacy/provider review.
Browser smoke now checks the three-line limit and refusal through Preferences.

## Single-click Meta notice (2026-11-18)

Owner requested that accepting cookies also authorize the disclosed Meta measurement,
without a second checkout or registration step. Updated banner and preferences copy,
kept optional controls default-off, added direct refusal to the banner, and bounded
the preferences panel with internal scrolling on mobile.

Frontend and backend now use lectum-meta-measurement-2026-11-18. Previous internal
notice grants are not migrated or accepted as this new authorization. The existing
single-click accept-all handler and revisioned server persistence are retained.

Validation: 30 frontend privacy/Pixel tests, 43 backend marketing unit tests, five
existing PostgreSQL integration tests and one new notice-version integration test
passed. Playwright mobile/desktop checks passed for accept-all, selective save,
refusal, reload, revocation and storage failure, with external requests blocked.
Frontend TypeScript passed. Screenshots inspected under .tmp/privacy-qa.

No new Stripe payment or Meta request was made. Integration fixtures verify canonical
payment recovery and consent checks, not a new provider end-to-end transmission.
Live checkout capture, reviewed source/account policy and production enablement
remain pending. The production transmission gates and collection flags stay closed.
The privacy notice is implementation copy, not a completed legal/provider review.
No schema changes, commit, version bump, push or deploy in this increment; TASK-333
remains incomplete. Full repository checks/builds were not run.


## Automatic Subscribe preparation (2026-11-18)

Owner screenshots now confirm the exact manual-sandbox-subscribe-60889c3e-e05d-4670-86ed-edeb5f008ad7
as processed by Meta, server origin, website, value 29.9 BRL. This supersedes the
prior pending UI-receipt status without changing the historical HTTP result.

Prepared the default scheduler resolver for professional subscriptions. It resolves
canonical payment/webhook evidence and its checkout operation, reads the persisted
browser reference without a live browser cookie, and checks the consent revision,
reviewed external notice version, account, exact URL, expiry, and capture before
payment. Only the approved fbp field would leave this path, not stored user-agent,
email, IP, patient fields, or the synthetic diagnostic identifier. Payment event ID
and timestamp are preserved across attempts; existing persistent queue deduplication
and fenced leases remain unchanged.

Production remains disabled. The new resolver policy has no approved account, URL
or external consent version. Existing internal campaign consent is not external
Meta authorization. Live checkout context capture, reviewed notice acquisition,
matching serializer policy, and a production rollout remain outstanding. Do not
flip environment flags to treat the manual success as completing these reviews.

Validation: four initial PostgreSQL consent/queue/subscription tests passed; after
the change, all eleven targeted tests passed (no skips), including persisted
resolver success, mismatched account/notice, missing approval, revoked/late consent,
queue deduplication and zero-network disabled paths. Only disposable loopback
fixtures were used. No new Meta sends, production deployment or payment occurred.

Final checks: 43 marketing unit tests passed without skips; backend tsc --noEmit
passed and Biome passed on all five changed source/test files. Fixed eager database
initialization by lazily importing the default resolver only when invoked. Manual
sandbox supervisor reached stopped on its original expiry. Full repository checks
and production build were not run; TASK-333 remains incomplete and uncommitted.

External notice draft for review, not published or treated as legal approval:
"Permitir compartilhar com a Meta a confirmacao da minha assinatura profissional,
o valor e a moeda, a data, o endereco da pagina de contratacao e um identificador
de navegador, para medir resultados dos anuncios da Lectum. A escolha e opcional
e pode ser revogada nas preferencias de privacidade. Nao inclui dados de pacientes,
dados clinicos ou dados do cartao."
Before collection, review the recipient/purpose/retention disclosure and publish
a distinct notice version with an unchecked, optional choice. Do not migrate old
internal consent into this version or retroactively authorize earlier payments.


## Owner-approved website Subscribe diagnostic sent (2026-11-18, 23:29 Brasilia)

After exact-field review, owner confirmed Site code TEST10505 by screenshot and
explicitly authorized the single send. Sent the immutable preview for the paid
sandbox journey to dataset 1606598847399888 once. Event ID:
manual-sandbox-subscribe-60889c3e-e05d-4670-86ed-edeb5f008ad7.
CAPI response: HTTP 200, events_received 1, messages [], error null.
UI receipt remains unconfirmed. Exclusive pre-send attempt marker prevents
reruns; no automatic retry. Production settings and account marketing consent
were not changed. This diagnostic is not validation of production attribution,
Subscribe eligibility for advertising optimization, or browser/server deduplication.

## Manual sandbox payment verified (2026-11-18, 23:24 Brasilia)

For run manual-capi-85975909-223b-45b1-aca5-754072744d1b, the owner
authorized diagnostic preparation before manually paying with a Stripe test card.
Read-only Stripe verification found an active test subscription and a paid BRL
2990-cent invoice at 23:22:32 Brasilia, with one invoice.paid inbox row.
Scoped financial reconciliation used the existing service for this subscription
only: complete, receipts_complete true, one local paid receipt. No new charge,
Meta request, production change, or marketing-consent mutation was performed.
The checkout-complete state and financial receipt are separate evidence; receipt
absence before reconciliation did not mean the sandbox payment failed.
Prepared a separate diagnostic preview, not the production marketing pipeline:
actual payment time/value, website source observed in the owner's checkout,
and a random hashed diagnostic ID only. No email, IP, browser identifiers or
card details. Exact payload and current Site code require review before sending.
Production consent and attribution eligibility remain unvalidated.

## Fresh manual sandbox preparation (2026-11-18, evening)

After the synthetic Subscribe remained absent in the owner's Site screenshots,
prepared a fresh protected browser session, not a resend or relabel of that event.
Run: .tmp/manual-capi-85975909-223b-45b1-aca5-754072744d1b; control port 3154;
one-hour expiry. Stripe test-account/key and loopback database assertions remain;
Meta delivery and production recording remain off. Current test-code metadata is
TEST10505, but no delivery has been wired or authorized by preparation alone.
Manual browser smoke passed: unauthenticated access denied, private files/webhook
not public, foreign-origin POST denied, verification-page content and registration
form available, email disclosure expands, Pixel absent. No registration/payment
submitted. PWA icon returned 404 in this restricted sandbox; core form worked.
User must stop before payment for the next review. This is not a completed
Subscribe end-to-end test or permission to reuse old consent for Meta sharing.

## Authorized synthetic Subscribe diagnostic (2026-11-18, 22:24 Brasilia)

Owner explicitly authorized one synthetic Subscribe request, not a real subscription.
Dataset 1606598847399888, TEST10505, action_source system_generated; no website
source spoofing, payment, actual user identifiers or production activation.
CAPI returned HTTP 200, events_received 1, messages [], error null.
Event ID: synthetic-subscribe-62111703-a6c1-41b5-8265-b8ef8f5ee187.
UI receipt remains unconfirmed. This does not validate website Subscribe,
production consent, payment integration, optimization eligibility or deduplication.
The one-shot attempt marker prevents automatic reruns.
Earlier complete SDK configuration recheck at 22:22 returned restrictedEventNames
[] with domain/ex_m/hme/r/v parameters; this is local-context evidence only.

## Subscribe eligibility and consent review (2026-11-18)

Outcome: NOT cleared for production activation. This is an engineering review,
not a legal opinion or provider authorization.

- Prior SDK evidence records restrictedEventNames containing Subscribe for dataset
  1606598847399888. This is a specific warning, not proof of a universal CAPI ban
  or the cause of the earlier missing UI entries. Successful local PageView does
  not supersede event-specific restrictions.
- Current privacy/preferences.tsx describes internal campaign measurement and
  association with the professional account (30 days before signup, up to 90 days
  after association). It does not identify Meta as an external recipient.
  Existing authorizeTransfer must not be repurposed as Meta-sharing permission.
- privacy/policy.ts versions choices, defaults transfer to false and rejects
  expired/obsolete choices. backend consent-policy.ts keeps acquisitionEnabled
  false and the campaign catalog empty. meta-capi.ts has no reviewed external
  notice version or source URL allowlist. Preserve all these gates.
- A future reviewed notice must identify recipient, purpose, actual events and
  identifiers, browser metadata, retention and withdrawal. Obtain a new,
  versioned choice for the new scope; do not retrospectively authorize old events.
  Approve the data contract and event eligibility before publishing final copy.
- Production Subscribe remains scoped to a verified first paid professional
  subscription, not patient treatment, plans-page views, renewals or sandbox
  payments. Do not rename events or change domain/category to evade restrictions.

Official-source check: on this date, Meta category help
https://www.facebook.com/business/help/1402913027039332 and Business Tools Terms
https://www.facebook.com/legal/technology_terms redirected to login/temporary
block. Their current contents and account-specific eligibility were NOT verified.
No inference from the fetch restriction about the owner's account is warranted.

Question prepared for Meta support (not sent):
For Lectum | Web, dataset 1606598847399888, our manual local PageView was processed
through browser and server. Our earlier SDK configuration listed Subscribe in
restrictedEventNames. The intended Subscribe represents the first paid subscription
by a psychologist to professional platform tools, not a patient's purchase of
healthcare. Is this event permitted for the actual production domain through Pixel
or CAPI, and usable for campaign optimization under this dataset's category?
Please confirm the applicable restrictions and review route, separately for receipt
and optimization. We do not intend to bypass restrictions by renaming the event.

No application code, saved consent, production settings or event policies changed.

## Confirmed manual PageView receipt (2026-11-18, 20:18 Brasilia)

Owner screenshots now supersede the earlier pending-UI status for the isolated
PageView diagnostic: Lectum | Web (1606598847399888), TEST89280, shows both Browser
and Server entries as Processado, received at 20:16:14. Both expanded entries show
event ID 39d7d860dbde3ef1e4b27d33a196b49d3add33d5e27c4ff8bb681a662178a4e0,
action source website and displayed URL http://127.0.0.1/.
This confirms receipt through both channels for this local test only. Matching IDs
do not independently prove applied deduplication. Production delivery, Subscribe
eligibility and campaign attribution remain unverified. Historical response files
retain their original uiReceiptConfirmed false diagnostic marker.

Read-only source review: metaTransmissionDecision always denies delivery;
meta-capi.ts has no reviewed source URLs or consent document version; the Pixel
session helper has no application caller in frontend/src outside tests. These
local source findings do not establish the configuration of the deployed runtime.
No new event, payment, production change, push or deployment was performed.

## Separate manual PageView diagnostic (2026-11-18)

Follow-up: owner manually ran PageView in ordinary Chrome. Saved response reports
HTTP 200, eventsReceived 1, messageCount 1, no error code; owner screenshots of
Test Events top and bottom show no event list. This does not prove bot filtering,
category enforcement, Pixel transport or production readiness. The first harness
discarded message contents; they cannot be reconstructed from the saved receipt.
Old attempt/result files are preserved without replay.

Correction adds bounded, allowlisted, secret-redacted provider messages/errors to
future receipts and an explicit local Pixel evidence snapshot (Resource Timing
endpoint labels/status when exposed, plus CSP violations). No raw URLs, request
bodies, headers or cookies are saved. Resource Timing is not a complete Network
capture and cross-origin status can be unavailable. It does not confirm receipt.
Two offline tests pass: redaction and intercepted desktop/mobile UI/HTTP guards,
including evidence persistence and duplicate CAPI rejection. No live Meta calls
were made during repair. Updated harness can be prepared separately on 3157;
starting it alone does not dispatch an event. Every new visit requires consent
and the CAPI button remains manual. No production change or deployment.

Owner explicitly chose a separate PageView test without payment. Read-only
preflight found the current disposable registration, no active stored campaign
consent and no checkout/payment. No past registration or payment is relabeled.
Subscribe restriction and production activation remain separate pending work.

Ignored harness `.tmp/manual-pageview.cjs` serves a loopback-only diagnostic on
3156 for 45 minutes. Its separate notice requires explicit sharing consent before
an actual visit; Pixel is then dispatched once and CAPI requires another manual
button. Original dataset 1606598847399888 is fixed. Test code is owner-confirmed
in the form. No production source, policy gate or provider restriction changed.
The browser Pixel may appear in dataset statistics, as disclosed; CAPI carries
test_event_code. Same event ID/name identifies the same visit across channels.

CAPI uses only actual browser UA, a hashed ephemeral diagnostic visitor ID and
optional actual fbp. No payment, account identity or patient data is read.
Credential stays server-side. Host/Origin/CSRF checks, consent, expiry, single-use
claims and exclusive receipt files guard the diagnostic. Unknown results do not
retry. Browser SDK dispatch and HTTP acknowledgement do not prove UI receipt.

Playwright desktop/mobile UI and HTTP guard test passed with a stub SDK and
injected transport, all other external requests aborted. Tested no pre-consent
SDK, no automatic CAPI, rejecting extra email field, same event ID, no reload
replay, stop and expiry. These are local tests, not evidence of Meta delivery.
An initial form Origin failure was fixed before release of the manual URL.
No new real event was sent during preparation. No commit, push or deploy.

## Fresh manual sandbox preparation (2026-11-18)

Follow-up UI repair: owner reported inert email registration and unavailable
privacy text. The initial smoke asserted only SSR visibility, not interactivity.
The sandbox-only legal SSR reader now uses the loopback API; the authenticated
gateway forwards only the dev HMR websocket, and the copied Next configuration
allows the current temporary hostname. Smoke now waits for client hydration,
clicks email registration, verifies the visible email input and published privacy
text, and checks the protected routes again. All passed without submitting a
registration or consent. Local screenshot confirms the expanded form. No
production source or provider restriction was changed.

Owner-authorized temporary HTTPS sandbox is prepared for a normal-browser action
against original dataset 1606598847399888 / TEST89280. No new registration,
checkout, payment or Meta event was submitted during setup. Automatic Meta sends
remain disabled; this is not a CAPI delivery validation or production activation.
The disposable participant, mail capture and evidence are isolated locally.

Gateway smoke checks passed: anonymous access 403, private files and public
webhooks 404, foreign-origin mutation 403, invalid local-control Host 403.
The local-control form grants a Secure/HttpOnly access cookie; registration
renders HTTP 200 without fbq or external requests in the smoke browser.
An initial control-page referrer-policy issue was corrected and the session
restarted. The active supervisor expires after one hour and disables the local
test offer during shutdown. Fresh user action and consent review are still
required before preparing any one-shot CAPI request. Do not reuse historical
event identity or treat automated page-load checks as manual-action evidence.

## Controlled Pixel preparation and UI evidence correction (2026-11-18)

### Follow-up SDK diagnostic (2026-11-18)

The fetched original-dataset configuration and runtime read-only inspection now
provide narrower evidence than the generic Events Manager heading:
- eventValidation.restrictedEventNames is ["Subscribe"] for 1606598847399888.
- prohibitedSources is empty in that response; this is not blanket eligibility.
- The real provider bot detector classifies the headless Edge test user agent as
  a bot, and bot_blocking_client_side_block_enabled evaluates true.
- InitiateCheckout is counted by the SDK, its command queue is empty and no
  consent/config fire locks remain, but no transport request occurs within 15s.
  Bot suppression explains this automated-test outcome; production delivery and
  the separate CAPI symptom remain unverified.

No SDK policy, user agent, automation flag or provider category was modified to
bypass detection. The harness now distinguishes completed diagnosis from event
transport validation and checks post-stop rejection. Every event endpoint stays
blocked by the harness; no real conversion or successful receipt is claimed.
Next delivery validation requires an actual consenting professional action in a
normal browser and a reviewed event/metadata contract. Do not substitute another
event name for Subscribe to bypass its restriction. Do not infer that this browser
configuration proves the cause of the historical CAPI issue.

The owner requested a controlled Pixel test while CAPI investigation continues.
Screenshots show an `Events blocked` heading with conditional explanatory text;
this is not proof of a specific enforced event restriction. Dataset category is
health/wellness provider, while the source-category dialog is empty. Neither
unrestricted eligibility nor a confirmed provider block can be inferred.

Added a local-only session coordinator for the original dataset, not a global
SDK loader or production activation. It checks explicit test authorization,
metadata review, professional context, exact checkout path without query/hash,
current versioned transfer consent before loading and again before dispatch.
It deduplicates within a session and stops on revocation or unknown SDK failure.
Caller-supplied action/context must come from a real isolated test, not fixtures.

16 policy/session/privacy unit tests passed using an injected SDK port; these
are not Meta integration tests. That initial run fetched no SDK.

Follow-up: added an opt-in loopback-only browser loader, with no import-time
installation, no existing SDK reuse, no query/hash/referrer, and consent rechecks.
An isolated Edge transport audit downloaded the official SDK and dataset config
once each. Every event endpoint was intercepted for abortion; no event delivery
was permitted. Its synthetic serialization-only call returned dispatched, but
no event request was observed in the five-second observation window. The audit
therefore failed its transport assertion. This does not establish a provider
restriction or successful receipt. No real conversion was claimed.
The same 16 tests pass with the loader imported.
Still pending: transport diagnosis, real-action wiring, browser metadata
inspection, isolated end-to-end delivery and provider eligibility confirmation.
Subscribe remains server-only. No production changes, push or deployment.


## Owner-authorized diagnostic dataset comparison (2026-11-18)

Owner created Lectum | Teste CAPI (1846546873030021), retaining the applicable
health-provider category and the original dataset, then authorized one Subscribe
send with TEST66765 and a separate private credential. Support described this as
diagnostic only, not a policy bypass. Original public-origin test remained absent
from the owner's Test Events screenshots despite its successful API receipt.

Read-only local database validation reproduced the prior public-origin payload
hash and rechecked current consent and unexpired browser evidence. Comparison
preserved event ID, actual payment time, historical public source URL, value,
currency, fbp and user agent. Only destination, credential and test code changed.
The historical tunnel remained stopped; no new payment or production activation.
One locked POST returned HTTP 200, events_received=1, messages=[], error=null at
2026-11-18T17:21:54.743Z (14:21:54 Brasilia). Comparison payload SHA-256:
36dafef99a62349952482e5139da9b71fdb080125647bd5086b8eb1bed757056.
Ignored receipts: .tmp/meta-owner-approved-comparison-20261118-*.json.
No automatic retry. Local PostgreSQL stopped afterward. UI visibility remains
pending; receipt does not prove policy eligibility or inactivity as root cause.
No production environment changes, commit, push or deploy. Validation-only run
and actual read-only reconstruction passed; full application suite not rerun.

## Authorized temporary HTTPS test (2026-11-18)

Owner authorized a restricted temporary public HTTPS sandbox and one CAPI test
send, then confirmed Website Test Events remained open with TEST89280. No
production deployment, real payment, general tracking activation or ID change.

Ignored harness scripts added a loopback-only authenticated gateway and an
ephemeral Cloudflare tunnel. Unauthenticated requests returned 403; configuration,
admin, webhook and source-map paths remained denied even with the access cookie.
Browser used the actual temporary HTTPS origin for registration, explicit consent,
email verification and native Stripe checkout. No payment response interception
or substituted event origin. Internal API BASE stayed loopback, matching the actual
local API and existing Stripe runtime guard; public WEB_URL and captured checkout
source used the tunnel origin. Production policies remained disabled.

Initial harness attempts stopped before payment due to dev websocket forwarding,
missing legal-query routes and incorrect internal BASE configuration. These were
corrected in ignored harness files only. Optional analytics, notification and dev
font requests remained blocked; this is not a full application visual regression
pass. Successful run preserved consent after tab/context changes and reload,
registered and verified a disposable account, completed one BRL 2990-cent sandbox
payment at 2026-11-18T16:45:34Z, matched its invoice.paid webhook, and reconciled
one canonical paid receipt. Persisted checkout context and current consent were
revalidated in a read-only transaction before transmission.

One locked POST at 2026-11-18T16:46:57.133Z returned HTTP 200,
events_received=1, messages=[], error=null for Subscribe/TEST89280/dataset
1606598847399888. Only fbp and browser user agent were included in user_data;
no email, phone, IP, clinical data or raw Stripe identifiers. Payload SHA-256:
9ae5d2287abefe8898c34ee57af9fdafc2f3fe99d8fc2e9ef90603ac414b1455.
Event ID: 59f7f05ed8ae1e6f0b316c317b1c56429fc5b7210f2795dccfd27f2f3694a49a.
Evidence expires 2026-11-19T16:45:13.264Z. Ignored receipts use
meta-owner-approved-public-test-20261118; preview is
meta-public-subscribe-review-20261118.json. Previous fixture pointer files were
preserved under .tmp/pre-public-test-20261118 before generating the new fixture.

Test offer disabled and test subscription canceled without proration or immediate
invoice. Tunnel, frontend, API, Stripe listener, SMTP and PostgreSQL stopped;
no listeners remained on their ports. Temporary public URL returned 530 after
shutdown; gateway access-token file removed. Node syntax checks passed for gateway
and browser harness; actual browser/Stripe/webhook/ledger/preview validation passed.
No full suite rerun: only ignored harness and documentation changed. No commit,
push or deployment. UI visibility remains owner-confirmation pending. HTTP receipt
does not prove visibility, attribution or that localhost caused earlier failures.

## Coordinated open-session attempt (2026-11-18)

Owner supplied the open Website Test Events screen with TEST89280 and explicitly
authorized one attempt. Revalidated the existing consent/payment/browser context
in a read-only local transaction; the approved payload hash, event ID and original
payment time were unchanged. One POST at 2026-11-18T15:54:49.995Z returned HTTP
200, events_received=1, messages=[], error=null. The prior session mismatch
warning did not recur. UI visibility, Meta deduplication and ad attribution are
not proven by this response and remain pending. No automatic retry, new payment,
production activation or deploy. Separate ignored attempt/result/diagnostic
receipts use prefix meta-owner-approved-open-session-20261118-1253; prior locks
remain intact. Local PostgreSQL is stopped after the attempt.

## Owner-authorized resend and actionable provider diagnostic (2026-11-18)

Owner explicitly authorized one controlled resend following Meta support advice.
Read-only local database validation passed before sending; consent and browser
evidence remained valid and the approved payload hash/event ID/time were unchanged.
Separate exclusive attempt/result files preserve the first attempt and prevent
automatic retries. At 2026-11-18T15:43:28.427Z Meta returned HTTP 200,
events_received=1, with a diagnostic stating TEST89280 does not match an active
Test Events session for this dataset and action source. Meta explicitly states
these received events will not appear in Test Events. This is confirmed for this
resend; the discarded first response message cannot be reconstructed.

Sanitized diagnostic retained locally in ignored resend diagnostics JSON. No
production flags, deployment, payment or event timestamp changed. Next step is
to open the matching dataset Test Events session and select the matching website
source, confirm its displayed code, and obtain separate authorization before any
further send. Do not assume receipt means policy eligibility or deduplication proof.

## Explicitly authorized one-shot Meta test (2026-11-18)

After reviewing the retained preview, the owner explicitly authorized one send.
Revalidated current consent, canonical sandbox payment, evidence expiry and exact
approved payload hash before sending one Subscribe with TEST89280 to dataset
1606598847399888. At 2026-11-18T12:51:11.123Z Meta returned HTTP 200 and
events_received=1. The response contained one provider message; its body was not
retained, so its meaning/severity remains unverified in Events Manager.

Ignored local attempt/result receipts prevent automatic retries. Do not resend
to recover the message. Events Manager visibility, message details and eligibility
still require review; this acknowledgement does not prove ad attribution or
Meta-side deduplication. Production transmission remains disabled; no deploy.
Retained fixture evidence keeps its existing expiry and cleanup requirement.

## Fresh offline preview retained for review (2026-11-18)

Owner authorized a new isolated session to prepare the exact preview, not send it.
Re-ran native frontend consent/registration/checkout in a disposable automated
browser, using synthetic campaigns and a Stripe sandbox test card. First payment
BRL 29.90 was confirmed at 2026-11-18T03:54:19Z. Existing invoice.paid inbox and
financial reconciliation completed; original/last acquisition, stored browser
context, current consent and stable event ID were verified without Meta requests.

Exact preview: ignored local .tmp/meta-subscribe-review-20261118.json, dataset
1606598847399888, test code TEST89280, transmissionAllowed=false. Payload SHA-256:
0c79691ba36962261f84579a68ddfd9009c631a0ee745f2d94ac6101969b146c.
Browser evidence and fixture records are retained for review; checkout evidence
expires at 2026-11-19T03:53:59.671Z. Revalidate consent, canonical payment, expiry
and payload hash before any separately authorized send. Do not replace expired
evidence, backdate it, or substitute a production source URL for the local URL.

The sandbox subscription was cancelled without proration/new invoice to prevent
renewal; its existing paid receipt and local evidence were retained. Local offer
disabled; API, frontend, Stripe listener and PostgreSQL stopped. Certificate/key
removed. No CAPI token was needed, no external Meta call, no production or deploy.
This automated browser proves preparation, not real-ad attribution or Meta receipt.
After approval/rejection or expiry, explicitly clean the retained local fixture and
preview/bearer files; expiry gates use but does not itself delete offline files.

## Supported runtime and Windows regression follow-up (2026-11-18)

- [x] Corrected the backend Glob regression fixture to use forward slashes for
  patterns and native-normalized returned paths, matching the existing frontend
  test. File matching, ignore behavior, cancellation and real template rendering
  assertions remain intact. All three focused dependency tests passed.
- [x] Downloaded portable Node 24.22.3 from nodejs.org and verified its official
  SHA-256 checksum. Used a disposable process PATH/shim; no global Node change,
  engine-range relaxation, dependency update or production environment edit.
- [x] Full frontend check passed on the supported runtime.
- [x] Full backend check passed on the supported runtime: 1552 tests, 1506 passed,
  zero failures and 46 conditional skips. Biome, runtime-dependency verification
  and Prisma/TypeScript validation passed. This supersedes the earlier Glob and
  unsupported-runtime blockers recorded below; the root workspace check was not run.
- [x] All 13 marketing PostgreSQL integration tests passed, zero skips, on the
  isolated local database with the supported runtime. Includes seven-day transfer,
  revocation/expiry, concurrency, recovery and out-of-order Stripe evidence.

Initial harness runs lacked local DATABASE_URL/JWT settings and started PostgreSQL
on its default port. These were setup failures, not passing validations; the final
integration run used port 55443 and an ephemeral process-only JWT secret. No Stripe
payment was created and no Meta delivery was attempted in this follow-up.
The controlled Meta send still requires separate approval and current Test Events
configuration; preparation approval is not production or transmission approval.
The isolated PostgreSQL instance was stopped after validation. No commit, push,
deploy, production migration or external marketing send occurred.

## Native checkout context and Stripe sandbox verification (2026-11-18)

- [x] Added a disabled authenticated checkout-context endpoint and an additive
  local-only migration. Serializable persistence uses the operation primary key,
  immutable browser/consent binding, and at most 24 hours of retention, capped by
  consent/identifier expiry. Revocation cascades and the existing purge expires it.
- [x] Added the separately disabled frontend bridge. It checks local and server
  consent, posts only operation/revision/document, and gives up within one second
  without a toast, sign-out or checkout failure. No new privacy dialog.
- [x] Actual isolated HTTPS browser flow: accept cookies, campaign A, close/reopen
  context with unchanged cookie expiry, campaign B, register and verify via local
  SMTP, automatic authorized handoff, native checkout capture, and one Stripe test
  payment of BRL 29.90. No payment-response interception in the final run.
- [x] Actual invoice.paid was persisted once and processed by the existing worker;
  existing financial reconciliation resolved the real first paid receipt. SQL and
  the read-only preview verified original/last campaign, current consent, stored
  context, HTTPS source, actual amount, and stable event ID on repeated reads.
  Test-mode Subscribe remained excluded and Meta requests were zero.
- [x] Focused tests: 20 backend tests (including real local PostgreSQL concurrency,
  consent, expiry, revocation and delayed attribution) plus 5 frontend tests passed.
  Backend build, full frontend check, scoped Biome and git diff --check passed.
- [ ] Full backend check is not green: 1505 passed, 46 skipped, one existing Windows
  Glob mail-template fixture failure in scripts/dependency-security-transitives.test.mjs.
  Node 24.16.0 is below the repository-required 24.22.1 minimum; rerun on that runtime.
- [ ] External activation still requires the approved per-event health/privacy
  matrix and restricted production policy, production migration/deploy authorization,
  and controlled Meta Events Manager delivery/deduplication validation. This run
  deliberately did not exercise Meta transport or change production gates.

The first native attempt exposed a missing test-only Next/Turbopack flag override;
payment and attribution succeeded but checkout context did not. Correcting only
the disposable harness and repeating the entire flow produced the successful run
above. The seven-day scenario remains a controlled-clock PostgreSQL integration
test, not a browser session left open for seven days. Pre-registration retention
remains the proposed 30 days; account consent/attribution are bounded, not indefinite.
The new context path currently permits only the configured test account; live
activation is not authorized by these test results. No deploy, push or Meta send.
Disposable sandbox subscriptions/customers were cancelled/removed, local fixture
records cleaned, the test offer disabled, and local API/frontend/PostgreSQL stopped.
The ephemeral browser bearer and self-signed certificate/private key were deleted.

## Browser UI handoff and stored first-payment preview (2026-11-17)

- [x] Real isolated Chrome/Playwright run used the existing privacy UI, accepted
  cookies, captured approved fixture campaign A, closed the browser context and
  restored its in-memory storage state in a new context. The Secure/HttpOnly/Lax
  cookie and its original expiry survived. Campaign B changed last touch.
- [x] Real local frontend/backend registration and local SMTP verification completed;
  the normal authenticated handoff issued one authorized consent grant, no extra
  privacy dialog, and no duplicate after reload. SQL verified identifier ownership,
  matching consent revision, claimed guest and removed raw guest browser copy.
- [x] Added prepareStoredSandboxPreview: resolve matching ID from persistent storage
  and original consent provenance, then compose the existing verified invoice.paid
  source into a read-only offline preview. Reject client-supplied fbp and extra fields.
- [x] Keep current checkout context separate from old identifier creation: the former
  must be consented, before payment and recent; the latter can originate seven days
  earlier with a still-valid original 30-day lifetime. Never backdate account consent.
- [x] Local PostgreSQL fixture test uses the actual SDK under a controlled Date clock,
  transfers evidence through the real consent repository, and preserves first payment
  event ID, actual receipt amount and BRL. Renewals/earlier payments, altered receipts,
  owner/context mismatch, expired ID, account/guest revocation and injected fields fail.
- [ ] Capture and bind the trusted checkout context in the isolated caller before a
  fresh real Stripe sandbox checkout/webhook test. The new composition is not a live
  route or an automatic delivery hook. This run did not charge Stripe or call Meta.

The UI context reopening and simulated seven-day payment test are separate validations,
not one seven-day browser-to-Stripe E2E. Browser fixture gates were overridden only in
temporary local processes with synthetic campaign allowlists. Source defaults, normal
frontend flags and all external delivery gates remain off. No production or deploy.
Build and scoped Biome passed; full workspace/backend check was not rerun in this
increment (previous Windows glob failure and Node runtime version gap remain open).
Current browser fixture user/acquisition were removed transactionally from local DB.
Screenshots: .tmp/sandbox-email-verified-mobile.png and desktop.png (same prefix).

## Anonymous browser handoff, still disabled (2026-11-17)

- [x] Reuse the existing consented anonymous acquisition token; no extra visitor ID.
- [x] Generate browser evidence only on a new consented visit in a separately reviewed
  professional campaign catalog. Defaults remain disabled and the catalog is empty.
- [x] Preserve the official fbp, first touch and original 30-day expiry across return
  visits; last campaign changes do not replace the first or renew identifier retention.
- [x] Transfer evidence in the existing authorized consent transaction; preserve actual
  account grant time and validate original claimed guest consent for pre-signup evidence.
- [x] Remove guest raw browser evidence on claim and remove transferred identifiers on
  guest revocation, even while collection is disabled. No identifier is returned in JSON.
- [x] Exercise the real public capture/revoke routes over local HTTP and PostgreSQL:
  cookie is Secure, HttpOnly, SameSite=Lax, limited to the private consent path.
- [x] Run 19 focused tests with zero failures/skips, including seven-day return after
  database reconnect, concurrent returning requests, campaign change, unauthorized
  transfer, idempotent claim, default-off, context exclusion, refusal, expiry and revoke.
- [x] Backend build passed using the explicit local test database configuration.
- [ ] Validate actual frontend/browser cookie persistence and registration end to end.
- [ ] Connect stored browser evidence to canonical first Stripe payment and the reviewed
  preview context; this increment is not a real Stripe checkout or Meta delivery test.

Migration 20261118020000_marketing_guest_browser adds two nullable paired fields,
applied only with pnpm db:migrate to 127.0.0.1:55443/lectum_stripe_test. No reset.
No frontend collection switch, Meta policy, token, checkout, recurring charge or
production setting was changed. Node remains 24.16.0 versus required >=24.22.1.
General backend check reproduced the preexisting Windows mail-template glob failure.
It completed with 1505 passing, 1 failing and 45 skipped tests; Biome, runtime
dependencies and typecheck passed. Database tests were enabled separately in the
19-test focused run, not in the general suite. Root workspace check was not rerun.
The browser identifier expires at the original 30-day boundary even after signup;
authorized campaign attribution retains its separate existing 90-day account limit.
The 30-day proposal and anonymous campaign eligibility still require privacy approval.

## Authenticated browser capture wired, still disabled (2026-11-17)

Installed exact capi-param-builder-nodejs 1.3.2 in backend with scripts disabled.
New additive marketing_browser_identifiers table stores token hash, consent owner/
revision, fbp, capture time and fixed expiry capped by 30 days/current consent.
The raw random token is only an HttpOnly, Secure, SameSite=Lax, path-scoped cookie;
fbp is never returned to frontend. No IP, URL, referrer, click ID or form is passed
to the SDK. Authenticated /marketing/consent/browser validates minimal revision/
document payload; backend code policy defaults false with no reviewed host, and
frontend call also defaults false. No environment switch overrides these gates.
The existing consented attribution effect calls the wrapper; while disabled it
makes no request. This effect also remains behind the existing attribution gate.

Read/reuse checks current persisted owner, professional role, consent revision,
document, grant, revocation and expiry. Expired/stale tokens do not resurrect IDs.
Revocation/regrant deletes stored identifiers; revoke clears the browser cookie.
Existing retention cleanup includes the new table. Cleanup scheduling remains a
required activation prerequisite. Generation is inside serializable transactions.
This increment covers authenticated accounts only, NOT anonymous cookie transfer.

Applied migration 20261118010000_marketing_browser_identifier with pnpm db:migrate
ONLY to 127.0.0.1:55443/lectum_stripe_test, no reset or production operation.
16 focused tests passed including generation by real SDK, consent rejection,
seven-day reuse, concurrent reuse, wrong owner/revision, expiry and actual revoke
deletion. Six broader consent/registration/attribution tests passed sequentially;
the preceding parallel run had one exhausted serialization-conflict failure in
registration-consent. Do not claim general concurrency validation from this run.
Backend build and frontend typecheck passed; scoped Biome passed. Runtime warning
remains: local Node 24.16.0 versus required >=24.22.1. Full repo suite not rerun.

Pending: actual application browser E2E including Secure cookie behavior, anonymous
transfer, linking stored capture to canonical checkout/payment source, fresh Stripe
sandbox first-payment flow and separately authorized Meta test delivery. No Meta
sends, production activation, commit, push or deploy. Before eventual publication,
apply additive migration before activating any browser capture or retention job.

## Official identifier validation and persisted consent binding (2026-11-17)

Added shared meta-browser-id validator for legacy Pixel, official two-character
language tokens and eight-character canonical base64url appendices. Validates
format byte 1, language range 1..6, change kind 0..3, bounded numeric core and
rejects whitespace/extra segments. Preserves official suffix unchanged through
CAPI serialization and sandbox preview; no generated replacement or stripping.
Sandbox preview reuses the existing READ ONLY persisted consent/payment resolver
(owner, revision, document, status and expiry). Additional identifier check rejects
creation before the current grant, capture before creation/future capture, and a
fixed 30-day identifier lifetime. Existing 24-hour capture and pre-payment evidence
constraints remain. No new route, cookie writer, consent table or runtime SDK added.

15 focused tests pass, zero skipped, including real isolated PostgreSQL with
disposable records, official appendix payload preservation and pre-consent ID
rejection. Biome passes for changed files. Local PostgreSQL stopped after tests.
Backend build passes; Node 24.16.0 still warns against required >=24.22.1 <25.
Full repository check was not rerun; previously recorded unrelated failures remain.
These tests validate persisted binding of supplied evidence, not authenticated
browser capture or actual Stripe delivery. The official generator is still only
in the ignored audit folder. Production collection and transmission remain off.
Remaining implementation: trusted consent-gated generator/cookie endpoint and
actual browser capture, then sandbox checkout and separately authorized test send.

## Official builder isolated audit (2026-11-17)

Pinned capi-param-builder-nodejs 1.3.2 in ignored .tmp/meta-param-builder-audit
only, installed with --ignore-scripts, no application manifest/lock changes and no
runtime dependencies. Registry integrity: sha512-P+VYIcO1JKPcoR1L5rK2mhwANh2JqF2rRNJD6Sj7u88ykDmHmQH/2SW9iqw/EIf2iqEDles1hV2IqauTppfFUw==.
Reviewed ParamBuilder, AppendixProvider and source network/logging references.
The explicit processRequest API allows empty query, only _fbp cookie and null
referrer/forwarded IP/remote address; no full framework request is needed. This API
is documented as deprecated, so any adoption must pin/review the replacement.
Default retention is 90 days; generated fbp has a fifth version/language appendix,
which current Lectum four-segment validators reject. Do not strip that appendix.
The builder is not consent-aware: the adapter must gate invocation and deletion.

Ran .tmp/meta-param-builder-audit/audit.cjs: 9 diagnostic scenarios passed, using
real library and Edge cookies, disposable consent fixtures and simulated server
time. Covered no consent/no invocation, generation without IP/fbc/referrer/source
URL, fixed 30-day cap, stable seven-day return, revoked/expired consent, malformed
input, current validator incompatibility, actual cookie removal and zero external
requests. New browser context restores in-memory storageState to represent a
returning session; no wall-clock seven-day wait or real account/payment occurred.
Network APIs are blocked during builder calls and all non-loopback browser
requests are aborted. Identifiers never printed or written to diagnostic files.
Cookie is HttpOnly/SameSite=Lax in HTTP loopback harness; a production adapter
would additionally require Secure, real consent binding and approved host policy.
No Pixel/CAPI loaded in this audit, no Stripe/token/database access. Browser and
server closed. npm audit for this isolated dependency: zero known advisories.

Pending: vetted appendix parsing in all affected validators, persistent consent
binding and revoke/expiry cleanup, adapter tests in the actual application, approved
retention after registration, then real sandbox first-payment and explicitly
authorized Meta test delivery. Diagnostic fixtures do not satisfy those gates.
No app checks/build rerun because no application code changed; diff check passed.

## Init-only cookie diagnosis and supported alternative (2026-11-17)

Inspected the actual downloaded cookie plugin, without invoking private functions
or tracking commands. Its configLoaded callback refreshes the click cookie, while
browser-ID creation Z(n) is called in the getCustomParameters event listener.
Repeat isolated run confirms this source structure, successful SDK/config loading,
zero event requests and absent _fbp. This explains the tested init-only behavior;
it is not a guarantee about all SDK versions or domains. Production untouched.
Current sandbox-subscribe-preview.ts requires fbp captured before payment. That
is a local test constraint, not a Meta requirement, and cannot currently be met
by init-only Pixel in this probe. Do not enable PageView just to satisfy it.

Official Meta capi-param-builder NodeJS documentation provides server-side first-
party cookie generation/persistence, including fbp. Correct the earlier broad
assumption that any server-generated fbp is necessarily fabricated evidence:
supported consent-gated generation is distinct from injecting a fixture. No
library installed or executed yet. Review its request extraction, optional IP,
URL/referrer defaults, cookie format and retention before adopting it; do not pass
the full Lectum request or silently broaden approved fields. Source:
https://github.com/meta/capi-param-builder/tree/main/nodejs
https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/fbp-and-fbc
Next engineering step: audit a pinned official builder and test an isolated,
consent-gated minimal-input adapter with all outbound delivery blocked. No actual
Subscribe delivery or new application collection was authorized by this probe.

## Reviewed SDK configuration probe (2026-11-17)

Following owner instruction to review the blocked request, inspected its metadata
without transmitting it: GET to the exact dataset configuration path, parameters
v/r/domain/hme/ex_m, no body, cookie, authorization or Referer. Inspected official
fbevents.js source: SignalsFBEventsModuleEncodings appends its module mapping hash
as hme and resolved module numeric encodings as ex_m; these are SDK metadata.
The temporary probe now has an explicit --reviewed-config mode. It allows only
the exact HTTPS dataset path with five unique validated parameters (stable release,
numeric version, exact local host, hex module hash, bounded numeric module list),
no credentials/body/Referer and no redirects. Other external requests remain blocked.
Actual result: SDK downloads 1, configuration downloads 1, SDK initialized, event
requests 0, other requests 0, tracking commands 0, _fbp absent. Context discarded
and server closed. This establishes absence only in this localhost/init-only probe,
not a universal claim about SDK cookie behavior. No fabricated identifier, PageView,
Subscribe, CAPI token access, application change, database change or deployment.
Actual browser evidence and end-to-end Meta delivery remain unvalidated. No app
checks/build rerun for this diagnostic-only increment; git diff --check passed.

## Authorized isolated SDK probe (2026-11-17)

Owner authorized SDK loading only in an isolated test browser, not event delivery.
Executed .tmp/meta-sdk-cookie-probe.cjs using bundled Playwright and headless Edge,
fresh nonpersistent context, local neutral page and service workers blocked.
Only the exact official fbevents.js GET was allowed externally, with redirects
disabled. All other external requests were aborted. No tracking commands issued.
Observed: SDK download 1, SDK initialized, event requests 0, configuration request
blocked 1, other requests blocked 0, _fbp absent. No cookie values were logged or
saved. Browser and local server closed. No token, database or production changes.
This restricted probe does not prove init can never create _fbp: the supplementary
configuration request was intentionally blocked. Review that request before any
broader SDK test; do not send PageView/Subscribe or invent browser evidence to make
the test pass. Actual consent-before-payment capture and Meta delivery remain open.
Application checks/build were not rerun for this temporary diagnostic-only change.

## Sandbox browser/payment composition (2026-11-17)

prepareVerifiedSandboxPreview composes canonical sandbox source resolution with
strict browser evidence validation and the test envelope. Requires the same user,
consent revision/document, capture between consent and payment, a maximum 24-hour
test-evidence age, valid fbp creation time and an explicitly reviewed source URL.
No arbitrary fields, account identifiers or Stripe references enter the payload.
Tested with disposable PostgreSQL records in READ ONLY transactions; 13 focused
tests pass, including wrong user/revision, late/pre-consent capture, missing/future
fbp and source query rejection. This is not a browser or real Stripe checkout run.

Actual consented browser capture is still absent. Meta's official fbp documentation
describes the website cookie/Pixel SDK origin; do not inject a fixture value, copy
another session's cookie or silently load Pixel to manufacture passing evidence.
No browser collector, public endpoint, sender, environment activation or deployment
was added. An isolated authenticated caller and approved actual source URL remain
necessary. Full suite and build were not rerun in this composition-only increment.
Reference: https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/fbp-and-fbc


## Read-only sandbox payment resolver (2026-11-17)

Implemented resolveSandboxSubscribeSource, separate from live delivery. Reads
test-mode Stripe receipt, complete invoice.paid inbox, owner checkout linkage,
complete reconciled lifetime contract history and first positive payment. Rejects
courtesy/free contracts, mismatched account/user/invoice, renewal, altered receipt,
refund/dispute and stale reconciliation. Current server consent revision/document
must be valid at payment and now. Returns only stable test event ID, amount/time
and consent evidence, never raw Stripe identifiers. Does not write a conversion.

Validated 13 focused tests with no skips, including PostgreSQL READ ONLY execution,
late/revoked/expired consent, pending webhook, earlier positive payment, live contract
exclusion and zero delivery jobs. Fixtures are synthetic disposable local records,
not a newly executed Stripe sandbox checkout. Scoped Biome and TypeScript passed.
The first build attempt lacked DATABASE_URL; rerun used only the local test URL.

Still needed: isolated owner-driven browser capture and caller pinned to local DB,
owner/account and approved actual source URL; connect resolver to test preview,
execute fresh real sandbox checkout and review the exact preview before separate
send authorization. No public endpoint, scheduler wiring, collection, send or deploy.


## Sandbox evidence availability audit (2026-11-17)

Read-only transaction against the disposable localhost:55443/lectum_stripe_test
database found zero financial receipts and zero completed invoice.paid inbox rows
for the approved Stripe test account, and zero currently active local consents.
No identifiers, secret values or personal data were printed. No Stripe/Meta API
was called and no rows were changed. Historical sandbox screenshots are not
current source evidence. The temporary PostgreSQL instance was stopped afterward.

A new participant-driven consent-before-payment flow is required; do not recreate
old consent, retimestamp old invoices or inject unit-test fbp values. Existing
temporary UI scripts include synthetic attribution overrides and are not a ready
owner-controlled Meta test harness. Genuine browser evidence capture and a verified
sandbox source resolver remain incomplete. External sending remains blocked.


## Owner-scoped test preparation approval (2026-11-17)

Owner identified himself as reviewer and explicitly approved preparation of a
controlled Subscribe test with his psychologist test account and Stripe sandbox.
Approved test fields: event name/time/id, actual positive BRL amount, actual
query-free source URL, fbp and client_user_agent after consent. No email, phone,
IP, clinical/community content, Stripe identifiers or real customer data.
This supersedes the pending field decision only for this limited test preparation;
it does not approve live collection, production eligibility, deployment or sending.
Actual origin URL and browser evidence must still be obtained and checked.

The pure preview now requires local/test/owner-test-account context, accepts only
Subscribe and fbp (not fbc), validates bounded nonempty control-free user agent,
and appends that field only to the test envelope. Production serializer/policy
remain unchanged. These context labels are assertions, not proof of a Stripe
payment or participant identity: the future runner must verify canonical sandbox
evidence before using the preview. No public endpoint or sender was added.

Validation: 12 focused CAPI/preview tests passed; no network calls. Full suite,
real sandbox payment/browser capture and Meta delivery were not run in this step.
Next: bind verified sandbox first-payment evidence and genuine consented owner
browser evidence, preview exact contents locally, then obtain separate send approval.


## Current API contract review (2026-11-17)

Official Meta v25.0 parameters documentation states website events require
client_user_agent, action_source and event_source_url. The current serializer
does not accept client_user_agent and the matrix explicitly leaves it unapproved.
The passing offline tests therefore do NOT establish API contract completeness.
Do not silently collect it or substitute the backend/Stripe webhook user agent.
Source: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/v25.0/

Next decision: controller/privacy review of a professional-only controlled test,
including actual event-origin URL, genuine authorized browser identifiers and
client_user_agent. No patient data or real customer test is authorized. Retain all
external gates until this decision and a separately authorized transmission.
After approval, implement the matching evidence lifecycle and updated serializer,
then validate the real Test Events response. Existing TEST code alone is insufficient.


## Offline Test Events preparation (2026-11-17)

- [x] Add a pure test-envelope preview reusing consent and minimal payload validation.
  The test code is supplied explicitly, never loaded by production delivery. No token,
  database, network, environment toggle, browser collection or bootstrap hook added.
- [x] Ten focused CAPI/preview tests pass, including zero network calls, stable event ID,
  paid BRL amount, invalid code, revoked/expired/missing consent and unreviewed sources.
  Synthetic identifiers exist only in unit fixtures, never sent to Meta.
- [ ] Real Test Events receipt remains unvalidated. The account screenshots establish
  availability of Test Events, not compliance approval or successful delivery.
- [ ] Approve event context, actual source URL, matching identifiers and consent notice;
  implement the approved resolver and check current API requirements before separately
  authorizing any controlled external test. Do not fabricate matching identifiers.
  The preview is not an executable sender and does not unlock production policies.


## Canonical delivery sources and recovery (2026-11-17)

- [x] Before future CAPI serialization, re-read canonical registration/checkout or
  recorded first-payment evidence. Check owner, source reference and exact occurrence.
  Subscribe additionally checks event ID/revision, actual BRL amount, receipt hash,
  invoice/payment/subscription references, checkout ownership and completed invoice.paid.
  Refunds, disputes, pending/missing webhook and changed amount fail closed.
- [x] Prepare bounded, keyset-paginated recovery for lost registration/checkout
  post-commit hooks. Reuse serializable enqueue and durable event identity.
  Canonical business records survive restarts; in-memory cursors only pace scans.
  A separately reviewed activation start is mandatory (currently null), excluding
  pre-activation actions and events outside seven days. No recovery runs now.
- [x] Add PostgreSQL assertions for source/time/owner/amount mismatch, payment-state
  changes and lost-hook recovery/replay. 45 targeted tests passed, zero skipped.
- [x] Correct the marketing attribution import ordering that blocked backend lint.

Validation: backend build, lint, runtime dependency check and typecheck passed.
Full backend check reached the complete test run but was not green: the existing
mail-template Glob regression test fails on Windows (empty matches for a backslash
pattern; reproduced independently). A media retention test also incorrectly matched
marketing retention imports; scope it to media retention and retain positive/negative
guard assertions. Its seven tests pass. The full suite was not rerun after that
test-only correction. Node 24.16.0 remains below the requested 24.22.1 minimum.
These are release blockers, not reasons to weaken Meta gates.

This supersedes earlier notes saying source validation and post-commit recovery
were entirely unwired. It does NOT complete matching/payload resolution or authorize
any external call. No fbc/fbp/fbclid collection or fallback email/IP/hash was added.
Scheduler still has no approved matching resolver, policies remain blocked, and
no new database schema, UI alert, deployment or production data access occurred.

### Required owner handoff before further activation-specific code

In Events Manager, select Lectum | Web (1606598847399888), then inspect Settings /
Manage data source categories / details for lectum.com.br and event restrictions.
Keep the accurate health-provider category and automatic data collection disabled.
Provide restriction details without tokens or user data; an empty list is not an
approval. Also inspect Test Events availability, but do not send test data yet.

The official Meta help URLs 1402913027039332 and 511197658391698 were retried;
both returned login/temporary-block pages. Account-specific eligibility remains
unverified. Next decisions are permitted professional events, matching identifiers,
actual non-sensitive source URLs, campaign catalog and retention/notice approval.
Only after these decisions can matching capture/resolver and controlled Test Events
delivery be finalized. Do not claim only an Ads Manager toggle remains, or launch
campaigns on the assumption this local foundation is already deployed.

## Anonymous consent at registration (2026-11-17)

- [x] Preserve account grant time; resolve earlier consent only from a server-recorded,
  claimed guest source linked through an explicitly authorized transfer.
- [x] Limit this exception to the canonical psychologist registration timestamp,
  matching source/user, current document and first consent revision. Never apply it
  to checkout, payment or regrant. Recheck evidence at enqueue, claim and delivery.
- [x] Test seven-day return with first/last campaign preservation, four concurrent
  enqueues producing one job, late account grant without backdating, missing transfer
  permission, expired/revoked/unclaimed/wrong-version guest evidence, guest revocation
  before retry, and regrant rejection. No real users or remote calls.

Registration and checkout now have gated post-commit hooks. Authorized consent
transfer also invokes a gated transactional registration hook, recovering the
ordering where account creation precedes transfer. All transmission policies remain
false; the transfer test confirms zero jobs through public gated entry points.
Storage primitive tests explicitly exercise future queue logic without Meta.
Scheduler scaffold exists but has no approved resolver and cannot start.

45 focused tests passed with the isolated PostgreSQL lectum_stripe_test database.
Scoped Biome passed. Full backend check stops at the pre-existing import-order
error in src/main/server/imports/write.ts (plus informational fiscal test lint).
Backend build passed (Prisma generation, TypeScript and aliases). Local Node 24.16.0
is below the repository's requested >=24.22.1; repeat release checks on supported Node.

Limits: no browser E2E or real Stripe/Meta delivery rerun in this increment.
Guest evidence is not retained beyond the existing 30-day window: absent/purged
evidence fails closed even if a registration job remains within its seven-day
delivery window. No new retention, schema, alert, collection or historical replay.
The generic acquisition resolver still requires account consent at event time;
an eventual approved registration payload resolver must handle the verified bridge,
not reuse that generic rule blindly. Post-commit checkout crash recovery and the
approved identifier/source URL resolver remain pending. No deploy or push.

## Revocation and retention wiring (2026-11-17)

Delivery jobs now carry an internal nullable user FK and consent revision. New
enqueue requires both, active psychologist ownership and current notice/consent
at occurrence and now, within a serializable transaction. Old ownerless jobs fail
closed. Regrant invalidates old jobs; revoke atomically deletes all account jobs,
including leased/completed metadata. User deletion cascades. Worker rechecks job
existence, lease and fresh account consent after payload resolution and before
delivery; supplied resolver consent cannot override database consent.

Existing opt-in MARKETING_ATTRIBUTION_RETENTION_ENABLED maintenance now also
cleans delivery metadata, independently of CAPI. Disabled remains the default;
only a local test enabled maintenance temporarily. Null-owner, expired/revoked
consent and inactive/deleted/non-professional owner jobs are removed. Existing
30-day operational retention remains proposed. No new environment key or timer.

Subscribe recording now calls the policy-gated enqueue in the same transaction
as its persisted event, only with eligible acquisition. Policy denies before queue
write, so no new collection is activated. No historical backfill or synthetic
conversion is enabled. Registration/checkout enqueue, approved source/identifier
resolver and outbound delivery scheduling remain unwired pending implementation
and review. This is NOT activation or evidence of successful Meta transmission.

Migration 20261117234518_marketing_delivery_owner applied via db:migrate only to
local lectum_stripe_test. Additive nullable fields preserve old versions; deploy
both delivery migrations before backend code since consent grant/revoke now touch
the queue. Rollback code leaves tables intact. No production migration/deploy.

Validation: 42 tests passed with none skipped, run serially against isolated local
PostgreSQL to avoid global-retention fixture interference. Added enqueue/revoke
race, leased revocation, regrant non-retroactivity and actual maintenance start/stop
with CAPI disabled. Scoped Biome and backend build passed; isolated API /health and
/ready returned HTTP 200. No new Stripe request or Meta send. General lint and
Node-version limitations recorded above remain release blockers. Test services
were stopped and disposable rows cleaned. No push/commit; TASK-333 remains open.

Revocation prevents subsequent authorization/retries but cannot undo an external
request already sent before revocation commits. External erasure obligations and
provider behavior still require review; do not claim atomic DB/network revocation.

## Durable delivery foundation (2026-11-17)

Added marketing_delivery_jobs, an additive metadata-only table, and a gated queue
entry point/processor. Unique event ID and conversion/source reference preserve
identity across concurrent enqueue/retry; changed identity/time is rejected. No
payload, email, click identifier, UTM, URL or clinical content is copied to jobs.
The processor requires fresh server evidence with the same persisted ID/time and
uses existing consent-at-event/at-send and compliance checks. Gates stay closed.

Claims use a two-minute fenced lease. Unconfirmed delivery uses the same event ID,
bounded backoff and at most 12 claims before review. Expired events cannot be sent
or re-enqueued; operational retention is proposed at 30 days from event occurrence,
with delivery eligibility capped at seven days. Maintenance exists but is not
scheduled: independent retention must be wired before collection/activation.
This is at-least-once delivery design, not an exactly-once network guarantee.

Migration 20261117233803_marketing_delivery_jobs applied using db:migrate only to
loopback lectum_stripe_test; Prisma client generated. 42 tests passed, none skipped,
including the real PostgreSQL queue test, concurrency/reconnect/fencing/retry cap,
terminal acknowledgement, expiry/purge and blocked entry points. Provider delivery
was NOT exercised; acknowledgement assertions test storage transitions only.
Scoped Biome, backend typecheck and backend build passed. Full backend Biome remains blocked by
existing import-order error in main/server/imports/write.ts and fiscal test infos.
Node 24.16.0 is below the repository requirement >=24.22.1; runtime alignment is
still a release prerequisite. No production database, deploy, push or Meta send.

Still incomplete: transaction-safe domain enqueue/resolvers for each eligible
event, approved identifiers/URLs/notice, independent maintenance/scheduler wiring,
revocation deletion integration and real Meta Test Events. Product hooks are not
connected to this foundation, so the new code cannot start collecting on its own.

## Recovery regression validation (2026-11-17)

Re-ran 41 marketing tests: all passed, none skipped, including six PostgreSQL
integration cases against loopback lectum_stripe_test. Added assertions that an
expired worker cannot defer a reclaimed job, cannot replace the new lease, and
cannot reschedule a completed job. Existing tests cover concurrent claims,
out-of-order evidence, interrupted acknowledgement, one durable conversion,
renewal exclusion, consent revocation/expiry and bounded delayed attribution.
Scoped Biome check passed. No business code or environment gates changed.

This run uses synthetic persisted Stripe evidence, not a fresh external Stripe
payment or signed webhook delivery. The prior synchronized-host sandbox browser
payment result remains separate evidence. No Meta network delivery, production
data, push or deploy. Durable Meta delivery/outbox wiring and approved matching
identifiers/source URLs remain unfinished; passing these tests does not make the
integration ready to activate. Local PostgreSQL stopped after validation.

## Accept cookies scope update (2026-11-17)

User explicitly requested that Accept cookies cover campaign measurement AND
anonymous-origin/account association, with explanation in existing text only.
Both banner and preferences acceptance now select all presented purposes; Save
preferences still honors individual switches. No extra dialog, toast or alert.
Guest choice persists an explicit authorizeTransfer flag; no flag, refusal,
pending revocation, expiry or old notice never implies authorization.

Frontend/backend notice version is now lectum-campaigns-2026-11-17. Old decisions
are not silently broadened. Existing choices require the ordinary notice for a new
grant; existing revocations remain effective. Backend/frontend must agree on the
version before grants succeed; mismatch fails closed during a later rollout.

Prepared account handoff uses the existing consent mutation and one-account token
claim: only an authenticated psychologist, an explicitly authorized valid guest
choice/token, and an undecided revision-zero account qualify. The mutation rechecks
the token/choice and current revision before submission. Existing account decisions
are not overwritten. Failure introduces no prompt and cannot infer consent.
The attribution feature gate is still false, so no such handoff/capture is enabled
in the shipped configuration. Meta event policy, identifier approval and empty
campaign/URL allowlists remain unchanged. Consent timestamps are not backdated.

Validation: 19 frontend privacy tests, 35 backend policy/CAPI tests, frontend
typecheck and scoped Biome/ESLint passed. Isolated browser QA uses real frontend
components with empty feed HTTP fixtures, blocking external traffic; it is not
production-data or authenticated signup/Stripe integration evidence. No new
database migration, provider configuration or dependency. No deploy/push.
Authenticated automatic handoff was subsequently validated with synthetic capture
enabled only in disposable local test processes. Real signup and local SMTP code
verification led to exactly one authorized consent grant, without extra clicks or
dialogs; reload did not repeat it. Local PostgreSQL confirmed revision one, one
consent event, first synthetic_a / last synthetic_b, a claimed guest token and
expiry capped at 90 days from account consent and by consent expiry.
The measurement-only browser scenario also completed signup/verification/reload,
with zero consent grants and no account consent or attribution rows in PostgreSQL.
Both test users and scoped guest data were removed. No Stripe customer/payment
was created; this run does not validate payment delivery or Meta delivery.

Final UI verification: mobile 390x844 and desktop 1440x1000 passed both accept
buttons, granular save, refusal, reload, revocation and quota failure. No Meta
requests observed; screenshots in .tmp/privacy-qa visually inspected. Sanitized
Next 16.4.5 production-mode build passed (95 static pages); preview stopped.
No deployed artifact, commit or production access. git diff --check passed.


## Owner matrix acceptance and delivery consent guard (2026-11-17)

Owner stated "matriz aprovada" and authorized continued technical work. Record this
as acceptance of the matrix/scope, not evidence of Meta account permissions or
approval of fbc/fbp, source URLs, final notice, transmission or deployment. The
individual activation checklist below remains open until its evidence is supplied.

Prepared CAPI delivery now requires the persisted business occurrence timestamp in
milliseconds, consistent with serialized event_time. Consent must cover that exact
instant AND the send/retry instant, with no revocation and the explicitly reviewed
document version. Later consent cannot authorize an older conversion; retries must
preserve the original event timestamp and ID. Sub-second ordering is not relaxed.
The reviewed external notice version remains null, URLs/catalogs empty, and the
hard event policy unchanged. No capture, queue discovery or provider call enabled.

Validation: 35 focused marketing-policy/meta-capi tests passed, none skipped.
Includes later consent within the same second, expiry at event/send boundaries,
revocation, obsolete notice, mismatched timestamps, absent allowlist and unchanged
retry identity. Scoped Biome and git diff --check passed. These are unit tests of
the real serializer/guard, not persistent queue or external delivery validation.
No schema, dependencies, checkout or recurring billing changed. No full integration
suite, health/ready smoke, browser test or production build rerun in this step.

Remaining engineering work: durable event resolver/outbox wiring, fresh server
consent lookup and revision binding on every attempt, retry acknowledgement and
crash/replay tests against isolated PostgreSQL. This guard does not make a remote
send atomic with a concurrent revocation, nor establish business evidence itself.


## Activation approval matrix (2026-11-17)

Decision record for owner/privacy review, NOT approval or a release authorization.
This matrix takes precedence over earlier readiness summaries. No collection,
Pixel, CAPI, production access or deployment is enabled by this document.

| Professional-only event | Required business confirmation | Candidate external data, subject to approval | Current decision and technical gap |
| --- | --- | --- | --- |
| CompleteRegistration | Successful committed psychologist registration, not form submission or login | Event name/time, durable event_id, reviewed non-sensitive source URL and separately approved matching identifier; no value | PENDING. Existing domain hook stops at the policy gate; resolver returns null. Consent timing, durable delivery identity/outbox and actual delivery remain to be implemented/validated before activation. No retroactive use of later consent. |
| InitiateCheckout | Actual successful start of the subscription checkout, not plans-page view, failed request or payment completion | Same minimal envelope; no card, plan detail, form fields or amount | PENDING. Confirm exact successful-start boundary and stable checkout identity. Browser command preparation is not an installed Pixel or durable delivery. Validate repeated clicks, retries and browser/server deduplication end to end. |
| Subscribe | Validated Stripe invoice.paid plus canonical paid ledger and lifetime first-paid history; positive actual BRL payment; exclude renewal, courtesy, free/zero, pending and sandbox conversions | Same minimal envelope plus actual amount paid / 100 and currency BRL, only if approved | PENDING. Local persistent evidence/recovery and signed sandbox flow have prior evidence; this is not a Meta delivery. Integrate approved consent-aware delivery with durable retry/acknowledgement before release. |

### Shared approval decisions

- Privacy reviewer/controller must approve each event's meaning and B2B context,
  dataset/domain restrictions, purpose, recipients, applicable legal basis and
  international transfer arrangements. Consent does not override Meta restrictions.
  Dataset health-category selection and empty diagnostics are not eligibility proof.
- Patient registration, Contact and CommunityPost remain BLOCKED. Do not rename
  events, move domains or create datasets to circumvent sensitive-context restrictions.
- Proposed retention: fixed 30 days before signup, then at most 90 days from
  authorized account transfer/capture, capped by consent expiry. The latter supports
  a bounded professional purchase decision. Both periods require privacy approval;
  neither is Meta's attribution window. No sliding renewal from returning visits.
- First touch remains immutable; last identified campaign is separate. Direct return
  does not overwrite campaigns. Only reviewed catalog values are accepted; raw UTMs,
  full URLs/referrers and free text are not approved for external transmission.
- Anonymous-to-account association requires its separate valid authorization.
  Revocation/expiry must prevent capture, resolution and pending delivery. Enable
  expiry maintenance before capture, and retain it if collection is later paused.
- fbc/fbp/fbclid are NOT approved. Current CAPI serializer requires fbc or fbp;
  without an approved matching strategy delivery must remain unavailable. Do not
  invent identifiers or silently fall back to email, hashed email, phone, IP,
  user agent, account ID or fingerprinting. Internal Stripe IDs stay internal.
- Review the final notice and preference text, including refusal currently only
  inside Preferences, for comparable ease of choice and withdrawal. A saved notice
  version or clicking Accept cookies is not blanket authorization for all sharing.
- Source URL allowlist and campaign catalogs remain empty. Review actual payloads
  and automatic browser metadata before any future Pixel loader; no automatic
  PageView, form collection, URL tracking or advanced matching is authorized.

### Evidence and release checklist

Prior runs recorded below: isolated PostgreSQL concurrency, deduplication, expiry,
revocation and out-of-order tests; simulated day-7 attribution; actual browser
registration and signed Stripe sandbox invoice with first/last campaign resolution.
Sandbox payment deliberately does NOT emit Subscribe. No real seven-day elapsed
browser run, physical iPhone validation or Meta Events Manager delivery is claimed.

- [ ] Named privacy/controller reviewer records date, notice/catalog versions,
  per-event decision, approved identifiers/URLs, retention and supporting restrictions.
- [ ] Engineering completes per-event resolver/outbox integration and verifies
  retries, consent revocation during delivery and no duplicate conversion on replay.
- [ ] Authorize a separate controlled Meta Test Events session with synthetic data,
  then verify receipt and matching event_id across channels, without production users.
- [ ] Re-run release checks for affected applications; document reviewed treatment
  of the remaining Picomatch advisory. Dependency risk is separate from privacy approval.
- [ ] User authorizes publication separately. Initial deployment keeps transmission
  off; activation is separately scoped to approved events after smoke validation.

Review evidence references (consulted 2026-11-17):
- ANPD cookie guidance: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais
- ANPD withdrawal rights: https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares
- Meta terms requiring authenticated review: https://www.facebook.com/legal/technology_terms
  Automated access returned a login/temporary-block page; no current terms or
  account-specific permissions were verified from that response. Obtain evidence
  through the account before approval; this matrix is not a legal opinion.

Implementation reviewed: backend marketing meta-policy.ts, conversion-hooks.ts,
consent-policy.ts, attribution-repository.ts and meta-capi.ts. All policies remain
unchanged and fail closed. Documentary review is not new end-to-end test evidence.

Matrix validation: re-ran marketing-policy.test.ts and meta-capi.test.ts via
tsx --test: 34 passed, zero failed/skipped. Includes zero network/identifier reads
through blocked hooks and inability of credentials/env opt-in to bypass policy.
git diff --check passed. No database, provider or browser E2E was rerun in this step.

## Validation resumed (2026-11-17)

- Local execution restored through an authorized shell; sandbox startup still fails.
- Re-ran `src/modules/marketing/*.test.ts`: 40 passed, zero skipped, against only
  loopback PostgreSQL port 55443 / lectum_stripe_test. Browser integration enabled
  with the existing isolated Playwright runtime. Initial missing-module failure
  resolved by setting PLAYWRIGHT_MODULE for the test process, without package changes.
- Frontend `pnpm test:privacy`: 18 passed. No optional collection or Meta delivery
  was enabled. Tests still prove fixtures/controller integration, not live signup
  UI or Stripe sandbox delivery. Earlier broader test totals are separate runs.
- Local configuration inspection found no STRIPE_* entries in root .env.local,
  no backend runtime .env (only examples and the untouched Meta secret file), and
  no STRIPE_* process variables. No secret values printed; no provider contacted.
- User screenshots show the dataset category saved as health/wellness provider,
  with no source-category entries or pending/blocked/confirmed events listed.
  These empty lists are NOT event eligibility approval. External gates stay closed.
- Remaining: real authenticated signup flow, Stripe sandbox signed delivery and
  recovery, supported Node (current 24.16.0), full build/check gates and privacy
  approval. No commit, push, deploy or production data access in this validation.

## Cross-session implementation (2026-11-12)

Supersedes the audit's implementation gaps below. Local code and isolated tests only;
no push/deploy, new collection, Pixel or CAPI activation.

- [x] First campaign is immutable; last identified campaign updates separately.
  Direct visits do not overwrite either. Only reviewed campaign catalog values are
  accepted; catalogs remain empty and fbclid remains excluded.
- [x] Browser retains only a random 256-bit bearer token and expiry, not URLs or
  campaign text. Server stores only its SHA-256 hash. Guest capture uses current
  consent and a fixed 30-day deadline, never a sliding extension from later visits.
- [x] Separate, default-off transfer choice in Preferences. Authentication alone
  does not authorize association. A manual preferences entry on plans is prepared
  behind the disabled capture gate, since onboarding normally waits for a paid plan.
  Existing signup, checkout and recurring billing behavior remains unchanged.
- [x] Transactional single-account claim with consent revision checks, replay
  protection, retry idempotency and revocation-before-capture tombstones. Claimed
  campaign copies are removed from the guest record; the usable browser token is
  removed after transfer. No fingerprinting or cross-device reconstruction.
- [x] Account acquisition is retained for at most 90 days from transfer/capture,
  capped by consent expiry. This bounded decision period supports delayed first
  payment without indefinite retention. First invoice resolution checks consent
  at payment and processing; revocation invalidates prior conversion references.
- [x] Additive migration 20261112195000_marketing_cross_session applied via
  pnpm db:migrate only to loopback PostgreSQL / lectum_stripe_test. Existing code
  and rows remain compatible; legacy attribution is bounded by consent expiry.
- [x] Expired data is immediately ineligible. Optional hourly purge removes expired
  server rows; MARKETING_ATTRIBUTION_RETENTION_ENABLED defaults false. Enable this
  maintenance before future approved capture and keep it enabled if capture is paused.
  Browser expiry is enforced on access; offline storage cannot be physically erased
  until the browser runs again. Network/storage failures fail closed and do not stop
  signup, navigation or payment.

Validation: 42 backend tests (none skipped), 18 frontend tests, backend build,
frontend typecheck, scoped Biome/ESLint, diff whitespace and mobile/desktop notice
smoke passed. WebKit used the real browser controller and public capture HTTP route
against PostgreSQL: campaign A -> close browser context -> reopen preserved storage
at day 7 -> direct return -> campaign B -> explicit transfer to a disposable account
-> first paid invoice evidence -> one blocked Subscribe linked to campaign A.
Bank fixtures supplied the account and already-verified Stripe inbox/ledger; this
is NOT a live Stripe request, full signup-form E2E or signature-delivery test.
Also covered refusal, expiry, revocation/reload, quota errors, late responses,
same-token two-account races, last-touch changes, first-payment deduplication and
out-of-order invoices. Edge removed the synthetic UTM query before navigation;
WebKit independently passed without disabling browser privacy protections. No
fallback reconstructs stripped parameters in the product.

Remaining release gates: supported Node version (host remains 24.16.0 vs >=24.22.1),
full repository/frontend production-build checks, authenticated UI flow through the
real registration form and actual Stripe sandbox signature delivery/recovery.
Privacy review must approve notice purpose/version, 30/90-day retention, campaign
catalog and allowed roles. UI association copy still needs review with the gate on
in an isolated environment. Meta dataset restrictions and Test Events remain pending.
Current gates: CAMPAIGN_ATTRIBUTION_ENABLED=false, acquisitionEnabled=false, empty
catalogs, META_CAPI_ENABLED=false and unchanged hard external event eligibility.

Future rollout: apply additive migration before enabling any capture; approve and
version notice/catalogs; enable independent retention; validate sandbox flow; only
then consider a separately authorized capture rollout. Rollback switches collection
off while keeping revocation/expiry maintenance available; do not drop the tables.
No new production secret is required. The local CAPI secret was not opened or changed.

## Privacy notice UI continuation (2026-11-12)

This section supersedes the consent-UI/psychologist-only statements in the older
snapshots. Local implementation only; NO deploy, push or Meta activation.

- Dark floating notice follows the supplied WhatsApp reference, with Lectum blue,
  white body copy, highlighted policy link, Aceitar cookies and Preferences.
  Refusal remains inside Preferences per the requested follow-up; legal review is pending.
  Preferences use existing Modal, RHF/Zod form foundation and switch controllers.
- Necessary storage stays on; campaign measurement starts off. The policy page
  exposes a permanent preferences action. Mobile navigation and safe areas remain
  clear; invitations yield to login, onboarding, composers, dialogs and inputs.
  Existing notification/PWA coordination reserves only one prompt at a time.
- Reuses the existing private marketing consent API and serializable repository.
  Both active patient and psychologist accounts can record preferences; acquisition
  remains psychologist-only and the approved campaign catalog remains empty.
  Notice version is lectum-campaigns-2026-11-12. Versioning the requested UI is NOT
  approval of Meta eligibility, policy/legal adequacy, or external delivery.
- Anonymous choices are versioned first-party browser preferences (90 days), not
  server proof for conversions. They are never assigned to an account on login.
  Authenticated grants require server confirmation/current revision. Denial wins
  locally before revocation; pending revocation survives reload where storage works
  and retries once per visit. Errors are visible, not converted into acceptance.
- Existing page-view/location measurement now mounts only with optional consent.
  Pixel SDK and CAPI remain blocked independently of preference and credentials.
  No new URL/form/UTM/fbclid collection was added to this notice.
- Isolated browser QA uses the actual local app, empty feed fixtures and blocks all
  external requests. Screenshots: .tmp/privacy-qa/{mobile,desktop}-{notice,preferences}.png.
  Real PostgreSQL tests use loopback 55443 / lectum_stripe_test, never production.

Validation: 10 focused frontend tests and 36 focused backend tests passed, including
two real-database consent tests. Frontend/backend TypeScript and scoped ESLint passed.
Full frontend pnpm test again reaches the existing two Sentry/Glob Windows failures;
those dependency tests are unchanged. Node 24.16.0 remains below the repository's
required >=24.22.1. Review design-qa.md for browser evidence and limitations.

Pending before release: visual approval, published privacy notice/legal review,
full checks on the supported runtime and authenticated end-to-end UI validation
against the local backend. Meta activation additionally requires dataset restrictions,
event/identifier eligibility and campaign catalog approval plus Meta Test Events.
No live Meta/Stripe validation was attempted and the CAPI token was not read or changed.

## Current continuation - real database and recovery (2026-11-12)

This section supersedes the earlier progress snapshots below. NO DEPLOY, push,
live provider configuration or Meta transmission is authorized or performed.

- [x] Additive migration `20261112165732_meta_consent_recovery`: consent revisions,
  audit history, consent-bound campaign attribution and durable internal Subscribe jobs.
  Applied using `pnpm db:migrate` ONLY to a newly initialized local PostgreSQL 18
  cluster on loopback port 55443, database `lectum_stripe_test`. No production data.
- [x] Persistent first-conversion uniqueness and stable event_id verified under
  simultaneous transactions against real PostgreSQL, not an in-memory repository.
- [x] Discovery reuses signed Stripe inbox records; no second webhook or gateway.
  Renewable worker lease, compare-and-set ownership and bounded backoff recover an
  interruption after conversion commit without recording another conversion.
- [x] Pending verification/financial reconciliation remains retryable, including after
  12 attempts. Renewal received before the first paid invoice is excluded using the
  complete ledger, not webhook arrival order. Storage failures retained for review
  after 12 attempts; no record is silently discarded or externally delivered.
- [x] Consent uses server timestamps, document version, expiry, serializable revisions,
  affirmative decision and authenticated owner ID. Repeated grants do not extend
  expiry or overwrite first-touch attribution. Revocation deletes the attribution.
  Old/revoked/expired consent, unknown notice and unapproved campaigns fail closed.
- [x] GET `/api/private/marketing/consent/status`, POST `/grant`, POST `/revoke`
  follow existing auth/validation/service/repository infrastructure, no-store responses.
  Grant restricted to active psychologists; patient transmission remains prohibited.
  No user ID, consent timestamp, URL, form data or fbclid accepted from the request.
- [x] Subscribe keeps only a consent-revision reference, never a campaign snapshot.
  Attribution requires consent valid at acquisition, payment and current resolution.
  No retroactive collection; existing internal analytics UTMs are not repurposed.
- [x] New internal worker runs after existing billing work, is disabled by default,
  and requires META_SUBSCRIBE_RECORDING_ENABLED plus explicit META_SUBSCRIBE_START_AT
  (UTC ISO timestamp, e.g. YYYY-MM-DDTHH:mm:ss.sssZ). Existing Stripe scheduler and
  ledger must already be enabled. This is not a CAPI delivery queue.

Current validation: 39 focused tests passed, zero skipped, including THREE real
PostgreSQL integration tests covering consent races/revocation, persistent dedup,
out-of-order processing, expired lease takeover, restart after committed conversion,
account isolation and backoff/review states. Fixtures are disposable and cleaned up.
Webhook signature/capture projections are supplied as local test fixtures; this is
not a live end-to-end Stripe webhook test. No live Stripe/Meta requests were made.
The separate environment-template suite passed all five tests after updating the
default-off production example. Backend TypeScript checking passed.
Backend `pnpm build` passed. After the focused tests, all six inspected fixture
tables (users, consent, consent audit, attribution, jobs and payment_events) were
empty again. Only the disposable local schema/migration history remains.

Full backend check initially reported 1493 passed, 35 skipped and two failures:
the environment-template coverage (fixed and rerun successfully) and an unrelated
mail-template Glob path test on Windows. The latter is outside this change and
remains a publication blocker. Node here is 24.16.0; project requires >=24.22.1 <25.
The complete task remains in progress; no completion/production-readiness claim.

Final root `pnpm check`: version/container logging, secrets, encoding, ADR/task
integrity, source safety/size, environment documentation and import cycles passed.
Frontend Biome, ESLint and TypeScript passed. The root run stopped at TWO existing
Glob path regressions in frontend/scripts/dependency-security-transitives.test.mjs
(Sentry legacy/current plugins), with the same empty-result Windows pattern as the
backend mail-template test. Unrelated dependency code was not changed. Downstream
root suites were not reached; backend check/build were executed separately above.
The temporary PostgreSQL cluster was shut down cleanly after testing. No commit,
push, deploy, production data change or Meta event transmission occurred.

### Remaining activation gates

- Meta dataset restrictions and health-context review; patient events stay blocked.
- Approved optional notice/version, campaign allowlist and retention policy. The
  runtime notice is intentionally null and campaign catalog empty; grant returns
  unavailable even with environment credentials. Tests inject a test-only policy.
- Consent UI plus pre-signup/session acquisition handoff and checkout continuity;
  authenticated persistence is ready, but anonymous campaign capture is NOT enabled.
- Approved current-consent resolver for external delivery (pinned revision), eligible
  identifiers, server-only token/API version, retry/outbox for actual CAPI delivery,
  and controlled Meta Events Manager plus mobile/desktop validation.
- Audited legacy/courtesy/trial history and operator recovery procedure for jobs in
  review_required. Do not classify unknown historical payments as a new subscriber.
- Resolve full-check/runtime discrepancies; validate signed Stripe webhook end-to-end
  in an isolated provider test setup before activation. No provider test keys used here.

Deployment is explicitly prohibited in this request. When later authorized, apply
the additive migration before exposing consent endpoints, keep all flags false,
and do not backfill or send old blocked records merely because approval changes.
Rollback leaves the additive tables in place; do not drop stored consent history.

## Stripe continuation (2026-11-12; supersedes legacy inventory below)

The previous checkout was stale (0.1.804). Fetched origin and fast-forwarded homolog
to 00ac0e982 (0.1.826), preserving local changes. Stripe is the current provider.
Resolved overlapping documentation/env additions; restored the current checkout
dispatcher exactly, removing our obsolete Mercado Pago checkout callback.

Existing signed intake: billing/stripe/inbox.ts. Existing canonical captured-payment
proof and durable receipts: payment-gateway/stripe-invoice.ts and
billing/stripe/financial-ledger. No second webhook or Stripe API client added.

Subscribe observation is invoked only after applied, completed financial reconciliation.
It requires a completed signed invoice.paid inbox record, the original checkout
PaymentIntent, a matching immutable financial receipt and complete coverage of all
local contracts, including deleted/cancelled contracts. Legacy/unknown history fails
closed. A profile with courtesy or legacy history is conservatively held for review;
conversion after free trials/courtesy is NOT supported by this first version.

Internal evidence reuses payment_events with isolated gateway namespace
marketing_stripe_subscribe and type Subscribe.blocked. The existing unique
(gateway, external_id) key is scoped to the psychologist for lifetime deduplication;
the payload pins Stripe account, invoice, invoice payment, PI, subscription and event.
Serializable transaction + upsert preserve a random persisted 64-hex event_id.
No schema change, migration, queue or analytics dashboard was added. Financial
reports filter actual gateway names and do not consume this internal namespace.

Amount is the verified receipt's amount_paid_cents (canonical invoice.amount_paid,
cross-checked by existing adapter with PI and capture), not catalog price. BRL only.
Zero, pending, free, courtesy, refunded, disputed, unverified and non-live payments
are not recorded as a new paid subscriber. Existing paid receipt selected before
status filtering prevents a later renewal replacing an earlier refunded payment.

No campaign data is copied. acquisition_user_id preserves linkage to existing signup
attribution; purpose-specific persisted consent and approved campaign snapshot are
still pending. Internal attribution records are not modified. There is no external
delivery or historical replay authorization, even with CAPI credentials present.

META_SUBSCRIBE_RECORDING_ENABLED=false is a new optional INTERNAL recording gate.
Keep it off pending database tests, history audit, and retry/order validation.
Existing BILLING_STRIPE_LEDGER_ENABLED also gates the underlying reconciliation.
Errors in the marketing observer do not fail financial processing. Automatic
durable retry of a failed observer, or an invoice.paid processed after financial
reconciliation, remains pending; manual replay of the existing reconciliation can
re-evaluate safely. Do not enable this implementation before resolving that gap.

Validation: 57 focused tests passed, one real PostgreSQL persistence/concurrency test
was skipped because an isolated configured database is unavailable. No backend
.env is present and Docker is not installed on PATH. Dependency versions were synced
from the lockfile and Prisma types regenerated without contacting a database.
Node is 24.16.0; repository requires >=24.22.1 <25. No live Stripe or Meta calls,
provider configuration, commit, push or deployment. Local implementation remains
INCOMPLETE, not release-ready. Backend TypeScript static checking passed.
The real database integration test was SKIPPED, NOT passed. Database persistence
and concurrent deduplication have NOT been verified by execution. Biome passed
for the touched marketing and financial-ledger service files.

Final checks: root check passed version, secrets, encoding, ADR/task integrity,
source-safety, env documentation, source size and import cycles. It stopped at
frontend types because refreshed Stripe dependencies were missing locally; frozen
lockfile install corrected that and frontend tsc then passed. Root full suite was
not rerun to completion. Backend check passed Biome and production-dependency
validation, then stopped because DATABASE_URL is not configured. Backend standalone
tsc had passed with generated types; this is not a database/integration validation.
No health/readiness, full builds, end-to-end signed webhook, real database test or
Meta Events Manager validation was completed. No new production readiness claim.

Official references: https://docs.stripe.com/invoicing/integration and
https://docs.stripe.com/webhooks (invoice.paid also includes out-of-band payments;
the existing captured-payment proof is therefore required, not just event name).

Status: local disabled integration in progress; activation blocked by compliance review.
Date: 2026-11-12. No push, deployment, external events or provider configuration.

## Owner update (2026-11-12)

Owner supplied dataset `Lectum | Web`, ID `1606598847399888`, domain lectum.com.br.
Category was not manually selected; actual restrictions remain unknown. This is NOT
approval of events or exemption from health-data restrictions. Owner authorized
continued implementation only with all external transmission disabled. CAPI token
will be provisioned later, exclusively as a server secret.

Continuation delivered locally:
- CAPI configuration reader with optional envs, default false, no API-version fallback.
  Dataset is documented in backend/.env.example, not written into live environment.
- CAPI serializer with strict field allowlist and exact reviewed URL list (currently
  EMPTY). No query/hash/referrer/form data, emails, IPs, UTMs or clinical fields.
- CAPI transport prepared with bounded timeout, no redirects, sanitized failure result,
  no raw provider logging. Compliance gate runs BEFORE env/consent/identifier resolver.
- Registration hooks after committed transactions for email and Google signup; not login.
- CommunityPost hook after successful create, patient-only, no post content/ID passed.
- Contact hook on existing patient WhatsApp action ingestion, no provider/target/URL passed.
  This remains a reported click, not proof of a conversation; anonymous roles are not inferred.
- Checkout-ready browser hook after payment form readiness, excluding courtesy renewal.
- Pure manual Pixel command preparation disables autoConfig, omits PageView/automatic
  matching parameters and rejects Subscribe/Contact/CommunityPost. No commands executed.
- Zero event collection/queueing while blocked, no deferred replay on future consent.

Important limitations: these hooks currently terminate at the gate. Resolver remains
null until persisted consent and durable outbox are integrated. CAPI has no production
caller able to transmit; Pixel loader is deliberately absent (loading SDK itself may
expose location/referrer). Subscribe is NOT wired to webhooks yet: full first-ever
payment history and persistent uniqueness must be implemented before that connection.
Do not describe this as a completed conversion measurement rollout.

Continuation validation: 33 backend policy/transport/gate tests and 3 frontend
Pixel-policy tests passed (36 total). TypeScript noEmit passed for backend and
frontend. Biome passed for all touched source files. Source-contract tests check
post-commit hook placement; they are not authenticated end-to-end signup/payment
tests. Network spy verifies zero fetch calls in blocked handlers. Full checks/builds,
database integration, browser device testing and Meta Events Manager tests remain
pending. No live secrets, real events, schema changes or deployments were used.

## Request and inventory

Implement marketing conversions without a new analytics system. Existing internal
analytics already records UTMs in page_view_event and links visitor/session identity
to registration. Do not forward that raw health-context dataset to Meta.

- frontend/src/components/analytics/page-view-tracker.tsx captures UTMs (session scope,
  not a verified first-touch marketing attribution record).
- backend/src/modules/api/public/analytics/page-view/repositories/PageViewTrackingRepository.ts
  stores UTMs and links visitor records to users.
- backend/src/modules/api/public/analytics/helpers/signup-identity.ts preserves signup identity.
- backend/src/modules/legal/registration.ts processes legal acceptance and promotional
  authorization. Neither is evidence of specific, optional Meta measurement consent.
- backend/src/modules/api/public/billing/webhook/use-cases/services.ts validates the
  Mercado Pago signature, stores idempotent notifications and reconciles subscriptions.
- backend/src/modules/billing/payment-gateway/invoice-payment.ts reads payment facts.
  A webhook notification or active subscription alone is not payment confirmation.
- At initial inventory no Meta Pixel/CAPI implementation existed in frontend/src or backend/src. Provider-side
  injections were not audited. No credentials were read or requested in chat.

## Compliance disposition

| Conversion | Meta name | External transmission |
| --- | --- | --- |
| Patient registration committed | CompleteRegistration | Blocked: health-service context |
| Patient WhatsApp click | Contact | Blocked: provider/patient relationship context |
| Patient post committed | CommunityPost | Blocked: health-community participation context |
| Professional registration committed | CompleteRegistration | Pending B2B and dataset review |
| Professional checkout started | InitiateCheckout | Pending B2B and dataset review |
| First professional paid subscription | Subscribe | Pending B2B and dataset review |

No event has been approved for transmission. Removing text, hashing identifiers,
renaming events, CAPI instead of Pixel, or consent alone is not a workaround for
Meta restrictions. Do not create a new dataset/domain to evade categorization.

Official references consulted 2026-11-12:
- https://www.facebook.com/legal/terms/businesstools
- https://www.facebook.com/business/help/361948878201809
- https://www.facebook.com/business/help/467621355878794
- https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events/
- https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.html
- https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf

Meta official pages were unavailable through the research tool (login restriction/429).
Do NOT treat secondary articles or this technical assessment as legal approval.
LGPD health/sensitive data, purpose limitation, minimization, withdrawal and sharing
need the controller's privacy review. Dataset restrictions must be checked in Events
Manager. User was asked for dataset ID and category/restriction screenshot, not a token.

## Implemented locally

- [x] Deny-by-default policy for all six requested conversions.
- [x] Explicit patient health-context block, separate pending B2B review.
- [x] Pure campaign filter: consent + exact server-controlled approved-value catalog.
  No arbitrary UTM forwarding or health-word regex pretending to prove eligibility.
- [x] Separate fbclid permission; no capture/storage without approval and consent.
- [x] Deterministic opaque event_id helper. Not a persistent deduplication ledger.
- [x] First-paid candidate rules using existing gateway contract, no plan-price fallback.
  Reject unverified signature/history, renewals, existing records, free/courtesy,
  sandbox, pending/rejected payments, wrong currency/reference and refunds.
- [x] Focused validation: 27 tests passed with `pnpm exec tsx --test
  src/modules/marketing/marketing-policy.test.ts`; Biome check passed for all five
  new source files. No network/database access or real marketing events in tests.
  Backend `pnpm exec tsc --noEmit --pretty false` also passed. Full root check,
  builds, browser QA and Meta Test Events were not executed; runtime integration
  is blocked and no application flow was changed. No commit/version bump yet.

Initial foundation has now been connected to the disabled hooks listed above.
No Pixel script, consent UI, schema, queue or new dependency was added. CAPI transport
code exists behind a non-overridable compliance gate. Full integration remains
incomplete; no runtime consent or provider approval is invented, per AGENTS.md.

## Remaining implementation gates

- [ ] Verify Meta dataset category, country restrictions, permitted events and identifiers.
- [ ] Approve optional consent copy, purpose/version, retention and withdrawal path.
  Rejecting measurement must not prevent signup/payment. Never reuse mandatory consent.
- [ ] Approve campaign catalog (opaque campaign IDs preferred) and fbclid eligibility.
- [ ] Reuse signup/session linkage to persist permitted acquisition through checkout,
  retaining capture time and consent evidence. No retroactive collection after consent.
- [ ] Wire committed registration/post actions, actual contact click and successful
  checkout entry; blocked events must never load Pixel or produce a CAPI payload.
- [ ] Add durable first-conversion uniqueness per professional across all subscriptions,
  including legacy/cancelled ones, with transaction/concurrency protection and retryable
  outbox. Unknown historical payment status must fail closed. Do not count a first
  observed renewal after rollout as acquisition. Deterministic event IDs alone are insufficient.
- [ ] Confirm actual first charge from provider after validated webhook; reconcile full
  professional history. Verify amount semantics (transaction_amount versus total paid,
  discounts/interest) before wiring the existing invoice adapter into marketing.
  Persist amount/currency/paidAt without using subscription status.
- [ ] Implement CAPI transport and reviewed per-event payload allowlist; bounded timeout,
  retry/backoff, stable event_time/id, no raw logs, current-consent recheck before retry.
- [ ] Implement Pixel only on approved B2B routes after consent, no automatic matching,
  automatic events or automatic PageView. Review URL/referrer/title and SPA route leakage;
  a script loaded on checkout remains resident when navigating to sensitive pages.
- [ ] Verify CSP narrowly, no broad network allowances, no token in NEXT_PUBLIC variables.
- [ ] Test withdrawal/denial/storage failure/provider failure, duplicate concurrent webhooks,
  re-subscriptions, renewals, no-payment activations, OAuth signup and mobile/desktop.
- [ ] Test real eligible events in Meta Test Events with approved test identities, matching
  event_name/event_id across Pixel/CAPI; Subscribe server-only. No real patient data.

## Connection information needed

Dataset/Pixel ID received. Still needed: business ownership/access; category/restriction evidence; approved
events/routes/identifiers/campaign values; consent text/version/retention approval.
After those gates, provision backend-only META_CAPI_ACCESS_TOKEN and
META_EVENT_ID_SECRET, dataset ID, supported Graph API version, optional test-event
code and default-off enablement. META_DATASET_ID, META_CAPI_ENABLED,
META_GRAPH_API_VERSION and META_CAPI_ACCESS_TOKEN are consumed only after the
compliance gate. META_EVENT_ID_SECRET is reserved for future persisted events.
Never paste tokens in chat or commit .env. Do not configure them yet expecting activation.

## Deploy / rollback

No production deployment requested in this task. No migrations, new required envs,
external calls, charging changes, dashboard or new analytics collector. Revert the
marketing module, disabled hooks and docs to roll back. No claims of successful Meta validation.
# Delayed attribution audit (2026-11-12)

Scope: audit and regression tests only; no activation, deployment or new collection.

- [x] Trace session attribution, signup identity, consent storage and Stripe Subscribe.
- [x] Test persisted acquisition at days 7, 30, 45 and 89 with a test-only approved catalog.
- [x] Test reconnection, later campaign not overwriting acquisition, expiry at day 90,
  delayed processing after expiry, revocation and no resurrection on a new grant.
- [x] Re-run Stripe out-of-order recovery, durable deduplication and Meta deny gates.
- [ ] Implement approved pre-signup first/last touch and a consent-evidence transfer.
- [ ] Approve retention, campaign catalog and identifier eligibility before collection.

Evidence: 39 tests passed, none skipped, including 5 PostgreSQL integration tests on
the disposable loopback lectum_stripe_test database. The initial run failed because
the cluster started on its default port; rerun passed after restoring test port 55443.
Fixtures clean themselves; no production database or external Meta call was used.

Current gaps: page-view-tracker stores a single campaign in sessionStorage, replacing
it on a new campaign. The separate visitor ID persists in localStorage and signup
records analytics identity, but this is not a consented marketing acquisition bridge.
The privacy client submits no campaign payload. Marketing storage has one campaign
record, no first/last pair; its default approved catalog is empty. fbclid is blocked.
Subscribe resolves acquisition by user and consent revision at paidAt and processing
time, keeping a reference rather than a raw snapshot. Thus persistence works only
when eligible acquisition was already recorded, not end-to-end from an anonymous visit.

Proposal (pending privacy review): a fixed 30-day pre-signup lifetime from the first
permitted capture, not extended by visits or campaign changes. Keep first touch
immutable and last identified campaign separate; direct returns do not overwrite it.
Never reconstruct pre-consent history. Only approved campaign values and separately
approved click identifiers; no full URLs, content, health context or fingerprinting.
Bind guest evidence to an authenticated account once, atomically, with valid purpose,
notice version and unrevoked consent; do not treat a visitor ID as proof of consent.
Handle shared browsers/account switches explicitly. Clear on refusal/expiry, enforce
expiry server-side, and do not recover data from old analytics logs after refusal.
Once registered, preserve the original acquisition in server storage independently
of browser sessions, with a separate bounded post-signup retention policy (proposal:
at most the current 90-day consent period, pending approval). A first paid invoice
may resolve it after day 30 while still valid; there is no indefinite retention until
payment. Further retention requires an approved policy, not silent renewal.
These are Lectum retention periods, not Meta attribution windows or delivery limits.
Cross-device, private browsing or erased storage continuity is not guaranteed.

## Real Stripe sandbox webhook validation (2026-11-17)

- Passed: authenticated the dedicated sandbox, created a synthetic monthly BRL
  subscription and confirmed an invoice.paid with amount_paid=100 (BRL 1.00).
- Passed: Stripe CLI forwarded the signed event to the existing application webhook
  route on loopback port 3141; the disposable PostgreSQL inbox persisted one row.
- Passed: replaying the same signed request returned HTTP 200 without a second row.
- Passed: changing the signed body without updating its signature returned HTTP 400
  and did not change the persisted event count.
- Cleanup succeeded: canceled the sandbox subscription, deleted the test customer,
  archived its price/product and removed the test inbox row. Stripe test history
  may remain. No production objects or real payments were touched.
- The local signing secret is stored only in the ignored sandbox environment file.
  Meta transmission and Subscribe recording remained disabled; no workers ran.

Scope: actual Stripe delivery, signature verification and durable inbox deduplication.
This does not validate the complete signup/consent/checkout/Subscribe pipeline or
Meta delivery. The test used a synthetic subscription created through the sandbox
API, not the application checkout. Those end-to-end checks and privacy approval
remain required before any activation or deployment.

### Additional concurrency validation (2026-11-17)

- Repeated the actual sandbox invoice.paid delivery and replayed the identical
  signed request eight times concurrently. All returned HTTP 200; the inbox still
  contained exactly one row. Tampering still returned HTTP 400.
- Called recordStripeSubscribe with the actual sandbox subscription identifier and
  test identity: it returned excluded, preserving the production-only conversion
  policy. This is an exclusion check, not a successful Subscribe conversion.
- Re-ran the marketing suite against disposable PostgreSQL: 40 passed, 0 failed,
  0 skipped. Coverage includes delayed attribution, consent/revocation, first/last
  touch, out-of-order recovery, durable deduplication and external deny gates.
- Checkout remains disabled in the local sandbox configuration. A complete UI test
  still needs an isolated signup/legal/catalog setup and sandbox-only checkout
  configuration. Do not weaken live-only Subscribe eligibility to make it pass.
- No production edits, deployment, Meta delivery or new collection was enabled.

### UI environment preflight (2026-11-17)

Read-only counts on the disposable lectum_stripe_test database: zero legal document
versions, two subscription plans, zero billing offers and zero billing price versions.
The existing plans alone do not constitute a usable Stripe checkout catalog.
The legal README identifies the available v0.3 documents as unapproved drafts.
Asked the owner whether to use explicitly disposable, non-legal test documents or
provide approved versions; no draft was published or acceptance manufactured.
The ordinary backend bootstrap imports dotenv and starts multiple schedulers. The
UI harness must isolate environment loading and avoid that bootstrap, while keeping
real routing, validation and persistence. Do not run it against inherited production
configuration. No end-to-end UI success is claimed by this preflight.

### Authorized sandbox preparation and checkout service (2026-11-17)

Owner explicitly approved disposable documents marked test-only with no legal effect.
Created two such documents exclusively in lectum_stripe_test (terms/privacy); no
existing draft was represented as approved. Created a real Stripe sandbox product
and monthly BRL price matching the local professional plan, then linked a local
price version and default-disabled offer. These disposable preparation records
remain for the UI test; they are not production catalog/documents.

Executed the existing StoreRepository with a disposable professional identity:
profile and two versioned acceptances persisted; no marketing attribution was
invented. Executed beginStripeCheckout with the real sandbox gateway and local
catalog. It reached requires_confirmation with setup confirmation, without exposing
the client secret. No card was confirmed in this test.

Checkout/collection were enabled only in the isolated process and the test offer
for this execution, then restored. Canceled the remote setup intent, deleted its
sandbox customer and removed the disposable user and local operations. Independent
post-run checks: zero enabled sandbox offers, zero remaining disposable users,
two test documents retained. No Meta send, production change or deploy.

This validates service/repository integration, not the browser UI, card confirmation,
authenticated HTTP journey or a successful Subscribe conversion. Those remain open.

### Real sandbox checkout payment (2026-11-17)

Extended the disposable harness to confirm the real setup intent with Stripe's test
card and continue through the existing confirmStripeCheckout service. Two initial
runs stopped at processing because the harness incorrectly required immediate
completion. Updated only the test to poll with allowPayment:false after the single
payment confirmation; no application billing behavior was changed.

Final run passed: setup succeeded, checkout complete, latest sandbox invoice paid,
amount_paid=2990, currency=brl, livemode=false. This was a BRL 29.90 simulated payment,
not a real charge. Cleanup canceled the sandbox subscription, removed its customer,
and removed local user/operations. Independent verification found zero enabled test
offers, zero disposable users and zero operations for the sandbox account.

This is real provider/service integration, not a browser test. UI registration,
authenticated HTTP, Stripe Elements, and the whole browser-to-webhook journey remain
unvalidated together. The earlier signed-webhook test remains separate evidence.
Sandbox Subscribe stays excluded, external Meta stays disabled, and no deploy occurred.

### Browser registration checkpoint (2026-11-17)

Isolated Chrome with a mobile viewport submitted the real psychologist signup form:
POST /api/public/user/store returned 200 and navigation reached /auth/verify-email.
Local database inspection confirmed one profile, two legal acceptances, confirmed=false,
and zero marketing attribution records. The synthetic user was removed afterward;
an independent count confirmed zero remaining users for that test identity.

The disposable Next launcher needed its real upgrade handler and explicit loopback
hostname to restore hydration. No production frontend configuration was changed.
Mobile and desktop captures are stored locally under .tmp/sandbox-registered-*.png.
This does not validate iPhone Safari or browser checkout. Verification mail cannot
be delivered with the isolated environment's absent EMAIL_API_* SMTP configuration.
Do not bypass verification: prepare a local-only mail sink before continuing the
browser journey. Stripe Elements and browser-to-webhook E2E remain pending.

Meta transmission remains disabled. No deploy or production data changes occurred.
The installed Next version emitted a security warning; dependency remediation needs
separate review. Test runtime Node 24.16.0 remains below the declared 24.22.1 minimum.

### Local SMTP and browser verification (2026-11-17)

Added an ignored loopback SMTP receiver using smtp-server/mailparser in a disposable
tool directory. No app manifest or production configuration changes. Messages remain
in memory, only synthetic ui-* @example.invalid recipients are accepted, and no
relay exists. A transport test passed and rejected a non-synthetic recipient.
Temporary dependency npm audit reported zero known vulnerabilities.

Initial application send failed with an incorrectly formatted test sender; corrected
the test environment to use a plain sender address plus a separate display name.
Copied the existing email templates into the isolated runtime. The actual application
sent its confirmation email over SMTP; the isolated Chrome browser extracted the
code from the received message and submitted the existing PUT confirmation route.
Signup and verification both returned 200. Database inspection confirmed confirmed=true,
one professional profile, two legal acceptances, and zero marketing attribution.
No confirmation flag or OTP was read/changed in the database to bypass the flow.

The browser navigated to /app/profissional/assinatura/planos, but both final screenshots
showed the unauthenticated access prompt. Therefore authenticated continuity and
browser checkout remain unvalidated; a matching pathname alone is not a passing E2E.
Captures: .tmp/sandbox-email-verified-mobile.png and desktop.png.
This is local SMTP evidence, not external email deliverability or iPhone Safari.
Meta remains disabled; no deploy, real email delivery, or production changes.

### Session continuity revalidation (2026-11-17)

The apparent access loss above was an early capture before client hydration, not
a reproduced authentication defect. Repeated the real browser flow and waited for
authenticated billing/plans HTTP 200 and the plans heading, rather than accepting
a URL change or a short fixed delay. After a full browser reload, auth/hidrate
returned 200, the plans remained visible and the restricted-access prompt was absent.
Two observed runs reached authenticated plans; the final run explicitly asserted
reload persistence. Only the ignored test harness changed, not application auth.

Validated together: browser registration -> actual local SMTP message -> code
submission -> confirmed account -> authenticated plans -> reload with valid session.
No OTP or cookie value was logged; diagnostics retained only status and cookie
metadata. The pre-confirmation consent-status request returned 403, then 200 after
confirmation. This is not a marketing attribution or consent opt-in test.

Browser checkout/payment remains unvalidated: sandbox checkout and the test offer
are still disabled. Earlier Stripe service/payment and signed-webhook tests remain
separate evidence, not a complete browser-to-webhook pass. Meta stays disabled.

### Browser sandbox payment validated (2026-11-17)

Extended the ignored isolated harness, without changing application billing code.
Temporarily enabled sandbox checkout, collection and reconciliation only inside the
local test process; environment files and production settings stayed unchanged.
The first attempt exposed the required reconciliation admission flag. The final run
used the existing application checkout and official Stripe Payment Element.

Validated together in isolated Chrome, mobile viewport: registration -> actual local
SMTP confirmation -> authenticated plans -> full reload -> checkout -> synthetic
Stripe card payment -> subscription address screen. Confirm was clicked once;
checkout and confirmation returned HTTP 200. Independent Stripe and local database
checks confirmed one sandbox subscription, one positive paid BRL invoice of 2990
cents, and two completed internal operations (one checkout and one collection)
linked to that same subscription. The verifier was corrected to distinguish these
two legitimate operation kinds from duplicate subscriptions or invoices.

Captures: .tmp/sandbox-checkout-mobile.png and
.tmp/sandbox-payment-result-mobile.png. No real funds were charged. Only synthetic
test data was used. External hosts outside the Stripe allowlist were blocked,
including hcaptcha.com; payment passed, but this does not validate every antifraud
or challenge path. Desktop payment interaction and real iPhone Safari remain untested.

No webhook listener was running during this browser payment. Earlier signed
invoice.paid replay/deduplication tests remain separate evidence: the combined
browser -> delivered webhook -> attribution/conversion flow is still pending.
This run did not validate marketing opt-in or campaign attribution. Sandbox events
remain excluded from Subscribe; no Meta delivery or Events Manager validation ran.
Compliance approval and explicit activation remain prerequisites for external sends.

Cleanup canceled the sandbox subscription, deleted its sandbox customer, removed
the disposable local user and related billing records, and disabled the test offer.
Independent database counts confirmed zero matching users and zero enabled test
offers. Stripe may retain canceled historical records. Local API, frontend and
PostgreSQL were stopped. No deploy, push, production change or Meta activation.
The earlier Next security warning and Node version mismatch remain separate gaps.

### Combined browser payment and signed webhook (2026-11-17)

Repeated the actual isolated browser signup, local SMTP confirmation, session
reload and Stripe Payment Element payment with the sandbox CLI listener active.
The listener signing secret stayed in process memory; no environment file was
changed. The existing application webhook route received the provider delivery.
Independent verification matched the browser subscription's latest paid invoice
to exactly one persisted invoice.paid inbox row for the sandbox account.
There was one subscription and one paid BRL 2990-cent invoice. Checkout and
collection operations both completed against that subscription. The browser
clicked confirm once; two successful confirmation requests were observed, without
creating a second invoice. Navigation reached the subscription address screen.

The actual application acquisition policy remains disabled with an empty approved
campaign catalog. Verified zero attribution rows for the synthetic user and that
sandbox Subscribe remains excluded. Do not describe this as positive campaign
attribution E2E: no production policy was overridden to manufacture that result.

Separately reran all five marketing integration test files with a real disposable
PostgreSQL database: 6 tests passed, 0 failed, 0 skipped. They cover first/last
touch, authorized single-account transfer, return after seven simulated days,
connection persistence, fixed retention, expiry/revocation, consent races,
out-of-order evidence recovery and persistent deduplication. Positive cases use
explicit synthetic test policies; these are not approval for live collection.

Remaining: one positive browser consent/acquisition/payment/attribution journey
under a reviewed policy/catalog; real iPhone Safari and desktop payment interaction;
Meta compliance approval and Events Manager delivery validation. Meta remains off.
Next emitted the previously noted security warning; no dependency update was made.

Canceled the sandbox subscription and deleted its customer, removed the local
synthetic user/billing records and its webhook inbox rows, and disabled the test
offer. Independent counts confirmed zero matching users and enabled test offers.
API, frontend, Stripe CLI listener and local PostgreSQL were stopped. No deploy,
push, production access, real charge or application source change in this session.

### Positive browser acquisition and public-page identity fix (2026-11-17)

The synthetic browser scenario exposed a product defect: a direct authenticated
visit to the public privacy page could leave Redux user identity empty. The notice
then ignored the preferences command; a fallback-only identity also failed the
existing account-change check on save. Added usePrivacyIdentity, which reuses the
existing auth hydrate query and canonical user-create action, only with a token,
no stored identity, and a successful completed hydration. Notice, attribution and
first-party measurement share this identity. Consent account-change checks remain
unchanged. No privacy policy, event gate, campaign catalog or payment code enabled.

Built an ignored disposable frontend copy because Next's custom dev server did
not apply the supplied config and directory junctions prevented startup. The
test-only compiler loader enables only sandbox/synthetic_a/synthetic_b; the local
API injects the identical policy in memory. Original application capture flags
remain false. No Meta token or transport is used.

Validated through real UI: guest accepts optional measurement -> synthetic_a
capture -> closes tab -> opens a new tab with synthetic_b -> registration -> real
local SMTP confirmation -> direct public privacy-page load -> explicitly enables
measurement AND account association -> successful grant -> authenticated plans
reload -> Stripe Payment Element -> one paid BRL 2990-cent invoice -> matching
signed invoice.paid persisted once. First touch remained synthetic_a and last
touch synthetic_b. The actual backend acquisition resolver returned synthetic_a
at that invoice's paid_at, with bounded retention. Subscribe remains excluded for
sandbox; no live conversion or Meta delivery is claimed.

Temporal caveat: local time was about 51 seconds ahead of Stripe's response Date.
The first paid run correctly failed closed because provider paid_at preceded local
consent time. It was canceled and cleaned. The passing run waited measured lag
plus five seconds AFTER consent and BEFORE checkout. Neither recorded dates nor
OS clock were changed; no tolerance was added to consent rules. Clock sync must
be checked before activation. This is not validation of immediate conversions on
an unsynchronized host. Seven-day return remains simulated-clock unit/database
evidence, not a seven-day browser E2E; browser return used another tab in the same
isolated context. Real iPhone Safari remains unvalidated.

Validation: 18 privacy/Pixel tests passed; 6 real-PostgreSQL marketing integration
tests passed, none skipped. TypeScript and scoped ESLint passed. Full frontend
pnpm check passed formatting/lint/typecheck but stopped at two Sentry legacy/current
Glob tests in scripts/dependency-security-transitives.test.mjs (expected source-map
path, received empty list). Do not report the full check as passed. Existing Next
security warning remains unresolved; no production build was run this session.

Canceled sandbox subscriptions from the paid attempts and deleted their customers,
removed local synthetic accounts/attribution/webhook records, disabled test offers.
Independent counts confirmed no remaining matching guest, final user or enabled
test offer. Local API/frontend/Stripe listener/PostgreSQL stopped. No deploy or
push. Compliance/catalog/retention approval and approved Events Manager delivery
remain required before activation; this task is not complete or production-ready.

### Windows dependency regression follow-up (2026-11-17)

The two Glob failures were test portability issues: path.join generated Windows
backslashes in patterns. Use forward slashes in patterns and normalize returned
filesystem paths for assertions. No dependencies, Sentry configuration or runtime
tracking behavior changed. The focused suite passed all 3 tests. Full frontend
pnpm check subsequently exited 0 (Biome, ESLint, TypeScript and chained suites).
Optional browser-dependent tests were skipped by their existing guards; this is
not evidence that all visual/browser scenarios passed. No production build run.

Read-only w32tm status failed because the Windows Time service was not started;
Get-Service confirmed W32Time is Stopped with StartType Disabled. No service or
clock changes made. Synchronize the test host before repeating immediate-consent
payment validation; production clock synchronization remains unverified.
Meta delivery and acquisition policy remain blocked. No deploy or push.

### Synchronized-host browser payment retest (2026-11-17)

After the user configured Windows Time, read-only status confirmed NTP sync.
Stripe response-Date comparison reported a rounded one-second lag. Removed the
provider-lag compensation sleep from the ignored browser harness and required
lag <= 5 seconds. No application policy or consent timestamp tolerance changed.

First browser attempt timed out before registration while the API started. The
retry passed real anonymous consent/capture, new-tab campaign change, registration,
local SMTP email verification, explicit account attribution consent and Stripe
test PaymentElement checkout. Compensation wait was zero; normal navigation and
form readiness waits remain. Consent was at 22:43:04.443Z and Stripe invoice paid_at
at 22:43:41Z. This is a subsequent checkout flow, not a sub-second timing test.

Verification exited 0: one subscription, one paid BRL 2990-cent invoice, one
checkout and collection operation (both complete), and one matching persisted
invoice.paid webhook. First touch synthetic_a and last touch synthetic_b survived;
the actual consentedAcquisition resolver returned synthetic_a at paid_at, with
bounded expiry. Sandbox Subscribe was excluded as intended; no Meta delivery.
Two confirmation HTTP calls followed one UI submission, without duplicate invoice.

Canceled test subscription, deleted sandbox customer and scoped local records,
disabled test offers (remaining enabled: 0), stopped browser/API/frontend/listener
and local PostgreSQL. No deploy/push. Real Safari, provider challenge flows,
production clock verification, Next security warning, privacy/catalog/retention
approval and explicitly approved Meta delivery testing remain outside this result.

### Frontend Next security patch (2026-11-17)

Audited frontend production dependencies: two moderate Next advisories and one
high picomatch advisory. Updated only frontend next/eslint-config-next 16.4.1 to
16.4.5 (minimum patched release), preserving other direct packages and lockfiles
of independent apps. Registry engines/React peers checked; no app use of
unstable_cache/use-cache/rootParams/cacheComponents was found by source search.
This search alone is not proof of non-exploitability. Lock changes are scoped to
Next, its platform packages, lint plugin/config and peer resolution references.

Post-update pnpm check passed, with existing optional browser skips. All 18
privacy/Pixel policy tests passed without skips. git diff --check passed.
Post-update production audit still reports high GHSA-fc5q-39xc-vjpf via
@sentry/nextjs > @rollup/plugin-commonjs > picomatch, with no patched version
listed. The two Next advisories are absent. No audit suppression added.
The admin app has not been upgraded or validated by this frontend-only change.
Build validation uses an ignored harness with sanitized env, loopback API and
no Sentry upload token. The Next 16.4.5 webpack production-mode build exited 0:
compilation, TypeScript, 95 static pages and traces completed. Source-map cleanup
also exited 0. This is a local sanitized build, not a deployed artifact or a
post-upgrade Stripe browser E2E. Sentry import deprecation remains a warning.
No commit, push, deploy or Meta activation. Privacy review remains external.

### Automatic sandbox preparation (2026-11-19)

Owner reconfirmed Site test code TEST10505. Added explicit reviewed-live checkout
context policy support while preserving disabled defaults and sandbox isolation.
The policy requires an exact account, document version and HTTPS source URL;
existing context retries cannot change their reviewed source. No production gate
was enabled. Backend typecheck and ten focused marketing tests passed, including
PostgreSQL context ownership/revocation, old consent rejection and canonical
sandbox payment/history verification.

An ignored local diagnostic harness now waits for the new synthetic participant,
the completed Stripe test checkout, reconciled first paid receipt, invoice.paid
inbox completion and current consent/browser context. It uses the existing
canonical sandbox resolver and minimal serializer, pins TEST10505, and writes an
exclusive attempt marker before one external request, with no automatic retry.
The test supervisor has a separate explicit automatic-test option. Its disposable
legal fixtures and control notice disclose this test instead of promising zero
Meta transmission. The source cookie banner remains unchanged.

This is preparation for a user-operated Chrome sandbox round, not validation of
the production delivery worker, campaign eligibility or production activation.
Owner completed the sandbox payment at 00:27:43 America/Sao_Paulo. The initial
diagnostic worker blocked before transport because an unrelated older invoice
webhook was pending. Added optional exact event-ID scoping to inbox claim and
processing; targeted processing skips the account-wide recovery sweep. A real
PostgreSQL integration test verifies invalid/missing IDs, cross-account/mode
isolation, leases, terminal state, unchanged unrelated rows and default behavior.
Backend typecheck passed. Full repository checks/build were not rerun.

Resumed the same unexpired session after confirming no attempt marker existed.
The current webhook completed; the old pending row retained its identical SHA256
before and after. One CAPI request at 00:33:31 returned HTTP 200/events_received=1,
TEST10505, Subscribe value 29.9 BRL, event ID
66239eb55c1727eecf08422de798f318fb072296fa387e721584b5d58d787e4c.
No second checkout or payment occurred. This round required a diagnostic worker
repair/resume, so it is not proof of an uninterrupted production worker flow.
Meta Test Events UI receipt remains pending owner confirmation; no resend.
No real payment, commit, push or deploy.

### Picomatch exposure review (2026-11-17)

pnpm why --prod identifies picomatch 4.0.4 under Sentry's Rollup commonjs,
pluginutils and fdir. Registry latest is 4.0.7, still in the advisory range;
upgrading to latest alone is not remediation. No direct app imports found.
Installed Sentry wrappingLoader calls commonjs with fixed sourceMap,
strictRequires and ignoreDynamicRequires settings, without user include/exclude
patterns. This inspected build path does not consume public form data as globs.

The Next server trace DOES include a separate compiled/picomatch copy. Its package
metadata has no version, so audit of the ordinary dependency cannot establish
that copy's security version. Inspected Next image matchers compile configured
hostname/pathname and test the requested URL against them. Lectum remote patterns
come from configured asset sources, not request bodies. This is scoped source
review, not proof that every runtime path is unexploitable or approval to release.

Added installed-library regression tests for fixed Rollup filters and Next image
matching (allowed source, host suffix spoof, wrong protocol and extglob-looking
candidate input). All 5 dependency tests passed, no skips. No crafted expensive
glob was executed, no dependency fork/override or audit suppression introduced.
The high advisory remains open pending upstream remediation or a separately
reviewed mitigation/risk decision. No Meta transmission or deployment.


## Atualização 2026-11-20 — elegibilidade dos eventos de usuários comuns

Por autorização explícita do proprietário, removido o bloqueio geral `pending_context_review` de `patient_registration`, `patient_contact` e `patient_community_post`. Os nomes externos são `CompleteRegistration`, `Contact` e `forum_post`. A elegibilidade não substitui consentimento vigente e anterior à ação, versão do aviso, URL permitida por ação, evidência persistida e configuração explícita da CAPI. As regras dos profissionais permanecem inalteradas. Pré-visualizações locais continuam sem capacidade de envio (`preview_only`).

A versão do aviso de usuários e sua lista de URLs ainda precisam de configuração; esta mudança não ativa envio externo nem publica a aplicação.

Validação desta alteração: 59 testes de marketing aprovados, 22 integrações dependentes de banco não executadas nesta rodada; 44 testes focados aprovados. Biome dos arquivos alterados e git diff --check sem erros. Sem envio real à Meta, push ou deploy.


### Sessão local de usuários comuns — 2026-11-20

Preparada sessão isolada em `.tmp/user-events-session.cjs`, com painel `http://127.0.0.1:3154`, proteção de acesso e expiração em uma hora. Banco exclusivamente local na porta 55443; SMTP local; pagamentos e envio automático à Meta desativados. A cópia de frontend usa aviso `lectum-meta-users-test-2026-11-20`, sem reutilizar consentimento profissional. URLs de teste exatas: `/cadastro` (rewrite real do cadastro comum), `/psicologos` e `/app/psychologists` (contato), `/app` (publicação). URLs de perfis e tópicos não são aceitas para transmissão.

Validação adicional: quatro testes de integração PostgreSQL aprovados, sem skips, abrangendo cadastro e-mail, Google/manual, revogação e fila. Backend `/health` e `/ready`: HTTP 200. Configuração do Next custom server adaptada ao arquivo `next.config.ts` da cópia local; opção programática `conf` não é usada pelo carregamento do custom server desta versão.

Smoke mobile (390x844) aprovado: acesso protegido, pagamentos bloqueados, aviso novo visível, medição desativada por padrão, cadastro em /cadastro acessível. Nenhuma conta criada pelo smoke e nenhuma requisição à Meta. Sessão aguardando interação manual; não representa validação de recebimento pela Meta.


### Cadastro manual e recebimento Meta — 2026-11-20

Conta de usuário comum criada pelo proprietário na sessão local: consentimento do aviso de teste registrado antes do cadastro; evento `CompleteRegistration` enfileirado com URL real `/cadastro`. Primeira tentativa com `TEST10505`: HTTP 200 e 1 evento recebido, porém código sem sessão ativa. Proprietário forneceu screenshot do código atual `TEST61669`. Segunda tentativa preservou event_id, event_time e dados, alterando somente test_event_code: HTTP 200, events_received=1, messages=[], sem erro. Confirmação registrada no job local como sent, attempts=2; nenhuma repetição automática. Recebimento na API confirmado; visualização no painel ainda não confirmada.

Corrigida allowlist do gateway isolado para incluir `/api/private/directory/psychologists`, raiz de community, notificações e login público. A rota directory era barrada antes do backend e causava erro de conteúdo não encontrado. Sessão retomada com o mesmo participante; conta e dados preservados. Contact e forum_post ainda aguardam ações e validação de recebimento. Sem push/deploy.

### Continuidade dos testes de usuários comuns — 2026-11-20

Proprietário confirmou por screenshots o processamento de CompleteRegistration e forum_post no conjunto Lectum | Web. A publicação foi recuperada manualmente de registro real, preservando consentimento anterior, horário e identificador do evento; não enviou tema/conteúdo. Primeira tentativa de forum_post recebeu aviso de sessão de teste inativa; uma repetição autorizada pelo screenshot atualizado retornou HTTP 200, events_received=1 e nenhuma mensagem. Sem repetição automática.

Identificada divergência de URL no sandbox: Início usa `/`, e o compositor também abre em `/psicologos`. Allowlist local de publicação ampliada para essas URLs genéricas, além de `/app`; a nova sessão carrega essa configuração. Validação da entrada automática na fila ainda depende da próxima ação manual, sem recuperação.

Perfil de contato efêmero criado apenas no PostgreSQL isolado, identificado como Perfil de teste, sem atendimento, com número fictício e vídeo local. Perfil removido pelo supervisor ao encerrar a sessão; sem modificações em contas profissionais existentes. API real da lista retorna o perfil. Participante e cadastro anterior preservados. Envios externos automáticos continuam desativados; Contact ainda não validado. Nenhum push/deploy ou commit nesta etapa de teste.

### Publicação automática e retomada de consentimento — 2026-11-20

Nova publicação feita pelo proprietário em `/` gerou job automaticamente, sem recuperação; envio manual desse job recebeu HTTP 200, events_received=1, messages=[] em TEST61669. WhatsApp abriu corretamente, mas nenhum important_action_event foi registrado. Diagnóstico: hasInternalMeasurementConsent depende de escolha local por conta; novo domínio do túnel não recuperava concessão já válida no servidor. NoticeSession agora espelha concessão existente somente quando não há escolha local, com versão e validade conferidas, preservando recusa/revogação local. Não faz nova concessão nem altera a revisão no servidor. Próximo clique manual ainda necessário para validar Contact. Não houve push/deploy.

Contact: novo clique manual após sincronização da preferência gerou automaticamente patient_contact, com origem genérica /psicologos. Payload mínimo validado contra consentimento anterior e evidência do navegador; envio único retornou HTTP 200/events_received=1, porém aviso de sessão TEST61669 inativa. Job registrado como sent para evitar repetição automática. Visualização no Gerenciador de Eventos ainda pendente; nenhum novo clique necessário para eventual repetição autorizada do mesmo event_id. Nenhum push/deploy.

Contact: após autorização explícita do proprietário ("autorizo") para uma única repetição, reenviado payload idêntico, com event_id preservado e TEST61669. Resultado: HTTP 200, events_received=1, messages=[], sem erro. Job permanece sent, attempts=2. Recebimento pela API confirmado; visualização no painel ainda depende de conferência. Nenhuma nova repetição automática, push ou deploy.


### 2026-11-21 — diferenciação de cadastro autorizada

CompleteRegistration agora inclui custom_data.account_type: user para usuário comum e professional para psicólogo, derivado da conversão interna, nunca de parâmetros arbitrários do cliente. Contact e forum_post continuam sem classificação. Preparação do Pixel profissional usa o mesmo parâmetro. Aviso de consentimento atualizado e versionado em 2026-11-21-account-type; aceites anteriores não são promovidos automaticamente. Eventos históricos não foram reenviados. Configuração das duas conversões personalizadas na Meta e ativação em produção permanecem pendentes.


### Configuração das conversões personalizadas de cadastro

Fonte: Lectum | Web (1606598847399888). Evento CompleteRegistration e categoria COMPLETE_REGISTRATION para ambas. Regras com AND: event eq CompleteRegistration + account_type eq user para Cadastro de usuário comum; event eq CompleteRegistration + account_type eq professional para Cadastro de psicólogo. Não criar evento adicional nem renomear o evento padrão. Preparação local: .tmp/meta-registration-custom-conversions.json. Criação na conta Meta ainda não executada: controle do navegador indisponível nesta sessão. Referência: https://developers.facebook.com/docs/marketing-api/reference/custom-conversion/ .


Validação complementar em 2026-11-21: check completo do frontend aprovado; typecheck backend aprovado; suíte backend com DATABASE_URL local e JWT temporário: 1582 testes, 1523 aprovados, 56 ignorados e 3 falhas em config/multer/filesRoute.test.ts (respostas 404 em contratos HEAD/GET/Range de Cloudflare Stream, fora dos arquivos alterados). Teste registration-test-preview atualizado para account_type professional e seus 3 casos aprovados. Verificação geral não está totalmente verde; sem commit, push ou deploy. Conversões externas ainda não criadas.


### Conversões confirmadas pelo proprietário — 2026-11-21

Screenshots confirmam criação no conjunto 1606598847399888: Cadastro de usuário comum (1442612211379461), CompleteRegistration com account_type eq user; Cadastro de psicólogo (2590375508106512), CompleteRegistration com account_type eq professional. Ambas Site, sem recebimento ainda. Esta confirmação substitui as pendências de criação acima; envio com o novo parâmetro e ativação produtiva seguem pendentes. Preparação de nova sessão isolada com aviso atualizado e documentos locais v5, preservando os documentos v4 e os eventos históricos.

### Preferências e aceite após cadastro — 2026-11-21
- Primeira abertura apresenta opções selecionadas; abrir o painel não registra consentimento. Escolhas salvas, inclusive recusas, prevalecem.
- Captura de aceite explícito de visitante independe de UTMs. Visita direta gera registro transferível sem inventar campanha ou identificador de navegador.
- Persistência que falha pode ser repetida com o mesmo token em visita direta.
- Validado: 20 testes de política/atribuição; integração PostgreSQL de cadastro por e-mail incluindo visita direta; navegador com três switches selecionados e recusa preservada. Nenhum evento externo enviado nessa validação.
- Alterações locais; não houve push/deploy. A tarefa geral e a validação de recebimento das novas conversões na Meta continuam pendentes.
- Complemento: typecheck de frontend/backend passou; integrações de cadastro profissional e transferência entre sessões passaram. Teste de campanha não aprovada agora verifica aceite preservado com dados de campanha vazios.

### Identificador para visita direta após aceite — 2026-11-21
O cadastro manual confirmou aceite anterior preservado, porém sem browser identifier: captura anônima dependia de campanha aprovada. Adicionado anonymousDirectVisits como autorização explícita de contexto, desativado por padrão e ativado somente no ambiente protegido local. Registro novo com aceite válido e campanhas vazias recebe identificador usando o gerador existente. Registros antigos não recebem preenchimento retroativo. Teste integrado percorre captura → cadastro → resolução do evento CompleteRegistration/account_type=user sem transmissão externa. Teste HTTP valida cookie seguro em visita direta, recusa, versão antiga, revogação e ausência de preenchimento retroativo.
- Validação desta correção: typecheck backend e Biome dos quatro arquivos aprovados; integrações PostgreSQL de cadastro/identificador aprovadas; 10 testes do cliente aprovados. Sessão manual renovada com TEST61669. Nenhum envio externo, commit, push ou deploy nesta etapa.
Validação externa 2026-11-21: após autorização explícita para o payload/destino, envio único do cadastro manual com CompleteRegistration/account_type=user e TEST61669 ao dataset 1606598847399888. API retornou HTTP 200, events_received=1, messages=[], sem erro. Job local marcado sent/attempts=1; sem repetição automática. Recebimento visual no painel Meta ainda pendente. Nenhum push/deploy.
Screenshot do proprietário confirmou CompleteRegistration Processado com account_type=user no Gerenciador de Eventos (ID 8a289b621dceb698f5c143b26c2231387d45067d841440d29bf85ced21128ff6). Iniciada preparação de sessão separada para cadastro profissional, sem novo envio externo.

### Correção de transferência profissional em visita direta — 2026-11-21
O teste manual revelou que AttributionRepository.transfer ainda exigia campanha não vazia, embora captureGuest preservasse aceite de visita direta. A transferência agora aceita origem armazenada vazia, mantendo validações de versão, expiração, revogação, claim e conta ativa. Campanha previamente armazenada que deixou de ser permitida continua rejeitada. A integração de registro profissional percorre os casos com/sem campanha e valida horário original, parâmetro professional, revogação e ausência de envio externo. Ambos passaram. Sessão manual renovada para validação completa; nenhum evento profissional enviado, push ou deploy.

Validação adicional: TypeScript backend (tsc --noEmit) e Biome dos dois arquivos passaram. Sessão profissional f43e1b01-bca9-4c78-b9f7-6048a1074628 preparada com correção; cadastro manual pendente.
Validação manual profissional concluída em 2026-11-21 na sessão f43e1b01-bca9-4c78-b9f7-6048a1074628: conta ativa, aceite anterior ao cadastro e evidência de navegador verificados pelo preview. Payload contém CompleteRegistration/account_type=professional e TEST61669. metaRequests=0; envio único aguardando autorização específica para este evento profissional.
Após autorização explícita do proprietário, envio único profissional realizado: CompleteRegistration, account_type=professional, TEST61669, dataset 1606598847399888. Meta respondeu HTTP 200, events_received=1, messages=[], sem erro. Recibo preservado na sessão f43e1b01-bca9-4c78-b9f7-6048a1074628. Sem repetição automática. Confirmação visual no Gerenciador de Eventos pendente; nenhum push/deploy.
Confirmação visual recebida em 2026-11-21: screenshot do proprietário mostra Concluir inscrição Processado, recebido de Servidor, account_type=professional, evento cb2d5814247b407175eed7705e0269912e45d3f7028309fae7edda0661eb6b26, às 13:37:00. Junto ao recebimento anterior account_type=user, diferenciação validada de ponta a ponta no ambiente de teste. Não equivale a ativação produtiva; nenhum push/deploy nesta etapa.
Preparação Google 2026-11-21: ambiente loopback 3140/4140 iniciado com cliente OAuth local previamente fornecido, banco descartável e envio Meta desligado. Cópia frontend com captura de aceite explícito habilitada para teste; política local permite associar consentimento Google de usuário comum. Smoke de usuário retornou preparação HTTP200 e tentativa de navegação ao Google com callback correto; login real ainda não concluído. Origem HTTP local não é elegível para payload externo Meta, devendo ser validada separadamente antes de qualquer envio. Nenhuma configuração cloud alterada.

### Cadastro Google real validado localmente — 2026-11-21
Após autorização explícita, excluídas somente as duas contas Google do banco loopback lectum_stripe_test e registros vinculados; os 19 demais cadastros permaneceram idênticos (comparação dentro da transação). O proprietário repetiu os dois cadastros reais: usuário comum criado às 14:02:15 e profissional às 14:07:56 (America/Sao_Paulo). Consulta ao banco confirmou provider Google, papéis corretos, contas ativas, consentimento de medição vigente e origem de consentimento anterior à criação em ambos. Termos e privacidade versão 5 registrados para ambos; profissional também registrou autorização promocional. Nenhum job de entrega criado nem evento Meta enviado nessa rodada: origem HTTP local e envio externo desabilitado. Esta evidência valida cadastro/aceites Google, não recebimento de eventos Google pela Meta. Nenhum push/deploy.

### Preparação HTTPS Google — 2026-11-21
Criado gateway local restrito por cookie HttpOnly/Secure e painel loopback 3144, com túnel temporário para frontend3140/API4141. Callback preparado no domínio do túnel, cliente Lectum Local QA e banco local mantidos. Captura prospectiva de navegador habilitada somente neste runner; envio Meta continua desligado. Nenhum cadastro existente foi excluído nesta etapa. Registro do callback no console Google ainda pendente; automação do navegador indisponível por falha de inicialização do sandbox. Smoke do fluxo em andamento, não confundir preparação com evento externo validado.

Continuação HTTPS: proprietário confirmou inclusão das URIs no cliente Lectum Local QA. Smoke real chegou à tela de login Google pelo novo callback HTTPS, preparação HTTP200, sem redirect_uri_mismatch; autenticação humana ainda pendente. Após nova autorização explícita, removidas novamente somente as duas contas Google locais e registros vinculados, com confirmação transacional de que os 19 demais cadastros permaneceram idênticos. Envio Meta permanece desativado. Rodada HTTPS inicia com novos cadastros humanos e captura prospectiva de consentimento/navegador.

### 2026-11-21 — Google HTTPS: cadastro profissional validado localmente
- Conta Google profissional criada às 14:49:44 (America/Sao_Paulo); termos v5 e ciência/autorização da política v5 registrados no cadastro.
- Consentimento de medição anterior ao cadastro e identificador do navegador anterior ao evento confirmados pela resolução canônica.
- Preview local CompleteRegistration com account_type=professional, TEST61669, somente fbp em user_data; sem dados de nome/email/telefone. Evento preparado de forma idempotente na fila local, sem requisição à Meta.
- Evidência: .tmp/google-professional-preview-result.json. Envio externo e confirmação visual na Meta continuam pendentes; nenhuma alteração de produção ou deploy.
- Às 14:55:21, após autorização explícita, realizado um único envio do evento Google profissional 13ba7eab65c880ca305b84991cce9faa2748b38debcd79e25f4b42d8fc704312. Meta respondeu HTTP 200/events_received=1, porém avisou que TEST61669 não corresponde a uma sessão de teste ativa para dataset/action_source, portanto não aparecerá na aba Eventos de teste. Sem repetição automática. Fila local marcada sent; evidência .tmp/google-professional-send-result.json. Pendente código de sessão Site ativa e eventual autorização de nova tentativa, preservando identidade do evento.
- Às 14:57:07, usuário forneceu novo código TEST68268 para repetir a tentativa. Reenviado uma vez com o mesmo event_id profissional; Meta confirmou HTTP 200, events_received=1 e nenhum aviso/erro. Nenhum dado pessoal adicional; produção permanece desativada. Evidência .tmp/google-professional-session-retry-result.json. Pendente apenas confirmação visual de processamento na aba de testes.


### 21/11/2026 — contexto de rede autorizado pelo proprietário

O proprietário aprovou a proposta de política e posteriormente solicitou incluir IP e agente do navegador. Nome, e-mail e telefone seguem excluídos. Versão opcional renovada para network-context; a publicação legal e ativação externa permanecem pendentes.

- [x] Captura lazy do contexto HTTP após validação do consentimento no outbox; isolamento por AsyncLocalStorage.
- [x] Migração aditiva com campos opcionais aplicada ao PostgreSQL local 55443, sem reset.
- [x] Serialização restrita; envio bloqueado sem agente do navegador; eventos antigos não recebem contexto de visitas posteriores.
- [x] Atualizar Preferências e proposta da política com dados técnicos e retenção curta.
- [ ] Verificar cadeia de proxies de produção antes de configurar META_CLIENT_IP_VERIFIED=true (trust proxy=true é rejeitado para captura).
- [ ] Publicar nova política, validar fluxo real no navegador e concluir checks antes de ativar a transmissão.

A execução anterior do check raiz passou frontend e parou no backend por DATABASE_URL ausente; não constitui check completo. Nesta rodada o ambiente de testes local é informado explicitamente.

Validação deste incremento: migração local aplicada sem reset; backend typecheck e build concluídos; 16 testes focados passaram, incluindo seis casos PostgreSQL e contexto HTTP concorrente. Teste de cadastro por e-mail foi ampliado e passou com persistência real do agente no outbox e resolução para CAPI. Os 11 testes de política passaram, inclusive invalidação da versão account-type. Prévia isolada 3160 verificada em 390 e 1440px: texto atualizado presente, sem overflow horizontal; screenshots em .tmp/network-privacy-390.png e .tmp/network-privacy-1440.png. Check completo frontend passou. Check raiz interrompido inicialmente por aviso Biome no backend, corrigido; continuação das suites backend/admin/video em andamento. Sem envio externo, commit, push ou deploy deste incremento.

Conclusão das verificações do incremento network-context: backend check passou (1.528 aprovados, 57 condicionais skipped, zero falhas); frontend/admin/video check passaram nas execuções respectivas. Build backend passou. O teste PostgreSQL de cadastro foi ampliado novamente para conferir limpeza dos campos no bloqueio e passou. A prévia 3160 criada nesta rodada foi encerrada após inspeção visual. Gate operacional de proxy permanece pendente; não ativar META_CLIENT_IP_VERIFIED até validação. Nenhum commit isolado deste incremento: os módulos de marketing e migrações anteriores da TASK-333 ainda integram o lote local não publicado, e a task de promoção continua em preparação.

### Continuação da preparação produtiva — 21/11/2026

- Proprietário confirmou autodeploys de homologação/preview Vercel frontend/admin desativados; registro atualizado em LOCAL-TO-PRODUCTION.
- Consolidada a proposta aprovada em TASK-333-production-privacy-complete.txt, preservando integralmente seções 1–3 e 6–10. Documento ainda local, sem publicação; data de vigência pendente.
- Smoke público: frontend 0.1.824, backend 0.1.826, health ok e ready ready, todos HTTP 200. Nova consulta legal salva localmente para conferência de versão.
- Acesso ao navegador indisponível por falha de inicialização do sandbox; solicitada somente a configuração TRUST_PROXY e status de proxy DNS ao proprietário. Nenhuma credencial solicitada ou impressa.
- Build otimizado frontend em andamento com API loopback e integrações externas desativadas. Nenhum push, merge ou deploy.

Build frontend concluído com sucesso (Next webpack, TypeScript, 95 páginas e remoção/verificação de source maps), exit 0. Log local .tmp/meta-production-frontend-build.log. Configuração de proxy e acesso para publicação legal continuam pendentes; produção não alterada.

### Traefik produtivo — 21/11/2026
Proprietário informou TRUST_PROXY=1 e mostrou DNS api.lectum.com.br com proxy Cloudflare ativo. Capturas confirmaram adição de forwardedHeaders.trustedIPs nos entryPoints web/websecure, usando as faixas oficiais IPv4/IPv6 consultadas e preservando global/providers/certificatesResolvers. Proprietário aplicou Update e Reload; captura confirmou Traefik Reloaded. Smoke posterior às 16:20 BRT: health/ready/ping/frontend version HTTP200, API ok/ready, versões backend0.1.826/frontend0.1.824. Isto verifica disponibilidade, não o IP final de req.ip; META_CLIENT_IP_VERIFIED permanece sem autorização técnica para ativação. Não mudar TRUST_PROXY para 2 sem validar a cadeia efetiva e caminhos alternativos.

### Diagnóstico administrativo de proxy — 21/11/2026
Implementada rota GET privada de settings/proxy-diagnostics, protegida pelo adminAuth canônico via mountRoute. Retorna apenas validade, contagem e comparações de IPs; sem valores pessoais, hashes, logs ou gravação. Comparação positiva não autoriza envio: relatório exige prova externa controlada. Quatro testes HTTP reais passaram, incluindo trust1/trust2, cabeçalhos inválidos/ausentes, ausência de vazamento e rejeição401 sem sessão pelo middleware real. Runbook local inclui consulta com cookie administrativo e dispositivo existentes, sem extrair credenciais. Check/build backend em execução. Nenhum deploy nesta etapa.


Validação do diagnóstico: check backend concluído com 1.532 testes aprovados, 57 condicionais ignorados e zero falhas (1.589 no total). Quatro testes HTTP focados passaram novamente após rejeitar IPv6 com identificador de interface, evitando erro de normalização. Checks de encoding, source-safety, tasks, ADRs, tamanho e ciclos passaram. Build final concluído com exit 0 (Prisma, TypeScript e aliases). Implementação local; a rota não está disponível em produção até publicação revisada. TRUST_PROXY e META_CLIENT_IP_VERIFIED de produção não foram alterados nesta etapa.


Publicacao separada do diagnostico: preparado checkout isolado .tmp/proxy-diagnostic-release em homolog, base main e58069b18 (mesmo conteudo da base local), commit d2e1b72c3, versao 0.1.827. Contem somente diagnostico privado, TASK-334/ADR-0699, runbook, manifests e normalizacao Windows dos testes Glob. O lote completo TASK-333 permanece local e fora deste commit. Build isolado aprovado; hooks de push ainda em execucao. Nao considerar o diagnostico publicado ate smoke da versao e rota. O checkout original continua com alteracoes preservadas e precisara integrar esse commit antes da futura publicacao do lote completo.

PR isolado #181 criado e integrado em main em 21/11/2026 19:56:42 UTC, merge d7f4a0d989f9cbbf8781e94d240b79c02c8b9a34. Hooks completos de push aprovados no checkout isolado: admin/backend/frontend/video/guards. Backend 1.465 testes aprovados, 33 condicionais ignorados, zero falhas. PR sem checks remotos antes do merge; nenhum requisito remoto foi ignorado. Smoke inicial apos merge health/ready HTTP200, API ainda 0.1.826, portanto rollout 0.1.827 ainda nao confirmado. Medicao Meta e IP permanecem desativados.

### Evidência produtiva e preparação do lote — 21/11/2026, após 17:30 BRT

- PR #181 implantado: backend 0.1.827. Proprietário confirmou TRUST_PROXY=2 e redeploy concluído.
- Diagnóstico autenticado: forwarded_hops=2; forwarded_chain_valid, cloudflare_header_valid, resolved_ip_valid, resolved_matches_cloudflare_header e cloudflare_matches_farthest_forwarded=true; resolved_matches_nearest_forwarded=false. O campo verification é um aviso constante e não uma certificação automática.
- Middleware lectum-api-cloudflare-only aplicado exclusivamente ao router da API no Traefik, com sourceRange IPv4/IPv6 oficiais e sem ipStrategy. Configuração persistiu após redeploy. trustedIPs global preservado.
- Provas externas anteriores: /ready público HTTP200; acesso HTTP direto ao IPv4 da origem com Host da API HTTP403, inclusive com cabeçalhos encaminhados forjados. Prova IPv6 inconclusiva por ausência de conexão; não declarar bloqueio IPv6 comprovado.
- Qnax rejeitou o plano com faixas Cloudflare por limite de dez regras. Reabertura mostrou as oito regras originais; nenhuma restrição nova do provedor foi confirmada. A proteção verificada está no router da API.
- Lote completo de marketing permanece local; aquisição, entrega e META_CLIENT_IP_VERIFIED continuam desligados. Política consolidada aprovada ainda não publicada. Preparação em checkout isolado preservará as alterações originais e o diagnóstico já entregue.

### Publicacao legal confirmada — 21/11/2026, 17:42 BRT
Proprietario publicou a politica de privacidade versao2 no Admin. Consulta independente GET /api/public/legal/current confirmou id cmwqvhrhc000001tdwdlle2gq, published_at 2026-11-21T20:42:54.842Z e corpo integral igual ao arquivo aprovado, normalizando apenas CRLF e espacos externos. Hash publico 002f73bfa56d82a70b00b9ba6a3d4cdfbe512f197c4eff573bd90246941fcc21. Termos permanecem versao1. Nenhum aceite foi criado pelo agente. Publicacao legal nao ativa gates de marketing.

Checkout de preparacao .tmp/meta-production-release em homolog, derivado do diagnostico publicado: lote integrado com tres conflitos triviais resolvidos, original preservado. PostgreSQL local55443 iniciado; db:migrate confirmou schema sincronizado e zero migracoes pendentes. Frontend check completo passou; check raiz em andamento no backend. Auditoria raiz/frontend/video sem vulnerabilidades conhecidas; backend acusou effect e fast-xml-parser; Admin acusou Next16.4.1. Admin alinhado a Next/eslint-config-next16.4.5 com node_modules independente; validacao da correcao ainda pendente. Sem novo commit, push, deploy ou ativacao.

Preparacao de release: checkout isolado avancou por fast-forward para main d7f4a0d98; branch homolog preservada. Executado UMA unica vez pnpm version:bump, versao0.1.828 nos cinco manifests, check:version aprovado. Nao repetir bump antes deste commit pendente. Overrides backend effect3.22.1 e fast-xml-parser5.12.0 incorporados ao checkout; node_modules aponta para instalacao isolada .tmp/backend-security-dependencies, sem alterar original. Auditoria --prod corrigida do backend e Admin sem avisos conhecidos. Primeiro backend check1532pass/57skip/0fail; segunda rodada com novas dependencias em andamento. Builds/checks finais ainda pendentes. Nenhum commit/push/deploy novo.

### Confirmacao final da publicacao legal e preflight local
Consulta publica repetida confirmou privacy versao2, published_at 2026-11-21T20:42:54.842Z e corpo identico ao arquivo aprovado apos normalizar quebras de linha e espacos externos. /ready retornou ready. Publicacao legal concluida; nao constitui ativacao de medicao.
Auditoria final pnpm check:dependencies: cinco escopos sem vulnerabilidades conhecidas. Frontend build0.1.828 concluido com exit0, incluindo TypeScript e verificacao de source maps. Backend check com dependencias corrigidas:1531pass/57skip/1timeout no subprocesso optional-auth; repeticao isolada desse teste passou em6.2s sem alteracao de codigo. Nao representar essa rodada integral como verde. Builds backend/video e Admin em andamento. Nenhum commit, push ou deploy novo; gates de aquisicao/entrega e IP continuam fechados.

Builds backend e video0.1.828 concluidos com exit0. Checks tasks e encoding passaram apos registro das evidencias. Admin compilacao e TypeScript aprovados; finalizacao do build ainda em andamento.

Admin build0.1.828 finalizado com sucesso, incluindo37paginas e sincronizacao de38manifests. Os quatro builds locais foram concluidos. Ativacao ainda pendente dos controles de entrega/origens e comprovacao operacional de IP; nenhuma alteracao externa nesta rodada.

### Configuracao de origem e coleta consentida — 21/11/2026
Sonda em Chromium/Edge isolado, sem login ou aceite, abriu /auth/register/patient e observou redirecionamento para https://www.lectum.com.br/auth/register/patient. Requisicoes reais a API enviaram Referer https://www.lectum.com.br/. Mantida strict-origin-when-cross-origin, sem relaxar cabecalhos nem reconstruir URLs. USER_DELIVERY_POLICY passa a aceitar somente essa origem observada nos tres eventos de usuario comum; caminhos de perfil/forum, queries, fragmentos e outros hosts continuam recusados. Notice version network-context configurada apos confirmacao da politica legal v2.
Coleta frontend/backend e geracao de identificador para nova visita direta com aceite foram preparadas no checkout local. Catalogo UTM continua vazio. Ausencia, recusa, revogacao e versao antiga impedem captura; consentimentos anteriores nao ganham identificadores retroativamente. Transmissao externa ainda depende de META_CAPI_ENABLED e credenciais; META_CLIENT_IP_VERIFIED nao foi ativada. Eventos profissionais e Subscribe mantem gates separados fechados nesta etapa.
Nove casos focados foram exercitados: oito passaram na rodada conjunta; o caso de coleta historica exigiu tornar explicita a politica desligada no fixture apos mudar o default. Repeticao desse caso passou, sem mudar a assercao de ausencia de identificador retroativo. Os testes de fronteira tambem passaram a desligar e restaurar explicitamente a politica. Check completo em andamento; nenhum commit/push/deploy.
Sondas externas repetidas: HTTP direto a origem com Host da API=403; com CF-Connecting-IP/X-Forwarded-For forjados=403; HTTPS direto com SNI da API=404 (certificado da origem nao confiavel ao cliente, validacao ignorada somente nessa sonda sem credenciais). IPv6 nao comprovado por sonda. /ready publico permaneceu saudavel.

### Configuracao de cadastros e validacao final do lote
Cadastro profissional CompleteRegistration passa a elegivel conforme pedido do proprietario, testes externos anteriores e politica v2 publicada. REGISTRATION_DELIVERY_POLICY e serializer usam a mesma versao network-context e origem publica observada; Subscribe/InitiateCheckout continuam bloqueados, sem alterar categoria/dominio ou contornar restricoes do provedor. REVIEWED_RECOVERY_START permanece null: sem recuperacao de acoes antigas. Esta decisao substitui a nota imediatamente anterior sobre cadastro profissional ainda fechado.
Check raiz concluiu com exit0; backend1590testes,1533pass/57skip/0fail. Suite especifica de privacidade25pass/0fail. Apos configuracao de cadastro profissional, suite focada41pass/0skip/0fail incluindo PostgreSQL, consentimento anterior ao cadastro, modo CAPI desligado e bloqueio de checkout/assinatura. Fixtures historicos agora especificam politica desligada em vez de depender do default global. Builds backend/frontend atualizados em andamento; Admin/video previamente aprovados e sem nova alteracao. Versao0.1.828 ja incrementada uma unica vez; nao repetir antes do commit pendente.

## Validação final da entrega 0.1.828 — 2026-11-21

- Política de privacidade v2 publicada pelo responsável e corpo conferido com o texto preparado.
- `pnpm check` completo passou; builds atuais de backend e frontend passaram. Builds de admin e video passaram sem alterações posteriores nesses aplicativos.
- 41 testes focados de cadastro profissional/bloqueios e 25 testes de privacidade passaram. Integrações de consentimento usam PostgreSQL local real; nenhum envio de conversão à Meta foi realizado nesta validação.
- Auditoria dos cinco escopos de dependências sem vulnerabilidades reportadas; nove migrações aditivas aplicadas localmente sem reset.
- Origem observada no navegador: `https://www.lectum.com.br/`. URLs detalhadas não são liberadas. Consentimento exige a versão atual; recuperação histórica permanece desativada.
- CAPI e IP verificado continuam com fallback desligado. Publicação de código não comprova recebimento externo nem conclui a TASK-333.

O hook de push identificou expectativa obsoleta no teste delivery-scheduler: cadastro profissional elegível com CAPI false retorna disabled; checkout permanece blocked. Corrigida a expectativa, preservando asserts de zero timer/rede/resolução. Teste focado passou. Primeiro push rejeitado pelo hook; demais checks de admin/frontend/video e guards passaram. Repetição integral pendente.
