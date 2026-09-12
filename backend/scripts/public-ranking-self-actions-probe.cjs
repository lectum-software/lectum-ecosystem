// Real PostgreSQL fixtures only, through the shared isolated runner. No app bootstrap or HTTP.
const assert = require("node:assert/strict");
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
assert.ok(/^[a-f0-9]{64}$/.test(process.env.JWT_SECRET_KEY));
assert.ok(/^[a-f0-9]{64}$/.test(process.env.ADMIN_JWT_SECRET));
const databaseUrl = new URL(process.env.DATABASE_URL);
assert.equal(databaseUrl.protocol, "postgresql:");
assert.match(databaseUrl.hostname, /^lectum-ranking-self178-db-[a-f0-9]{20}$/);
assert.equal(databaseUrl.pathname, "/lectum_audit");
assert.equal(databaseUrl.username, "lectum_audit");
assert.equal(databaseUrl.port, "5432");
assert.equal(databaseUrl.search, "");
assert.equal(databaseUrl.hash, "");
assert.ok(/^[a-f0-9]{48}$/.test(databaseUrl.password));
// Import application modules only after validating the complete disposable environment.
const { prisma } = require("/app/dist/external/prisma/client.js");
const { getRankingContext } = require("/app/dist/utils/psychologist-public-ranking/context.js");
const {
  calculateVideoScoreWithLearningWindow,
  DEFAULT_NEW_VIDEO_SCORE,
  PROFESSIONAL_COLD_START_MIN_SEARCH_IMPRESSIONS,
  PROFESSIONAL_COLD_START_MIN_QUALIFIED_VIDEO_VIEWS,
} = require("/app/dist/utils/psychologist-public-ranking/scoring.js");

const DAY = 86_400_000;
const start = new Date(Date.now() - 60 * DAY);
const early = new Date(start.getTime() + 20 * DAY);
const late = new Date(start.getTime() + 40 * DAY);
const beforeStart = new Date(start.getTime() - DAY);
const CURRENT_VIDEO = "https://example.invalid/local-ranking-current.mp4"; // Never fetched.
const OLD_VIDEO = "https://example.invalid/local-ranking-old.mp4";
let sequence = 0;
let plan;
let passed = 0;
let stage = "initialization";
const failures = [];
const check = async (name, operation) => {
  stage = name;
  try {
    await operation();
    passed++;
    console.log("CHECK_OK", name);
  } catch (error) {
    if (!(error instanceof assert.AssertionError)) throw error;
    failures.push(name);
    console.log("CHECK_FAIL", name);
  }
};
const newUser = (role = "paciente") =>
  prisma.user.create({
    data: {
      name: "Unidade local",
      email: `ranking-self-${sequence++}@example.invalid`,
      role,
    },
  });
const candidateFor = async (startedAt = start) => {
  const user = await newUser("psicologo");
  const profile = await prisma.psychologist_profile.create({
    data: {
      user_id: user.id,
      createdAt: beforeStart,
      updatedAt: beforeStart,
      video_url: CURRENT_VIDEO,
    },
  });
  if (startedAt)
    await prisma.professional_subscription.create({
      data: {
        psychologist_id: profile.id,
        plan_id: plan.id,
        createdAt: startedAt,
        status: "ativa",
        source: "legacy",
        current_period_end: new Date("2099-01-01T00:00:00Z"),
      },
    });
  const candidate = await prisma.psychologist_profile.findUniqueOrThrow({
    where: { id: profile.id },
    include: {
      subscriptions: true,
      user: {
        include: {
          psychologist_approaches: true,
          psychologist_services: true,
          psychologist_specialties: true,
        },
      },
    },
  });
  assert.equal(candidate.cfp_verified_at, null);
  assert.equal(candidate.crp_status, "pendente");
  assert.equal(candidate.published, false);
  return candidate;
};
const favorite = (candidate, actorId, extra = {}) =>
  prisma.psychologist_favorite.create({
    data: {
      psychologist_id: candidate.user.id,
      user_id: actorId,
      createdAt: early,
      ...extra,
    },
  });
