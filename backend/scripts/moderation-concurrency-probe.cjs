// Manual only through moderation-concurrency-integration.mjs; no HTTP or provider calls.
const assert = require("node:assert/strict");
const { setTimeout: pause } = require("node:timers/promises");
assert.equal(process.env.NODE_ENV, "test");
assert.match(new URL(process.env.DATABASE_URL).hostname, /^lectum-moderation178-db-[a-f0-9]{20}$/);
const { prisma } = require("/app/dist/external/prisma/client.js");
const { Client } = require("/app/node_modules/pg");
const moderationRoot = "/app/dist/modules/api/admin/private/moderation/";
const communityRoot = "/app/dist/modules/api/admin/private/communities/manage/";
const { AdminModerationRepository } = require(
  `${moderationRoot}repositories/AdminModerationRepository.js`,
);
const { AdminCommunityManageRepository } = require(
  `${communityRoot}repositories/AdminCommunityManageRepository.js`,
);
const reports = require(`${moderationRoot}use-cases/services/reports.js`);
const { activitySafeSnapshot, safeJsonObject } = require(
  `${moderationRoot}repositories/support/moderation-query.js`,
);
const content = require(`${communityRoot}use-cases/services/content.js`);
const analytics = require(`${communityRoot}use-cases/services/content-analytics.js`);
const groups = require(`${communityRoot}use-cases/services/report-groups.js`);
const repository = new AdminModerationRepository();
const communities = new AdminCommunityManageRepository();
const legacy = require("/app/package.json").version === "0.1.354";
let passed = 0;
let stage = "initialization";
const failures = [];
const check = async (name, operation) => {
  try {
    stage = name;
    await operation();
    passed++;
    console.log("CHECK_OK", name);
  } catch (error) {
    if (!(error instanceof assert.AssertionError)) throw error;
    failures.push(name);
    console.log("CHECK_FAIL", name);
  }
};

// Hold one real row lock until both application transactions reach their writes.
// This changes scheduling only: repositories, Prisma client and SQL remain real/unmodified.
const concurrentWhileLocked = async (table, id, operations) => {
  assert.ok(["community_posts", "post_reports", "content_moderation_events"].includes(table));
  const blocker = new Client({ connectionString: process.env.DATABASE_URL });
  await blocker.connect();
  let running;
  let barrierError;
  try {
    await blocker.query("BEGIN");
    await blocker.query(`SELECT id FROM "${table}" WHERE id = $1 FOR UPDATE`, [id]);
    running = Promise.allSettled(operations.map((operation) => operation()));
    let waiting = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      // PostgreSQL caches activity statistics inside a transaction; refresh observation only.
      await blocker.query("SELECT pg_stat_clear_snapshot()");
      const result = await blocker.query(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND wait_event_type = 'Lock' AND query LIKE $1",
        [`%${table}%`],
      );
      if (result.rows[0].n >= operations.length) {
        waiting = true;
        break;
      }
      await pause(20);
    }
    if (!waiting) throw new Error("LOCAL_LOCK_BARRIER_TIMEOUT");
  } catch (error) {
    barrierError = error;
  } finally {
    await blocker.query("ROLLBACK");
    await blocker.end();
  }
  const settled = running ? await running : [];
  if (barrierError) throw barrierError;
  for (const result of settled) if (result.status === "rejected") throw result.reason;
  return settled.map((result) => result.value);
};

