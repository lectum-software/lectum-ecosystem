# ADR-0698 - Fail closed before Meta health-data transmission

## Requested User Names and Shared Registration Claim (2026-11-19)

Use CompleteRegistration, Contact and forum_post for the user's three actions.
Keep the internal patient_* keys for compatibility; external Contact denotes a
button click, not proof of communication. Earlier WhatsAppClick/PublicationCreated
names in this record are superseded.

Share the existing guest-grant claim logic between Google and manual registration
with provider-specific entry points and audit actions. Email registration supplies
only an optional guest token in its POST body; preparation is server-side before
account creation, and claim/queue happen in that account transaction. Preserve
single ownership, original grant time/expiry, live revocation, browser evidence and
exact observed-source review. Never infer marketing consent from legal acceptance.
No database schema or additional storage was needed. All current activation gates
remain unchanged pending the user-specific notice, source URL configuration and
browser/provider validation. This is local implementation, not completed activation.


## Durable User Delivery Context (2026-11-19)

Store the observed, per-action reviewed source URL with a user delivery job.
The nullable source_url addition preserves existing professional jobs; user jobs
without this context cannot be delivered. Never reconstruct or replace a source
URL to make an event eligible. Google preparation records it in private state;
contact/publication hooks capture the observed request source after persistence.
Resolve delivery against canonical ownership/state, live consent revision, the
original claimed guest grant and a matching browser identifier. The scheduler
can dispatch these resolvers, but production transmission remains disabled.
This supersedes earlier implementation-pending notes for the evidence resolver,
not the remaining user notice, email continuity or real end-to-end validation.


## Private User OAuth Consent Reference (2026-11-19)

Use a private authenticated/encrypted state field, not query forwarding or a
browser-provided consent boolean, for the user Google registration grant.
Preparation reads an existing server grant under the separate user notice gate.
Claim occurs only during new Google account persistence, revalidates the live
source, consumes it once and retains original grant time/expiry. Missing, expired,
revoked or mismatched evidence never creates an account consent. Logging in to an
existing account never claims it. Guest revocation invalidates the linked user
consent as well as browser/attribution evidence, with a consent audit event.
The default user notice remains null; no collection or transmission is enabled.
This is implemented transport and persistence, not proof of real provider login
or completed external delivery. No additional database schema was introduced.

## Per-Action User Serialization Review (2026-11-19)

The pure serializer accepts user registration, WhatsApp click and publication
with distinct names CompleteRegistration, WhatsAppClick and PublicationCreated.
This supersedes earlier serializer-only-professionals notes. User URLs require
an additional exact per-conversion allowlist, default empty, on top of the shared
allowlist. The serializer never substitutes a neutral URL for the actual source.
Extra context/identity fields are rejected rather than forwarded. These are
local preparation primitives, not a platform approval or an active transport.
All transmission gates stay closed. The user OAuth consent bridge and browser
evidence resolver still need implementation before a real end-to-end test.

## Supplied Support Guidance (2026-11-19)

Owner screenshots show a favorable conditional response in Meta's help chat for
minimal registration, WhatsApp and publication events. Record its provenance as
a help-chat response; the screenshots do not establish a human case review.
Preserve all minimization conditions without changing event semantics or supplying
an unrelated source URL. This evidence informs ongoing implementation but does
not automatically enable any gate, approve an actual URL or replace consent.

## Shared Queue Local Preparation (2026-11-19)

Reuse the existing durable queue instead of creating parallel storage for users.
User conversions require a separate reviewed document version, unset by default.
Runtime input validation refuses them before database access while unset; notice
configuration is not transmission approval. Source lookup selects ownership/state
and server time only. Do not use browser-supplied WhatsApp timestamps, infer a
conversation, or include anonymous publication in this initial preparation.
Do not retroactively grant registration consent: OAuth/guest bridging for users
remains unresolved. Consent and purge distinguish user/professional roles.
Existing canonical-source validation is extended to user references. No schema
change, scheduler activation, product-hook activation or user CAPI serialization
is part of this change. Regression tests use scoped disposable local PostgreSQL
fixtures, not real user activity or provider transmission.

## Queue Lifecycle Dependency (2026-11-19)

User events cannot reuse the professional delivery queue by merely extending the
conversion enum. Queue consent and purge rules, plus guest registration consent
bridging, currently enforce the professional role. Keep insertion rejected before
database access until an approved user-specific lifecycle is implemented. Tests
cover runtime rejection of untyped input and zero identity/network access from
blocked user hooks. This is a boundary regression, not a user delivery implementation.

## Per-Flow Context Review (2026-11-19)

The legacy patient_* role/conversion names are not sufficient evidence to classify
all users as patients. Their status is now pending_context_review, still denied
by metaTransmissionDecision. Actual source flows must be reviewed individually:
internal WhatsApp records include page/target, publication records include
community/content, and Google user attribution is intentionally not carried over.
Do not reuse those records as external payloads, invent a neutral source URL or
interpret generic event names as approval. No user delivery resolver/outbox exists.

## User Action Terminology And Minimization (2026-11-19)

Do not infer a clinical relationship from membership or a button click. The role
named paciente in legacy contracts is not evidence of actual patient status.
A local-only user-event preview describes registration, publication and WhatsApp
clicks without content, community, destination or professional data. Reject all
extra input fields rather than silently stripping or disguising contextual data.
The preview has no identifiers, URLs, transport or hooks and is not a valid CAPI
candidate. Context review remains necessary before any external integration;
generic naming alone does not resolve eligibility. Existing gates remain closed.

The owner subsequently supplied Processado evidence for the renewed professional
registration at 16:22:05 (f0afb2). The earlier pending UI receipt is superseded;
the sandbox-versus-production caveat remains unchanged.

## Automatic Sandbox Receipt Caveat (2026-11-19)

The renewed session produced one automatic registration attempt after the owner's
signup and prior-consent verification. API acceptance (200, events_received=1)
included an inactive-test-session warning for TEST10505. Keep UI receipt pending
and do not retry automatically or infer production readiness from this result.

## Scoped Automatic Registration Test (2026-11-19)

Manual test UI receipt is confirmed by the owner's Processado screenshot.
For the next authorized test, keep production gates closed and use an isolated
expiring observer restricted to the new session's disposable email. Reuse canonical
consent/source/browser verification and recheck in the one-shot sender. An exclusive
attempt marker prevents automatic replay even after ambiguous transport results.
Do not describe this test observer as proof that the production scheduler is wired
or approved. Refusal/revocation and repeated observation are covered with scoped
real-PostgreSQL fixtures; actual new browser signup remains a human test gate.

## Explicit Second Registration Attempt (2026-11-19)

Owner separately authorized a second attempt after confirming the Site session
code. Revalidate current evidence and require identical event_id and payload hash;
retain both attempt markers and never turn this into an automatic retry loop.
Meta accepted this attempt with HTTP 200, one event received and zero messages.
Visual confirmation and production approval remain separate outstanding gates.