const contact = (candidate, actorId, extra = {}) =>
  prisma.contact_request.create({
    data: {
      psychologist_id: candidate.user.id,
      user_id: actorId,
      channel: "whatsapp",
      createdAt: early,
      ...extra,
    },
  });
const videoData = (candidate, actorId, extra = {}) => ({
  psychologist_id: candidate.user.id,
  viewer_id: actorId,
  session_key: `local-watch-${sequence++}`,
  video_url: CURRENT_VIDEO,
  duration_seconds: 10,
  watched_seconds: 3,
  max_position_seconds: 0,
  createdAt: early,
  last_event_at: early,
  ...extra,
});
const video = (candidate, actorId, extra = {}) =>
  prisma.profile_video_watch_session.create({
    data: videoData(candidate, actorId, extra),
  });
const impressionData = (candidate, actorId, extra = {}) => ({
  psychologist_id: candidate.user.id,
  viewer_id: actorId,
  source: "search_result",
  createdAt: early,
  ...extra,
});
const impression = (candidate, actorId, extra = {}) =>
  prisma.profile_view_event.create({
    data: impressionData(candidate, actorId, extra),
  });
const allActions = async (candidate, actorId, extra = {}) => {
  if (actorId !== null) await favorite(candidate, actorId, extra);
  await contact(candidate, actorId, extra);
  await video(candidate, actorId, extra);
  await impression(candidate, actorId, extra);
};
const count = (map, candidate) => map.get(candidate.user.id) ?? 0;
const metrics = (context) => ({
  favoriteCounts: context.favoriteCounts,
  whatsappClickCounts: context.whatsappClickCounts,
  latestActivityAt: context.latestActivityAt,
  videoStats: context.videoStats,
  professionalStartDates: context.professionalStartDates,
  qualifiedVideoViewsSinceProfessionalStart: context.qualifiedVideoViewsSinceProfessionalStart,
  searchImpressionsSinceProfessionalStart: context.searchImpressionsSinceProfessionalStart,
});
const assertEmpty = (context, candidate) => {
  for (const map of [
    context.favoriteCounts,
    context.whatsappClickCounts,
    context.qualifiedVideoViewsSinceProfessionalStart,
    context.searchImpressionsSinceProfessionalStart,
  ])
    assert.equal(count(map, candidate), 0);
  assert.equal(context.latestActivityAt.has(candidate.user.id), false);
  assert.deepEqual(context.videoStats.get(candidate.user.id), {
    latestAt: null,
    qualifiedViews: 0,
    score: DEFAULT_NEW_VIDEO_SCORE,
  });
};
const rowsFor = async (candidate) => {
  const where = { psychologist_id: candidate.user.id };
  const orderBy = { id: "asc" };
  return Promise.all([
    prisma.psychologist_profile.findUniqueOrThrow({ where: { id: candidate.id } }),
    prisma.psychologist_favorite.findMany({ where, orderBy }),
    prisma.contact_request.findMany({ where, orderBy }),
    prisma.profile_video_watch_session.findMany({ where, orderBy }),
    prisma.profile_view_event.findMany({ where, orderBy }),
  ]);
};

