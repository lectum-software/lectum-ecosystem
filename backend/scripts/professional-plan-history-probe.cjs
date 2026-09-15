// Real repository + PostgreSQL in an immutable image, using only the isolated runner.
const assert = require("node:assert/strict");

const guard = () => {
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
  assert.match(process.env.JWT_SECRET_KEY, /^[a-f0-9]{64}$/u);
  assert.match(process.env.ADMIN_JWT_SECRET, /^[a-f0-9]{64}$/u);
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.protocol, "postgresql:");
  assert.match(url.hostname, /^lectum-plan-history178-db-[a-f0-9]{20}$/u);
  assert.equal(url.port, "5432");
  assert.equal(url.pathname, "/lectum_audit");
  assert.equal(url.username, "lectum_audit");
  assert.match(url.password, /^[a-f0-9]{48}$/u);
  assert.equal(url.search, "");
  assert.equal(url.hash, "");
};
let prisma;
let passed = 0;
let failed = 0;
let step = "isolated-environment";
const check = async (name, run) => {
  step = name;
  try {
    await run();
    passed++;
    console.log("CHECK_OK", name);
  } catch (error) {
    if (!(error instanceof assert.AssertionError)) throw error;
    failed++;
    console.log("CHECK_FAIL", name);
  }
};
const pause = () => new Promise((resolve) => setTimeout(resolve, 8));
const before = (date) => new Date(date.getTime() - 1);

