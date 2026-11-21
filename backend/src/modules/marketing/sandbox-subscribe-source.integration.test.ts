import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";

test("PostgreSQL: sandbox source verifies payment, owner, history and consent without writes", {
  skip: process.env.LECTUM_STRIPE_DB_TESTS !== "true",
}, async (t) => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55443");
  assert.equal(url.pathname, "/lectum_stripe_test");
  const { default: db } = await import("@/infra/database/prisma");
  const { resolveSandboxSubscribeSource } = await import("./sandbox-subscribe-source");
  const { financeReceipt } = await import(
    "@/modules/api/admin/private/finance/dashboard/use-cases/services/stripe-ledger-fixtures"
  );
  const tag = randomUUID();
  const guestToken = randomBytes(32).toString("hex");
  const { attributionTokenHash } = await import("./attribution-repository");
  const guestHash = attributionTokenHash(guestToken);
  const now = new Date();
  const paidAt = new Date(now.getTime() - 1000);
  const scope = { gateway: "stripe", mode: "test", account_id: `acct_${tag}` };
  const user = await db.user.create({
    data: {
      name: "Disposable sandbox source",
      email: `${tag}@example.invalid`,
      role: "psicologo",
      active: true,
    },
  });
  const profile = await db.psychologist_profile.create({ data: { user_id: user.id } });
  const plan = await db.subscription_plan.create({
    data: { slug: tag, name: tag, price_cents: 2990 },
  });
  const sub = await db.professional_subscription.create({
    data: {
      psychologist_id: profile.id,
      plan_id: plan.id,
      source: "stripe",
      gateway: "stripe",
      gateway_mode: "test",
      gateway_account_id: scope.account_id,
      gateway_subscription_id: `sub_${tag}`,
      contracted_amount_cents: 2990,
    },
  });
  const request = {
    userId: user.id,
    accountId: scope.account_id,
    invoiceId: `in_${tag}`,
    consentRevision: 1,
    documentVersion: "sandbox-unit-only",
  };
  const read = (change = {}) =>
    db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        return resolveSandboxSubscribeSource(tx, { ...request, ...change }, now);
      },
      { isolationLevel: "RepeatableRead" },
    );
  try {
    const receipt = financeReceipt({
      ...scope,
      id: tag,
      subscription_id: sub.id,
      psychologist_id: profile.id,
      provider_subscription_id: `sub_${tag}`,
      invoice_id: request.invoiceId,
      invoice_payment_id: `inpay_${tag}`,
      payment_intent_id: `pi_${tag}`,
      paid_at: paidAt,
      invoice_paid_at: paidAt,
    });
    await db.billing_financial_receipt.create({ data: receipt });
    await db.marketing_consent.create({
      data: {
        user_id: user.id,
        revision: 1,
        document_version: request.documentVersion,
        granted_at: new Date(now.getTime() - 2000),
        expires_at: new Date(now.getTime() + 60000),
      },
    });
    assert.equal(await read(), null);
    await db.billing_financial_reconciliation.create({
      data: {
        ...scope,
        subscription_id: sub.id,
        psychologist_id: profile.id,
        provider_subscription_id: `sub_${tag}`,
        state: "complete",
        receipts_complete: true,
        requested_revision: 1,
        processed_revision: 1,
        covered_from: new Date(now.getTime() - 2000),
        covered_through: now,
      },
    });
    await db.billing_operation.create({
      data: {
        ...scope,
        user_id: user.id,
        psychologist_id: profile.id,
        subscription_id: sub.id,
        kind: "checkout",
        intent: "subscription",
        intent_kind: "payment",
        request_key: tag,
        provider_subscription_id: `sub_${tag}`,
        provider_intent_id: `pi_${tag}`,
      },
    });
    const event = await db.billing_gateway_event.create({
      data: {
        ...scope,
        external_id: `evt_${tag}`,
        type: "invoice.paid",
        resource_id: request.invoiceId,
        state: "pending",
        gateway_created_at: paidAt,
      },
    });
    assert.equal(await read(), null);
    await db.billing_gateway_event.update({ where: { id: event.id }, data: { state: "complete" } });
    const result = await read();
    assert.ok(result);
    assert.equal(result.amountCents, 2990);
    assert.equal(result.occurredAtMs, paidAt.getTime());
    assert.match(result.eventId, /^[a-f0-9]{64}$/);
    assert.deepEqual(await read(), result);
    const { prepareVerifiedSandboxPreview } = await import("./sandbox-subscribe-preview");
    const browser = {
      userId: user.id,
      consentRevision: 1,
      documentVersion: request.documentVersion,
      capturedAtMs: paidAt.getTime(),
      sourceUrl: "https://example.test/subscription",
      fbp: `fb.1.${paidAt.getTime()}.123456`,
      clientUserAgent: "Mozilla/5.0 (unit test only)",
    };
    const preview = (change = {}) =>
      db.$transaction(
        async (tx) => {
          await tx.$executeRaw`SET TRANSACTION READ ONLY`;
          return prepareVerifiedSandboxPreview(
            tx,
            request,
            { ...browser, ...change },
            [browser.sourceUrl],
            "TEST89280",
            now,
          );
        },
        { isolationLevel: "RepeatableRead" },
      );
    const prepared = await preview();
    assert.ok(prepared);
    assert.equal(prepared.transmissionAllowed, false);
    const officialFbp = `${browser.fbp}.${Buffer.from([1, 4, 2, 1, 3, 2]).toString("base64url")}`;
    const officialPreview = await preview({ fbp: officialFbp });
    assert.equal(officialPreview?.payload.data[0].user_data.fbp, officialFbp);
    assert.equal(prepared.payload.data[0].event_id, result.eventId);
    assert.deepEqual(prepared.payload.data[0].custom_data, { value: 29.9, currency: "BRL" });
    for (const change of [
      { userId: "other" },
      { consentRevision: 2 },
      { documentVersion: "old" },
      { capturedAtMs: now.getTime() },
      { capturedAtMs: now.getTime() - 3000 },
      { sourceUrl: `${browser.sourceUrl}?private=value` },
      { fbp: undefined },
      { fbp: `${browser.fbp}.ZZ` },
      { fbp: `fb.1.${now.getTime() - 3000}.123456` },
      { fbp: `fb.1.${now.getTime()}.123456` },
      { email: "private@example.test" },
    ])
      assert.equal(await preview(change), null);
    const { createBrowserEvidence } = await import("./browser-identifier-repository");
    const { MarketingConsentRepository } = await import("./consent-repository");
    const { prepareStoredSandboxPreview, preparePersistedSandboxPreview } = await import(
      "./sandbox-subscribe-preview"
    );
    const visitAt = new Date(now.getTime() - 7 * 86400000);
    const guestExpiry = new Date(visitAt.getTime() + 30 * 86400000);
    t.mock.timers.enable({ apis: ["Date"], now: visitAt.getTime() });
    let evidence: ReturnType<typeof createBrowserEvidence>;
    try {
      evidence = createBrowserEvidence("127.0.0.1", visitAt, guestExpiry);
    } finally {
      t.mock.timers.reset();
    }
    assert.ok(evidence);
    await db.marketing_guest_attribution.create({
      data: {
        token_hash: guestHash,
        document_version: request.documentVersion,
        granted_at: visitAt,
        first_at: visitAt,
        last_at: visitAt,
        expires_at: guestExpiry,
        first_campaigns: { utm_campaign: "local_professional" },
        last_campaigns: { utm_campaign: "local_professional" },
        browser_fbp: evidence.fbp,
        browser_captured_at: evidence.capturedAt,
      },
    });
    await new MarketingConsentRepository({
      documentVersion: request.documentVersion,
      acquisitionEnabled: true,
      maxAgeMs: 90 * 86400000,
      campaigns: { utm_campaign: ["local_professional"] },
    }).grant(
      user.id,
      {
        accepted: true,
        expected_revision: 1,
        document_version: request.documentVersion,
        guest_token: guestToken,
        authorize_transfer: true,
      },
      new Date(now.getTime() - 2000),
    );
    const { fbp: _suppliedIdentifier, ...checkoutContext } = browser;
    const storedPreview = (change = {}, token = guestToken) =>
      db.$transaction(
        async (tx) => {
          await tx.$executeRaw`SET TRANSACTION READ ONLY`;
          return prepareStoredSandboxPreview(
            tx,
            request,
            token,
            { ...checkoutContext, ...change },
            [browser.sourceUrl],
            "TEST89280",
            now,
          );
        },
        { isolationLevel: "RepeatableRead" },
      );
    const stored = await storedPreview();
    assert.ok(stored);
    assert.equal(stored.transmissionAllowed, false);
    assert.equal(stored.payload.data[0].user_data.fbp, evidence.fbp);
    assert.equal(stored.payload.data[0].event_id, result.eventId);
    assert.deepEqual(stored.payload.data[0].custom_data, { value: 29.9, currency: "BRL" });
    const persistedPreview = () =>
      db.$transaction(
        async (tx) => {
          await tx.$executeRaw`SET TRANSACTION READ ONLY`;
          return preparePersistedSandboxPreview(
            tx,
            request,
            guestToken,
            [browser.sourceUrl],
            "TEST89280",
            now,
          );
        },
        { isolationLevel: "RepeatableRead" },
      );
    assert.equal(await persistedPreview(), null);
    const { captureCheckoutContext } = await import("./checkout-context");
    await db.billing_operation.update({
      where: { id: result.operationId },
      data: {
        state: "requires_confirmation",
        created_at: new Date(now.getTime() - 2000),
      },
    });
    assert.equal(
      await captureCheckoutContext(
        user.id,
        guestToken,
        browser.clientUserAgent,
        {
          operationId: result.operationId,
          revision: 1,
          documentVersion: request.documentVersion,
        },
        { enabled: true, sandboxAccountId: scope.account_id, sourceUrl: browser.sourceUrl },
        paidAt,
      ),
      true,
    );
    assert.deepEqual(await persistedPreview(), stored);
    await db.marketing_checkout_context.update({
      where: { operation_id: result.operationId },
      data: { expires_at: now },
    });
    assert.equal(await persistedPreview(), null);
    await db.marketing_checkout_context.update({
      where: { operation_id: result.operationId },
      data: { expires_at: new Date(now.getTime() + 60000) },
    });
    assert.deepEqual(
      await storedPreview(),
      stored,
      "Same first payment cannot acquire a new event ID",
    );
    assert.equal(await storedPreview({}, randomBytes(32).toString("hex")), null);
    const identifier = await db.marketing_browser_identifier.findUniqueOrThrow({
      where: { token_hash: guestHash },
    });
    await db.marketing_browser_identifier.update({
      where: { token_hash: guestHash },
      data: { expires_at: now },
    });
    assert.equal(
      await storedPreview(),
      null,
      "Expired matching evidence cannot be used for an earlier payment",
    );
    await db.marketing_browser_identifier.update({
      where: { token_hash: guestHash },
      data: { expires_at: identifier.expires_at },
    });
    for (const change of [
      { fbp: browser.fbp },
      { email: "not-allowed@example.invalid" },
      { userId: "other" },
      { capturedAtMs: visitAt.getTime() },
      { capturedAtMs: now.getTime() },
    ])
      assert.equal(await storedPreview(change), null);
    await db.marketing_guest_attribution.update({
      where: { token_hash: guestHash },
      data: { revoked: true },
    });
    assert.equal(await storedPreview(), null, "Original guest revocation blocks stored matching");
    await db.marketing_guest_attribution.update({
      where: { token_hash: guestHash },
      data: { revoked: false },
    });
    const earlier = financeReceipt({
      ...receipt,
      id: `${tag}-earlier`,
      invoice_id: `in_earlier_${tag}`,
      invoice_payment_id: `inpay_earlier_${tag}`,
      paid_at: new Date(paidAt.getTime() - 1000),
      invoice_paid_at: new Date(paidAt.getTime() - 1000),
    });
    await db.billing_financial_receipt.create({ data: earlier });
    assert.equal(await read(), null);
    assert.equal(await storedPreview(), null, "A later payment cannot become Subscribe");
    await db.billing_financial_receipt.delete({ where: { id: earlier.id } });
    await db.billing_financial_reconciliation.updateMany({
      where: scope,
      data: { requested_revision: 2 },
    });
    assert.equal(await read(), null);
    await db.billing_financial_reconciliation.updateMany({
      where: scope,
      data: { requested_revision: 1 },
    });
    for (const change of [
      { userId: "missing" },
      { accountId: "other" },
      { invoiceId: "renewal" },
      { consentRevision: 2 },
      { documentVersion: "old" },
    ])
      assert.equal(await read(change), null);
    for (const change of [
      { refunded_cents: 1 },
      { dispute_status: "open" },
      { current_state: "pending" },
      { amount_paid_cents: 1 },
      { currency: "USD" },
    ]) {
      await db.billing_financial_receipt.update({ where: { id: receipt.id }, data: change });
      assert.equal(await read(), null);
      assert.equal(await storedPreview(), null);
      await db.billing_financial_receipt.update({
        where: { id: receipt.id },
        data: {
          refunded_cents: 0,
          dispute_status: "none",
          current_state: "paid",
          amount_paid_cents: 2990,
          currency: "BRL",
        },
      });
    }
    await assert.rejects(
      db.billing_financial_receipt.update({
        where: { id: receipt.id },
        data: { amount_paid_cents: 0 },
      }),
    );
    for (const change of [{ revoked_at: now }, { expires_at: now }, { granted_at: now }]) {
      await db.marketing_consent.update({ where: { user_id: user.id }, data: change });
      assert.equal(await read(), null);
      assert.equal(await storedPreview(), null);
      await db.marketing_consent.update({
        where: { user_id: user.id },
        data: {
          revoked_at: null,
          granted_at: new Date(now.getTime() - 2000),
          expires_at: new Date(now.getTime() + 60000),
        },
      });
    }
    await db.professional_subscription.update({
      where: { id: sub.id },
      data: { grant_reason: "courtesy" },
    });
    assert.equal(await read(), null);
    await db.professional_subscription.update({
      where: { id: sub.id },
      data: { grant_reason: null, gateway_mode: "live" },
    });
    assert.equal(await read(), null);
    assert.equal(await db.marketing_delivery_job.count({ where: { user_id: user.id } }), 0);
  } finally {
    await db.billing_gateway_event.deleteMany({ where: scope });
    await db.billing_operation.deleteMany({ where: scope });
    await db.billing_financial_receipt.deleteMany({ where: scope });
    await db.billing_financial_reconciliation.deleteMany({ where: scope });
    await db.marketing_consent.deleteMany({ where: { user_id: user.id } });
    await db.marketing_guest_attribution.deleteMany({ where: { token_hash: guestHash } });
    await db.professional_subscription.delete({ where: { id: sub.id } });
    await db.psychologist_profile.delete({ where: { id: profile.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.subscription_plan.delete({ where: { id: plan.id } });
    await db.$disconnect();
  }
});