## Registration Test Receipt Limitation (2026-11-19)

The explicitly authorized one-shot local registration attempt passed canonical
prior-consent/browser checks. Meta accepted one CompleteRegistration (HTTP 200,
events_received=1), but warned that TEST10505 has no matching active Test Events
session. Do not interpret API acceptance as visual test confirmation or permission
to enable production. Preserve the attempt marker, prohibit automatic retries,
and require an active Site code plus explicit authorization for another attempt.
Only fbp accompanied the event envelope; no profile or clinical fields were sent.

## Registration Test Preview Boundary (2026-11-19)

Keep registration preview separate from the Stripe subscription test context.
It is a pure serializer after canonical consent/source resolution, restricted to
local owner tests, carrying only the registration envelope and browser identifier.
No purchase amount, click ID, profile data or transport is introduced. Test code
presence is not transmission approval. Real Meta receipt remains unverified.

## Expanded Preference Version (2026-11-19)

Use lectum-meta-measurement-2026-11-19-registration on both sides for the detailed
notice including professional registration. Invalidate previous stored choices;
do not migrate acceptance from the Subscribe-only version. Keep the approved
compact banner intact and all details/refusal controls inside preferences. This
text/version update is not approval of production transmission and does not
retroactively authorize either Google account created during the prior test.

## Professional Registration Resolver (2026-11-19)

CompleteRegistration now has a separate worker resolver, reusing the canonical
source, durable job identity and verified first-consent bridge. Only a claimed
guest browser identifier captured before account creation is eligible. The
resolver never substitutes a later identifier, changes the creation timestamp or
includes subscription value. Current consent and original guest evidence are
rechecked; patient roles remain rejected.

The canonical registration URL and notice version require their own review and
default to null. Subscribe-only notice acceptance is not authorization for signup
transmission. No new transport or environment bypass is introduced; the production
policy stays blocked. Local PostgreSQL assertions verify payload minimization,
replay identity, consent timing/revocation and source/role rejection. Provider
receipt and fresh consented signup remain separate pending validation steps.

OAuth follow-up: a dedicated local test client is now configured; the owner has
reported successful Google signup for both roles. Earlier missing-client notes
below describe the preceding checkpoint, not the current client configuration.

## Release Evidence Boundaries (2026-11-19)

Keep build/check evidence, isolated browser contracts and PostgreSQL integration
evidence distinct from real OAuth/email and production acceptance. The local UI
preview must not be described as a configured Google login environment. Missing
test OAuth credentials remain a release-validation gap, not a reason to reuse
production credentials or substitute simulated authentication.

Cookie notice colors now use centralized semantic tokens while retaining the
approved appearance. Browser QA asserts opaque background and white acceptance
text as well as behavior and bounds. Source-safety recognizes test-file doubles
without allowing them in shipped UI; other safety rules still apply to tests.
Local QA variables are documented but excluded from production env templates.

## Patient Creation Boundaries (2026-11-19)

Patient email signup reads current browser consent before generating optional
analytics identifiers; its repository requires measurement_allowed === true.
Missing declarations from older clients fail closed for attribution, not account
creation. This guest declaration is separate from legal/adult attestations and
does not silently grant marketing consent to the newly created account.

For patient Google registration, omit optional analytics both in the browser and
in persistence. OAuth may outlive or return after revocation of the local choice;
retaining a consent snapshot would not prove current authorization. Professional
signup behavior is outside this change.

Patient posts are requested product content: persistence, moderation and eligible
community notifications do not depend on optional cookies. Keep their literal
Meta conversion hook blocked and do not add content, identity or attribution to it.
PostgreSQL tests verify publication under absent/accepted/revoked consent,
operational notifications, moderation, and zero external fetches. This is local
creation-flow evidence, not approval for patient advertising or all-site analytics.

## Internal WhatsApp measurement boundary (2026-11-19)

The contact HTTP path now has local PostgreSQL coverage through the real directory
router and notification dispatcher. Consent creates a contact plus the intended
in-app notification; refusal/revocation and unresolved sessions preserve the URL
without recording or notifying. Recipient opt-out skips notification delivery,
and redispatching one contact is sequentially deduplicated. Fixtures have no push
subscriptions or connected sockets. This verifies persistence and policy decisions,
not external delivery, concurrent deduplication or production behavior.

Optional authentication can downgrade invalid credentials to guest access. Keep
that availability behavior, but apply a scoped identity guard to contact-click and
important-action routes: unresolved user credentials cannot authorize measurement
as a guest. Authenticated identities still require fresh repository consent.
Real HTTP/Passport regression tests cover eleven identity cases and eighteen
denied WhatsApp action requests without database access.

Additional real HTTP/PostgreSQL coverage now uses persisted JWT sessions and the
important-action router: bearer/cookie success with current consent; refusal,
revocation, expiry, missing/wrong device and removed tokens deny writes. Two
consented accounts cannot share ownership of one analytics session, and repeated
event IDs do not duplicate actions. Only disposable loopback database fixtures are
used and removed. This does not validate production or contact notification delivery.

Local PostgreSQL integration now verifies real writes, refusal/revocation/expiry,
notice version, event idempotency and cross-account session ownership with scoped
disposable fixtures. This covers services/repositories, not HTTP authentication,
provider delivery, production configuration or general analytics retention.

Verified eight browser scenarios on mobile/desktop using real UI with synthetic
API responses and intercepted external navigation. No Meta traffic or real contact.
This evidence does not substitute authenticated server/database integration tests.

Separate contact availability from optional measurement. A refused/missing browser
choice returns the contact URL without persisting the click or notifying the
professional. Authenticated measurement additionally checks current server consent;
anonymous measurement relies on an explicit browser declaration. Missing fields
from older clients fail closed for measurement while preserving contact access.
Do not bulk-link historical actions/sessions on a WhatsApp click. Recheck the local
choice after availability verification, before creating the analytics identity.
This narrows existing first-party collection; it does not approve patient Meta
sharing or establish a retention policy for the remaining analytics surfaces.

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

Final preparation checks: 43 marketing unit tests, backend TypeScript no-emit and
targeted Biome passed. Default resolver import is lazy so blocked delivery does
not initialize database dependencies. Notice acquisition and live capture remain
separate pending work, not implicitly approved by the diagnostic or this change.


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


Date: 2026-11-12. Status: accepted for local foundation; external activation pending.
Task: TASK-333.

## Diagnostic comparison dataset (2026-11-18)

