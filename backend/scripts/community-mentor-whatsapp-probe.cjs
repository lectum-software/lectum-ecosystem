// Somente no runner isolado: repositórios/query reais, sem mocks, roteador, sessão ou provider.
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
assert.match(databaseUrl.hostname, /^lectum-mentor-whatsapp178-db-[a-f0-9]{20}$/u);
assert.equal(databaseUrl.pathname, "/lectum_audit");
assert.equal(databaseUrl.username, "lectum_audit");
assert.equal(databaseUrl.port, "5432");
assert.equal(databaseUrl.search, "");
assert.equal(databaseUrl.hash, "");
assert.ok(/^[a-f0-9]{48}$/.test(databaseUrl.password));

// Import application modules only after validating the complete disposable environment.
const { prisma } = require("/app/dist/external/prisma/client.js");
const ranking = require("/app/dist/utils/community-mentor-ranking.js");
const {
  CommunityMentorRepository,
} = require("/app/dist/modules/api/private/community/repositories/queries/CommunityMentorRepository.js");
const {
  AdminCommunityManageMentorRepository,
} = require("/app/dist/modules/api/admin/private/communities/manage/repositories/queries/AdminCommunityManageMentorRepository.js");
const {
  adminCommunityMentorScore,
} = require("/app/dist/modules/api/admin/private/communities/manage/repositories/support/manage-selects.js");

let step = "setup";
let passed = 0;
let failed = 0;
class MissingCommunityWhatsappHelperError extends TypeError {}
const failureDetails = (error) => ({
  step,
  kind:
    error instanceof assert.AssertionError
      ? "AssertionError"
      : error instanceof TypeError
        ? "TypeError"
        : ["PrismaClientValidationError", "PrismaClientKnownRequestError"].includes(error?.name)
          ? error.name
          : "other",
  code: /^P\d{4}$/.test(error?.code ?? "") ? error.code : "none",
  reason:
    error instanceof MissingCommunityWhatsappHelperError
      ? "missing_community_whatsapp_helper_in_image"
      : error instanceof assert.AssertionError
        ? "assertion"
        : "runtime_or_infrastructure",
});
const check = async (name, run) => {
  step = name;
  try {
    await run();
    passed += 1;
    console.log("CHECK_OK", name);
  } catch (error) {
    if (!(error instanceof assert.AssertionError)) throw error;
    failed += 1;
    console.log("CHECK_FAIL", name);
  }
};

