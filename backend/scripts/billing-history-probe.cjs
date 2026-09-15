// Execute only through billing-history-integration.mjs in its isolated Docker network.
// Fixtures persist through real Prisma/PostgreSQL; they are NOT provider notifications
// or evidence of a real charge, webhook authentication, reconciliation or settlement.
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomBytes } = require("node:crypto");
assert.equal(process.env.NODE_ENV, "test");
const database = new URL(process.env.DATABASE_URL);
assert.match(database.hostname, /^lectum-audit178-db-[a-f0-9]{20}$/);
assert.equal(database.pathname, "/lectum_audit");
assert.equal(process.env.MERCADO_PAGO_ACCESS_TOKEN, undefined);
const express = require("/app/node_modules/express");
const { prisma } = require("/app/dist/external/prisma/client.js");
const { encrypt } = require("/app/dist/utils/crypt/index.js");
const endpoint = require("/app/dist/main/server/imports/write.js").default;
const i18n = require("/app/dist/main/server/i18n.js").default;
const {
  SubscriptionRepository,
} = require("/app/dist/modules/api/private/psychologist/billing/subscription/repositories/SubscriptionRepository.js");
const {
  AdminPsychologistBillingRepository,
} = require("/app/dist/modules/api/admin/private/psychologists/billing/repositories/AdminPsychologistBillingRepository.js");
const failed = [];
let server,
  step = "setup";