After support explicitly framed a new dataset as diagnostic only, owner created
1846546873030021 with the health-provider category retained and authorized one
Subscribe test with TEST66765. Preserve original dataset and all production gates.
Revalidate consent and browser/payment evidence in a read-only local transaction;
reuse the genuine historical event without inventing a new time or source URL.
Only test code, destination and separately supplied credential may change.
Separate exclusive attempt lock prevents retries and preserves previous receipts.
The single request returned HTTP 200 / events_received=1 / messages=[] at
2026-11-18T17:21:54.743Z. PostgreSQL was stopped after validation and sending.
Visibility and root cause remain unconfirmed; this is not approval for production,
category avoidance or replacement of the original dataset.

## Restricted public-origin sandbox decision (2026-11-18)

Explicit owner authorization permitted one temporary HTTPS sandbox flow and one
Meta test send, not production activation. Preserve genuine browser provenance:
register, grant consent and complete Stripe sandbox checkout on the public origin
instead of editing the source URL of an old payment. Protect the gateway with an
ephemeral HttpOnly/Secure cookie, route allowlists and a one-hour lifetime; keep
database, SMTP, administrative routes and Stripe webhook off the public tunnel.
Authenticated dev-websocket forwarding is harness-only. Internal API BASE remains
loopback and Stripe runtime protections are unchanged; public WEB_URL represents
the actual browser-facing origin. No application policy is enabled in source.

The completed browser flow produced one canonical sandbox receipt and persisted
consented context. A separately locked, read-only-revalidated send at
2026-11-18T16:46:57.133Z returned one received event without messages or errors.
Cancel sandbox renewal, disable the test offer, stop all temporary services and
remove the gateway credential afterward; shutdown was verified. UI confirmation
is still required. Support's localhost explanation remains a hypothesis, not a
conclusion established by HTTP 200. Preserve prior attempt locks and require
separate authorization for another send. No production deploy risk from these
ignored harness changes; production compliance gates remain pending.

## Coordinated session acknowledgement (2026-11-18)

Following explicit owner authorization with the Test Events Website session open,
one independently locked attempt reused the unchanged approved event after local
read-only consent/evidence validation. At 2026-11-18T15:54:49.995Z Meta returned
HTTP 200, one received event, no messages and no error. This removes the observed
session warning for this attempt only; it does not authorize production or prove
UI visibility, deduplication, policy eligibility or advertising attribution.

## Separately authorized resend diagnostic (2026-11-18)

One separately authorized resend preserved the approved payload and event ID,
after read-only revalidation, using a separate exclusive attempt lock. Sanitize
provider diagnostics before local persistence; never log secrets or raw user data.
Meta acknowledged one event at 2026-11-18T15:43:28.427Z but explicitly reported
no matching active Test Events session for TEST89280/dataset/action source and
that the event will not appear in Test Events. Resolve session configuration
before any further separately authorized attempt. Production remains disabled.

## Scoped one-shot test authorization (2026-11-18)

The owner's explicit authorization permitted exactly one reviewed sandbox
Subscribe payload with TEST89280, not general or production activation. The
isolated sender revalidated persisted consent/payment/context and the approved
payload hash, recorded an exclusive attempt marker before POST, and allowed no
automatic retry. Meta acknowledged HTTP 200 / events_received=1 at
2026-11-18T12:51:11.123Z. One provider message was counted but not retained;
Events Manager review remains pending. Keep ordinary transport disabled and
do not equate API receipt with policy approval, attribution or deduplication.

## Validation runtime follow-up (2026-11-18)

Use a checksum-verified portable Node 24.22.3 for local validation without changing
the user's global runtime or weakening the required engine range. Fix the Windows
Glob fixture with portable pattern separators and normalized assertion paths,
preserving the security regression assertions. This changes no application policy.
The full frontend/backend checks and 13 real PostgreSQL marketing integration
tests passed on this runtime. The backend general suite reports 1506 passes,
zero failures and 46 conditional skips. External Meta delivery remains a separate
authorization gate; no production migration, deployment or transmission occurred.

## Persisted sandbox checkout context (2026-11-18)

Add an optional, disabled-by-default authenticated endpoint under the existing
consent cookie path. It accepts only operation ID, consent revision and document
version. Identity and cookie come from authenticated middleware, the user agent
from the request header, and the query-free source URL/account from server policy.
No device-authentication header is stored in marketing evidence.

Only an owned Stripe test checkout awaiting confirmation can create evidence.
Serializable transactions and the operation primary key preserve the first
capture across concurrent retries; neither the browser binding nor expiry is
replaced. Retention is at most 24 hours and capped by consent/browser expiry.
Revocation cascades from browser evidence; the existing retention purge also
deletes expired checkout contexts. Its scheduler remains disabled.

The offline preview resolves the exact checkout from the canonical first paid
receipt and completed invoice.paid inbox, then reads its stored context and current
consent. Client-supplied context is not used by this new composition. No enqueue
or Meta transport was added. The serializer still requires an exact reviewed
HTTPS URL, even for a local preview.

Migration 20261118030000 adds a separate table and indexes without altering billing
tables or existing data. Applied only to the isolated local PostgreSQL database.
For an eventual authorized rollout, apply the additive migration before deploying
code; keep capture and external transmission disabled. Rollback disables the
optional capture and retains the table; no destructive schema rollback is needed.

The frontend bridge is separately disabled by default. Before presenting a newly
created checkout for confirmation, it checks local choice and current server
consent, then posts only the operation/revision/document identifiers. The entire
optional attempt is bounded to one second, aborts on timeout, and cannot produce
a toast, sign-out or payment failure. Consent is rechecked after the status read.
The hook also checks that it remains mounted after the optional asynchronous work.
Initial harness validation intercepted the real checkout response; the native
bridge has a separate browser test mode without payment-response interception.
Sandbox fixtures use only approved synthetic campaign names and a local certificate;
no production settings, trust-store installation or Meta requests are required.

## Read-only matching of stored identity to first payment (2026-11-17)

Add a sandbox-only composition that accepts an opaque browser bearer and a trusted
authenticated checkout context, not a caller-supplied fbp. Resolve the stored identifier
through current account consent and original claimed guest provenance, then reuse the
canonical first-paid receipt/invoice.paid resolver. No extra payment integration, write,
enqueue or network operation is introduced. Production event policy is unchanged.

Separate identifier age from checkout context age: an identifier can be seven days old
and still valid, whereas checkout context must follow current account consent, precede
canonical payment and meet the existing 24-hour local preview freshness bound. Current
revocation/expiry blocks use even for earlier payments. Repeated reads preserve event ID.
This read-only helper does not by itself capture checkout URL/UA or activate a transport;
trusted context capture and a fresh Stripe sandbox E2E remain explicit prerequisites.

Validation used real isolated browser registration with local SMTP and PostgreSQL, plus
separate canonical payment fixtures using the official ID builder under a controlled
clock. No actual new Stripe payment or Meta event was performed in this increment.

## Anonymous handoff without retention renewal (2026-11-17)

