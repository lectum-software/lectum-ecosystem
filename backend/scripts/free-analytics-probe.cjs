// Real event collection while free, real HTTP access guard and real persisted upgrade.
// This does NOT prove checkout/payment, provider notifications or frontend event emission.
const assert = require("node:assert/strict");

// Reject host/production configuration before importing application modules or connecting.
assert.deepEqual(Object.keys(process.env).sort(), [
  "ADMIN_JWT_SECRET",
  "CRYPTO_ALGORITHM",
  "DATABASE_URL",
  "JWT_SECRET_KEY",
  "NODE_ENV",
  "PATH",
]);
assert.equal(process.env.NODE_ENV, "test");
assert.equal(process.env.PATH, "/usr/local/bin:/usr/bin:/bin");
assert.equal(process.env.CRYPTO_ALGORITHM, "bcrypt");
assert.match(process.env.JWT_SECRET_KEY, /^[a-f0-9]{64}$/);
assert.match(process.env.ADMIN_JWT_SECRET, /^[a-f0-9]{64}$/);
const databaseUrl = new URL(process.env.DATABASE_URL);
assert.equal(databaseUrl.protocol, "postgresql:");
assert.match(databaseUrl.hostname, /^lectum-free-analytics178-db-[a-f0-9]{20}$/);
assert.equal(databaseUrl.pathname, "/lectum_audit");
assert.equal(databaseUrl.username, "lectum_audit");
assert.equal(databaseUrl.port, "5432");
assert.equal(databaseUrl.search, "");
assert.equal(databaseUrl.hash, "");
assert.match(databaseUrl.password, /^[a-f0-9]{48}$/);

const { prisma } = require("/app/dist/external/prisma/client.js");
const { generateToken } = require("/app/dist/modules/api/middlewares/_auth/utils/generateToken.js");
const {
  PsychologistAnalyticsRepository,
} = require("/app/dist/modules/api/private/psychologist/analytics/repositories/AnalyticsRepository.js");
const analyticsService = require("/app/dist/modules/api/private/psychologist/analytics/use-cases/services.js");
const entitlement = new PsychologistAnalyticsRepository();
const cases = [];
const test = (name, run) => cases.push({ name, run });
let server;
let origin;
let freePlan;
let paidPlan;
let owner;
let other;
let paidSubscription;
let originalEvent;
let eventsBeforeUpgrade;
let countsBeforeUpgrade;
let eventsAfterDowngrade;
let passed = 0;
let stage = "setup";
const failures = [];
const analyticsRoute = "/api/private/psychologist/analytics";