(async () => {
  guard();
  step = "import-isolated-repository";
  ({ prisma } = require("/app/dist/external/prisma/client.js"));
  const root = "/app/dist/modules/api/admin/private/psychologists/dashboard/";
  const { AdminPsychologistsDashboardDirectoryRepository } = require(
    `${root}repositories/queries/AdminPsychologistsDashboardDirectoryRepository.js`,
  );
  const { getPlanSegmentAt, pickCurrentPlan } = require(
    `${root}use-cases/services/plan/segments.js`,
  );
  const { calculateChurnPercent } = require(`${root}use-cases/services/subscriptions/timeline.js`);
  const { buildPsychologistsDashboard } = require(`${root}use-cases/services.js`);
  const { loadPlanHistoryByProfile } = require(`${root}repositories/queries/plan-history.js`);
  const { PLAN_HISTORY_PAGE_SIZE, PLAN_HISTORY_SCOPE_BATCH_SIZE } = require(
    `${root}repositories/queries/plan-history-pages.js`,
  );
  const loadHistories = (ids, range) =>
    prisma.$transaction((transaction) => loadPlanHistoryByProfile(transaction, ids, range), {
      isolationLevel: "RepeatableRead",
    });
  const repository = new AdminPsychologistsDashboardDirectoryRepository();
  const coverage = await repository.planHistoryCoverage();
  await check("coverage-exists", () => assert.ok(coverage instanceof Date));
  await check("baseline-observed-not-backdated", async () => {
    const records = await prisma.subscription_plan_history.findMany({
      where: { observation: "baseline_observed" },
    });
    for (const row of records) assert.equal(row.observed_at.getTime(), coverage.getTime());
  });
  let sequence = 0;
  const makeProfile = async () => {
    const actor = await prisma.user.create({
      data: {
        name: "Perfil descartável C7",
        email: `plan-history-${sequence++}@example.invalid`,
        role: "psicologo",
        active: true,
        createdAt: new Date("2020-01-01T00:00:00Z"),
        psychologist_profile: { create: {} },
      },
      include: { psychologist_profile: true },
    });
    return actor.psychologist_profile.id;
  };
  const profileId = await makeProfile();
  const load = async (id = profileId, range = { start: coverage, end: new Date() }) => {
    const profiles = await repository.listPsychologistProfiles(range);
    const profile = profiles.find((item) => item.id === id);
    assert.ok(profile);
    return profile;
  };
  const segment = async (date, id) => getPlanSegmentAt(await load(id), date);
  const last = (id) =>
    prisma.professional_subscription_history.findFirstOrThrow({
      where: { subscription_id: id },
      orderBy: { id: "desc" },
    });
  const count = (id) =>
    prisma.professional_subscription_history.count({ where: { subscription_id: id } });
  await check("before-coverage-unknown", async () =>
    assert.equal(await segment(before(coverage)), "unknown"),
  );
  await check("covered-empty-is-none", async () => assert.equal(await segment(new Date()), "none"));
  const freePlan = await prisma.subscription_plan.upsert({
    where: { slug: "gratuito" },
    create: { slug: "gratuito", name: "Gratuito", active: true },
    update: {},
  });
  const paidPlan = await prisma.subscription_plan.create({
    data: {
      slug: "plan-history-paid",
      name: "Profissional observado",
      price_cents: 9900,
      active: true,
    },
  });
  const createSubscription = (planId, source, id = profileId) =>
    prisma.professional_subscription.create({
      data: {
        psychologist_id: id,
        plan_id: planId,
        status: "ativa",
        source,
        createdAt: new Date("2020-01-01T00:00:00Z"),
      },
    });
  await pause();
  const free = await createSubscription(freePlan.id, "legacy");
  const freeObserved = await last(free.id);
  await check("insert-observed", () => assert.equal(freeObserved.observation, "insert_observed"));
  await check("creation-date-does-not-invent-past", async () =>
    assert.equal(await segment(before(freeObserved.observed_at)), "none"),
  );
  await check("free-inclusive-boundary", async () =>
    assert.equal(await segment(freeObserved.observed_at), "free"),
  );
  const noOpCount = await count(free.id);
  await prisma.professional_subscription.update({
    where: { id: free.id },
    data: { updatedAt: new Date() },
  });
  await check("irrelevant-update-does-not-add-history", async () =>
    assert.equal(await count(free.id), noOpCount),
  );
  await pause();
  const courtesy = await createSubscription(paidPlan.id, "admin_grant");
  const courtesyObserved = await last(courtesy.id);
  await check("courtesy-outranks-free", async () =>
    assert.equal(await segment(courtesyObserved.observed_at), "courtesy"),
  );
  await check("courtesy-does-not-reclassify-free", async () =>
    assert.equal(await segment(freeObserved.observed_at), "free"),
  );
  await pause();
  const paid = await createSubscription(paidPlan.id, "mercadopago");
  const paidObserved = await last(paid.id);
  await check("paid-outranks-courtesy", async () =>
    assert.equal(await segment(paidObserved.observed_at), "subscriber"),
  );
  await check("paid-does-not-reclassify-courtesy", async () =>
    assert.equal(await segment(courtesyObserved.observed_at), "courtesy"),
  );
  const countBeforeRollback = await count(paid.id);
  const rollback = new Error("rollback-disposable-transaction");
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.professional_subscription.update({
        where: { id: paid.id },
        data: { status: "cancelada" },
      });
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  await check("rollback-preserves-source", async () =>
    assert.equal(
      (await prisma.professional_subscription.findUniqueOrThrow({ where: { id: paid.id } })).status,
      "ativa",
    ),
  );
  await check("rollback-preserves-history", async () =>
    assert.equal(await count(paid.id), countBeforeRollback),
  );
  await pause();
  await prisma.subscription_plan.update({
    where: { id: paidPlan.id },
    data: { name: "Nome posterior" },
  });
  await check("catalog-name-history", async () =>
    assert.equal(
      pickCurrentPlan(await load(), paidObserved.observed_at).plan.name,
      "Profissional observado",
    ),
  );
  await check("catalog-name-current", async () =>
    assert.equal(pickCurrentPlan(await load(), new Date()).plan.name, "Nome posterior"),
  );
  await pause();
  await prisma.subscription_plan.update({ where: { id: paidPlan.id }, data: { active: false } });
  await check("inactive-catalog-current", async () =>
    assert.equal(await segment(new Date()), "free"),
  );
  await check("inactive-catalog-does-not-reclassify-past", async () =>
    assert.equal(await segment(paidObserved.observed_at), "subscriber"),
  );
  await prisma.subscription_plan.update({ where: { id: paidPlan.id }, data: { active: true } });
  const expiry = new Date(Date.now() + 60_000);
  await prisma.professional_subscription.update({
    where: { id: paid.id },
    data: { current_period_end: expiry },
  });
  await check("expiry-exclusive-with-courtesy-preserved", async () => {
    assert.equal(await segment(before(expiry)), "subscriber");
    assert.equal(await segment(expiry), "courtesy");
  });
  await pause();
  await prisma.professional_subscription.update({
    where: { id: paid.id },
    data: { current_period_end: new Date("2000-01-01T00:00:00Z") },
  });
  const expired = await last(paid.id);
  await pause();
  await prisma.professional_subscription.update({
    where: { id: paid.id },
    data: { current_period_end: expiry },
  });
  await check("renewal-does-not-fill-expired-gap", async () => {
    assert.equal(await segment(expired.observed_at), "courtesy");
    assert.equal(await segment(new Date()), "subscriber");
  });
  await pause();
  await prisma.professional_subscription.update({
    where: { id: paid.id },
    data: { status: "cancelada" },
  });
  const canceled = await last(paid.id);
  await check("cancellation-preserves-past-paid", async () =>
    assert.equal(await segment(paidObserved.observed_at), "subscriber"),
  );
  await check("cancellation-current-courtesy", async () =>
    assert.equal(await segment(canceled.observed_at), "courtesy"),
  );
  await check("churn-real-historical-opening", async () =>
    assert.deepEqual(
      calculateChurnPercent([await load()], {
        start: paidObserved.observed_at,
        end: canceled.observed_at,
      }),
      { canceled: 1, denominator: 1, known: true, value: 100 },
    ),
  );
  await pause();
  await prisma.professional_subscription.update({
    where: { id: courtesy.id },
    data: { deleted: true },
  });
  await check("soft-delete-does-not-reclassify-past", async () => {
    assert.equal(await segment(new Date()), "free");
    assert.equal(await segment(courtesyObserved.observed_at), "courtesy");
  });
  await prisma.professional_subscription.delete({ where: { id: paid.id } });
  await check("hard-delete-preserves-historical-state", async () => {
    assert.equal((await last(paid.id)).observation, "delete_observed");
    assert.equal(await segment(paidObserved.observed_at), "subscriber");
  });
  const concurrentId = await makeProfile();
  let release;
  let signal;
  const ready = new Promise((resolve) => {
    signal = resolve;
  });
  const finish = new Promise((resolve) => {
    release = resolve;
  });
  const updating = prisma.$transaction(
    async (transaction) => {
      await transaction.subscription_plan.update({
        where: { id: paidPlan.id },
        data: { name: "Nome concorrente" },
      });
      signal();
      await finish;
    },
    { timeout: 10_000 },
  );
  // Observe failures too, so setup errors cannot leave this synchronization hanging.
  await Promise.race([ready, updating]);
  let concurrent;
  try {
    concurrent = await createSubscription(paidPlan.id, "mercadopago", concurrentId);
  } finally {
    release();
  }
  await updating;
  await check("concurrent-catalog-and-insert-captured", async () => {
    const profile = await load(concurrentId);
    assert.equal(getPlanSegmentAt(profile, new Date()), "subscriber");
    assert.equal(pickCurrentPlan(profile, new Date()).plan.name, "Nome concorrente");
  });
  await check("both-independent-history-sources-exist", async () => {
    assert.ok((await count(concurrent.id)) > 0);
    assert.ok(
      await prisma.subscription_plan_history.findFirst({
        where: { plan_id: paidPlan.id, name: "Nome concorrente" },
      }),
    );
  });
  await check("history-stores-no-provider-identifier", () =>
    assert.equal("gateway_subscription_id" in paidObserved, false),
  );
  await prisma.psychologist_profile.delete({ where: { id: concurrentId } });
  await check("profile-erasure-cascades-without-recreating-history", async () =>
    assert.equal(
      await prisma.professional_subscription_history.count({
        where: { psychologist_id: concurrentId },
      }),
      0,
    ),
  );
  await check("free-entitlement-and-unknown-dto-preserved", async () => {
    const original = await prisma.professional_subscription.findUniqueOrThrow({
      where: { id: free.id },
    });
    assert.equal(original.status, "ativa");
    assert.equal(original.deleted, false);
    const earlier = new Date(coverage.getTime() - 86_400_000).toISOString().slice(0, 10);
    const response = await buildPsychologistsDashboard({
      period: "custom",
      from: earlier,
      to: earlier,
    });
    assert.equal(response.status, 200);
    assert.equal(response.data.plan_history.current_known, false);
    assert.equal(response.data.cards.free_psychologists.unavailable, true);
    assert.ok(response.data.plan_segments.free.unavailable_reason);
    assert.equal(response.data.psychologists.items[0].plan_history_known, false);
    assert.ok(response.data.psychologists.items[0].plan_history_unavailable_reason);
    assert.equal(
      response.data.plan_segments.all.statistics.features.items.find(
        (item) => item.id === "verified",
      ).unavailable,
      true,
    );
    assert.doesNotThrow(() => JSON.stringify(response.data));
  });
  const window = { start: before(canceled.observed_at), end: canceled.observed_at };
  const fullProfile = await load();
  const windowProfile = await load(profileId, window);
  const bounded = windowProfile.plan_history;
  await check("window-keeps-predecessor-churn", () => {
    assert.deepEqual(
      calculateChurnPercent([windowProfile], window),
      calculateChurnPercent([fullProfile], window),
    );
    assert.equal(getPlanSegmentAt(windowProfile, window.start), "subscriber");
    assert.equal(getPlanSegmentAt(windowProfile, window.end), "courtesy");
  });
  await check("window-boundaries-retain-exact-cancellation", async () => {
    const boundary = { start: canceled.observed_at, end: canceled.observed_at };
    const profile = await load(profileId, boundary);
    assert.ok(profile.plan_history.subscriptions.some((row) => row.id === canceled.id));
    assert.deepEqual(
      calculateChurnPercent([profile], boundary),
      calculateChurnPercent([fullProfile], boundary),
    );
  });
  await check("window-removes-obsolete-and-future-revisions", () => {
    for (const [rows, allRows, key] of [
      [bounded.subscriptions, fullProfile.plan_history.subscriptions, "subscription_id"],
      [bounded.plans, fullProfile.plan_history.plans, "plan_id"],
    ]) {
      assert.ok(rows.every((row) => row.observed_at <= window.end));
      const predecessors = rows.filter((row) => row.observed_at < window.start);
      assert.equal(new Set(predecessors.map((row) => row[key])).size, predecessors.length);
      for (const row of predecessors) {
        const latest = allRows
          .filter((item) => item[key] === row[key] && item.observed_at < window.start)
          .sort(
            (left, right) => right.observed_at - left.observed_at || (left.id > right.id ? -1 : 1),
          )[0];
        assert.deepEqual(row, latest);
      }
    }
    assert.ok(bounded.subscriptions.length < fullProfile.plan_history.subscriptions.length);
  });
  await check("empty-profile-scope-is-empty", async () =>
    assert.equal((await loadHistories([], window)).size, 0),
  );

  const largeProfile = await makeProfile();
  const catalogPlan = await prisma.subscription_plan.create({
    data: {
      slug: "history-paged-catalog",
      name: "Histórico paginado",
      price_cents: 9900,
      active: true,
    },
  });
  await prisma.professional_subscription.createMany({
    data: Array.from({ length: PLAN_HISTORY_PAGE_SIZE + 1 }, (_, index) => ({
      id: `history-paged-sub-${index}`,
      psychologist_id: largeProfile,
      plan_id: catalogPlan.id,
      status: "ativa",
      source: "mercadopago",
    })),
  });
  await pause();
  const afterLargeInsert = new Date();
  const allWindow = { start: coverage, end: afterLargeInsert };
  const largeHistories = await loadHistories([largeProfile], allWindow);
  await check("profile-scope-does-not-load-neighbors", () => {
    assert.deepEqual([...largeHistories.keys()], [largeProfile]);
    assert.ok(
      largeHistories
        .get(largeProfile)
        .subscriptions.every((row) => row.psychologist_id === largeProfile),
    );
    assert.ok(
      largeHistories.get(largeProfile).plans.every((row) => row.plan_id === catalogPlan.id),
    );
  });
  await check("subscription-event-keyset-crosses-page", () => {
    const rows = largeHistories.get(largeProfile).subscriptions;
    assert.equal(rows.length, PLAN_HISTORY_PAGE_SIZE + 1);
    assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
  });
  await check("subscription-predecessor-keyset-crosses-page", async () => {
    const histories = await loadHistories([largeProfile], {
      start: afterLargeInsert,
      end: afterLargeInsert,
    });
    const rows = histories.get(largeProfile).subscriptions;
    assert.equal(rows.length, PLAN_HISTORY_PAGE_SIZE + 1);
    assert.ok(rows.every((row) => row.observed_at < afterLargeInsert));
  });

  const batch = Array.from({ length: PLAN_HISTORY_SCOPE_BATCH_SIZE + 1 }, (_, index) => ({
    userId: `history-scope-user-${index}`,
    profileId: `history-scope-profile-${index}`,
    planId: `history-scope-plan-${index}`,
  }));
  await prisma.user.createMany({
    data: batch.map(({ userId }) => ({
      id: userId,
      name: "Perfil descartável C7",
      email: `${userId}@example.invalid`,
      role: "psicologo",
      active: true,
    })),
  });
  await prisma.psychologist_profile.createMany({
    data: batch.map(({ userId, profileId }) => ({ id: profileId, user_id: userId })),
  });
  await prisma.subscription_plan.createMany({
    data: batch.map(({ planId }) => ({
      id: planId,
      slug: planId,
      name: "Plano descartável C7",
      price_cents: 9900,
      active: true,
    })),
  });
  await prisma.professional_subscription.createMany({
    data: batch.map(({ profileId, planId }) => ({
      psychologist_id: profileId,
      plan_id: planId,
      status: "ativa",
      source: "mercadopago",
    })),
  });
  await check("profile-and-associated-plan-batches-cross-limit", async () => {
    const histories = await loadHistories(
      batch.map((item) => item.profileId),
      { start: coverage, end: new Date() },
    );
    assert.equal(histories.size, batch.length);
    for (const item of batch) {
      const history = histories.get(item.profileId);
      assert.equal(history.subscriptions.length, 1);
      assert.equal(getPlanSegmentAt({ plan_history: history }, new Date()), "subscriber");
      assert.ok(history.plans.some((plan) => plan.plan_id === item.planId));
    }
    assert.equal(
      new Set(histories.get(batch[0].profileId).plans.map((row) => row.plan_id)).size,
      batch.length,
    );
  });

  for (let index = 0; index <= PLAN_HISTORY_PAGE_SIZE; index++) {
    await prisma.subscription_plan.update({
      where: { id: catalogPlan.id },
      data: { name: `Revisão observada ${index}` },
    });
  }
  await pause();
  const afterCatalog = new Date();
  await check("catalog-event-keyset-crosses-page", async () => {
    const histories = await loadHistories([largeProfile], { start: coverage, end: afterCatalog });
    const plans = histories.get(largeProfile).plans;
    assert.equal(plans.length, PLAN_HISTORY_PAGE_SIZE + 2);
    assert.equal(new Set(plans.map((row) => row.id)).size, plans.length);
  });
  await check("catalog-predecessor-uses-latest-revision", async () => {
    const histories = await loadHistories([largeProfile], {
      start: afterCatalog,
      end: afterCatalog,
    });
    const plans = histories.get(largeProfile).plans;
    assert.equal(plans.length, 1);
    assert.equal(plans[0].name, `Revisão observada ${PLAN_HISTORY_PAGE_SIZE}`);
    const actual = await prisma.subscription_plan_history.findFirstOrThrow({
      where: { plan_id: catalogPlan.id },
      orderBy: [{ observed_at: "desc" }, { id: "desc" }],
    });
    assert.equal(plans[0].id, actual.id);
    assert.equal(plans[0].observed_at.getTime(), actual.observed_at.getTime());
  });
  assert.equal(passed + failed, 40);
  console.log("PROBE_SUMMARY", JSON.stringify({ passed, failed, total: passed + failed }));
  if (failed) process.exitCode = 1;
  else console.log("PROFESSIONAL_PLAN_HISTORY_POSTGRES_OK");
})()
  .catch((error) => {
    const name =
      error instanceof assert.AssertionError
        ? "AssertionError"
        : error instanceof TypeError
          ? "TypeError"
          : "InfrastructureError";
    console.log("INTEGRATION_FAILED", JSON.stringify({ step, name }));
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prisma) {
      try {
        await prisma.$disconnect();
      } catch {
        console.log(
          "INTEGRATION_FAILED",
          JSON.stringify({ step: "disconnect", name: "InfrastructureError" }),
        );
        process.exitCode = 1;
      }
    }
  });