Reuse the existing anonymous consent token, already held by the acquisition client,
as the bearer for the path-scoped HttpOnly cookie. Do not introduce another identity
mechanism or pretend that HttpOnly hides the existing acquisition token from its client.
Store only its hash on the server. Add nullable paired browser evidence fields to guest
attribution; do not backfill historical visits. Anonymous browser capture additionally
requires a separately reviewed campaign allowlist (empty by default) and the disabled
browser policy. Consent alone does not establish eligibility in a health context.

Claim browser evidence atomically with the existing explicitly authorized attribution
transfer, then clear the guest copy. Never backdate account consent: reads of pre-signup
evidence verify the claimed guest record, document, source consent, account revision,
active professional owner and both expirations. Keep the original 30-day expiry even
though campaign attribution can have its separate bounded post-signup lifetime.
Guest revocation deletes the transferred browser record as well as campaign attribution.
Public capture/revoke can set/clear the same existing private-path cookie; its path is
not broadened. No URL, IP, referrer, form data, email or click ID enters the SDK.

Migration 20261118020000 is additive and was applied only to disposable local PostgreSQL.
Older code tolerates nullable columns; rollback disables collection, retains the columns
and runs existing retention cleanup, rather than destructive schema rollback.
No deployment/activation is included. Actual browser behavior and first-payment linkage
remain prerequisites; local HTTP/PostgreSQL tests are not a complete Stripe/Meta E2E.

## Disabled authenticated browser capture (2026-11-17)

Adopt the audited exact capi-param-builder-nodejs 1.3.2 behind a code-level disabled
gate, never a full-request extractor. Persist its fbp separately from UTM data with
consent revision, creation and fixed expiry capped at 30 days/current consent.
Use a random opaque HttpOnly cookie; only its hash enters the database. Read/reuse
requires matching authenticated owner and current consent; revoke/regrant deletes
records. No automatic account-to-new-browser identifier restoration. This does not
implement anonymous visitor transfer or authorize Meta transmission. Additive
table migration is required before any future activation; no production deployment.

## Shared identifier parser and persisted sandbox consent (2026-11-17)

Use one strict parser for legacy/official fbp formats in the serializer and sandbox
preview. Decode the official appendix structurally and preserve it unchanged.
Do not trust syntactic validity as proof of browser ownership or consent. Reuse
the persisted sandbox consent resolver and additionally enforce ID creation after
the current grant and fixed 30-day expiry. No new capture route or SDK dependency
is activated by this validation change. The trusted capture/generation path remains
pending, as does actual delivery; tests use disposable local database evidence.

## Official builder audit, not adoption (2026-11-17)

Evaluate capi-param-builder-nodejs 1.3.2 only in the ignored isolated audit directory
with scripts disabled and exact package lock. No application dependency added.
The minimal-input processRequest call generates an official identifier with no
event send or supplied IP/URL/referrer. It is deprecated upstream; review lifecycle
before adoption. Never use whole-request extraction or forward every output.
The official fifth appendix must be supported through explicit validation, not
stripped or accepted using an unbounded regex. Current Lectum validators reject it.
Enforce consent before calling the builder and override its rolling 90-day default
with an approved fixed retention; diagnostic uses 30 days from identifier creation.
Nine isolated scenarios passed with real Edge cookies and simulated time, but
fixture consent is not persistent Lectum authorization. No activation, database,
Stripe or CAPI changes; actual application integration remains pending.

## Cookie origin investigation (2026-11-17)

The inspected Pixel cookie plugin creates the browser cookie during event custom
parameter processing, not its configLoaded callback. Do not add PageView or call
private SDK internals solely to satisfy the sandbox's pre-payment fbp constraint.
Official Meta capi-param-builder NodeJS docs describe server-generated first-party
cookies; that supported mechanism is not equivalent to fabricated test evidence.
Evaluate it as an alternative, not an activated dependency. Audit IP, URL/referrer,
format, consent and retention before any adapter or new collection. Keep the
existing strict source/consent checks and all transmission gates unchanged until
the replacement evidence flow is tested and approved. No new package installed.

## Reviewed configuration fetch (2026-11-17)

Owner requested review and continuation of the SDK probe. The exact dataset GET
contains SDK version/release, localhost and module encoding metadata; official SDK
source confirms hme/ex_m originate from module encodings. No cookies, authorization,
body or Referer were present. Permit this resource only in the explicit temporary
probe mode after strict parameter validation, without redirects. Keep all event
and other external endpoints blocked. One SDK and one config resource loaded with
zero event requests; init-only localhost context still produced no _fbp. Do not
infer production behavior or add tracking calls to obtain an identifier. No change
to production gates, consent policy, browser collector or delivery authorization.

## SDK-only authorization boundary (2026-11-17)

The owner authorized loading Pixel in a fresh isolated browser, not sending events.
The diagnostic allowed only the exact official SDK resource, disallowed redirects
and blocked every other external request. SDK initialized; no tracking command or
event request occurred; one configuration request was blocked; _fbp was absent.
This is an inconclusive cookie-generation probe under restricted networking, not
a delivery test or permission to send PageView. Do not fabricate _fbp or reuse
personal sessions. Any further configuration fetch needs payload review and event
endpoints must remain blocked. Production gates and application code unchanged.

## Bound sandbox browser evidence (2026-11-17)

Compose sandbox source and offline preview only when browser evidence matches
the canonical owner and exact consent revision/document. Require capture after
consent and before payment, bounded to 24 hours for this single controlled test.
Reject unknown fields and impossible future fbp timestamps. This pure/read-only
composition does not authenticate capture or create a browser identifier; the
isolated trusted caller remains required. Never silently load Pixel or substitute
unit fixtures for actual consented capture. No production or sending changes.


## Separate read-only sandbox source resolver (2026-11-17)

Keep sandbox evidence outside the live Subscribe recording/delivery pipeline.
Resolve only test-scoped canonical first-paid receipts with reconciled history,
completed invoice.paid and matching owner checkout. Recheck exact server consent
revision/document at occurrence and preview time. Use a stable namespaced hash
for test event identity; emit no Stripe identifiers. Verify with a READ ONLY
PostgreSQL transaction. The future isolated caller must pin owner/account/local DB;
this primitive is not an authenticated endpoint or permission to send.


## Owner approval limited to controlled test preparation (2026-11-17)

Owner approved a Subscribe-only sandbox preparation using his consented test
account, source URL without query parameters, fbp and client_user_agent plus
event identity/time and actual BRL amount. Exclude fbc and all other identifiers.
Implement this in the offline preview only, requiring explicit local/test/owner
context. Context labels do not replace canonical payment or consent verification.
No production policy or acquisition gate changes; no new collection or sender.
Separate authorization after exact local preview remains necessary for sending.


## Website API contract gap (2026-11-17)

Official Meta v25.0 parameters documentation lists client_user_agent as required
for website events, alongside action_source/event_source_url. Existing local
serialization lacks this field; offline passing tests are not API readiness.
Do not add collection without review, change action_source to bypass requirements,
or use the server/Stripe webhook user agent instead of event-origin evidence.
Controller review must cover this additional field before matching capture and
controlled external testing. No policy, environment or transport gate changed.


