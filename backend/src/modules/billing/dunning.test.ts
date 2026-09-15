import assert from "node:assert/strict";
import { test } from "node:test";
import type { professional_subscription } from "@/interfaces/objects";
import {
  BILLING_DUNNING_GRACE_DAYS,
  buildBillingDunningUpdate,
  resolveBillingDunningDueStage,
  resolveBillingDunningTransitionNotice,
  shouldKeepProfessionalBenefitsDuringDunning,
} from "./dunning";

const DAY_MS = 24 * 60 * 60 * 1000;

const subscription = (data: Partial<professional_subscription> = {}): professional_subscription =>
  ({
    id: "subscription-1",
    source: "mercadopago",
    status: "ativa",
    ...data,
  }) as professional_subscription;

test("buildBillingDunningUpdate abre janela de 7 dias para assinatura paga ativa", () => {
  const now = new Date("2026-08-15T12:00:00.000Z");
  const update = buildBillingDunningUpdate({
    now,
    previous: subscription(),
    status: "inadimplente",
  });

  assert.equal(update.billing_issue_started_at, now);
  assert.equal(
    update.billing_grace_ends_at?.toISOString(),
    new Date(now.getTime() + BILLING_DUNNING_GRACE_DAYS * DAY_MS).toISOString(),
  );
  assert.equal(update.billing_last_notice_key, "payment_failed");
  assert.equal(update.billing_downgraded_at, null);
  assert.equal(
    resolveBillingDunningTransitionNotice({
      previous: subscription(),
      status: "inadimplente",
    }),
    "payment_failed",
  );
});

test("buildBillingDunningUpdate nao abre regua para primeira tentativa que ainda estava inativa", () => {
  const update = buildBillingDunningUpdate({
    previous: subscription({ status: "inativa" }),
    status: "inadimplente",
  });

  assert.deepEqual(update, {});
});

test("shouldKeepProfessionalBenefitsDuringDunning preserva beneficios ate o fim da graca", () => {
  const now = new Date("2026-08-15T12:00:00.000Z");

  assert.equal(
    shouldKeepProfessionalBenefitsDuringDunning(
      subscription({
        billing_grace_ends_at: new Date(now.getTime() + DAY_MS),
        status: "inadimplente",
      }),
      now,
    ),
    true,
  );
  assert.equal(
    shouldKeepProfessionalBenefitsDuringDunning(
      subscription({
        billing_downgraded_at: now,
        billing_grace_ends_at: new Date(now.getTime() + DAY_MS),
        status: "inadimplente",
      }),
      now,
    ),
    false,
  );
});

test("resolveBillingDunningDueStage segue D+3, D+6 e D+7", () => {
  const startedAt = new Date("2026-08-01T00:00:00.000Z");
  const graceEndsAt = new Date(startedAt.getTime() + BILLING_DUNNING_GRACE_DAYS * DAY_MS);
  const base = subscription({
    billing_grace_ends_at: graceEndsAt,
    billing_issue_started_at: startedAt,
    billing_last_notice_key: "payment_failed",
    status: "inadimplente",
  });

  assert.equal(
    resolveBillingDunningDueStage(base, new Date(startedAt.getTime() + 3 * DAY_MS)),
    "reminder_d3",
  );
  assert.equal(
    resolveBillingDunningDueStage(
      { ...base, billing_last_notice_key: "reminder_d3" },
      new Date(startedAt.getTime() + 6 * DAY_MS),
    ),
    "final_d6",
  );
  assert.equal(
    resolveBillingDunningDueStage({ ...base, billing_last_notice_key: "final_d6" }, graceEndsAt),
    "downgraded",
  );
});