(async () => {
  if (!i18n.isInitialized) await new Promise((resolve) => i18n.on("initialized", resolve));
  const app = express();
  app.use(express.json());
  app.use(require("/app/node_modules/i18next-http-middleware").handle(i18n));
  app.use(endpoint);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const route = "/api/private/psychologist/billing/subscription";
  const request = async (path, owner, body) => {
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? "GET" : "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        "x-device": owner?.device || "audit-no-session",
        "x-refine": "true",
        "content-type": "application/json",
        ...(owner?.token ? { authorization: `Bearer ${owner.token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };
  const createUser = async (name, role = "psicologo") => {
    const password = randomBytes(24).toString("hex");
    const user = await prisma.user.create({
      data: {
        name: `Discardable Billing ${name}`,
        email: `${name}@billing-audit.example.com`,
        password: await encrypt(password),
        confirmed: true,
        role,
      },
    });
    const owner = { user, device: `billing-audit-${name}` };
    const login = await request("/api/public/auth/login", owner, { email: user.email, password });
    assert.equal(login.status, 200);
    owner.token = login.body.data.user_tokens[0].token;
    assert.equal(typeof owner.token, "string");
    return owner;
  };
  const [a, b, patient] = await Promise.all([
    createUser("alpha"),
    createUser("beta"),
    createUser("patient", "paciente"),
  ]);
  const plan = await prisma.subscription_plan.upsert({
    where: { slug: "profissional" },
    create: {
      slug: "profissional",
      name: "Professional Audit",
      interval: "month",
      price_cents: 2990,
      active: true,
    },
    update: { interval: "month", price_cents: 2990, active: true, deleted: false },
  });
  for (const [index, owner] of [a, b].entries()) {
    const profile = await prisma.psychologist_profile.create({ data: { user_id: owner.user.id } });
    owner.subscription = await prisma.professional_subscription.create({
      data: {
        psychologist_id: profile.id,
        plan_id: plan.id,
        status: "ativa",
        source: "mercadopago",
        gateway: "mercadopago",
        gateway_subscription_id: index === 0 ? "audit-preapproval-123" : "audit-preapproval-1234",
        current_period_end: new Date(Date.now() + 86400000 * 30),
      },
      include: { plan: true },
    });
  }
  const repository = new SubscriptionRepository();
  const admin = new AdminPsychologistBillingRepository();
  const ids = (items) => items.map((item) => item.external_id).sort();
  const history = async (owner, query = "") => {
    const response = await request(`${route}${query}`, owner);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.subscription.id, owner.subscription.id);
    return response.body.data.payment_history;
  };
  let eventSequence = 0;
  const event = (owner, external_id, payload = {}, extra = {}) => ({
    // Different days ensure legacy same-day deduplication cannot hide an ownership leak.
    createdAt: new Date(Date.UTC(2025, 0, 1 + eventSequence++)),
    gateway: "mercadopago",
    external_id,
    type: "payment",
    payload: {
      preapproval_id: owner.subscription.gateway_subscription_id,
      status: "approved",
      transaction_amount: 29.9,
      ...payload,
    },
    ...extra,
  });
  const check = async (name, action) => {
    step = name;
    try {
      await action();
      console.log("CHECK_OK", name);
    } catch (error) {
      failed.push(name);
      console.error(
        "INTEGRATION_FAILED",
        name,
        "actual",
        typeof error?.actual === "number" ? error.actual : "unavailable",
      );
    }
  };
  const persist = async (events) => {
    // Only this runner's empty, disposable database can reach these operations.
    await prisma.payment_event.deleteMany({ where: { external_id: { startsWith: "audit-" } } });
    await prisma.payment_event.createMany({ data: events });
    assert.equal(await prisma.payment_event.count(), events.length);
  };
  await check("HTTP_session_required", async () =>
    assert.equal((await request(route)).status, 401),
  );
  await check("HTTP_patient_role_rejected", async () =>
    assert.equal((await request(route, patient)).status, 403),
  );
  await check("B1_HTTP_prefix_isolation_two_persisted_owners", async () => {
    await persist([event(a, "audit-own-a"), event(b, "audit-own-b")]);
    assert.deepEqual(ids(await history(a)), ["audit-own-a"]);
    assert.deepEqual(ids(await history(b)), ["audit-own-b"]);
  });
  await check("B1_repository_and_admin_prefix_isolation", async () => {
    await persist([event(a, "audit-own-a"), event(b, "audit-own-b")]);
    for (const [owner, expected] of [
      [a, "audit-own-a"],
      [b, "audit-own-b"],
    ]) {
      assert.deepEqual(ids(await repository.showPaymentHistory(owner.subscription)), [expected]);
      assert.deepEqual(ids(await admin.showPaymentHistory(owner.subscription)), [expected]);
      const metrics = await admin.summarizePaymentMetrics([owner.subscription]);
      assert.equal(metrics.paidInstallmentsCount, 1);
      assert.equal(metrics.lifetimeValueCents, 2990);
    }
  });
  await check("B1_free_text_does_not_establish_ownership", async () => {
    await persist([event(b, "audit-free-text", { description: a.subscription.id })]);
    assert.deepEqual(await history(a), []);
    assert.equal((await admin.summarizePaymentMetrics([a.subscription])).paidInstallmentsCount, 0);
  });
  await check("B1_conflicting_explicit_references_hidden_from_both_owners", async () => {
    await persist([event(b, "audit-conflicting", { external_reference: a.subscription.id })]);
    for (const owner of [a, b]) {
      assert.deepEqual(await history(owner), []);
      assert.equal(
        (await admin.summarizePaymentMetrics([owner.subscription])).paidInstallmentsCount,
        0,
      );
    }
  });
  await check("B2_persisted_authorized_topic_is_not_paid_status", async () => {
    await persist(
      ["rejected", "pending", "unpaid", "unauthorized", "authorized", "refunded"].map(
        (status, index) =>
          event(
            a,
            `audit-unpaid-${index}`,
            { status },
            { type: "subscription_authorized_payment" },
          ),
      ),
    );
    assert.deepEqual(await history(a), []);
    assert.equal((await admin.summarizePaymentMetrics([a.subscription])).paidInstallmentsCount, 0);
  });
  await check("B2_nested_installment_payment_status_is_authoritative", async () => {
    // Official authorized_payments schema: installment lifecycle != payment.status.
    // https://www.mercadopago.com.br/developers/en/reference/online-payments/subscriptions/get-authorized-payment/get
    await persist([
      event(
        a,
        "audit-nested-approved",
        { status: "processed", payment: { status: "approved" } },
        { type: "subscription_authorized_payment" },
      ),
      event(
        a,
        "audit-nested-rejected",
        { status: "processed", payment: { status: "rejected" } },
        { type: "subscription_authorized_payment" },
      ),
    ]);
    assert.deepEqual(ids(await history(a)), ["audit-nested-approved"]);
    assert.equal((await admin.summarizePaymentMetrics([a.subscription])).paidInstallmentsCount, 1);
  });
  await check("B3_persisted_malformed_amount_is_not_invented", async () => {
    for (const transaction_amount of ["USD29.90", "1e3", "29.9.0", -1]) {
      await persist([event(a, "audit-invalid-amount", { transaction_amount })]);
      const items = await history(a);
      assert.equal(items.length, 1);
      assert.equal(items[0].amount_cents, null);
      const metrics = await admin.summarizePaymentMetrics([a.subscription]);
      assert.equal(metrics.paidInstallmentsCount, 1);
      assert.equal(metrics.lifetimeValueCents, null);
      assert.equal(metrics.lifetimeValueAvailable, false);
    }
  });
  await check("B3_persisted_decimal_BRL_has_exact_cents", async () => {
    for (const transaction_amount of [29.9, "29.90", "29,90"]) {
      await persist([event(a, "audit-valid-amount", { transaction_amount })]);
      assert.equal((await history(a))[0].amount_cents, 2990);
      assert.equal(
        (await admin.summarizePaymentMetrics([a.subscription])).lifetimeValueCents,
        2990,
      );
    }
  });
  await check("HTTP_owner_query_parameters_cannot_select_other_subscription", async () => {
    await persist([event(a, "audit-own-a"), event(b, "audit-own-b")]);
    assert.deepEqual(
      ids(
        await history(
          a,
          `?subscription_id=${b.subscription.id}&user_id=${b.user.id}&psychologist_id=${b.subscription.psychologist_id}`,
        ),
      ),
      ["audit-own-a"],
    );
  });
  await check("concurrent_HTTP_reads_keep_owners_isolated_and_do_not_write_billing", async () => {
    await persist([event(a, "audit-own-a"), event(b, "audit-own-b")]);
    const snapshot = async () => ({
      subscriptions: await prisma.professional_subscription.findMany({ orderBy: { id: "asc" } }),
      events: await prisma.payment_event.findMany({ orderBy: { id: "asc" } }),
    });
    const before = await snapshot();
    await Promise.all(
      Array.from({ length: 12 }, async (_, index) => {
        const owner = index % 2 ? b : a;
        assert.deepEqual(ids(await history(owner)), [index % 2 ? "audit-own-b" : "audit-own-a"]);
      }),
    );
    assert.deepEqual(await snapshot(), before);
  });
  await check("soft_deleted_and_other_gateway_events_hidden", async () => {
    await persist([
      event(a, "audit-deleted", {}, { deleted: true }),
      event(a, "audit-other-gateway", {}, { gateway: "audit-unrelated" }),
    ]);
    assert.deepEqual(await history(a), []);
    assert.equal((await admin.summarizePaymentMetrics([a.subscription])).paidInstallmentsCount, 0);
  });
  step = "aggregate";
  assert.equal(failed.length, 0);
  console.log("BILLING_HISTORY_POSTGRES_HTTP_OK");
})()
  .catch(() => {
    console.error("INTEGRATION_FAILED", step, "scenario_failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  });