## Offline Test Events preparation (2026-11-17)

Use a pure `prepareMetaTestPreview` wrapper around the existing consent-aware
serializer. Require an explicit valid test code and reviewed sources/document;
return `local_preview_only` with `transmissionAllowed: false`. No sender, token
reader, environment flag or production import is added. Test codes do not establish
eligibility or exempt test payloads from privacy review. Production policy remains
blocked. Real API acceptance and identifier/source approval remain external gates.
Reference: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/v25.0/


## Canonical source validation and lost-hook recovery (2026-11-17)

Do not trust a delivery resolver's amount or occurrence merely because its event
ID matches a job. Re-read the original user/checkout or persisted first-paid
Stripe evidence and ledger. Verify ownership, exact timestamp, event identity,
positive actual BRL amount, immutable receipt hash and completed invoice.paid.
Current refunds/disputes invalidate delivery. No Stripe API fetch is added.

Use bounded keyset scans of existing business records to recover lost post-commit
hooks. Reuse serializable deduplicated queue writes; no duplicate integration,
new durable table or independent active timer. Gate before scanning and require
an explicit reviewed activation start (null until approved), never historical
import. Restart may revisit records but cannot change durable identity.

All external gates and identifier/source URL approvals remain closed. Matching
collection/resolution cannot be completed by inventing an identifier or interpreting
empty Meta diagnostics as permission. Owner must supply dataset restriction evidence
and privacy decisions before activation-specific work. No deploy.

## Registration evidence bridge (2026-11-17)

Keep account granted_at unchanged. For professional_registration only, accept an
earlier server-recorded guest grant through the existing authorized transfer.
Require first account revision, matching document, active psychologist, canonical
user.createdAt/source reference, linked attribution revision and timestamps, and
a claimed, unrevoked, unexpired guest source. Regrant cannot revive this exception.
The queue evaluates it both when persisting and immediately before delivery.
An effective evidence start is returned to the serializer; no stored date is
backdated. Consent transfer and gated registration enqueue share a transaction.

No new fields or retention extensions: purging the 30-day guest source removes
this eligibility. This conservative loss is preferred to retaining extra evidence
without review. No new UI acceptance step, collection enablement or Meta activation.
The provider resolver remains unimplemented/unapproved, so this establishes local
eligibility only, not end-to-end external delivery. The acquisition helper used by
payments retains its stricter account-at-occurrence rule.

## Ownership, revocation and maintenance (2026-11-17)

Supersedes the unwired-retention limitation below. Delivery metadata now references
the internal user and consent revision; nullable additive columns tolerate older
versions, but new jobs require valid professional consent. Serializable enqueue
and revoke prevent revoked work from being restored by a racing insert. Regrant
deletes previous jobs; user FK deletion cascades. Fresh server consent replaces
resolver-provided consent immediately before delivery, after a live lease check.
No identifier is added to an external payload by this change.

Reuse attribution maintenance opt-in/start/stop for queue retention; cleanup stays
independent of CAPI enablement and defaults off. Migration must precede code because
consent operations access the queue. Rollback code without dropping additive schema.
Subscribe gets transaction-local gated enqueue; patient events, registration and
checkout remain unconnected. Source URLs, matching identifiers, outbound resolver
and delivery scheduler remain pending; policy/collection gates are unchanged.
Do not retroactively enqueue previously blocked conversions after approval.

Local database race/retention tests and API health passed without provider sends.
Consent revocation cannot recall a network request already dispatched; this design
does not promise atomicity between database commits and external network delivery.

## Delivery metadata queue (2026-11-17)

Reuse Prisma/PostgreSQL and the existing CAPI consent serializer, with an additive
marketing_delivery_jobs table. Persist only event identity, business reference,
immutable occurrence time and retry/lease state; resolve consent/payload freshly.
Unique event_id and conversion/source_ref fence duplicates, including secret-key
rotation conflicts. A timed-out response is unconfirmed, never proof of rejection:
retry the original event_id. Provider deduplication must be verified externally;
no exactly-once network guarantee is made.

Two-minute leases fence obsolete acknowledgements, 12 attempts bound failures,
and seven-day event expiry blocks indefinite replay. Proposed queue metadata
retention is 30 days from occurrence, not campaign/Meta attribution retention.
Maintenance must run independently of external delivery once collection exists.
No scheduler/product enqueue is wired and all external policy gates remain closed.
Local PostgreSQL state-machine evidence does not validate Meta receipt.

Rollout: apply additive migration before any future queue consumer, keep collection
and transmission disabled until per-event resolvers and privacy approval exist.
No new environment variable/dependency. Existing versions ignore the new table.
Rollback by disabling/not wiring consumers; preserve the table and avoid destructive
rollback migrations. Before activation, implement revocation-linked removal and
retention scheduling, and validate external delivery with approved synthetic data.

## Recovery fencing regression (2026-11-17)

Real local PostgreSQL regression now explicitly verifies stale-worker defer and
terminal-job retry cannot override a new lease or reopen completion. The 41-test
marketing suite passed with external transmission blocked. This validates local
conversion recovery, not an implemented Meta delivery outbox or provider receipt.
External activation remains pending; no new provider call or deployment occurred.

## Automatic handoff verification (2026-11-17)

Isolated browser signup with local SMTP verification and PostgreSQL confirmed
one automatic authorized handoff after Accept cookies, no additional dialog and
no duplicate on reload. First/last synthetic campaigns remained distinct, with
bounded post-signup retention. A measurement-only choice produced no account
consent or attribution after signup and reload. Scoped test data was removed.
Capture overrides existed only in disposable test processes; shipped gates remain
disabled. No Stripe payment or external Meta delivery was exercised in this run.

## Delayed attribution audit and proposed retention

Implementation continuation: cross-session code is now prepared behind separate
disabled browser/server collection gates. Anonymous campaign data is stored on the
server under a hash of a random browser token with a fixed 30-day lifetime. The
token is not a user credential and cannot grant authenticated consent. A distinct
explicit association choice and an authenticated consent revision are required to
transfer it transactionally once; first/last campaigns stay separate. Claimed guest
payloads are erased and the browser's usable token is removed. Revocation tombstones
prevent delayed capture from restoring a refused identity. Account retention is at
most 90 days, further capped by consent expiry, independent of Meta attribution.

The additive cross-session migration supports old rows and old deployments. Hourly
deletion is separately opt-in via MARKETING_ATTRIBUTION_RETENTION_ENABLED; it must
be enabled before collection and stay enabled after collection is paused. Read-time
expiry is always enforced. Capture, maintenance, campaign catalog and notice changes
require a later reviewed rollout. The current change activates none of them.
The browser/database/Stripe-ledger integration test passes with disposable records;
real registration UI and Stripe sandbox delivery remain explicit release gates.
The following audit snapshot describes the state before this continuation.