(async () => {
  assert.equal(await prisma.user.count(), 0);
  assert.equal(await prisma.community.count({ where: { slug: { startsWith: "moderation-" } } }), 0);
  const admin = await prisma.admin.create({
    data: { name: "Auditoria local", email: "moderation@example.invalid" },
  });
  const otherAdmin = await prisma.admin.create({
    data: { name: "Segundo admin local", email: "moderation2@example.invalid" },
  });
  const author = await prisma.user.create({
    data: { name: "Autor local", email: "author@example.invalid", role: "paciente" },
  });
  let sequence = 0;
  const setup = async (count = 3) => {
    const community = await prisma.community.create({
      data: { name: "Comunidade local", slug: `moderation-${sequence++}` },
    });
    const post = await prisma.community_post.create({
      data: {
        author_id: author.id,
        community_id: community.id,
        title: "Post local",
        content: "Conteúdo somente local",
        replies_count: count,
      },
    });
    const replies = [];
    for (let i = 0; i < count; i++)
      replies.push(
        await prisma.post_reply.create({
          data: { post_id: post.id, author_id: author.id, content: `Resposta local ${i}` },
        }),
      );
    return { community, post, replies };
  };
  const reportFor = async (item, reply = null, status = "pendente") => {
    const reporter = await prisma.user.create({
      data: {
        name: "Denunciante local",
        email: `reporter-${sequence++}@example.invalid`,
        role: "paciente",
      },
    });
    const record = await prisma.post_report.create({
      data: {
        post_id: item.post.id,
        reply_id: reply?.id,
        target_type: reply ? "reply" : "post",
        target_id: reply?.id ?? item.post.id,
        reporter_id: reporter.id,
        reason: "outro",
        status,
      },
    });
    return repository.findPostReport(record.id);
  };
  const readPost = (item) =>
    prisma.community_post.findUniqueOrThrow({ where: { id: item.post.id } });
  const readReport = (report) => repository.findPostReport(report.id);
  const reportLogs = (report) =>
    prisma.admin_activity_log.findMany({
      where: { target_id: report.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  const eventFor = (item) =>
    prisma.content_moderation_event.create({
      data: {
        author_id: author.id,
        community_id: item.community.id,
        target_type: "post",
        target_id: item.post.id,
        decision: "review",
        categories: [],
        severity: "low",
        reason_code: "local_audit",
        content_excerpt: "Somente local",
      },
    });

  // The input adapters below will use each version's own repository contract.
  // No application source/module/provider/Prisma method is replaced in this probe.

  const auditFor = (report, resolution, measure, adminId = admin.id) =>
    reports.createReportAudit({
      action:
        resolution === "dismissed"
          ? "moderation_report_dismissed"
          : measure === "remove_content"
            ? "moderation_report_content_removed"
            : "moderation_report_upheld",
      adminId,
      changedFields: ["Status da denuncia"],
      reason: "Auditoria local",
      report,
      safeAfter: {
        "Status da denuncia": resolution === "dismissed" ? "Improcedente" : "Procedente",
        ...reports.safeReportTargetSummary(report),
      },
    });
  const resolve = (
    report,
    resolution = "upheld",
    measure = "remove_content",
    adminId = admin.id,
  ) => {
    const prepareAudit = (current) =>
      reports.postReportStatusGroup(current.status) === "pending"
        ? auditFor(current, resolution, measure, adminId)
        : null;
    const input = legacy
      ? { report, audit: prepareAudit(report) }
      : { reportId: report.id, prepareAudit };
    return resolution === "dismissed"
      ? repository.resolveReportDismissed(input)
      : repository.resolveReportUpheld({ ...input, measure });
  };
  const buildEventAudit = (before, after) => ({
    safeBefore: safeJsonObject(activitySafeSnapshot(before)),
    safeAfter: safeJsonObject(activitySafeSnapshot(after)),
  });
  const reviewEvent = (id, adminId) =>
    repository.markReviewing(id, legacy ? adminId : { adminId, buildAudit: buildEventAudit });
  const resolveEvent = (id, input) =>
    repository.resolveEvent(id, legacy ? input : { ...input, buildAudit: buildEventAudit });
  await check("disjoint_stale_reports_preserve_cumulative_counter", async () => {
    const item = await setup();
    const first = await reportFor(item, item.replies[0]);
    const second = await reportFor(item, item.replies[1]);
    await resolve(first);
    await resolve(second);
    assert.equal((await readPost(item)).replies_count, 1);
    assert.equal(
      await prisma.post_reply.count({ where: { post_id: item.post.id, deleted: false } }),
      1,
    );
  });
  await check("concurrent_disjoint_removals_retry_with_current_counter", async () => {
    const item = await setup();
    const first = await reportFor(item, item.replies[0]);
    const second = await reportFor(item, item.replies[1]);
    const results = await concurrentWhileLocked("community_posts", item.post.id, [
      () => resolve(first),
      () => resolve(second),
    ]);
    assert.ok(results.every(Boolean));
    assert.equal((await readPost(item)).replies_count, 1);
    assert.equal((await reportLogs(first)).length, 1);
    assert.equal((await reportLogs(second)).length, 1);
  });
  await check("overlapping_reply_tree_never_decrements_twice", async () => {
    const item = await setup();
    await prisma.post_reply.update({
      where: { id: item.replies[1].id },
      data: { parent_reply_id: item.replies[0].id },
    });
    const first = await reportFor(item, item.replies[0]);
    const child = await reportFor(item, item.replies[1]);
    await resolve(first);
    const result = await resolve(child);
    assert.equal((await readPost(item)).replies_count, 1);
    assert.equal(result.contentRemoved, false);
    assert.equal(result.contentAlreadyUnavailable, true);
  });
  await check("concurrent_incompatible_decisions_have_one_winner", async () => {
    const item = await setup();
    const report = await reportFor(item);
    const results = await concurrentWhileLocked("post_reports", report.id, [
      () => resolve(report, "dismissed"),
      () => resolve(report, "upheld", "none"),
    ]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal((await reportLogs(report)).length, 1);
    assert.equal((await readPost(item)).deleted, false);
  });
  await check("uphold_without_measure_changes_only_selected_report", async () => {
    const item = await setup();
    const first = await reportFor(item);
    const second = await reportFor(item);
    await resolve(first, "upheld", "none");
    assert.equal((await readReport(second)).status, "pendente");
    assert.equal((await readPost(item)).deleted, false);
    assert.equal((await readPost(item)).replies_count, 3);
  });
  await check("repeated_post_removal_preserves_counter_time_and_log", async () => {
    const item = await setup();
    const report = await reportFor(item);
    await resolve(report);
    const saved = await readPost(item);
    const result = await resolve(report);
    assert.equal(result, null);
    const current = await readPost(item);
    assert.equal(current.replies_count, 0);
    assert.equal(current.deletedAt.getTime(), saved.deletedAt.getTime());
    assert.equal((await reportLogs(report)).length, 1);
  });
  await check("same_target_reports_already_resolved_are_not_reapplied", async () => {
    const item = await setup();
    const first = await reportFor(item);
    const second = await reportFor(item);
    const result = await resolve(first);
    assert.equal(result.affectedReportsCount, 2);
    assert.equal(await resolve(second), null);
    assert.equal((await reportLogs(second)).length, 0);
    assert.equal((await readPost(item)).replies_count, 0);
  });
  await check("failed_audit_rolls_back_report_counter_and_content", async () => {
    const item = await setup();
    const report = await reportFor(item);
    await assert.rejects(
      () => resolve(report, "upheld", "remove_content", "missing-local-admin"),
      (error) => error.code === "P2003",
    );
    assert.equal((await readPost(item)).deleted, false);
    assert.equal((await readPost(item)).replies_count, 3);
    assert.equal((await readReport(report)).status, "pendente");
    assert.equal(
      await prisma.post_reply.count({ where: { post_id: item.post.id, deleted: false } }),
      3,
    );
    assert.equal((await reportLogs(report)).length, 0);
  });
  await check("resolved_aliases_reject_while_legacy_pending_semantics_remain", async () => {
    for (const status of [
      "resolvida",
      "resolved",
      "procedente",
      "upheld",
      "rejeitada",
      "rejected",
      "improcedente",
      "dismissed",
      " ReSolVIda ",
    ]) {
      const item = await setup(0);
      const report = await reportFor(item);
      await prisma.post_report.update({ where: { id: report.id }, data: { status } });
      assert.equal(await resolve(report, "dismissed"), null);
      assert.equal((await reportLogs(report)).length, 0);
    }
    for (const status of [
      "pendente",
      "pending",
      "em_analise",
      "em analise",
      "in_review",
      "in review",
      "legacy_unknown",
    ]) {
      const item = await setup(0);
      const report = await reportFor(item, null, status);
      assert.ok(await resolve(report, "dismissed"));
    }
  });
  await check("current_content_is_used_to_prepare_audit", async () => {
    const item = await setup(0);
    const report = await reportFor(item);
    await prisma.community_post.update({
      where: { id: item.post.id },
      data: { title: "Título atual local" },
    });
    await resolve(report, "dismissed");
    const [log] = await reportLogs(report);
    assert.equal(log.safe_before.Conteudo, "Título atual local");
  });
  await check("counter_floor_zero_preserved_without_historical_repair", async () => {
    const item = await setup();
    await prisma.community_post.update({ where: { id: item.post.id }, data: { replies_count: 0 } });
    const report = await reportFor(item, item.replies[0]);
    await resolve(report);
    assert.equal((await readPost(item)).replies_count, 0);
    assert.equal(
      await prisma.post_reply.count({ where: { post_id: item.post.id, deleted: false } }),
      2,
    );
  });
  await check("concurrent_review_and_resolve_never_regress_resolved", async () => {
    const item = await setup(0);
    const event = await eventFor(item);
    await concurrentWhileLocked("content_moderation_events", event.id, [
      () => reviewEvent(event.id, admin.id),
      () => resolveEvent(event.id, { adminId: otherAdmin.id, note: "Resolvido local" }),
    ]);
    const saved = await repository.findEvent(event.id);
    assert.equal(saved.status, "resolved");
    assert.ok(saved.reviewed_at);
    const logs = await prisma.admin_activity_log.findMany({ where: { target_id: event.id } });
    assert.ok(logs.length === 1 || logs.length === 2);
    if (logs.length === 1) assert.equal(logs[0].action, "content_moderation_resolved");
    assert.equal(logs.filter((log) => log.safe_before.status === "pending").length, 1);
    assert.ok(
      logs.every(
        (log) => !(log.safe_before.status === "resolved" && log.safe_after.status === "reviewing"),
      ),
    );
  });
  await check("first_review_author_and_timestamp_are_preserved", async () => {
    const item = await setup(0);
    const event = await eventFor(item);
    const first = await reviewEvent(event.id, admin.id);
    const second = await reviewEvent(event.id, otherAdmin.id);
    assert.equal(second.reviewed_by_admin_id, admin.id);
    assert.equal(second.reviewed_at.getTime(), first.reviewed_at.getTime());
  });
  await check("resolved_note_remains_deliberately_revisable", async () => {
    const item = await setup(0);
    const event = await eventFor(item);
    await resolveEvent(event.id, { adminId: admin.id, note: "Primeira" });
    const updated = await resolveEvent(event.id, {
      adminId: otherAdmin.id,
      note: "Segunda",
    });
    assert.equal(updated.status, "resolved");
    assert.equal(updated.admin_note, "Segunda");
    assert.equal(updated.reviewed_by_admin_id, admin.id);
  });
  await check("failed_event_audit_is_atomic", async () => {
    const item = await setup(0);
    const event = await eventFor(item);
    await assert.rejects(
      () =>
        resolveEvent(event.id, {
          adminId: "missing-local-admin",
          note: "Não persistir",
        }),
      (error) => error.code === "P2003",
    );
    assert.equal((await repository.findEvent(event.id)).status, "pending");
    assert.equal(await prisma.admin_activity_log.count({ where: { target_id: event.id } }), 0);
  });

  const contentLogs = (item) =>
    prisma.admin_activity_log.findMany({
      where: { target_id: item.community.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  const communityRemoveInput = async (item, reply = null, adminId = admin.id) => {
    const base = { adminId, communityId: item.community.id, reason: "Auditoria local" };
    if (reply) {
      const current = await communities.findReplyContent(item.community.id, reply.id);
      const buildSafeBefore = (record, community) =>
        analytics.contentSafeBefore(content.mapReplyContent(community, record));
      return legacy
        ? { ...base, reply: current, safeBefore: buildSafeBefore(current, item.community) }
        : { ...base, replyId: reply.id, buildSafeBefore };
    }
    const current = await communities.findPostContent(item.community.id, item.post.id);
    const buildSafeBefore = (record, community) =>
      analytics.contentSafeBefore(content.mapPostContent(community, record));
    return legacy
      ? { ...base, post: current, safeBefore: buildSafeBefore(current, item.community) }
      : { ...base, postId: item.post.id, buildSafeBefore };
  };
  await check("community_disjoint_concurrent_reply_removals_preserve_counter", async () => {
    const item = await setup();
    const first = await communityRemoveInput(item, item.replies[0]);
    const second = await communityRemoveInput(item, item.replies[1]);
    const results = await concurrentWhileLocked("community_posts", item.post.id, [
      () => communities.removeReplyContent(first),
      () => communities.removeReplyContent(second),
    ]);
    assert.ok(results.every(Boolean));
    assert.equal((await readPost(item)).replies_count, 1);
    assert.equal((await contentLogs(item)).length, 2);
  });
  await check("community_and_moderation_writers_share_correct_counter", async () => {
    const item = await setup();
    const first = await communityRemoveInput(item, item.replies[0]);
    const report = await reportFor(item, item.replies[1]);
    await concurrentWhileLocked("community_posts", item.post.id, [
      () => communities.removeReplyContent(first),
      () => resolve(report),
    ]);
    assert.equal((await readPost(item)).replies_count, 1);
    assert.equal((await contentLogs(item)).length, 1);
    assert.equal((await reportLogs(report)).length, 1);
  });
  await check("community_repeated_post_removal_does_not_restore_counter", async () => {
    const item = await setup();
    const input = await communityRemoveInput(item);
    await communities.removePostContent(input);
    const saved = await readPost(item);
    assert.equal(await communities.removePostContent(input), null);
    assert.equal((await readPost(item)).replies_count, 0);
    assert.equal((await readPost(item)).deletedAt.getTime(), saved.deletedAt.getTime());
    assert.equal((await contentLogs(item)).length, 1);
  });
  await check("community_audit_reads_current_content_inside_transaction", async () => {
    const item = await setup();
    const input = await communityRemoveInput(item);
    await prisma.community_post.update({
      where: { id: item.post.id },
      data: { title: "Título atualizado local", content: "Texto atualizado local" },
    });
    await communities.removePostContent(input);
    const [log] = await contentLogs(item);
    assert.equal(log.safe_before.title, "Título atualizado local");
    assert.equal(log.safe_before.excerpt, "Texto atualizado local");
  });
  await check("community_scope_and_unavailable_targets_fail_without_log", async () => {
    const item = await setup();
    const other = await setup();
    const input = await communityRemoveInput(item);
    await prisma.community_post.update({
      where: { id: item.post.id },
      data: { community_id: other.community.id },
    });
    assert.equal(await communities.removePostContent(input), null);
    assert.equal((await readPost(item)).deleted, false);
    await prisma.community_post.update({
      where: { id: item.post.id },
      data: { community_id: item.community.id, status: "bloqueado" },
    });
    assert.equal(await communities.removePostContent(input), null);
    assert.equal((await readPost(item)).deleted, false);
    assert.equal((await contentLogs(item)).length, 0);
    assert.equal((await contentLogs(other)).length, 0);
  });
  await check("community_audit_failure_rolls_back_complete_removal", async () => {
    const item = await setup();
    const input = await communityRemoveInput(item, null, "missing-local-admin");
    await assert.rejects(
      () => communities.removePostContent(input),
      (error) => error.code === "P2003",
    );
    assert.equal((await readPost(item)).deleted, false);
    assert.equal((await readPost(item)).replies_count, 3);
    assert.equal(
      await prisma.post_reply.count({ where: { post_id: item.post.id, deleted: false } }),
      3,
    );
  });

  const communityResolutionInput = async (item, resolution) => {
    const currentReports = await communities.listReports(item.community.id);
    const makeAudit = (records, community) => {
      const group = groups
        .groupReportsByContent(records.map((report) => analytics.mapReport(community, report)))
        .find((group) => group.content.id === item.post.id && group.content.type === "post");
      return group
        ? {
            previousResolution: group.status_group,
            safeBefore: groups.reportGroupSafeBefore(group),
          }
        : null;
    };
    const current = makeAudit(currentReports, item.community);
    assert.ok(current);
    const input = {
      adminId: admin.id,
      communityId: item.community.id,
      previousResolution: current.previousResolution,
      reason: "Auditoria local",
      resolution,
      review: current.previousResolution !== "pending",
      targetId: item.post.id,
      targetType: "post",
    };
    return legacy
      ? { ...input, safeBefore: current.safeBefore }
      : { ...input, prepareAudit: makeAudit };
  };
  await check("community_opposing_pending_decisions_have_one_winner", async () => {
    const item = await setup(0);
    const report = await reportFor(item);
    const first = await communityResolutionInput(item, "upheld");
    const second = await communityResolutionInput(item, "dismissed");
    const results = await concurrentWhileLocked("post_reports", report.id, [
      () => communities.resolveReportsForTarget(first),
      () => communities.resolveReportsForTarget(second),
    ]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal((await contentLogs(item)).length, 1);
  });
  await check("community_deliberate_revision_and_reopen_remain_available", async () => {
    const item = await setup(0);
    const report = await reportFor(item);
    assert.ok(
      await communities.resolveReportsForTarget(await communityResolutionInput(item, "upheld")),
    );
    const revision = await communityResolutionInput(item, "dismissed");
    await prisma.community_post.update({
      where: { id: item.post.id },
      data: { title: "Revisão de título atual" },
    });
    assert.ok(await communities.resolveReportsForTarget(revision));
    const logs = await contentLogs(item);
    assert.equal(logs.length, 2);
    const log = logs.find((entry) => entry.action === "community_report_decision_reviewed");
    assert.equal(log.metadata.previous_resolution, "upheld");
    assert.equal(log.safe_before.status_group, "upheld");
    assert.equal(log.safe_before.title, "Revisão de título atual");
    assert.ok(
      await communities.resolveReportsForTarget(await communityResolutionInput(item, "pending")),
    );
    assert.equal((await readReport(report)).status, "pendente");
  });
  await check("stale_community_revision_does_not_replace_newer_intent", async () => {
    const item = await setup(0);
    const report = await reportFor(item);
    await communities.resolveReportsForTarget(await communityResolutionInput(item, "upheld"));
    const stale = await communityResolutionInput(item, "dismissed");
    await communities.resolveReportsForTarget(await communityResolutionInput(item, "pending"));
    assert.equal(await communities.resolveReportsForTarget(stale), null);
    assert.equal((await readReport(report)).status, "pendente");
    assert.equal((await contentLogs(item)).length, 2);
  });

  await check("legacy_resolved_event_can_fill_missing_first_review", async () => {
    const item = await setup(0);
    const event = await eventFor(item);
    await prisma.content_moderation_event.update({
      where: { id: event.id },
      data: { status: "resolved", reviewed_at: null, reviewed_by_admin_id: null },
    });
    const result = await reviewEvent(event.id, admin.id);
    assert.equal(result.status, "resolved");
    assert.ok(result.reviewed_at);
    assert.equal(result.reviewed_by_admin_id, admin.id);
  });
  await check("repeated_review_is_noop_without_false_started_log", async () => {
    const item = await setup(0);
    const event = await eventFor(item);
    await reviewEvent(event.id, admin.id);
    await reviewEvent(event.id, otherAdmin.id);
    assert.equal(await prisma.admin_activity_log.count({ where: { target_id: event.id } }), 1);
  });

  console.log(
    "PROBE_SUMMARY",
    JSON.stringify({ passed, failed: failures.length, total: passed + failures.length }),
  );
  if (failures.length) process.exitCode = 1;
  else console.log("MODERATION_POSTGRES_OK");
})()
  .catch((error) => {
    const code = /^P\d{4}$/.test(error?.code ?? "") ? error.code : "none";
    const kind = [
      "TypeError",
      "PrismaClientValidationError",
      "PrismaClientKnownRequestError",
      "AssertionError",
    ].includes(error?.name)
      ? error.name
      : "other";
    console.error("INTEGRATION_FAILED", JSON.stringify({ stage, kind, code }));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
