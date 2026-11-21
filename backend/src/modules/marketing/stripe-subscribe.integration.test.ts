import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: verified-event evidence, out-of-order recovery, leases and persistent deduplication", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { recordStripeSubscribe, SUBSCRIBE_RECORD_GATEWAY } = await import("./stripe-subscribe");
  const { SubscribeJobs } = await import("./subscribe-jobs");
  const { MarketingConsentRepository } = await import("./consent-repository");
  const { attributionTokenHash } = await import("./attribution-repository");
  const acquisitionPolicy = {
    acquisitionEnabled: true,
    documentVersion: "browser-cross-session-test-v1",
    maxAgeMs: 90 * 86_400_000,
    campaigns: { utm_source: ["meta"], utm_campaign: ["campaign_a", "campaign_b"] },
  };
  const guest =
    process.env.LECTUM_ATTRIBUTION_BROWSER_TESTS === "true"
      ? await (await import("./cross-session-browser.fixture")).browserGuestReturn(
          acquisitionPolicy,
          new Date(Date.now() - 14 * 86_400_000),
        )
      : null;
  const jobs = new SubscribeJobs();
  const { financeReceipt } = await import(
    "@/modules/api/admin/private/finance/dashboard/use-cases/services/stripe-ledger-fixtures"
  );
  const tag = randomUUID();
  const identity = { mode: "live" as const, accountId: `acct_${tag}` };
  const scope = { gateway: "stripe", mode: identity.mode, account_id: identity.accountId };
  const user = await db.user.create({
    data: { name: "Disposable marketing test", email: `${tag}@example.invalid`, role: "psicologo" },
  });
  const profile = await db.psychologist_profile.create({ data: { user_id: user.id } });
  const plan = await db.subscription_plan.create({
    data: { slug: tag, name: tag, price_cents: 9990 },
  });
  const subscription = await db.professional_subscription.create({
    data: {
      psychologist_id: profile.id,
      plan_id: plan.id,
      source: "stripe",
      gateway: "stripe",
      gateway_mode: identity.mode,
      gateway_account_id: identity.accountId,
      gateway_subscription_id: `sub_${tag}`,
      contracted_amount_cents: 2990,
    },
  });
  try {
    if (guest)
      await new MarketingConsentRepository(acquisitionPolicy).grant(
        user.id,
        {
          accepted: true,
          document_version: acquisitionPolicy.documentVersion,
          expected_revision: 0,
          authorize_transfer: true,
          guest_token: guest.token,
        },
        guest.registeredAt,
      );
    const receipt = financeReceipt({
      id: tag,
      ...scope,
      subscription_id: subscription.id,
      psychologist_id: profile.id,
      provider_subscription_id: `sub_${tag}`,
      invoice_id: `in_${tag}`,
      invoice_payment_id: `inpay_${tag}`,
      payment_intent_id: `pi_${tag}`,
      paid_at: new Date(Date.now() - 86_400_000),
      invoice_paid_at: new Date(Date.now() - 86_400_000),
    });
    await db.billing_financial_receipt.create({ data: receipt });
    assert.equal(await recordStripeSubscribe(subscription.id, identity), "history_unverified");
    await db.billing_financial_reconciliation.create({
      data: {
        ...scope,
        subscription_id: subscription.id,
        psychologist_id: profile.id,
        provider_subscription_id: `sub_${tag}`,
        state: "complete",
        requested_revision: 1,
        processed_revision: 1,
        receipts_complete: true,
        covered_from: new Date("2026-11-01"),
        covered_through: new Date("2026-11-12"),
      },
    });
    await db.billing_operation.create({
      data: {
        ...scope,
        user_id: user.id,
        psychologist_id: profile.id,
        subscription_id: subscription.id,
        kind: "checkout",
        intent: "subscription",
        intent_kind: "payment",
        request_key: tag,
        provider_subscription_id: `sub_${tag}`,
        provider_intent_id: `pi_${tag}`,
      },
    });
    assert.equal(await recordStripeSubscribe(subscription.id, identity), "awaiting_verified_event");
    const event = await db.billing_gateway_event.create({
      data: {
        ...scope,
        external_id: `evt_${tag}`,
        resource_id: `in_${tag}`,
        type: "invoice.paid",
        state: "pending",
        gateway_created_at: receipt.invoice_paid_at,
      },
    });
    const since = new Date(Date.now() - 60_000);
    await Promise.all([jobs.discover(identity, since), jobs.discover(identity, since)]);
    assert.equal(
      await db.marketing_subscribe_job.count({ where: { source_event_id: event.id } }),
      1,
    );
    const now = new Date(Date.now() + 1_000);
    const owners = await Promise.all([jobs.claim(identity, now), jobs.claim(identity, now)]);
    assert.equal(owners.filter(Boolean).length, 1);
    const owner = owners.find((job) => job !== null)!;
    await jobs.process(owner, identity, now);
    assert.equal(
      (await db.marketing_subscribe_job.findUniqueOrThrow({ where: { id: owner.id } })).state,
      "pending",
    );
    assert.equal(
      await db.payment_event.count({
        where: { gateway: SUBSCRIBE_RECORD_GATEWAY, external_id: profile.id },
      }),
      0,
    );

    // Renewal arrives first, but complete financial history still identifies the first invoice.
    const renewal = financeReceipt({
      ...receipt,
      id: `${tag}_renewal`,
      invoice_id: `in_renewal_${tag}`,
      invoice_payment_id: `inpay_renewal_${tag}`,
      payment_intent_id: `pi_renewal_${tag}`,
      paid_at: new Date(receipt.paid_at.getTime() + 86_400_000),
      invoice_paid_at: new Date(receipt.invoice_paid_at.getTime() + 86_400_000),
    });
    await db.billing_financial_receipt.create({ data: renewal });
    const renewalEvent = await db.billing_gateway_event.create({
      data: {
        ...scope,
        external_id: `evt_renewal_${tag}`,
        resource_id: renewal.invoice_id,
        type: "invoice.paid",
        state: "complete",
        gateway_created_at: renewal.invoice_paid_at,
      },
    });
    await jobs.discover(identity, since);
    const renewalJob = await jobs.claim(identity, new Date(now.getTime() + 1_000));
    assert.ok(renewalJob);
    assert.equal(renewalJob.source_event_id, renewalEvent.id);
    await jobs.process(renewalJob, identity);
    assert.equal(
      (await db.marketing_subscribe_job.findUniqueOrThrow({ where: { id: renewalJob.id } })).state,
      "excluded",
    );
    await db.billing_gateway_event.update({ where: { id: event.id }, data: { state: "complete" } });
    // Incomplete reconciliation must defer even after webhook verification is finished.
    await db.billing_financial_reconciliation.updateMany({
      where: scope,
      data: { requested_revision: 2 },
    });
    const waiting = await jobs.claim(identity, new Date(now.getTime() + 61_000));
    assert.ok(waiting);
    await jobs.process(waiting, identity, new Date(now.getTime() + 61_000));
    assert.equal(
      (await db.marketing_subscribe_job.findUniqueOrThrow({ where: { id: waiting.id } })).state,
      "pending",
    );
    await db.billing_financial_reconciliation.updateMany({
      where: scope,
      data: { processed_revision: 2 },
    });
    const interrupted = await jobs.claim(identity, new Date(now.getTime() + 182_000));
    assert.ok(interrupted);
    await Promise.all([
      recordStripeSubscribe(subscription.id, identity, undefined, acquisitionPolicy),
      recordStripeSubscribe(subscription.id, identity, undefined, acquisitionPolicy),
    ]);
    const where = { gateway: SUBSCRIBE_RECORD_GATEWAY, external_id: profile.id };
    assert.equal(await db.payment_event.count({ where }), 1);
    const stored = await db.payment_event.findFirstOrThrow({ where });
    const payload = stored.payload as Record<string, unknown>;
    assert.match(String(payload.event_id), /^[a-f0-9]{64}$/);
    assert.equal(payload.amount_paid_cents, 2990);
    assert.equal(payload.currency, "BRL");
    assert.equal(payload.transmission, "blocked_compliance");
    const { resolveDeliverySource } = await import("./delivery-source");
    const reference = {
      user_id: user.id,
      consent_revision: 1,
      conversion: "professional_subscription",
      source_ref: stored.id,
      event_id: String(payload.event_id),
      occurred_at: receipt.paid_at,
    };
    if (!guest) assert.equal(await resolveDeliverySource(db, reference), null);
    // Exercise source resolution only; this fixture does not grant consent or transmit.
    await db.payment_event.update({
      where: { id: stored.id },
      data: {
        payload: {
          ...(stored.payload as Record<string, string | number>),
          acquisition_user_id: user.id,
          consent_revision: 1,
          attribution_status: "consented_reference",
        },
      },
    });
    assert.deepEqual(await resolveDeliverySource(db, reference), {
      occurredAt: receipt.paid_at,
      amountCents: 2990,
      operationId: (
        await db.billing_operation.findFirstOrThrow({
          where: { ...scope, kind: "checkout", subscription_id: subscription.id },
        })
      ).id,
      accountId: identity.accountId,
    });
    assert.equal(await resolveDeliverySource(db, { ...reference, event_id: "wrong" }), null);
    if (!guest) {
      const { resolveSubscriptionDeliveryEvidence } = await import("./subscription-delivery");
      const source = await resolveDeliverySource(db, reference);
      assert.ok(source?.operationId);
      const policy = {
        documentVersion: "external-meta-test-v1",
        sourceUrls: ["https://example.invalid/professional/checkout"],
        accountId: identity.accountId,
      };
      const grantedAt = new Date(receipt.paid_at.getTime() - 2000);
      const capturedAt = new Date(receipt.paid_at.getTime() - 1000);
      const expiresAt = new Date(now.getTime() + 86400000);
      const tokenHash = "b".repeat(64);
      await db.marketing_consent.create({
        data: {
          user_id: user.id,
          revision: 1,
          document_version: policy.documentVersion,
          granted_at: grantedAt,
          expires_at: expiresAt,
        },
      });
      await db.marketing_browser_identifier.create({
        data: {
          token_hash: tokenHash,
          user_id: user.id,
          consent_revision: 1,
          fbp: `fb.1.${capturedAt.getTime()}.123456`,
          captured_at: capturedAt,
          expires_at: expiresAt,
        },
      });
      await db.marketing_checkout_context.create({
        data: {
          operation_id: source.operationId,
          token_hash: tokenHash,
          document_version: policy.documentVersion,
          source_url: policy.sourceUrls[0]!,
          client_user_agent: "Test agent never exported",
          captured_at: capturedAt,
          expires_at: expiresAt,
        },
      });
      const evidence = await resolveSubscriptionDeliveryEvidence(db, reference, policy, now);
      assert.equal(evidence?.candidate.eventId, reference.event_id);
      assert.equal(evidence?.candidate.amountCents, 2990);
      assert.equal(evidence?.occurredAtMs, receipt.paid_at.getTime());
      assert.equal("clientUserAgent" in evidence!.candidate, false);
      assert.equal(await resolveSubscriptionDeliveryEvidence(db, reference), null);
      assert.equal(
        await resolveSubscriptionDeliveryEvidence(
          db,
          reference,
          { ...policy, accountId: "wrong" },
          now,
        ),
        null,
      );
      assert.equal(
        await resolveSubscriptionDeliveryEvidence(
          db,
          reference,
          { ...policy, documentVersion: "internal-only-notice" },
          now,
        ),
        null,
      );
      assert.equal(
        await resolveSubscriptionDeliveryEvidence(
          db,
          reference,
          { ...policy, sourceUrls: [] },
          now,
        ),
        null,
      );
      await db.marketing_consent.update({ where: { user_id: user.id }, data: { revoked_at: now } });
      assert.equal(await resolveSubscriptionDeliveryEvidence(db, reference, policy, now), null);
      await db.marketing_consent.update({
        where: { user_id: user.id },
        data: { revoked_at: null, granted_at: new Date(receipt.paid_at.getTime() + 1) },
      });
      assert.equal(await resolveSubscriptionDeliveryEvidence(db, reference, policy, now), null);
      await db.marketing_checkout_context.delete({ where: { operation_id: source.operationId } });
      await db.marketing_browser_identifier.delete({ where: { token_hash: tokenHash } });
      await db.marketing_consent.delete({ where: { user_id: user.id } });
    }
    assert.equal(await resolveDeliverySource(db, { ...reference, consent_revision: 2 }), null);
    assert.equal(await resolveDeliverySource(db, { ...reference, occurred_at: now }), null);
    for (const data of [
      { refunded_cents: 1 },
      { dispute_status: "open" },
      { current_state: "failed" },
      { amount_paid_cents: 9990 },
    ]) {
      await db.billing_financial_receipt.update({ where: { id: receipt.id }, data });
      assert.equal(await resolveDeliverySource(db, reference), null);
      await db.billing_financial_receipt.update({
        where: { id: receipt.id },
        data: {
          refunded_cents: receipt.refunded_cents,
          dispute_status: receipt.dispute_status,
          current_state: receipt.current_state,
          amount_paid_cents: receipt.amount_paid_cents,
        },
      });
    }
    await db.billing_gateway_event.update({ where: { id: event.id }, data: { state: "pending" } });
    assert.equal(await resolveDeliverySource(db, reference), null);
    await db.billing_gateway_event.update({ where: { id: event.id }, data: { state: "complete" } });
    await db.payment_event.update({ where: { id: stored.id }, data: { payload: stored.payload! } });
    if (guest) {
      assert.equal(payload.attribution_status, "consented_reference");
      assert.equal(payload.acquisition_user_id, user.id);
      const acquisition = await db.marketing_attribution.findUniqueOrThrow({
        where: { user_id: user.id },
      });
      assert.deepEqual(acquisition.campaigns, { utm_source: "meta", utm_campaign: "campaign_a" });
      assert.deepEqual(acquisition.last_campaigns, {
        utm_source: "meta",
        utm_campaign: "campaign_b",
      });
      assert.equal(acquisition.source_token_hash, attributionTokenHash(guest.token));
    }
    assert.equal(await recordStripeSubscribe(subscription.id, identity), "duplicate");
    assert.deepEqual((await db.payment_event.findFirstOrThrow({ where })).payload, stored.payload);
    // Simulate a crash after commit and before acknowledgement, then another worker takes over.
    await db.$disconnect();
    const restarted = new SubscribeJobs();
    const recovered = await restarted.claim(identity, new Date(now.getTime() + 303_000));
    assert.ok(recovered);
    assert.notEqual(recovered.lease_token, interrupted.lease_token);
    assert.equal((await jobs.finish(interrupted, "complete")).count, 0);
    assert.equal((await jobs.defer(interrupted, "storage_unavailable")).count, 0);
    const active = await db.marketing_subscribe_job.findUniqueOrThrow({
      where: { id: recovered.id },
    });
    assert.equal(active.state, "processing");
    assert.equal(active.lease_token, recovered.lease_token);
    await restarted.process(recovered, identity);
    assert.equal(
      (await db.marketing_subscribe_job.findUniqueOrThrow({ where: { id: recovered.id } })).state,
      "complete",
    );
    assert.equal(await db.payment_event.count({ where }), 1);
    assert.equal((await restarted.defer(recovered, "storage_unavailable")).count, 0);
    assert.equal(await restarted.claim(identity, new Date(now.getTime() + 86400000)), null);
    assert.deepEqual((await db.payment_event.findFirstOrThrow({ where })).payload, stored.payload);
    assert.equal(await restarted.discover(identity, since), 0);
  } finally {
    await db.payment_event.deleteMany({
      where: { gateway: SUBSCRIBE_RECORD_GATEWAY, external_id: profile.id },
    });
    await db.billing_gateway_event.deleteMany({ where: scope });
    await db.billing_operation.deleteMany({ where: scope });
    await db.billing_financial_receipt.deleteMany({ where: scope });
    await db.billing_financial_reconciliation.deleteMany({ where: scope });
    await db.professional_subscription.delete({ where: { id: subscription.id } });
    await db.psychologist_profile.delete({ where: { id: profile.id } });
    await db.user.delete({ where: { id: user.id } });
    if (guest)
      await db.marketing_guest_attribution.deleteMany({
        where: { token_hash: attributionTokenHash(guest.token) },
      });
    await db.subscription_plan.delete({ where: { id: plan.id } });
    await db.$disconnect();
  }
});