The 2026-11-12 audit adds regression coverage, not a new tracking implementation.
Current persisted acquisition can resolve days or weeks later, only with valid
consent both at payment and processing time. The campaign catalog remains empty.
First/last touch and an authorized guest-to-account transfer are not implemented;
existing internal analytics visitor identity is not marketing consent evidence.
Propose a fixed 30-day pre-signup lifetime starting at the first consented capture,
subject to privacy review; preserve first touch and update last campaign separately.
After signup use separately approved bounded server retention, never an unlimited
wait for first payment. Expiry/revocation must invalidate conversion resolution.
This retention policy is distinct from any Meta attribution or delivery window.
See TASK-333 for test evidence and the full proposed safeguards. No deploy or activation.

## Privacy preference interface

The requested notice is versioned as lectum-campaigns-2026-11-12, with 90-day browser
preferences and server consent for authenticated accounts using the existing API.
Active patients may also save privacy choices; this never permits patient Meta events
or acquisition association. Meta policy and the empty campaign catalog stay closed.
The notice version identifies the presented copy, not a legal or Meta approval.
Anonymous choices cannot become server conversion evidence automatically on login.
Existing first-party page/location measurement is gated by the choice; this change
does not install a Pixel loader or lift the CAPI gate. Per the requested layout,
refusal is available inside Preferences, with a permanent reopen action on the
Privacy Policy page. Initial acceptance reads Aceitar cookies. Legal review remains pending.
Pending revocation fails closed locally and retries on a subsequent visit. No deploy.

## Current continuation: persistence and internal recovery

Supersedes the initial no-migration/no-queue snapshot below. Add optional consent,
revision audit, approved attribution and internal Subscribe-job tables through an
additive migration. Keep conversion identity in existing payment_events with lifetime
professional uniqueness. All external Meta policy gates remain hard-disabled.

Use the existing signed Stripe inbox as recoverable discovery source. Separate
financial completion from marketing acknowledgement; late invoice.paid or ledger
completion is retryable. CAS leases and immutable event_id make crash-after-commit
replay idempotent. Never import an external sender into this worker. Its optional
flag and explicit discovery cutoff are separate from CAPI, both off by default.
Do not modify checkout, collection or financial reconciliation semantics.

Consent grant is versioned, optional and owner-authenticated, with server timestamps
and serializable optimistic revisions. Revocation removes campaign attribution;
only a consent revision reference may remain on a blocked conversion. Attribution
must have been captured with valid consent before payment and still be valid now.
No use of mandatory terms/promotional consent; no retroactive acquisition snapshot.
No approved notice or campaign catalog exists, so collection is unavailable until
review. Authenticated persistence does not imply a completed anonymous signup handoff.

Real isolated PostgreSQL tests now verify races, durable deduplication, delayed
events, lease takeover and revocation. External provider validation and full release
gates remain pending as detailed in TASK-333. No production data or deploy involved.

## Earlier implementation snapshots

Stripe correction: owner confirmed Stripe, and refreshed homolog contains the
signed inbox plus canonical financial ledger. Reuse those, not legacy MP hooks.
Internal Subscribe evidence uses the existing payment_events unique key in an
isolated marketing_stripe_subscribe namespace; this is not a provider event and
must never be fed back into billing. It stores only minimal financial references,
actual BRL paid amount, blocked transmission status and persisted event_id.
No new payment request, checkout edit, webhook endpoint or migration is needed.
Default-off internal observation awaits real database/concurrency testing, retry
and event-order handling, audited lifetime history and consent-bound attribution.
No external transmission is authorized by this ADR. See TASK-333 limitations.

Lectum is a health-context service. Existing internal analytics and promotional
authorization are not permission to disclose acquisition/activity to Meta.
No Pixel/CAPI integration exists in the inspected source. Meta dataset restrictions
and dedicated measurement consent are unavailable. Do not invent provider approval.

Patient signup, WhatsApp contact and community publication remain blocked based on
context, even without clinical fields. Professional B2B conversions remain pending
dataset/privacy review. No environment flag overrides that decision. No global Pixel
script is loaded and no CAPI network transport is activated.

Prepare isolated pure policy, attribution-validation, event-identity and first-paid
candidate functions with tests. They have no runtime hooks and do not persist data.
Use existing gateway payment contract and analytics identity infrastructure in the
eventual integration, not a separate analytics dashboard/database.

Subscribe requires validated webhook plus trusted provider payment, full professional
payment history and durable uniqueness across subscription IDs. Subscription activation,
notification receipt or a new empty marketing ledger must never count as payment.
The helper alone cannot establish history/compliance or prevent concurrent duplicates.

Do not transmit raw UTMs: values themselves can contain health data/PII. An approved
server-controlled campaign catalog and specific revocable consent are required.
fbclid is a separate identifier decision. Hashed IDs remain linkable personal data.

Trade-off: activation is delayed, rather than turning a privacy uncertainty into real
disclosure. Full runtime implementation and Events Manager/mobile validation remain
open in TASK-333. No new dependency, migration, required env or deployment.

## Continuation with dataset ID

Owner supplied Lectum | Web (1606598847399888) and explicitly kept transmission off.
Dataset creation without selecting a health category does not establish eligibility.
Connect minimal domain hooks after committed actions, terminating at the compliance
gate before collecting identifiers. Prepare strict CAPI transport and pure Pixel
commands, but no Pixel SDK loader. Do not read URL/referrer/forms automatically or
enqueue events for retroactive sending. Source URL approval list stays empty.
No API version is guessed or silently upgraded. Secrets remain backend-only envs.
Subscribe webhook connection, durable deduplication/outbox and consent persistence
remain incomplete and are explicitly tracked; no production activation or remote test.

## Local mail validation (2026-11-17)

Use smtp-server and mailparser only in an ignored disposable .tmp tool directory,
not in application manifests or deployment artifacts. Bind SMTP to loopback, accept
only synthetic @example.invalid recipients, disable relay and external delivery,
and keep received messages in process memory. Browser automation obtains the actual
code from that SMTP message, never from the user table, and submits the existing
verification form. This validates local SMTP and verification, not internet mail
deliverability. No production email credentials, Meta activation or deploy.

## Public-page identity and synthetic attribution validation (2026-11-17)

Privacy preferences must work on direct public legal-page visits by authenticated
users, not only after private-app navigation has hydrated Redux. Reuse the existing
auth query and canonical user action to populate missing identity; never weaken
the consent mutation's account-change guard or infer consent from authentication.
Identity loading/error stays fail-closed. All privacy surfaces use the same hook.

