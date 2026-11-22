import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { confirmedMarketingAction, registrationCommitted } from "./conversion-hooks";
import {
  buildConsentedMetaCapiPayload,
  buildMetaCapiPayload,
  deliverMetaConversion,
  type MetaCapiCandidate,
} from "./meta-capi";
import { readMetaConfig } from "./meta-config";
import { META_CONVERSIONS } from "./meta-policy";

const now = 1794477600;
const sourceUrl = "https://www.lectum.com.br/app/profissional/assinatura";
const candidate = {
  conversion: "professional_subscription",
  eventId: "a".repeat(64),
  occurredAt: now,
  sourceUrl,
  fbp: "fb.1.1794477600000.123456",
  amountCents: 3490,
};

test("configuration is optional and disabled without exact opt-in", () => {
  assert.deepEqual(readMetaConfig({}), {
    enabled: false,
    datasetId: null,
    apiVersion: null,
    token: null,
  });
  assert.equal(readMetaConfig({ META_DATASET_ID: "1606598847399888" }).enabled, false);
  assert.equal(readMetaConfig({ META_CAPI_ENABLED: "TRUE" }).enabled, false);
  assert.equal(
    readMetaConfig({ META_GRAPH_API_VERSION: "../../other", META_DATASET_ID: "x/events" })
      .apiVersion,
    null,
  );
  assert.equal(readMetaConfig({ META_CAPI_ACCESS_TOKEN: "token\r\nheader" }).token, null);
});

test("CAPI serialization is minimal and keeps id, time and paid amount", () => {
  assert.deepEqual(buildMetaCapiPayload(candidate, [sourceUrl], now), {
    data: [
      {
        event_name: "Subscribe",
        event_id: candidate.eventId,
        event_time: now,
        action_source: "website",
        event_source_url: sourceUrl,
        user_data: { fbp: candidate.fbp },
        custom_data: { value: 34.9, currency: "BRL" },
      },
    ],
  });
  assert.equal(buildMetaCapiPayload(candidate, [], now), null);
});

test("CAPI rejects unreviewed user events, unexpected fields, URLs and invalid values", () => {
  for (const input of [
    { ...candidate, conversion: "patient_registration" },
    { ...candidate, email: "someone@example.test" },
    { ...candidate, title: "clinical content" },
    { ...candidate, utm_campaign: "condition" },
    { ...candidate, amountCents: 0 },
    { ...candidate, amountCents: 0.1 },
    { ...candidate, occurredAt: now + 1 },
    { ...candidate, occurredAt: now - 7 * 86400 - 1 },
    { ...candidate, sourceUrl: `${sourceUrl}?condition=private` },
    { ...candidate, sourceUrl: `${sourceUrl}#private` },
    { ...candidate, sourceUrl: "http://www.lectum.com.br" },
    { ...candidate, sourceUrl: "https://user:pass@www.lectum.com.br" },
    { ...candidate, fbp: undefined },
    { ...candidate, conversion: "professional_registration" },
  ])
    assert.equal(buildMetaCapiPayload(input, [input.sourceUrl], now), null);
});

test("disabled configuration prevents identifier reads and network calls", async (t) => {
  const previous = process.env.META_CAPI_ENABLED;
  process.env.META_CAPI_ENABLED = "false";
  t.after(() => {
    if (previous === undefined) delete process.env.META_CAPI_ENABLED;
    else process.env.META_CAPI_ENABLED = previous;
  });
  const fetchGuard = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("unexpected network");
  });
  for (const conversion of META_CONVERSIONS) {
    const result = await deliverMetaConversion({
      conversion,
      resolve: async () => {
        assert.fail("blocked events must not resolve consent, identifiers or stored events");
      },
    });
    const status = "disabled";
    assert.equal(result.status, status);
    assert.equal((await confirmedMarketingAction(conversion)).status, status);
  }
  assert.equal((await registrationCommitted("paciente")).status, "disabled");
  assert.equal((await registrationCommitted("psicologo")).status, "disabled");
  assert.equal(
    (
      await registrationCommitted("psicologo", () => {
        throw new Error("identity_must_not_be_read");
      })
    ).status,
    "disabled",
  );
  assert.equal((await registrationCommitted("admin")).status, "blocked");
  assert.equal(fetchGuard.mock.callCount(), 0);
});

