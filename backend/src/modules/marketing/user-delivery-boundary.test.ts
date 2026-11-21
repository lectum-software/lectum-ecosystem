import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { Prisma } from "@/external/generated/prisma/client";
import { registrationCommitted } from "./conversion-hooks";
import { MarketingDeliveryJobs } from "./delivery-jobs";
import { USER_DELIVERY_POLICY, userActionCommitted } from "./user-events";

const reviewedVersion = USER_DELIVERY_POLICY.documentVersion;
beforeEach(() => {
  USER_DELIVERY_POLICY.documentVersion = null;
});
afterEach(() => {
  USER_DELIVERY_POLICY.documentVersion = reviewedVersion;
});

test("user conversions require a separately reviewed notice before database access", async () => {
  const tx = new Proxy(
    {},
    {
      get() {
        assert.fail("unsupported conversion must be rejected before database access");
      },
    },
  ) as Prisma.TransactionClient;
  const jobs = new MarketingDeliveryJobs();
  for (const conversion of [
    "patient_registration",
    "patient_contact",
    "patient_community_post",
    "user_registration",
    "whatsapp_clicked",
    "publication_created",
  ]) {
    const input = {
      conversion,
      eventId: "a".repeat(64),
      sourceRef: "source",
      userId: "user",
      consentRevision: 1,
      occurredAt: new Date("2026-11-19T12:00:00Z"),
    };
    await assert.rejects(
      jobs.enqueueInTransaction(
        tx,
        input as Parameters<MarketingDeliveryJobs["enqueueInTransaction"]>[1],
        new Date("2026-11-19T12:00:01Z"),
      ),
      conversion.startsWith("patient_")
        ? { message: "marketing_user_review_required" }
        : { name: "ZodError" },
    );
  }
});

test("blocked user hooks do not resolve account identity or contact Meta", async (t) => {
  const network = t.mock.method(globalThis, "fetch", async () => {
    assert.fail("user hooks must not contact a provider");
  });
  const registration = await registrationCommitted("paciente", () => {
    assert.fail("user identity must not be resolved while transmission is blocked");
  });
  assert.deepEqual(registration, { status: "blocked", reason: "marketing_user_review_required" });
  for (const conversion of ["patient_contact", "patient_community_post"] as const) {
    assert.deepEqual(
      await userActionCommitted(conversion, () => {
        assert.fail("missing notice must prevent source resolution");
      }),
      {
        status: "blocked",
        reason: "marketing_user_review_required",
      },
    );
  }
  assert.equal(network.mock.callCount(), 0);
});