Positive browser acquisition uses a disposable frontend copy/compiler policy and
local API policy injection, never a production env toggle. Only named synthetic
campaigns are allowed. External Meta remains disabled. This validates UI transfer
and the actual resolver against a real sandbox invoice; sandbox Subscribe remains
excluded and cannot be used as evidence of a delivered production conversion.

Provider/local clock skew must not be solved by backdating consent or relaxing its
ordering check. The test measured about 51 seconds of local clock lead and waited
after consent before payment. Verify clock synchronization before live activation.
The successful new-tab scenario does not replace seven-day browser/Safari coverage.

### Frontend dependency gate (2026-11-17)

Use the minimum verified patched Next 16.4.5 and matching eslint-config-next in
the frontend's own manifest/lockfile. Preserve React, payment SDKs, Sentry version
and all consent gates. Registry metadata confirms compatible Node/React peers.
GHSA-mfr8-8qww-v76h and GHSA-vc7v-qv4w-wrv8 disappear from the production audit.
GHSA-fc5q-39xc-vjpf remains through Sentry/Rollup/picomatch with no published fix
listed at review time. Do not hide the advisory or assert zero vulnerabilities.
Other applications are independent and not implicitly upgraded by this change.

Picomatch follow-up: distinguish the audited Sentry/Rollup build dependency from
Next's separately vendored runtime matcher. Fixed-pattern boundary tests support
the inspected paths, not a global safety claim. Keep GHSA-fc5q-39xc-vjpf visible;
do not replace it with latest 4.0.7 (also affected), suppress audit, or disable
observability solely to achieve a green audit. Release needs reviewed treatment
of this remaining advisory, independently of Meta consent approval.
## Activation matrix decision (2026-11-17)

User subsequently requested one Accept cookies action for all presented optional
purposes, with no additional alert. Supersede the earlier mandatory separate
transfer click: explain association in the existing notice, retain granular Save
preferences, persist explicit guest authorization, and version the notice on both
sides. A prepared handoff can use that prior express authorization only for an
undecided psychologist account and a valid one-use token; it never replaces account
refusal. No authorization is inferred from login or old measurement-only consent.
Feature/transmission gates remain disabled. No retroactive conversion authorization.

Owner accepted the matrix; no identifier/transmission permission is inferred.
The prepared sender now checks consent at the exact persisted occurrence and at
send time against an explicitly reviewed document version (still unset). Require
millisecond evidence matching serialized seconds so later consent cannot authorize
an earlier event and retries cannot retimestamp it. Keep durable resolver/revision
binding and outbox recovery as separate unfinished work; pure guard tests do not
prove concurrent revocation/remote-send atomicity. All external gates remain closed.

TASK-333 now contains a per-event professional B2B approval matrix. All three
events remain pending; patient events remain blocked. Privacy approval and technical
delivery readiness are separate gates: registration's null resolver, checkout
delivery identity/outbox, and Subscribe's external recovery path must not be
represented as complete based on sandbox invoice evidence. The CAPI serializer
requires fbc/fbp while their collection is unapproved; no fallback identifier is
authorized. Proposed fixed 30/90-day retention remains subject to review.
No code/config flags, secrets or external services changed. Meta terms retrieval
was login-blocked; account-specific permission review remains an external gate.

# Manual PageView diagnostic addendum (2026-11-18)

Diagnostic observability correction: preserve redacted, bounded provider message
text and codes, not just message counts. Previous lost message content must not
be guessed or recovered by replaying the event. Browser Resource Timing and CSP
snapshots are partial client evidence, not a full network trace or receipt proof.
Existing attempt locks and receipts remain untouched; all repair tests intercept
external transport. Manual Chrome PageView still lacks owner-visible UI receipt.

Owner chose a separate, explicit-consent PageView connectivity diagnostic rather
than proceeding with sandbox payment. The loopback-only ignored harness is not
an implementation of production tracking, not a renamed Subscribe and not an
eligibility workaround. It records a real visit to its diagnostic page, one
browser attempt and an independently manual server attempt with the same event
identity. No historical account action is transmitted retroactively.

The temporary visitor identifier is generated for this diagnostic session and
hashed before CAPI transmission; it is not an email, account ID or invented
customer match. No attribution quality claim follows from this test. The separate
notice discloses Pixel network metadata/cookies and possible dataset statistics.
Existing registration consent and test-only legal documents are not reused as
authorization. Original production guards remain disabled. Provider restrictions
must not be altered. Local intercepted UI tests are not provider delivery tests.

### Automatic owner sandbox round (2026-11-19)

Owner reconfirmed TEST10505 for a fresh manual-Chrome signup and Stripe test
payment. A separate ignored diagnostic process may send at most one Subscribe
after canonical sandbox payment/history, checkout browser evidence and current
versioned consent are verified. An exclusive on-disk attempt precedes transport;
unknown outcomes are not retried. The process is scoped to one synthetic owner
email, local database, test Stripe account and expiring session. It does not
enable production recording/delivery or reinterpret test payments as live.

New disposable test documents disclose the limited Meta transmission; previous
zero-transmission fixtures and existing account consent are not retroactively
reused. The approved short cookie notice is unchanged, with detail and rejection
in Preferences. Production checkout context support requires an explicit live
account/document/HTTPS review; defaults remain disabled. Provider UI receipt of
the new automatic round remains unverified until the owner completes the test.

After the owner paid, an unrelated old inbox row blocked the diagnostic. Exact
event-ID scoping is additive to the existing identity/lease predicates, and scoped
processing omits account-wide recovery. An invalid explicit ID never falls back
to a general claim. Real PostgreSQL regression passed. After repair, one resumed
diagnostic CAPI request returned HTTP 200/events_received=1 at 00:33:31 local;
the unrelated row remained byte-equivalent under a before/after SHA256.
The Meta UI receipt and uninterrupted production automation are not established
by this response. No automatic resend or production activation is authorized.


## Atualização 2026-11-20 — elegibilidade dos eventos de usuários comuns

Por autorização explícita do proprietário, removido o bloqueio geral `pending_context_review` de `patient_registration`, `patient_contact` e `patient_community_post`. Os nomes externos são `CompleteRegistration`, `Contact` e `forum_post`. A elegibilidade não substitui consentimento vigente e anterior à ação, versão do aviso, URL permitida por ação, evidência persistida e configuração explícita da CAPI. As regras dos profissionais permanecem inalteradas. Pré-visualizações locais continuam sem capacidade de envio (`preview_only`).

A versão do aviso de usuários e sua lista de URLs ainda precisam de configuração; esta mudança não ativa envio externo nem publica a aplicação.

Validação desta alteração: 59 testes de marketing aprovados, 22 integrações dependentes de banco não executadas nesta rodada; 44 testes focados aprovados. Biome dos arquivos alterados e git diff --check sem erros. Sem envio real à Meta, push ou deploy.


## Complemento — testes locais de 2026-11-20