// All identities/sessions/subscriptions are transient rows in this run's isolated PostgreSQL.
// Tokens use the production signer AND persisted session lookup; no JWT/Passport replacements.
const newProfessional = async (name) => {
  const user = await prisma.user.create({
    data: {
      name: `Profissional efêmero ${name}`,
      email: `free-analytics-${name}@example.invalid`,
      role: "psicologo",
      confirmed: true,
    },
  });
  const profile = await prisma.psychologist_profile.create({
    data: { user_id: user.id, published: true },
  });
  const subscription = await prisma.professional_subscription.create({
    data: { psychologist_id: profile.id, plan_id: freePlan.id, status: "ativa", source: "legacy" },
  });
  const device = `isolated-free-analytics-${name}`;
  const token = generateToken(user, "user", device);
  await prisma.user_token.create({ data: { user_id: user.id, device_id: device, token } });
  return { user, profile, subscription, device, token };
};
const request = async (path, { actor, method = "GET", body, device } = {}) => {
  assert.ok(path.startsWith("/api/"));
  const response = await fetch(`${origin}${path}`, {
    method,
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
    headers: {
      "Accept-Language": "pt",
      "Content-Type": "application/json",
      ...(actor ? { Authorization: `Bearer ${actor.token}`, "x-device": actor.device } : {}),
      ...(device ? { "x-device": device } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
};
const views = () => prisma.profile_view_event.findMany({ orderBy: { id: "asc" } });
const historyCounts = async () => ({
  views: await prisma.profile_view_event.count(),
  actions: await prisma.important_action_event.count(),
  video_sessions: await prisma.profile_video_watch_session.count(),
  contacts: await prisma.contact_request.count(),
  reviews: await prisma.professional_review.count(),
  favorites: await prisma.psychologist_favorite.count(),
  posts: await prisma.community_post.count(),
});
const dateOnly = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const customPeriod = (date) => `?period=custom&start_at=${dateOnly(date)}&end_at=${dateOnly(date)}`;
const expectFreeDenied = async (actor = owner) => {
  const response = await request(`${analyticsRoute}?period=all`, { actor });
  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(response.body.code, "professional_analytics_professional_plan");
  assert.equal(Object.hasOwn(response.body, "data"), false);
  const result = await analyticsService.index({ auth: actor.user, q: { period: "all" } });
  assert.equal(result.status, 403);
  assert.equal(result.success, false);
  assert.equal(result.code, "professional_analytics_professional_plan");
  assert.equal(Object.hasOwn(result.data ?? {}, "metrics"), false);
};
const expectPaidMetrics = async (query = "?period=all", expectedViews = 1) => {
  const response = await request(`${analyticsRoute}${query}`, { actor: owner });
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.deepEqual(response.body.data.access, { has_professional_entitlement: true, mode: "full" });
  assert.equal(response.body.data.metrics.profile_views, expectedViews);
  for (const field of [
    "search_results",
    "favorites_received",
    "whatsapp_clicks",
    "reviews_received",
    "posts_published",
  ]) {
    assert.equal(response.body.data.metrics[field], 0);
  }
  return response.body.data;
};

test("free_entitlement_is_false_with_real_active_free_subscription", async () => {
  const row = await prisma.professional_subscription.findUniqueOrThrow({
    where: { id: owner.subscription.id },
    include: { plan: true },
  });
  assert.equal(row.status, "ativa");
  assert.equal(row.plan.slug, "gratuito");
  assert.equal(row.plan.price_cents, 0);
  assert.equal(row.gateway_subscription_id, null);
  assert.equal(await entitlement.hasProfessionalEntitlement(owner.user.id), false);
  assert.deepEqual(await views(), []);
});

test("free_analytics_HTTP_and_service_are_403_before_collection", () => expectFreeDenied());

test("real_HTTP_collects_current_profile_view_while_free_without_notification", async () => {
  const start = Date.now();
  const response = await request(`/api/private/directory/psychologists/${owner.user.id}/view`, {
    method: "POST",
    body: {},
    device: "isolated-anonymous-profile-view",
  });
  const end = Date.now();
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.tracked, true);
  assert.equal(response.body.data.notification_event_id, null);
  const rows = await views();
  assert.equal(rows.length, 1);
  originalEvent = rows[0];
  assert.equal(originalEvent.psychologist_id, owner.user.id);
  assert.equal(originalEvent.source, "profile_page");
  assert.equal(originalEvent.viewer_id, null);
  assert.equal(originalEvent.device_id, "isolated-anonymous-profile-view");
  assert.equal(originalEvent.deleted, false);
  assert.ok(originalEvent.createdAt.getTime() >= start && originalEvent.createdAt.getTime() <= end);
  assert.equal(await entitlement.hasProfessionalEntitlement(owner.user.id), false);
  assert.equal(
    await prisma.professional_subscription.count({ where: { psychologist_id: owner.profile.id } }),
    1,
  );
});

test("free_profile_view_retry_deduplicates_without_rewriting_original_event", async () => {
  const before = await views();
  const response = await request(`/api/private/directory/psychologists/${owner.user.id}/view`, {
    method: "POST",
    body: {},
    device: "isolated-anonymous-profile-view",
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.tracked, false);
  assert.equal(response.body.data.notification_event_id, null);
  assert.deepEqual(await views(), before);
});

test("free_analytics_stays_403_after_real_event_is_persisted", async () => {
  const before = await views();
  assert.equal(before.length, 1);
  await expectFreeDenied();
  assert.deepEqual(await views(), before);
});

test("another_free_professional_collects_a_distinct_real_event", async () => {
  const response = await request(`/api/private/directory/psychologists/${other.user.id}/view`, {
    method: "POST",
    body: {},
    device: "isolated-other-anonymous-view",
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.tracked, true);
  assert.equal(response.body.data.notification_event_id, null);
  assert.equal((await views()).length, 2);
  assert.equal(await entitlement.hasProfessionalEntitlement(other.user.id), false);
});

test("analytics_without_real_session_is_401_not_an_entitlement_preview", async () => {
  const response = await request(`${analyticsRoute}?period=all`);
  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(Object.hasOwn(response.body, "data"), false);
});

test("inactive_paid_fixture_does_not_unlock_or_create_history", async () => {
  eventsBeforeUpgrade = await views();
  countsBeforeUpgrade = await historyCounts();
  // Move only real clock forward; no backdated or hand-inserted analytics events.
  await prisma.$queryRaw`SELECT 1 FROM pg_sleep(0.02)`;
  paidSubscription = await prisma.professional_subscription.create({
    data: {
      psychologist_id: owner.profile.id,
      plan_id: paidPlan.id,
      status: "inativa",
      source: "legacy",
      current_period_end: new Date(Date.now() + 86_400_000),
    },
  });
  assert.ok(originalEvent.createdAt.getTime() < paidSubscription.createdAt.getTime());
  assert.equal(paidSubscription.gateway, null);
  assert.equal(paidSubscription.gateway_subscription_id, null);
  await expectFreeDenied();
  assert.deepEqual(await views(), eventsBeforeUpgrade);
  assert.deepEqual(await historyCounts(), countsBeforeUpgrade);
});

test("persisted_paid_upgrade_unlocks_without_mutating_event_history", async () => {
  // Test fixture transition, not a simulated payment/webhook or production upgrade path.
  await prisma.$transaction([
    prisma.professional_subscription.update({
      where: { id: owner.subscription.id },
      data: { status: "inativa" },
    }),
    prisma.professional_subscription.update({
      where: { id: paidSubscription.id },
      data: { status: "ativa" },
    }),
  ]);
  assert.equal(await entitlement.hasProfessionalEntitlement(owner.user.id), true);
  assert.deepEqual(await views(), eventsBeforeUpgrade);
  assert.deepEqual(await historyCounts(), countsBeforeUpgrade);
});

test("paid_HTTP_reads_the_same_pre_subscription_event_once", async () => {
  await expectPaidMetrics();
  const exact = await prisma.profile_view_event.findUniqueOrThrow({
    where: { id: originalEvent.id },
  });
  assert.deepEqual(exact, originalEvent);
  assert.ok(exact.createdAt.getTime() < paidSubscription.createdAt.getTime());
  assert.deepEqual(await views(), eventsBeforeUpgrade);
});

test("paid_custom_event_day_includes_original_event_without_synthetic_history", async () => {
  const result = await expectPaidMetrics(customPeriod(originalEvent.createdAt));
  assert.equal(result.period.key, "custom");
  assert.deepEqual(await views(), eventsBeforeUpgrade);
  assert.deepEqual(await historyCounts(), countsBeforeUpgrade);
});

test("paid_day_before_collection_stays_zero_not_reconstructed_history", async () => {
  const previousDay = new Date(originalEvent.createdAt);
  previousDay.setDate(previousDay.getDate() - 1);
  await expectPaidMetrics(customPeriod(previousDay), 0);
  assert.deepEqual(await views(), eventsBeforeUpgrade);
});

test("paid_repeated_reads_do_not_inflate_counts_or_rewrite_timestamps", async () => {
  for (let i = 0; i < 3; i++) await expectPaidMetrics();
  assert.deepEqual(await views(), eventsBeforeUpgrade);
  assert.deepEqual(await historyCounts(), countsBeforeUpgrade);
});

test("other_professional_remains_free_blocked_despite_own_persisted_event", async () => {
  await expectFreeDenied(other);
  assert.equal(
    await prisma.profile_view_event.count({ where: { psychologist_id: other.user.id } }),
    1,
  );
  assert.deepEqual(await views(), eventsBeforeUpgrade);
});

test("expired_paid_entitlement_revokes_read_but_preserves_original_event", async () => {
  await prisma.professional_subscription.update({
    where: { id: paidSubscription.id },
    data: { current_period_end: new Date(Date.now() - 1000) },
  });
  assert.equal(await entitlement.hasProfessionalEntitlement(owner.user.id), false);
  await expectFreeDenied();
  assert.deepEqual(await views(), eventsBeforeUpgrade);
  eventsAfterDowngrade = await views();
});

test("collection_resumes_without_paid_entitlement_after_expiry", async () => {
  const response = await request(`/api/private/directory/psychologists/${owner.user.id}/view`, {
    method: "POST",
    body: {},
    device: "isolated-new-view-after-expiry",
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.tracked, true);
  assert.equal(response.body.data.notification_event_id, null);
  assert.equal(
    await prisma.profile_view_event.count({ where: { psychologist_id: owner.user.id } }),
    2,
  );
  const rows = await views();
  for (const original of eventsAfterDowngrade)
    assert.deepEqual(
      rows.find((row) => row.id === original.id),
      original,
    );
  await expectFreeDenied();
});

test("renewal_exposes_only_actual_before_and_after_expiry_events", async () => {
  const before = await views();
  await prisma.professional_subscription.update({
    where: { id: paidSubscription.id },
    data: { current_period_end: new Date(Date.now() + 86_400_000) },
  });
  await expectPaidMetrics("?period=all", 2);
  assert.deepEqual(await views(), before);
  assert.deepEqual(
    await prisma.profile_view_event.findUniqueOrThrow({ where: { id: originalEvent.id } }),
    originalEvent,
  );
});

test("final_history_contains_only_three_HTTP_collected_views_and_no_backfill", async () => {
  assert.deepEqual(await historyCounts(), {
    views: 3,
    actions: 0,
    video_sessions: 0,
    contacts: 0,
    reviews: 0,
    favorites: 0,
    posts: 0,
  });
  assert.equal(
    await prisma.profile_view_event.count({ where: { psychologist_id: owner.user.id } }),
    2,
  );
  assert.equal(
    await prisma.profile_view_event.count({ where: { psychologist_id: other.user.id } }),
    1,
  );
  assert.equal(
    await prisma.professional_subscription.count({
      where: { gateway_subscription_id: { not: null } },
    }),
    0,
  );
});

(async () => {
  assert.equal(cases.length, 18);
  assert.equal(new Set(cases.map((entry) => entry.name)).size, cases.length);
  const connection =
    await prisma.$queryRaw`SELECT current_database() AS database, current_user AS role`;
  assert.deepEqual(connection, [{ database: "lectum_audit", role: "lectum_audit" }]);
  assert.equal(await prisma.profile_view_event.count(), 0);
  freePlan = await prisma.subscription_plan.upsert({
    where: { slug: "gratuito" },
    update: {},
    create: { name: "Plano gratuito isolado", slug: "gratuito", price_cents: 0 },
  });
  paidPlan = await prisma.subscription_plan.create({
    data: {
      name: "Plano profissional isolado",
      slug: "isolated-free-analytics-paid",
      price_cents: 1000,
    },
  });
  owner = await newProfessional("owner");
  other = await newProfessional("other");
  // No OAuth/SMTP/payment configuration; app loads the production handler and real route graph.
  server = require("/app/dist/main/server/app.js").default;
  const i18n = require("/app/dist/main/server/i18n.js").default;
  if (!i18n.isInitialized) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("I18nInitializationTimeout")), 5000);
      const initialized = () => {
        clearTimeout(timer);
        i18n.off("initialized", initialized);
        resolve();
      };
      i18n.on("initialized", initialized);
    });
  }
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  assert.equal(server.address().address, "127.0.0.1");
  origin = `http://127.0.0.1:${server.address().port}`;
  for (const entry of cases) {
    stage = entry.name;
    try {
      await entry.run();
      passed++;
      console.log("CHECK_OK", entry.name);
    } catch (error) {
      if (!(error instanceof assert.AssertionError)) throw error;
      failures.push(entry.name);
      console.log("CHECK_FAIL", entry.name);
    }
  }
  console.log(
    "PROBE_SUMMARY",
    JSON.stringify({ passed, failed: failures.length, total: cases.length }),
  );
  if (failures.length) process.exitCode = 1;
  else console.log("FREE_ANALYTICS_POSTGRES_OK");
})()
  .catch(() => {
    console.error("INTEGRATION_FAILED", stage);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) {
      server.closeAllConnections();
      const { soc } = require("/app/dist/main/socket/state.js");
      if (soc) await new Promise((resolve) => soc.close(resolve));
      else await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  });
