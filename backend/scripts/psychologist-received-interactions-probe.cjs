// Only the isolated runner may execute this file. No HTTP, query mocks or providers.
const assert = require("node:assert/strict");

const assertIsolatedEnvironment = () => {
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
  assert.match(databaseUrl.hostname, /^lectum-received-interactions178-db-[a-f0-9]{20}$/u);
  assert.equal(databaseUrl.pathname, "/lectum_audit");
  assert.equal(databaseUrl.username, "lectum_audit");
  assert.equal(databaseUrl.port, "5432");
  assert.equal(databaseUrl.search, "");
  assert.equal(databaseUrl.hash, "");
  assert.ok(/^[a-f0-9]{48}$/.test(databaseUrl.password));
};

let prisma;
let step = "isolated-environment";
let passed = 0;
let failed = 0;
const safeErrorName = (error) =>
  error instanceof assert.AssertionError
    ? "AssertionError"
    : error instanceof TypeError
      ? "TypeError"
      : [
            "PrismaClientValidationError",
            "PrismaClientKnownRequestError",
            "PrismaClientUnknownRequestError",
            "PrismaClientInitializationError",
            "PrismaClientRustPanicError",
          ].includes(error?.name)
        ? error.name
        : "other";
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
const sortedIds = (items) => items.map((item) => item.id).sort();

