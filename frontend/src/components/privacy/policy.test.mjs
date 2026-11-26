import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  canShowPrivacyNotice,
  createPrivacyChoice,
  PRIVACY_MAX_AGE_MS,
  PRIVACY_NOTICE_VERSION,
  parsePrivacyChoice,
  privacyStorageKey,
} from "./policy.ts";

test("Meta notice invalidates previous internal measurement consent and matches backend", () => {
  const accepted = createPrivacyChoice(true, 1, true);
  assert.equal(
    parsePrivacyChoice(JSON.stringify({ ...accepted, version: "lectum-campaigns-2026-11-17" }), 2),
    null,
  );
  const backend = readFileSync(
    new URL("../../../../backend/src/modules/marketing/consent-policy.ts", import.meta.url),
    "utf8",
  );
  assert.ok(backend.includes(`documentVersion: "${PRIVACY_NOTICE_VERSION}"`));
  assert.equal(createPrivacyChoice(false, 1).authorizeTransfer, false);
});

test("registration notice rejects Subscribe-only acceptance without upgrading it", () => {
  const previous = {
    ...createPrivacyChoice(true, 1, true),
    version: "lectum-meta-measurement-2026-11-19-registration",
  };
  assert.equal(parsePrivacyChoice(JSON.stringify(previous), 2), null);
  const preferences = readFileSync(new URL("preferences.tsx", import.meta.url), "utf8");
  assert.match(preferences, /Só começa após seu aceite/);
  assert.match(preferences, /sem medir ações anteriores ao aceite/);
});

test("no decision, malformed, expired and unknown notices fail closed", () => {
  const now = 100_000;
  for (const raw of [
    null,
    "",
    "{",
    "{}",
    JSON.stringify({ ...createPrivacyChoice(true, now), version: "old" }),
    JSON.stringify(createPrivacyChoice(true, now + 1)),
    JSON.stringify({ ...createPrivacyChoice(true, now), expiresAt: now + PRIVACY_MAX_AGE_MS + 1 }),
  ]) {
    assert.equal(parsePrivacyChoice(raw, now), null);
  }
  assert.equal(
    parsePrivacyChoice(JSON.stringify(createPrivacyChoice(true, now)), now + PRIVACY_MAX_AGE_MS),
    null,
  );
});
test("affirmative and refusal choices persist without campaigns or health data", () => {
  for (const campaigns of [true, false]) {
    const choice = parsePrivacyChoice(JSON.stringify(createPrivacyChoice(campaigns, 1)), 2);
    assert.equal(choice.campaigns, campaigns);
    assert.equal(choice.expiresAt, 1 + PRIVACY_MAX_AGE_MS);
    assert.equal(Object.hasOwn(choice, "utm_source"), false);
  }
});
test("guest preference is never implicitly assigned to an account", () => {
  assert.notEqual(privacyStorageKey(), privacyStorageKey("account-a"));
  assert.notEqual(privacyStorageKey("account-a"), privacyStorageKey("account-b"));
});

test("accept-all authorization is explicit, versioned and removed by refusal or revocation", () => {
  const accepted = createPrivacyChoice(true, 1, true);
  assert.equal(parsePrivacyChoice(JSON.stringify(accepted), 2).authorizeTransfer, true);
  for (const choice of [
    createPrivacyChoice(true, 1),
    createPrivacyChoice(false, 1, true),
    { ...accepted, pendingRevocation: true },
    { ...accepted, authorizeTransfer: "true" },
    { ...accepted, authorizeTransfer: undefined },
  ])
    assert.equal(parsePrivacyChoice(JSON.stringify(choice), 2).authorizeTransfer, false);
  assert.equal(
    parsePrivacyChoice(JSON.stringify({ ...accepted, version: "lectum-campaigns-2026-11-12" }), 2),
    null,
  );
  assert.equal(parsePrivacyChoice(JSON.stringify(accepted), accepted.expiresAt), null);
});
test("forms, authentication, checkout, post creation and legal reading are not invitation surfaces", () => {
  for (const path of [
    "/auth/login",
    "/auth/register",
    "/app/perfil",
    "/app/profissional/assinatura",
    "/app/community/new",
    "/comunidades/example/publicacao/new",
    "/politica-de-privacidade",
  ])
    assert.equal(canShowPrivacyNotice(path), false, path);
  for (const path of ["/", "/psicologos", "/comunidades", "/comunidades/example"])
    assert.equal(canShowPrivacyNotice(path), true, path);
});
test("pending revocation survives reload and rejects permissive malformed values", () => {
  const choice = createPrivacyChoice(false, 1);
  assert.equal(
    parsePrivacyChoice(JSON.stringify({ ...choice, pendingRevocation: true }), 2).pendingRevocation,
    true,
  );
  assert.equal(parsePrivacyChoice(JSON.stringify({ ...choice, campaigns: "true" }), 2), null);
});
test("notice does not load Meta scripts or capture URL/form/campaign data", () => {
  for (const name of ["notice.tsx", "preferences.tsx", "use-choice.ts"]) {
    const source = readFileSync(new URL(name, import.meta.url), "utf8");
    assert.doesNotMatch(
      source,
      /fbq\(|fbevents|connect\.facebook|document\.referrer|URLSearchParams|utm_source/,
    );
  }
});
test("first-party page/location trackers are inside the consent boundary", () => {
  const source = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");
  assert.match(
    source,
    /<PrivacyMeasurementBoundary>[\s\S]*<LocationCapture\s*\/>[\s\S]*<PageViewTracker\s*\/>[\s\S]*<\/PrivacyMeasurementBoundary>/,
  );
});

test("network context requires a fresh choice instead of upgrading account-type consent", () => {
  const previous = {
    ...createPrivacyChoice(true, 1, true),
    version: "lectum-meta-measurement-2026-11-21-account-type",
  };
  assert.equal(parsePrivacyChoice(JSON.stringify(previous), 2), null);
});