(async () => {
  const now = new Date();
  const day = 86_400_000;
  const old = new Date(now.getTime() - 120 * day);
  const recent = new Date(now.getTime() - 4 * day);
  const at = (index) => new Date(recent.getTime() + index * 1000);
  const plan = await prisma.subscription_plan.create({
    data: { name: "Plano descartável C23", slug: "audit-c23-plan", active: true },
  });
  const mentor = async (label, { entitled = true, published = true, video = true } = {}) => {
    const user = await prisma.user.create({
      data: {
        name: `Mentor descartável ${label}`,
        email: `c23-${label}@example.invalid`,
        role: "psicologo",
        active: true,
        psychologist_profile: {
          create: {
            published,
            video_url: video ? "https://example.invalid/c23-video" : null,
            ...(entitled
              ? {
                  subscriptions: {
                    create: { plan_id: plan.id, status: "ativa", source: "admin_grant" },
                  },
                }
              : {}),
          },
        },
      },
    });
    return user.id;
  };
  const a = await mentor("a");
  const b = await mentor("b");
  const emptyMentor = await mentor("sem-conteudo");
  const patient = await prisma.user.create({
    data: { name: "Ator descartável C23", email: "c23-ator@example.invalid", role: "paciente" },
  });
  const createCommunity = (slug, extra = {}) =>
    prisma.community.create({ data: { name: "Comunidade descartável C23", slug, ...extra } });
  const main = await createCommunity("audit-c23-main");
  const other = await createCommunity("audit-c23-other");
  const inactive = await createCommunity("audit-c23-inactive", { active: false });
  const deletedCommunity = await createCommunity("audit-c23-deleted", { deleted: true });
  const post = (authorId, communityId = main.id, extra = {}) =>
    prisma.community_post.create({
      data: {
        author_id: authorId,
        community_id: communityId,
        title: "Alvo descartável C23",
        content: "Conteúdo de regressão no PostgreSQL efêmero.",
        status: "publicado",
        anonymous: false,
        createdAt: old,
        updatedAt: old,
        ...extra,
      },
    });
  const reply = (authorId, postId, extra = {}) =>
    prisma.post_reply.create({
      data: {
        author_id: authorId,
        post_id: postId,
        content: "Resposta descartável C23.",
        createdAt: old,
        updatedAt: old,
        ...extra,
      },
    });
  const aPost = await post(a);
  const patientPost = await post(patient.id);
  const bReply = await reply(b, patientPost.id);
  let sequence = 0;
  const action = (targetType, targetId, userId = null, occurredAt = at(10), extra = {}) =>
    prisma.important_action_event.create({
      data: {
        visitor_id: "c23-disposable-visitor",
        session_id: `c23-event-reference-${++sequence}`,
        action_type: "whatsapp_click",
        page_kind: "community_post",
        target_type: targetType,
        target_id: targetId,
        user_id: userId,
        occurred_at: occurredAt,
        ...extra,
      },
    });
  const publicRepository = new CommunityMentorRepository();
  const adminRepository = new AdminCommunityManageMentorRepository();
  const mentorIds = [a, b, emptyMentor];
  const publicRanking = (period = "30d", community = main.slug) =>
    publicRepository.topMentors({ q: { period, community, limit: 10 } });
  const postFilter = (communityId = main.id) => ({
    community_id: communityId,
    deleted: false,
    status: "publicado",
  });
  const counts = (window, ids = mentorIds, communityId = main.id) => {
    if (typeof ranking.getCommunityMentorWhatsappClickCounts !== "function") {
      throw new MissingCommunityWhatsappHelperError();
    }
    return ranking.getCommunityMentorWhatsappClickCounts(ids, postFilter(communityId), window);
  };
  const countsAt = (index) => counts({ gte: at(index), lte: at(index) });
  const expectedCounts = (aCount, bCount) =>
    new Map([...(aCount ? [[a, aCount]] : []), ...(bCount ? [[b, bCount]] : [])]);
  const item = (result, id) => result.data.find((entry) => entry.professional.id === id);
  const metricCounts = (result) =>
    new Map(
      result.data
        .filter((entry) => entry.metrics.community_whatsapp_clicks > 0)
        .map((entry) => [entry.professional.id, entry.metrics.community_whatsapp_clicks]),
    );
  const allFrom = new Date(old.getTime() - day);
  const initialPublic = await publicRanking("all");
  const initialSignals = await ranking.getCommunityMentorRankingSignals(main.id, mentorIds);

  await check("persisted_baseline_has_zero_whatsapp", async () => {
    assert.equal(initialPublic.count, 2);
    assert.equal(item(initialPublic, a).metrics.community_whatsapp_clicks, 0);
    assert.equal(item(initialPublic, b).metrics.community_whatsapp_clicks, 0);
    const metrics = await adminRepository.buildMentorMetrics(main.id, mentorIds, allFrom, now);
    assert.equal(metrics.get(a).community_whatsapp_clicks, 0);
    assert.equal(metrics.get(b).community_whatsapp_clicks, 0);
  });
  await check("empty_candidate_list_has_no_signal", async () => {
    assert.deepEqual(await counts(undefined, []), new Map());
  });
  await check("candidate_without_content_has_no_signal", async () => {
    assert.deepEqual(await counts(undefined, [emptyMentor]), new Map());
  });

  await action("community_post", aPost.id, null, at(0));
  await action("post", aPost.id, patient.id, at(1));
  await action("post_reply", bReply.id, patient.id, at(2));
  await action("reply", bReply.id, null, at(3));
  await action("community_post", aPost.id, null, at(4));
  await action("community_post", aPost.id, null, at(4));
  await action("community_post", aPost.id, b, at(5));
  await action("post_reply", bReply.id, a, at(6));

  await check("current_post_target_is_attributed", async () => {
    assert.deepEqual(await countsAt(0), expectedCounts(1, 0));
  });
  await check("legacy_post_alias_is_attributed", async () => {
    assert.deepEqual(await countsAt(1), expectedCounts(1, 0));
  });
  await check("current_reply_target_is_attributed", async () => {
    assert.deepEqual(await countsAt(2), expectedCounts(0, 1));
  });
  await check("legacy_reply_alias_is_attributed", async () => {
    assert.deepEqual(await countsAt(3), expectedCounts(0, 1));
  });
  await check("grouped_events_are_not_unique_visitor_counts", async () => {
    assert.deepEqual(await countsAt(4), expectedCounts(2, 0));
  });
  await check("another_candidate_is_a_valid_third_party", async () => {
    assert.deepEqual(await counts({ gte: at(5), lte: at(6) }), expectedCounts(1, 1));
  });

  for (const type of ["community_post", "post"]) await action(type, aPost.id, a, at(7));
  for (const type of ["post_reply", "reply"]) await action(type, bReply.id, b, at(7));
  await check("authenticated_self_actions_are_excluded", async () => {
    assert.deepEqual(await countsAt(7), new Map());
    assert.deepEqual(metricCounts(await publicRanking()), expectedCounts(5, 3));
  });
  await check("recent_clicks_on_old_content_are_in_current_period", async () => {
    const result = await publicRanking();
    assert.deepEqual(metricCounts(result), expectedCounts(5, 3));
    assert.equal(item(result, a).metrics.posts_published, 0);
    assert.equal(item(result, b).metrics.replies_published, 0);
  });
  await check("all_three_consumers_apply_the_same_existing_score", async () => {
    const result = await publicRanking("all");
    const metrics = await adminRepository.buildMentorMetrics(main.id, mentorIds, allFrom, now);
    const signals = await ranking.getCommunityMentorRankingSignals(main.id, mentorIds);
    for (const id of [a, b]) {
      assert.equal(signals.get(id).score, item(result, id).score);
      assert.equal(adminCommunityMentorScore(metrics.get(id)), item(result, id).score);
    }
    assert.equal(metrics.get(a).community_whatsapp_clicks, 5);
    assert.equal(metrics.get(b).community_whatsapp_clicks, 3);
  });
  await check("weight_six_changes_score_and_existing_order", async () => {
    const result = await publicRanking("all");
    const signals = await ranking.getCommunityMentorRankingSignals(main.id, mentorIds);
    assert.equal(item(result, a).score - item(initialPublic, a).score, 30);
    assert.equal(item(result, b).score - item(initialPublic, b).score, 18);
    assert.equal(signals.get(a).score - initialSignals.get(a).score, 30);
    assert.equal(initialPublic.data[0].professional.id, b);
    assert.equal(result.data[0].professional.id, a);
    assert.equal(signals.get(a).position, 1);
  });

  await action("psychologist", a, patient.id, at(8), { page_kind: "community_top_mentors" });
  await action("psychologist", aPost.id, null, at(8));
  await prisma.contact_request.create({ data: { psychologist_id: a, user_id: patient.id } });
  await check("generic_profile_and_contact_have_no_community_attribution", async () => {
    assert.deepEqual(await countsAt(8), new Map());
    assert.deepEqual(metricCounts(await publicRanking()), expectedCounts(5, 3));
  });

  const edgeFrom = new Date(now.getTime() - 40 * day);
  const edgeTo = new Date(now.getTime() - 39 * day);
  await action("post", aPost.id, null, edgeFrom);
  await action("reply", bReply.id, null, edgeTo);
  await action("post", aPost.id, null, new Date(edgeFrom.getTime() - 1));
  await action("reply", bReply.id, null, new Date(edgeTo.getTime() + 1));
  await check("event_period_includes_exact_boundaries", async () => {
    assert.deepEqual(await counts({ gte: edgeFrom, lte: edgeTo }), expectedCounts(1, 1));
    const metrics = await adminRepository.buildMentorMetrics(main.id, mentorIds, edgeFrom, edgeTo);
    assert.equal(metrics.get(a).community_whatsapp_clicks, 1);
    assert.equal(metrics.get(b).community_whatsapp_clicks, 1);
  });
  await check("event_period_does_not_leak_adjacent_milliseconds", async () => {
    assert.deepEqual(await counts({ gt: edgeFrom, lt: edgeTo }), new Map());
  });
  await check("historical_events_are_excluded_from_thirty_days", async () => {
    assert.deepEqual(metricCounts(await publicRanking()), expectedCounts(5, 3));
    assert.deepEqual(metricCounts(await publicRanking("90d")), expectedCounts(7, 5));
  });

  const sharedPost = await post(a, main.id, { id: "c23-shared-target" });
  const sharedReply = await reply(b, patientPost.id, { id: sharedPost.id });
  await action("post", sharedPost.id, null, at(11));
  await action("reply", sharedReply.id, a, at(11));
  await check("type_and_id_pair_disambiguates_cross_table_collision", async () => {
    assert.deepEqual(await countsAt(11), expectedCounts(1, 1));
  });

  const deletedPost = await post(a, main.id, { deleted: true });
  const removedPost = await post(a, main.id, { status: "removido" });
  const deletedReply = await reply(b, patientPost.id, { deleted: true });
  const replyToDeleted = await reply(b, deletedPost.id);
  const replyToRemoved = await reply(b, removedPost.id);
  for (const target of [deletedPost, removedPost]) await action("post", target.id, null, at(12));
  for (const target of [deletedReply, replyToDeleted, replyToRemoved])
    await action("reply", target.id, null, at(12));
  await action("post", aPost.id, null, at(12), { deleted: true });
  await action("post", aPost.id, null, at(12), { action_type: "profile_view" });
  await check("deleted_events_and_unavailable_content_are_excluded", async () => {
    assert.deepEqual(await countsAt(12), new Map());
    assert.deepEqual(metricCounts(await publicRanking()), expectedCounts(6, 4));
  });

  const otherPost = await post(a, other.id);
  await action("post", otherPost.id, null, at(13));
  await check("community_scope_does_not_distribute_clicks", async () => {
    assert.deepEqual(await countsAt(13), new Map());
    assert.deepEqual(await counts(undefined, mentorIds, other.id), expectedCounts(1, 0));
    assert.deepEqual(metricCounts(await publicRanking()), expectedCounts(6, 4));
    assert.deepEqual(metricCounts(await publicRanking("30d", "")), expectedCounts(7, 4));
  });
  for (const community of [inactive, deletedCommunity]) {
    const target = await post(a, community.id);
    await action("post", target.id, null, at(14));
  }
  await check("global_public_ranking_preserves_active_community_filter", async () => {
    assert.deepEqual(metricCounts(await publicRanking("30d", "")), expectedCounts(7, 4));
    assert.equal(await publicRanking("30d", inactive.slug), null);
    assert.equal(await publicRanking("30d", deletedCommunity.slug), null);
  });
  await check("caller_candidate_allowlist_is_preserved", async () => {
    assert.deepEqual(await counts({ gte: recent, lte: now }, [a]), expectedCounts(6, 0));
    assert.deepEqual(await counts({ gte: recent, lte: now }, [b, b, ""]), expectedCounts(0, 4));
  });

  const ineligible = [
    await mentor("sem-plano", { entitled: false }),
    await mentor("nao-publicado", { published: false }),
    await mentor("sem-video", { video: false }),
  ];
  for (const id of ineligible) {
    const target = await post(id);
    await action("post", target.id, null, at(15));
  }
  await check("public_profile_and_entitlement_eligibility_are_unchanged", async () => {
    const result = await publicRanking();
    assert.equal(result.count, 2);
    for (const id of [...ineligible, emptyMentor]) assert.equal(item(result, id), undefined);
    assert.deepEqual(metricCounts(result), expectedCounts(6, 4));
  });

  const replyOnMentorPost = await reply(b, aPost.id);
  await action("reply", replyOnMentorPost.id, a, at(16));
  await check("reply_click_belongs_to_reply_author_not_parent_author", async () => {
    assert.deepEqual(await countsAt(16), expectedCounts(0, 1));
    assert.deepEqual(metricCounts(await publicRanking()), expectedCounts(6, 5));
  });
  await action("post", aPost.id, null, new Date(now.getTime() + day));
  await check("future_event_is_not_in_public_or_admin_period", async () => {
    assert.deepEqual(metricCounts(await publicRanking("all")), expectedCounts(8, 7));
    const metrics = await adminRepository.buildMentorMetrics(main.id, mentorIds, allFrom, now);
    assert.equal(metrics.get(a).community_whatsapp_clicks, 8);
    assert.equal(metrics.get(b).community_whatsapp_clicks, 7);
  });
  for (const [type, id] of [
    ["post", bReply.id],
    ["reply", aPost.id],
    ["post", "c23-missing-target"],
    [null, aPost.id],
    ["post", null],
    ["POST", aPost.id],
  ])
    await action(type, id, null, at(17));
  await check("invalid_or_missing_target_pairs_have_no_signal", async () => {
    assert.deepEqual(await countsAt(17), new Map());
    assert.deepEqual(metricCounts(await publicRanking()), expectedCounts(6, 5));
  });

  await check("ranking_reads_do_not_mutate_persisted_events_or_content", async () => {
    const snapshot = async () =>
      Promise.all([
        prisma.important_action_event.findMany({ orderBy: { id: "asc" } }),
        prisma.community_post.findMany({ orderBy: { id: "asc" } }),
        prisma.post_reply.findMany({ orderBy: { id: "asc" } }),
        prisma.contact_request.findMany({ orderBy: { id: "asc" } }),
      ]);
    const before = await snapshot();
    await publicRanking();
    await adminRepository.buildMentorMetrics(main.id, mentorIds, allFrom, now);
    await ranking.getCommunityMentorRankingSignals(main.id, mentorIds);
    assert.deepEqual(await snapshot(), before);
  });
  await check("repeated_real_reads_are_stable", async () => {
    const results = await Promise.all([publicRanking(), publicRanking(), publicRanking()]);
    for (const result of results) assert.deepEqual(metricCounts(result), expectedCounts(6, 5));
    assert.deepEqual(results[0].data, results[1].data);
    assert.deepEqual(results[1].data, results[2].data);
  });
  await check("score_breakdown_keeps_existing_weight_and_other_components", async () => {
    const result = await publicRanking();
    for (const [id, count] of [
      [a, 6],
      [b, 5],
    ]) {
      const entry = item(result, id);
      assert.equal(entry.score_breakdown.community_whatsapp_points, count * 6);
      assert.equal(entry.score, count * 6);
      for (const [key, points] of Object.entries(entry.score_breakdown)) {
        if (key !== "community_whatsapp_points") assert.equal(points, 0);
      }
    }
  });
  await check("shared_aggregation_and_both_repositories_match_same_window", async () => {
    const result = await publicRanking();
    const { start_at: from, end_at: to } = result.period;
    const metrics = await adminRepository.buildMentorMetrics(main.id, mentorIds, from, to);
    const shared = await counts({ gte: from, lte: to });
    assert.deepEqual(shared, expectedCounts(6, 5));
    for (const id of [a, b]) {
      assert.equal(metrics.get(id).community_whatsapp_clicks, shared.get(id));
      assert.equal(item(result, id).metrics.community_whatsapp_clicks, shared.get(id));
      assert.equal(adminCommunityMentorScore(metrics.get(id)), item(result, id).score);
    }
  });

  const tiedCommunity = await createCommunity("audit-c23-tied");
  const tiedPostA = await post(a, tiedCommunity.id);
  const tiedPostB = await post(b, tiedCommunity.id);
  await action("community_post", tiedPostA.id, null, at(18));
  for (const actor of [patient.id, a, emptyMentor]) {
    await prisma.post_vote.create({
      data: { post_id: tiedPostB.id, user_id: actor, value: 1, createdAt: at(18) },
    });
  }
  await check("existing_whatsapp_tiebreak_precedes_upvotes", async () => {
    const result = await publicRanking("all", tiedCommunity.slug);
    const signals = await ranking.getCommunityMentorRankingSignals(tiedCommunity.id, mentorIds);
    const metrics = await adminRepository.buildMentorMetrics(
      tiedCommunity.id,
      mentorIds,
      allFrom,
      now,
    );
    assert.equal(item(result, a).score, 8);
    assert.equal(item(result, b).score, 8);
    assert.equal(result.data[0].professional.id, a);
    assert.equal(signals.get(a).score, signals.get(b).score);
    assert.equal(signals.get(a).position, 1);
    assert.equal(adminCommunityMentorScore(metrics.get(a)), 8);
    assert.equal(adminCommunityMentorScore(metrics.get(b)), 8);
  });

  step = "summary";
  console.log("PROBE_SUMMARY", JSON.stringify({ passed, failed, total: passed + failed }));
  assert.equal(failed, 0);
  assert.equal(passed, 31);
  console.log("COMMUNITY_MENTOR_WHATSAPP_POSTGRES_OK");
})()
  .catch((error) => {
    console.error("INTEGRATION_FAILED", JSON.stringify(failureDetails(error)));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