(async () => {
  assertIsolatedEnvironment();
  step = "import-application-modules";
  ({ prisma } = require("/app/dist/external/prisma/client.js"));
  const {
    AdminPsychologistEngagementRepository,
  } = require("/app/dist/modules/api/admin/private/psychologists/engagement/repositories/AdminPsychologistEngagementRepository.js");
  const base = "/app/dist/modules/api/admin/private/psychologists/engagement/use-cases/services/";
  const { loadAdminPsychologistStatisticsData } = require(`${base}statistics-data.js`);
  const {
    buildContentFormatDistribution,
    classifyPostContentFormat,
    classifyReplyContentFormat,
    resolvePeriod,
  } = require(`${base}business-content.js`);
  const { buildSeries } = require(`${base}visibility-series.js`);
  step = "setup";
  const period = resolvePeriod({ period: "custom", from: "2026-05-10", to: "2026-05-12" });
  assert.equal(period.success, true);
  const day = 86_400_000;
  const old = new Date("2020-01-01T12:00:00Z");
  const currentMiddle = new Date(period.current.start.getTime() + day + day / 2);
  const previousMiddle = new Date(period.previous.start.getTime() + day + day / 2);
  let sequence = 0;
  const actor = (role = "paciente", extra = {}) =>
    prisma.user.create({
      data: {
        name: "Ator descartável C8",
        email: `c8-${sequence++}@example.invalid`,
        role,
        active: true,
        createdAt: old,
        ...extra,
      },
    });
  const psychologist = await actor("psicologo", { psychologist_profile: { create: {} } });
  const patient = await actor();
  const community = (slug, extra = {}) =>
    prisma.community.create({ data: { name: "Comunidade descartável C8", slug, ...extra } });
  const main = await community("c8-main");
  const other = await community("c8-other");
  const deletedCommunity = await community("c8-deleted", { deleted: true });
  const createPost = (authorId, communityId, createdAt, extra = {}) =>
    prisma.community_post.create({
      data: {
        author_id: authorId,
        community_id: communityId,
        title: "Conteúdo descartável C8",
        content: "Regressão de interações no banco efêmero.",
        status: "publicado",
        createdAt,
        ...extra,
      },
    });
  const createReply = (authorId, postId, createdAt, extra = {}) =>
    prisma.post_reply.create({
      data: {
        author_id: authorId,
        post_id: postId,
        content: "Resposta descartável C8.",
        createdAt,
        ...extra,
      },
    });
  const pair = async (communityId, createdAt, options = {}) => {
    const authorId = options.authorId ?? psychologist.id;
    const post = await createPost(authorId, communityId, createdAt, options.post);
    const parent = await createPost(patient.id, communityId, old, options.parent);
    const reply = await createReply(authorId, parent.id, createdAt, options.reply);
    return { post, reply };
  };
  const oldMain = await pair(main.id, old);
  const oldOther = await pair(other.id, old);
  const recent = await pair(main.id, new Date(period.current.start.getTime() + 1000));
  const previous = await pair(main.id, new Date(period.previous.start.getTime() + 1000));
  const ineligible = [
    await pair(main.id, old, { post: { deleted: true }, reply: { deleted: true } }),
    await pair(main.id, old, { post: { deleted: true }, parent: { deleted: true } }),
    await pair(main.id, old, { post: { status: "rascunho" }, parent: { status: "rascunho" } }),
    await pair(deletedCommunity.id, old),
    await pair(main.id, old, { authorId: patient.id }),
  ];

  const batch = async (content, createdAt, { deleted = false, value = 1 } = {}) => {
    const user = await actor();
    const common = { user_id: user.id, createdAt, deleted };
    await Promise.all([
      prisma.post_save.create({ data: { ...common, post_id: content.post.id } }),
      prisma.post_reply_save.create({ data: { ...common, reply_id: content.reply.id } }),
      createReply(user.id, content.post.id, createdAt, { deleted }),
      prisma.post_vote.create({ data: { ...common, post_id: content.post.id, value } }),
      prisma.post_vote.create({ data: { ...common, reply_id: content.reply.id, value } }),
      prisma.post_share.create({ data: { ...common, post_id: content.post.id } }),
      prisma.post_share.create({
        data: {
          ...common,
          post_id: content.reply.post_id,
          reply_id: content.reply.id,
          target_type: "reply",
        },
      }),
    ]);
    return { post_id: content.post.id, reply_id: content.reply.id, createdAt, value };
  };
  const currentExpected = [
    await batch(oldMain, period.current.start),
    await batch(oldMain, period.current.end, { value: -1 }),
    await batch(recent, currentMiddle),
  ];
  const previousExpected = [
    await batch(oldMain, period.previous.start),
    await batch(oldMain, period.previous.end, { value: -1 }),
    await batch(previous, previousMiddle),
  ];
  const otherCurrent = await batch(oldOther, currentMiddle);
  await batch(oldOther, previousMiddle);
  await batch(oldMain, new Date(period.previous.start.getTime() - 1));
  await batch(oldMain, new Date(period.current.end.getTime() + 1));
  await batch(oldMain, currentMiddle, { deleted: true });
  for (const content of ineligible) await batch(content, currentMiddle);
  const ownComment = await createReply(psychologist.id, oldMain.post.id, currentMiddle);

  // These are persisted analytics rows, not contact requests or outbound actions.
  for (const content of [oldMain, recent]) {
    for (const [targetType, targetId] of [
      ["post", content.post.id],
      ["reply", content.reply.id],
    ]) {
      await prisma.important_action_event.create({
        data: {
          action_type: "whatsapp_click",
          target_type: targetType,
          target_id: targetId,
          visitor_id: "c8-isolated-visitor",
          session_id: `c8-isolated-session-${sequence++}`,
          occurred_at: currentMiddle,
        },
      });
    }
  }

  step = "load-real-statistics-data";
  const repository = new AdminPsychologistEngagementRepository();
  const profile = await repository.findPsychologist(psychologist.id);
  assert.ok(profile);
  const load = (communityFilter) =>
    loadAdminPsychologistStatisticsData({
      period,
      profile,
      query: { community: communityFilter },
      repository,
    });
  const byId = await load(main.id);
  const all = await load("all");
  const bySlug = await load(main.slug);
  const unknown = await load("c8-unknown");
  const queries = [
    ["postSaves", "previousPostSaves", "post_id", false],
    ["replySaves", "previousReplySaves", "reply_id", false],
    ["commentsReceived", "previousCommentsReceived", "post_id", false],
    ["postVotes", "previousPostVotes", "post_id", true],
    ["replyVotes", "previousReplyVotes", "reply_id", true],
    ["postShares", "previousPostShares", "post_id", false],
    ["replyShares", "previousReplyShares", "reply_id", false],
  ];
  const edges = (rows, target, vote) =>
    rows
      .map((row) => `${row[target]}|${row.createdAt.toISOString()}${vote ? `|${row.value}` : ""}`)
      .sort();

  for (const [currentKey, previousKey, target, vote] of queries) {
    await check(`${currentKey}-current-historical-inclusive`, () => {
      assert.deepEqual(edges(byId[currentKey], target, vote), edges(currentExpected, target, vote));
    });
    await check(`${previousKey}-previous-historical-inclusive`, () => {
      assert.deepEqual(
        edges(byId[previousKey], target, vote),
        edges(previousExpected, target, vote),
      );
    });
    await check(`${currentKey}-all-communities`, () => {
      assert.deepEqual(
        edges(all[currentKey], target, vote),
        edges([...currentExpected, otherCurrent], target, vote),
      );
    });
  }
  await check("slug-and-canonical-id-same-received-events", () => {
    for (const [currentKey, previousKey, target, vote] of queries) {
      for (const key of [currentKey, previousKey]) {
        assert.deepEqual(edges(bySlug[key], target, vote), edges(byId[key], target, vote));
      }
    }
  });
  await check("unknown-community-does-not-expand-received-events", () => {
    for (const [currentKey, previousKey] of queries) {
      assert.deepEqual(unknown[currentKey], []);
      assert.deepEqual(unknown[previousKey], []);
    }
  });
  await check("historical-content-keeps-authorship-and-soft-delete-publication-guards", () => {
    const eligible = [oldMain, oldOther, recent, previous];
    assert.deepEqual(sortedIds(byId.allPosts), eligible.map((item) => item.post.id).sort());
    assert.deepEqual(
      sortedIds(byId.allReplies),
      [...eligible.map((item) => item.reply.id), ownComment.id].sort(),
    );
  });
  await check("produced-content-current-and-previous-remain-unchanged", () => {
    assert.deepEqual(sortedIds(byId.communityPosts), [recent.post.id]);
    assert.deepEqual(sortedIds(byId.communityReplies), [recent.reply.id, ownComment.id].sort());
    assert.deepEqual(sortedIds(byId.previousCommunityPosts), [previous.post.id]);
    assert.deepEqual(sortedIds(byId.previousCommunityReplies), [previous.reply.id]);
  });
  await check("content-grid-whatsapp-keeps-only-current-produced-targets", () => {
    assert.deepEqual(byId.contentPostWhatsappClicks, [
      { target_id: recent.post.id, _count: { _all: 1 } },
    ]);
    assert.deepEqual(byId.contentReplyWhatsappClicks, [
      { target_id: recent.reply.id, _count: { _all: 1 } },
    ]);
  });
  const series = buildSeries({
    ...byId,
    labels: period.labels,
    posts: byId.communityPosts,
    replies: byId.communityReplies,
  });
  await check("real-series-keeps-received-counts-and-positive-negative-votes", () => {
    const sum = (key) => series.reduce((total, point) => total + point[key], 0);
    assert.equal(sum("comments_received"), 3);
    assert.equal(sum("saves"), 6);
    assert.equal(sum("shares"), 6);
    assert.equal(sum("upvotes"), 4);
    assert.equal(sum("downvotes"), 2);
    assert.equal(sum("posts"), 1);
    assert.equal(sum("replies"), 2);
  });
  await check("real-series-uses-received-event-dates-not-content-dates", () => {
    assert.deepEqual(
      series.map((point) => point.comments_received),
      [1, 1, 1],
    );
    assert.deepEqual(
      series.map((point) => point.posts),
      [1, 0, 0],
    );
  });
  await check("real-content-format-builder-keeps-current-cohort-and-clicks", () => {
    const counts = (rows) => new Map(rows.map((row) => [row.target_id, row._count._all]));
    const posts = buildContentFormatDistribution(
      byId.communityPosts,
      classifyPostContentFormat,
      counts(byId.contentPostWhatsappClicks),
    );
    const replies = buildContentFormatDistribution(
      byId.communityReplies,
      classifyReplyContentFormat,
      counts(byId.contentReplyWhatsappClicks),
    );
    assert.equal(posts.total, 1);
    assert.equal(replies.total, 2);
    assert.equal(posts.total_whatsapp_clicks, 1);
    assert.equal(replies.total_whatsapp_clicks, 1);
  });
  await check("negative-period-and-deleted-event-fixtures-really-exist", async () => {
    assert.equal(
      await prisma.post_save.count({ where: { post_id: oldMain.post.id, deleted: true } }),
      1,
    );
    assert.equal(
      await prisma.post_save.count({
        where: {
          post_id: oldMain.post.id,
          OR: [
            { createdAt: { lt: period.previous.start } },
            { createdAt: { gt: period.current.end } },
          ],
        },
      }),
      2,
    );
  });

  console.log("PROBE_SUMMARY", JSON.stringify({ passed, failed, total: passed + failed }));
  if (failed === 0) console.log("PSYCHOLOGIST_RECEIVED_INTERACTIONS_POSTGRES_OK");
  else process.exitCode = 1;
})()
  .catch((error) => {
    console.error(
      "INTEGRATION_FAILED",
      JSON.stringify({
        step,
        kind: safeErrorName(error),
        reason: step === "isolated-environment" ? "environment_guard" : "runtime_or_infrastructure",
        assertions_passed: passed,
        assertions_failed: failed,
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (prisma) await prisma.$disconnect();
    } catch (error) {
      console.error("INTEGRATION_FAILED", "disconnect", safeErrorName(error));
      process.exitCode = 1;
    }
  });