(async () => {
  assert.equal(await prisma.user.count(), 0);
  plan = await prisma.subscription_plan.create({
    data: { slug: "local-ranking-fixture", name: "Plano local", price_cents: 0 },
  });

  await check("empty_candidate_scope_returns_empty_maps", async () => {
    const candidate = await candidateFor();
    await allActions(candidate, (await newUser()).id);
    const context = await getRankingContext([], null);
    for (const map of Object.values(metrics(context))) assert.equal(map.size, 0);
    assert.equal(context.viewerId, null);
    assert.ok(context.now instanceof Date);
  });
  await check("self_favorite_does_not_change_count_or_recency", async () => {
    const candidate = await candidateFor();
    const before = metrics(await getRankingContext([candidate], null));
    await favorite(candidate, candidate.user.id, { createdAt: late });
    assert.deepEqual(metrics(await getRankingContext([candidate], null)), before);
  });
  await check("self_whatsapp_does_not_change_count_or_recency", async () => {
    const candidate = await candidateFor();
    const before = metrics(await getRankingContext([candidate], null));
    await contact(candidate, candidate.user.id, { createdAt: late });
    assert.deepEqual(metrics(await getRankingContext([candidate], null)), before);
  });
  await check("self_video_does_not_change_qualification_score_or_recency", async () => {
    const candidate = await candidateFor();
    const before = metrics(await getRankingContext([candidate], null));
    await video(candidate, candidate.user.id, {
      watched_seconds: 10,
      max_position_seconds: 10,
      completed: true,
      createdAt: late,
      last_event_at: late,
    });
    assert.deepEqual(metrics(await getRankingContext([candidate], null)), before);
  });
  await check("self_search_impression_does_not_change_cold_start_exposure", async () => {
    const candidate = await candidateFor();
    const before = metrics(await getRankingContext([candidate], null));
    await impression(candidate, candidate.user.id, { createdAt: late });
    assert.deepEqual(metrics(await getRankingContext([candidate], null)), before);
  });
  await check("third_party_anonymous_and_other_candidate_actions_still_count", async () => {
    const candidate = await candidateFor();
    const other = await candidateFor();
    const third = await newUser();
    for (const actorId of [third.id, null, other.user.id]) await allActions(candidate, actorId);
    const context = await getRankingContext([candidate, other], third.id);
    assert.equal(count(context.favoriteCounts, candidate), 2);
    assert.equal(count(context.whatsappClickCounts, candidate), 3);
    assert.equal(count(context.qualifiedVideoViewsSinceProfessionalStart, candidate), 3);
    assert.equal(count(context.searchImpressionsSinceProfessionalStart, candidate), 3);
    assert.equal(context.videoStats.get(candidate.user.id).qualifiedViews, 3);
    assert.deepEqual(context.latestActivityAt.get(candidate.user.id), early);
    assertEmpty(context, other);
  });
  await check("cross_candidate_comparison_is_per_row_not_candidate_id_list", async () => {
    const left = await candidateFor();
    const right = await candidateFor();
    for (const [target, actor] of [
      [left, left],
      [right, right],
      [left, right],
      [right, left],
    ])
      await allActions(target, actor.user.id);
    const context = await getRankingContext([left, right], left.user.id);
    for (const candidate of [left, right]) {
      for (const map of [
        context.favoriteCounts,
        context.whatsappClickCounts,
        context.qualifiedVideoViewsSinceProfessionalStart,
        context.searchImpressionsSinceProfessionalStart,
      ])
        assert.equal(count(map, candidate), 1);
      assert.equal(context.videoStats.get(candidate.user.id).qualifiedViews, 1);
    }
  });
  await check("context_counts_do_not_depend_on_requesting_viewer", async () => {
    const candidate = await candidateFor();
    const third = await newUser();
    for (const actorId of [candidate.user.id, third.id, null]) await allActions(candidate, actorId);
    let expected;
    for (const viewerId of [null, candidate.user.id, third.id]) {
      const context = await getRankingContext([candidate], viewerId);
      assert.equal(context.viewerId, viewerId);
      assert.equal(count(context.favoriteCounts, candidate), 1);
      assert.equal(count(context.whatsappClickCounts, candidate), 2);
      if (expected) assert.deepEqual(metrics(context), expected);
      else expected = metrics(context);
    }
  });
  await check("legacy_non_self_video_learning_and_activity_values_are_preserved", async () => {
    const candidate = await candidateFor();
    const third = await newUser();
    await favorite(candidate, third.id);
    await contact(candidate, null);
    const current = await video(candidate, third.id, { watched_seconds: 6 });
    const historical = await video(candidate, null, {
      video_url: OLD_VIDEO,
      watched_seconds: 5,
      last_event_at: late,
    });
    await impression(candidate, null);
    const context = await getRankingContext([candidate], third.id);
    assert.equal(count(context.favoriteCounts, candidate), 1);
    assert.equal(count(context.whatsappClickCounts, candidate), 1);
    assert.equal(count(context.qualifiedVideoViewsSinceProfessionalStart, candidate), 2);
    assert.equal(count(context.searchImpressionsSinceProfessionalStart, candidate), 1);
    const stats = context.videoStats.get(candidate.user.id);
    assert.deepEqual(
      stats,
      calculateVideoScoreWithLearningWindow(CURRENT_VIDEO, [current, historical]),
    );
    assert.equal(stats.qualifiedViews, 2);
    assert.ok(Math.abs(stats.score - ((0.425 * 29) / 30 + 0.51 / 30)) < 1e-12);
    assert.deepEqual(stats.latestAt, early); // Existing current-video precedence, not rewritten.
    assert.deepEqual(context.latestActivityAt.get(candidate.user.id), late);
  });
  await check("video_consumption_or_is_preserved_and_zero_consumption_stays_excluded", async () => {
    const candidate = await candidateFor();
    const third = await newUser();
    const watched = await video(candidate, third.id);
    const position = await video(candidate, null, { watched_seconds: 0, max_position_seconds: 3 });
    await video(candidate, third.id, {
      watched_seconds: 0,
      max_position_seconds: 0,
      completed: true,
      last_event_at: late,
    });
    const context = await getRankingContext([candidate], null);
    assert.equal(count(context.qualifiedVideoViewsSinceProfessionalStart, candidate), 2);
    assert.deepEqual(context.latestActivityAt.get(candidate.user.id), early);
    assert.deepEqual(
      context.videoStats.get(candidate.user.id),
      calculateVideoScoreWithLearningWindow(CURRENT_VIDEO, [watched, position]),
    );
  });
  await check(
    "positive_subthreshold_consumption_keeps_activity_without_qualification",
    async () => {
      const candidate = await candidateFor();
      await video(candidate, null, {
        watched_seconds: 1,
        max_position_seconds: 2,
        last_event_at: late,
      });
      const context = await getRankingContext([candidate], null);
      assert.equal(count(context.qualifiedVideoViewsSinceProfessionalStart, candidate), 0);
      assert.equal(context.videoStats.get(candidate.user.id).qualifiedViews, 0);
      assert.deepEqual(context.latestActivityAt.get(candidate.user.id), late);
    },
  );
  await check("professional_start_is_inclusive_per_candidate_not_global_earliest", async () => {
    const left = await candidateFor(start);
    const rightStart = new Date(start.getTime() + DAY);
    const right = await candidateFor(rightStart);
    for (const [candidate, since] of [
      [left, start],
      [right, rightStart],
    ]) {
      for (const offset of [-1, 0, 1]) {
        const createdAt = new Date(since.getTime() + offset);
        await impression(candidate, null, { createdAt });
        await video(candidate, null, { createdAt, last_event_at: late });
      }
    }
    const context = await getRankingContext([left, right], null);
    for (const candidate of [left, right]) {
      assert.equal(count(context.searchImpressionsSinceProfessionalStart, candidate), 2);
      assert.equal(count(context.qualifiedVideoViewsSinceProfessionalStart, candidate), 2);
      assert.equal(context.videoStats.get(candidate.user.id).qualifiedViews, 3);
    }
    assert.deepEqual(context.professionalStartDates.get(right.user.id), rightStart);
  });
  await check("self_actions_cannot_supply_cold_start_threshold_counts", async () => {
    const candidate = await candidateFor();
    await prisma.profile_video_watch_session.createMany({
      data: Array.from({ length: 30 }, () => videoData(candidate, candidate.user.id)),
    });
    await prisma.profile_view_event.createMany({
      data: Array.from({ length: 500 }, () => impressionData(candidate, candidate.user.id)),
    });
    const context = await getRankingContext([candidate], null);
    assertEmpty(context, candidate);
  });
  await check("anonymous_legitimate_cold_start_threshold_counts_are_preserved", async () => {
    assert.equal(PROFESSIONAL_COLD_START_MIN_QUALIFIED_VIDEO_VIEWS, 30);
    assert.equal(PROFESSIONAL_COLD_START_MIN_SEARCH_IMPRESSIONS, 500);
    const candidate = await candidateFor();
    await prisma.profile_video_watch_session.createMany({
      data: Array.from({ length: 30 }, () => videoData(candidate, null)),
    });
    await prisma.profile_view_event.createMany({
      data: Array.from({ length: 500 }, () => impressionData(candidate, null)),
    });
    const context = await getRankingContext([candidate], null);
    assert.equal(count(context.qualifiedVideoViewsSinceProfessionalStart, candidate), 30);
    assert.equal(count(context.searchImpressionsSinceProfessionalStart, candidate), 500);
    assert.equal(context.videoStats.get(candidate.user.id).qualifiedViews, 30);
  });
  await check("deleted_out_of_scope_wrong_channel_and_wrong_source_stay_excluded", async () => {
    const candidate = await candidateFor();
    const outside = await candidateFor();
    const third = await newUser();
    await allActions(candidate, third.id, { deleted: true });
    await allActions(outside, third.id);
    await contact(candidate, null, { channel: "email" });
    await impression(candidate, null, { source: "profile_page" });
    assertEmpty(await getRankingContext([candidate], null), candidate);
  });
  await check("published_review_recency_remains_unchanged_by_self_action_filters", async () => {
    const candidate = await candidateFor(null);
    for (const extra of [
      { status: "publicada", createdAt: early },
      { status: "pendente", createdAt: late },
      { status: "publicada", deleted: true, createdAt: late },
    ])
      await prisma.professional_review.create({
        data: {
          psychologist_id: candidate.user.id,
          author_id: (await newUser()).id,
          rating: 4,
          ...extra,
        },
      });
    const context = await getRankingContext([candidate], null);
    assert.deepEqual(context.latestActivityAt.get(candidate.user.id), early);
    assert.equal(context.professionalStartDates.size, 0);
    assert.equal(context.searchImpressionsSinceProfessionalStart.size, 0);
  });
  await check("ranking_context_does_not_mutate_candidates_or_delete_legacy_history", async () => {
    const candidate = await candidateFor();
    await allActions(candidate, candidate.user.id);
    const candidates = [candidate];
    const beforeCandidates = structuredClone(candidates);
    const beforeRows = await rowsFor(candidate);
    await getRankingContext(candidates, candidate.user.id);
    assert.deepEqual(candidates, beforeCandidates);
    assert.deepEqual(await rowsFor(candidate), beforeRows);
    assert.equal(beforeRows[0].cfp_verified_at, null);
    assert.equal(beforeRows[0].published, false);
  });
  console.log(
    "PROBE_SUMMARY",
    JSON.stringify({ passed, failed: failures.length, total: passed + failures.length }),
  );
  if (failures.length) process.exitCode = 1;
  else console.log("PUBLIC_RANKING_SELF_ACTIONS_OK");
})()
  .catch((error) => {
    const code = /^P\d{4}$/.test(error?.code ?? "") ? error.code : "none";
    const kind = [
      "TypeError",
      "PrismaClientValidationError",
      "PrismaClientKnownRequestError",
    ].includes(error?.name)
      ? error.name
      : "other";
    console.error("INTEGRATION_FAILED", JSON.stringify({ stage, kind, code }));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