test("delivery requires reviewed consent both at the persisted event and at send time", () => {
  const occurredAtMs = now * 1000 + 500;
  const consent = {
    purpose: "meta_ads_measurement" as const,
    documentVersion: "synthetic-review-v1",
    grantedAt: occurredAtMs - 100,
    expiresAt: occurredAtMs + 10_000,
    revokedAt: null,
  };
  const evidence = { consent, candidate: candidate as MetaCapiCandidate, occurredAtMs };
  const build = (item: Parameters<typeof buildConsentedMetaCapiPayload>[0], at = occurredAtMs) =>
    buildConsentedMetaCapiPayload(item, [sourceUrl], consent.documentVersion, at);
  assert.ok(build(evidence));
  assert.ok(build({ ...evidence, consent: { ...consent, grantedAt: occurredAtMs } }));
  for (const invalid of [
    null,
    { ...consent, grantedAt: occurredAtMs + 1 },
    { ...consent, expiresAt: occurredAtMs },
    { ...consent, revokedAt: occurredAtMs + 1 },
    { ...consent, documentVersion: "obsolete-version" },
  ]) {
    assert.equal(build({ ...evidence, consent: invalid }, occurredAtMs + 2), null);
  }
  assert.equal(build(evidence, consent.expiresAt), null);
  assert.equal(build(evidence, occurredAtMs - 1), null);
  for (const invalidTime of [NaN, Infinity, 0, occurredAtMs + 0.1, occurredAtMs - 1000]) {
    assert.equal(build({ ...evidence, occurredAtMs: invalidTime }), null);
  }
  assert.equal(build(evidence, NaN), null);
  assert.equal(buildConsentedMetaCapiPayload(evidence, [sourceUrl], null, occurredAtMs), null);
  assert.equal(
    buildConsentedMetaCapiPayload(evidence, [], consent.documentVersion, occurredAtMs),
    null,
  );
  // Retry preserves the original event timestamp/id; later consent is never backdated.
  const retried = build(evidence, occurredAtMs + 1000);
  assert.equal(retried?.data[0].event_id, candidate.eventId);
  assert.equal(retried?.data[0].event_time, candidate.occurredAt);
});

test("enablement without complete configuration does not resolve subscription evidence", async (t) => {
  const original = process.env.META_CAPI_ENABLED;
  process.env.META_CAPI_ENABLED = "true";
  t.after(() => {
    if (original === undefined) delete process.env.META_CAPI_ENABLED;
    else process.env.META_CAPI_ENABLED = original;
  });
  assert.equal(
    (
      await deliverMetaConversion({
        conversion: "professional_subscription",
        resolve: async () => {
          assert.fail("credentials must not approve a conversion");
        },
      })
    ).status,
    "disabled",
  );
});

test("registration and post hooks are placed after persistence, never in forms", () => {
  const read = (path: string) => readFileSync(resolve(__dirname, path), "utf8");
  for (const path of [
    "../api/public/user/store/repositories/StoreRepository.ts",
    "../api/public/auth/login/repositories/LoginRepository.ts",
  ]) {
    const text = read(path);
    assert.match(
      text,
      /\}\);\s+void registrationCommitted\((created|res)\.role, \(\) => \1\.id\);\s+return/,
    );
  }
  const post = read("../api/private/community/use-cases/services.ts");
  const hook = post.indexOf('userActionCommitted("patient_community_post",');
  assert.ok(hook > post.indexOf("const res = await repository.createPost"));
  assert.ok(
    hook > post.indexOf("if (!res)", post.indexOf("const res = await repository.createPost")),
  );
});

test("registration account type comes only from server conversion", () => {
  for (const [conversion, accountType] of [
    ["patient_registration", "user"],
    ["professional_registration", "professional"],
  ] as const) {
    const input = { ...candidate, conversion, amountCents: undefined };
    const urls = { patient_registration: [sourceUrl] };
    const body = buildMetaCapiPayload(input, [sourceUrl], now, urls);
    assert.equal(body?.data[0].event_name, "CompleteRegistration");
    assert.deepEqual(body?.data[0].custom_data, { account_type: accountType });
    assert.equal(
      buildMetaCapiPayload({ ...input, account_type: "spoofed" }, [sourceUrl], now, urls),
      null,
    );
  }
});