Screenshots do proprietário confirmaram processamento de cadastro comum e publicação pela Meta. O recebimento da publicação resultou de recuperação manual de ação real; não constitui validação do hook automático. A URL genérica da página inicial é `/`, e o compositor também opera em `/psicologos`; essas rotas foram adicionadas à allowlist apenas do sandbox. Perfil efêmero de contato, marcado como teste e removido ao encerrar a sessão, permite testar a interface real sem alterar dados profissionais existentes. A ativação produtiva e a validação do Contact permanecem pendentes.

Retomada de preferência de conta: ao autenticar em navegador/origem sem escolha local, uma concessão vigente confirmada pelo servidor pode ser espelhada localmente com a mesma validade e versão. Escolhas locais existentes, inclusive recusa ou revogação pendente, não são substituídas. Isso não cria novo consentimento, não transfere origem e não altera revisão do consentimento persistido.


### 2026-11-21 — diferenciação de cadastro autorizada

CompleteRegistration agora inclui custom_data.account_type: user para usuário comum e professional para psicólogo, derivado da conversão interna, nunca de parâmetros arbitrários do cliente. Contact e forum_post continuam sem classificação. Preparação do Pixel profissional usa o mesmo parâmetro. Aviso de consentimento atualizado e versionado em 2026-11-21-account-type; aceites anteriores não são promovidos automaticamente. Eventos históricos não foram reenviados. Configuração das duas conversões personalizadas na Meta e ativação em produção permanecem pendentes.

### Ajuste de persistência — 2026-11-21
A preferência explícita do visitante não depende da existência de campanha aprovada na URL. O registro de transferência pode conter campanhas vazias; isso não autoriza criação de evidência de navegador fora da política existente. Os switches iniciais são selecionados, mas só salvar/aceitar registra a escolha. Recusas anteriores prevalecem. A integração de cadastro preserva o instante do aceite, sem reconstruir consentimento retroativo.

### Contexto direto para evidência de navegador — 2026-11-21
Permitir configurar explicitamente anonymousDirectVisits, independentemente de campanhas anônimas aprovadas. A ausência de UTMs não impede a criação prospectiva do identificador após aceite válido quando esse contexto foi habilitado. Flag omitida mantém comportamento anterior. Habilitação aplicada apenas no teste protegido; produção segue fechada. Não converter eventos antigos sem evidência em eventos elegíveis por preenchimento retroativo.

### Correção de transferência profissional em visita direta — 2026-11-21
O teste manual revelou que AttributionRepository.transfer ainda exigia campanha não vazia, embora captureGuest preservasse aceite de visita direta. A transferência agora aceita origem armazenada vazia, mantendo validações de versão, expiração, revogação, claim e conta ativa. Campanha previamente armazenada que deixou de ser permitida continua rejeitada. A integração de registro profissional percorre os casos com/sem campanha e valida horário original, parâmetro professional, revogação e ausência de envio externo. Ambos passaram. Sessão manual renovada para validação completa; nenhum evento profissional enviado, push ou deploy.

Confirmação visual recebida em 2026-11-21: screenshot do proprietário mostra Concluir inscrição Processado, recebido de Servidor, account_type=professional, evento cb2d5814247b407175eed7705e0269912e45d3f7028309fae7edda0661eb6b26, às 13:37:00. Junto ao recebimento anterior account_type=user, diferenciação validada de ponta a ponta no ambiente de teste. Não equivale a ativação produtiva; nenhum push/deploy nesta etapa.

Validação Google local em 2026-11-21: após limpeza autorizada apenas das duas contas Google de teste, novos cadastros reais de usuário comum (14:02:15) e profissional (14:07:56) confirmados no banco, com papéis corretos, termos/privacidade v5 e consentimento de medição anterior preservado. Envio Meta desabilitado, zero jobs; a validação externa de eventos originados do Google permanece separada. Sem alteração de gates produtivos, push ou deploy.


### 21/11/2026 — IP e agente do navegador

Autorização explícita do proprietário para revisar IP/agente e ajustar a implementação e o aviso. Não ampliar para nome/email/telefone. O middleware guarda um leitor de contexto em AsyncLocalStorage; a leitura e persistência ocorrem somente após o consentimento ser validado pelo outbox. O evento deve ter ocorrido dentro da mesma requisição, em até dois minutos; recuperação sem contexto não inventa identificadores. Webhooks e rotas administrativas ficam excluídos.

Campos opcionais preservam compatibilidade da migração. Envio exige agente válido; IP é opcional e só habilitado após confirmação operacional dos proxies com META_CLIENT_IP_VERIFIED=true. Nunca ler diretamente X-Forwarded-For; usar req.ip com confiança limitada (trust proxy=true proibido neste fluxo). Falta de contexto reduz elegibilidade, não autoriza usar dados de nova visita. Limpar os campos após entrega confirmada/bloqueio, na expiração e revogação pelos caminhos existentes.

Preferências e política descrevem a ampliação, com nova versão de consentimento sem reaproveitar a anterior. Publish/Meta continuam desligados até validação. Subscribe não é ativado nesta alteração; contexto de webhook não representa o navegador de um assinante.

Continuação em 21/11/2026: confirmação do proprietário para autodeploys Vercel desativados registrada; política integral consolidada preservando demais seções. Build frontend isolado passou, além dos checks já registrados. IP permanece desativado até evidência da cadeia de proxies, evitando confundir IP do intermediário com IP do visitante. Nenhum deploy/publicação legal nesta etapa.

Diagnóstico de proxy: adotar rota administrativa autenticada de observação, sem dados pessoais na resposta e sem ativação automática. O resultado compara req.ip com CF-Connecting-IP e posições de X-Forwarded-For, mas não transforma cabeçalhos recebidos em evidência confiável por si só. A validação da origem e de caminhos alternativos continua obrigatória antes de META_CLIENT_IP_VERIFIED. Nenhuma alteração global de TRUST_PROXY neste incremento.

Validação do diagnóstico concluída: backend check com 1.532 aprovados, 57 condicionais ignorados e zero falhas; build backend exit 0. Respostas não expõem IPs e rejeitam IPv6 com escopo de interface. Produção permanece sem este endpoint até publicação revisada, sem ativação de IP por esta etapa.

### Auditoria de preparacao produtiva — 21/11/2026
Admin alinhado a Next/eslint-config-next16.4.5, ja usado no frontend, eliminando os sete advisories Next do lock16.4.1. Auditoria --prod do Admin corrigido: zero avisos conhecidos. Backend: preparar overrides effect3.22.1 (GHSA-7589-6fvf-x4pw) e fast-xml-parser5.12.0 (GHSA-474x-hrwr-fgx4); patches confirmados no registry e advisories oficiais. Instalacao isolada sem scripts, mantendo dependencias do checkout original intactas. Raiz, frontend e video passaram auditoria --prod. A auditoria do backend corrigido e checks/builds seguem pendentes; nao usar o baseline historico como conclusao atual.

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
