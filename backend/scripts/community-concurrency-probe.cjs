// Somente via community-concurrency-integration.mjs: serviços/repositórios reais e PostgreSQL.
// As barreiras são locks nativos observados em pg_stat_activity, não sleeps ou banco/provider falso.
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { setTimeout: delay } = require("node:timers/promises");
const { Client } = require("/app/node_modules/pg");

assert.equal(process.env.NODE_ENV, "test");
const databaseUrl = new URL(process.env.DATABASE_URL);
assert.match(databaseUrl.hostname, /^lectum-community178-db-[a-f0-9]{20}$/);
assert.equal(databaseUrl.pathname, "/lectum_audit");
assert.equal(databaseUrl.password, "");
const phase = process.argv[2];
const expectedVersion = process.argv[3];
assert.ok(process.argv.length === 4 && ["baseline", "fixed"].includes(phase));
assert.match(expectedVersion, /^\d+\.\d+\.\d+$/);
if (phase === "baseline") assert.equal(expectedVersion, "0.1.324");
assert.equal(require("/app/package.json").version, expectedVersion);
const { prisma } = require("/app/dist/external/prisma/client.js");
const {
  PostRepository,
} = require("/app/dist/modules/api/private/posts/repositories/PostRepository.js");
const { updatePost } = require("/app/dist/modules/api/private/posts/use-cases/services/update.js");
const i18n = require("/app/dist/main/server/i18n.js").default;
const repository = new PostRepository();
const monitor = new Client({ connectionString: process.env.DATABASE_URL });
let step = "setup";
const failed = [];
const expectedBaselineFailures = [
  "sibling_deletes_count",
  "overlapping_deletes_no_double_count",
  "create_after_parent_deleted",
  "create_after_post_deleted",
  "professional_descendant_prevents_stale_delete",
  "delete_post_clears_reply_count",
  "patient_edit_link_body_blocked",
  "patient_edit_link_title_blocked",
  "patient_edit_safety_hold",
  "patient_edit_sensitive_event",
];
const safeAssertionValue = (value) => {
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  return ["ok", "not_found", "invalid_parent", "professional_replies_block"].includes(value)
    ? value
    : "invariant";
};

const check = async (name, fn) => {
  step = name;
  try {
    await fn();
    console.log("CHECK_OK", name);
  } catch (error) {
    // Falhas de barreira/runtime nunca contam como demonstração de vulnerabilidade.
    if (error?.code !== "ERR_ASSERTION") throw error;
    failed.push(name);
    console.log(
      "INVARIANT_FAILED",
      name,
      "actual",
      safeAssertionValue(error.actual),
      "expected",
      safeAssertionValue(error.expected),
    );
  }
};
const waitForBlocked = async (table, minimum) => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const { rows } = await monitor.query(
      `SELECT count(*)::int AS count FROM pg_stat_activity
       WHERE datname = current_database() AND pid <> pg_backend_pid()
       AND wait_event_type = 'Lock' AND query LIKE $1`,
      [`%"${table}"%`],
    );
    if (rows[0].count >= minimum) return;
    await delay(10);
  }
  throw new Error("BarrierNotReached");
};
const withLock = async (query, parameters, run) => {
  const blocker = new Client({ connectionString: process.env.DATABASE_URL });
  await blocker.connect();
  await blocker.query("BEGIN");
  try {
    await blocker.query(query, parameters);
    return await run(async () => blocker.query("COMMIT"));
  } finally {
    await blocker.query("ROLLBACK");
    await blocker.end();
  }
};
const invariant = async (postId) => {
  const [post, active] = await Promise.all([
    prisma.community_post.findUniqueOrThrow({ where: { id: postId } }),
    prisma.post_reply.findMany({ where: { post_id: postId, deleted: false } }),
  ]);
  assert.equal(post.replies_count, active.length);
  if (post.deleted || post.status !== "publicado") assert.equal(active.length, 0);
  const activeIds = new Set(active.map((row) => row.id));
  for (const row of active) {
    if (row.parent_reply_id) assert.ok(activeIds.has(row.parent_reply_id));
  }
};

(async () => {
  await monitor.connect();
  if (!i18n.isInitialized) await new Promise((resolve) => i18n.on("initialized", resolve));
  const suffix = randomBytes(8).toString("hex");
  const patient = await prisma.user.create({
    data: {
      name: "Isolated Patient",
      email: `p-${suffix}@example.test`,
      role: "paciente",
      confirmed: true,
    },
  });
  const professional = await prisma.user.create({
    data: {
      name: "Isolated Professional",
      email: `d-${suffix}@example.test`,
      role: "psicologo",
      confirmed: true,
    },
  });
  const community = await prisma.community.create({
    data: { name: "Isolated Community", slug: `isolated-${suffix}`, members_count: 2 },
  });
  for (const author of [patient, professional]) {
    await prisma.community_member.create({
      data: { community_id: community.id, user_id: author.id },
    });
  }
  const newPost = (author = professional, extra = {}) =>
    prisma.community_post.create({
      data: {
        community_id: community.id,
        author_id: author.id,
        title: "Conversa preservada",
        content: "Buscando apoio para minha rotina.",
        ...extra,
      },
    });
  const addReply = async (post, author = professional, parent) => {
    const result = await repository.createReply({
      auth: author,
      p: { id: post.id },
      b: { content: "Resposta de apoio.", parentReplyId: parent?.id },
    });
    assert.equal(result.kind, "ok");
    return result.data;
  };
  const deleteReply = (post, reply, author = professional) =>
    repository.deleteReply({ auth: author, p: { id: post.id, replyId: reply.id } });
  const deletePost = (post, author = professional) =>
    repository.deletePost({ auth: author, p: { id: post.id } });
  const edit = (post, author, body) =>
    updatePost({
      auth: author,
      p: { id: post.id },
      b: { title: post.title, content: post.content, ...body },
    });
  const concurrentDeletes = async (post, targets) =>
    withLock("LOCK TABLE post_replies IN SHARE MODE", [], async (release) => {
      const pending = Promise.all(targets.map((target) => deleteReply(post, target)));
      // Attach immediately so an unexpected runtime error is handled while the barrier unwinds.
      pending.catch(() => {});
      try {
        await waitForBlocked("post_replies", targets.length);
      } finally {
        await release();
      }
      return pending;
    });

  await check("sibling_deletes_count", async () => {
    const post = await newPost();
    const replies = [];
    for (let i = 0; i < 3; i += 1) replies.push(await addReply(post));
    const results = await concurrentDeletes(post, replies.slice(0, 2));
    assert.ok(results.every((r) => r.kind === "ok"));
    assert.equal(
      results.reduce((sum, r) => sum + r.data.deleted_count, 0),
      2,
    );
    await invariant(post.id);
  });
  await check("concurrent_creates_count", async () => {
    const post = await newPost();
    const results = await withLock("LOCK TABLE post_replies IN SHARE MODE", [], async (release) => {
      const pending = Promise.all([addReply(post), addReply(post)]);
      pending.catch(() => {});
      try {
        await waitForBlocked("post_replies", 2);
      } finally {
        await release();
      }
      return pending;
    });
    assert.equal(new Set(results.map((reply) => reply.id)).size, 2);
    await invariant(post.id);
    assert.equal(
      (await prisma.community_post.findUniqueOrThrow({ where: { id: post.id } })).replies_count,
      2,
    );
  });
  await check("overlapping_deletes_no_double_count", async () => {
    const post = await newPost();
    const root = await addReply(post);
    const child = await addReply(post, professional, root);
    await addReply(post);
    const results = await concurrentDeletes(post, [root, child]);
    assert.ok(results.every((r) => r.kind === "ok" || r.kind === "invalid_target"));
    const deleted = results.filter((r) => r.kind === "ok").flatMap((r) => r.data.reply_ids);
    assert.equal(deleted.length, new Set(deleted).size);
    assert.equal(deleted.length, 2);
    await invariant(post.id);
  });

  // Pausa uma criação real na reativação da própria associação. O alvo pode ser excluído
  // por outra transação sem depender desse lock; ao retomar, o retry deve revalidá-lo.
  const createWhileDeleting = async (deleteWholePost) => {
    const post = await newPost();
    const parent = await addReply(post);
    await prisma.community_member.update({
      where: { community_id_user_id: { community_id: community.id, user_id: patient.id } },
      data: { deleted: true },
    });
    await prisma.community.update({
      where: { id: community.id },
      data: { members_count: { decrement: 1 } },
    });
    try {
      const result = await withLock(
        "SELECT id FROM community_members WHERE community_id=$1 AND user_id=$2 FOR UPDATE",
        [community.id, patient.id],
        async (release) => {
          const pending = repository.createReply({
            auth: patient,
            p: { id: post.id },
            b: { content: "Comentário concorrente.", parentReplyId: parent.id },
          });
          pending.catch(() => {});
          try {
            await waitForBlocked("community_members", 1);
            const removed = deleteWholePost
              ? await deletePost(post)
              : await deleteReply(post, parent);
            assert.equal(removed.kind, "ok");
          } finally {
            await release();
          }
          return pending;
        },
      );
      assert.equal(result.kind, deleteWholePost ? "not_found" : "invalid_parent");
      await invariant(post.id);
      const membership = await prisma.community_member.findUniqueOrThrow({
        where: { community_id_user_id: { community_id: community.id, user_id: patient.id } },
      });
      assert.equal(membership.deleted, true, "A criação recusada não deve reativar associação.");
    } finally {
      await prisma.community_member.update({
        where: { community_id_user_id: { community_id: community.id, user_id: patient.id } },
        data: { deleted: false, deletedAt: null },
      });
      await prisma.community.update({ where: { id: community.id }, data: { members_count: 2 } });
    }
  };
  await check("create_after_parent_deleted", () => createWhileDeleting(false));
  await check("create_after_post_deleted", () => createWhileDeleting(true));
  await check("professional_descendant_prevents_stale_delete", async () => {
    const post = await newPost(patient);
    const root = await addReply(post, patient);
    const result = await withLock(
      "SELECT id FROM post_replies WHERE id=$1 FOR NO KEY UPDATE",
      [root.id],
      async (release) => {
        const pending = deleteReply(post, root, patient);
        pending.catch(() => {});
        try {
          await waitForBlocked("post_replies", 1);
          await addReply(post, professional, root);
        } finally {
          await release();
        }
        return pending;
      },
    );
    assert.equal(result.kind, "professional_replies_block");
    await invariant(post.id);
  });
  await check("delete_post_clears_reply_count", async () => {
    const post = await newPost();
    await addReply(post);
    assert.equal((await deletePost(post)).kind, "ok");
    await invariant(post.id);
  });
  await check("reply_object_authorization", async () => {
    const first = await newPost();
    const second = await newPost();
    const reply = await addReply(first);
    assert.equal((await deleteReply(first, reply, patient)).kind, "forbidden");
    assert.equal((await deleteReply(second, reply)).kind, "invalid_target");
    const result = await repository.createReply({
      auth: patient,
      p: { id: second.id },
      b: { content: "Texto permitido.", parentReplyId: reply.id },
    });
    assert.equal(result.kind, "invalid_parent");
    await invariant(first.id);
    await invariant(second.id);
  });
  await check("patient_post_with_professional_reply_preserved", async () => {
    const post = await newPost(patient);
    await addReply(post, professional);
    assert.equal((await deletePost(post, patient)).kind, "professional_replies_block");
    await invariant(post.id);
  });

  const blockedEdit = async (changes, decision, code) => {
    const post = await newPost(patient);
    const result = await edit(post, patient, changes);
    assert.equal(result.status, 422);
    assert.equal(result.code, code);
    const stored = await prisma.community_post.findUniqueOrThrow({ where: { id: post.id } });
    assert.equal(stored.title, post.title);
    assert.equal(stored.content, post.content);
    assert.equal(stored.status, "publicado");
    assert.equal(stored.edited_at, null);
    assert.equal(stored.anonymous, post.anonymous);
    assert.equal(stored.author_id, post.author_id);
    const event = await prisma.content_moderation_event.findFirst({
      where: {
        author_id: patient.id,
        decision,
        content_snapshot: changes.content || post.content,
        title_snapshot: changes.title || post.title,
      },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(event);
    // Snapshot da tentativa, sem apontar como alvo removível para a versão publicada anterior.
    assert.equal(event.target_type, "submitted_post");
    assert.equal(event.target_id, null);
    assert.equal(event.community_id, community.id);
  };
  await check("patient_edit_link_body_blocked", () =>
    blockedEdit(
      { content: "Visite https://example.test para continuar." },
      "block",
      "content_moderation_blocked",
    ),
  );
  await check("patient_edit_link_title_blocked", () =>
    blockedEdit({ title: "Veja https://example.test" }, "block", "content_moderation_blocked"),
  );
  await check("patient_edit_safety_hold", () =>
    blockedEdit(
      { content: "Vou me machucar agora." },
      "safety_hold",
      "content_moderation_safety_hold",
    ),
  );
  await check("patient_edit_sensitive_event", async () => {
    const post = await newPost(patient);
    const content = "Tenho vício em pornografia e quero parar.";
    assert.equal((await edit(post, patient, { content })).status, 200);
    const stored = await prisma.community_post.findUniqueOrThrow({ where: { id: post.id } });
    assert.equal(stored.content, content);
    assert.equal(stored.status, post.status);
    assert.ok(stored.edited_at);
    const event = await prisma.content_moderation_event.findFirst({
      where: { target_id: post.id, target_type: "community_post", decision: "allow_sensitive" },
    });
    assert.ok(event);
    assert.equal(event.content_snapshot, content);
  });
  await check("ordinary_edit_and_media_clear_compatible", async () => {
    const post = await newPost(patient);
    const before = await prisma.content_moderation_event.count();
    const result = await edit(post, patient, {
      content: "Minha rotina melhorou.",
      mediaUrl: null,
      mediaType: null,
    });
    assert.equal(result.status, 200);
    assert.equal(result.code, "post_updated");
    assert.equal(result.data.content, "Minha rotina melhorou.");
    assert.equal(result.data.anonymous, post.anonymous);
    assert.equal(result.data.status, post.status);
    assert.equal(result.data.media_url, null);
    assert.equal(await prisma.content_moderation_event.count(), before);
  });
  await check("professional_edit_exempt", async () => {
    const post = await newPost(professional);
    const before = await prisma.content_moderation_event.count();
    assert.equal(
      (await edit(post, professional, { content: "Informações em https://example.test." })).status,
      200,
    );
    assert.equal(await prisma.content_moderation_event.count(), before);
  });
  await check("edit_authorization_before_moderation", async () => {
    const post = await newPost(professional);
    const before = await prisma.content_moderation_event.count();
    const content = "Visite https://example.test.";
    assert.equal((await edit(post, patient, { content })).status, 403);
    const blocked = await newPost(patient, { status: "bloqueado" });
    assert.equal((await edit(blocked, patient, { content })).status, 404);
    const removed = await newPost(patient, { deleted: true, status: "removido" });
    assert.equal((await edit(removed, patient, { content })).status, 404);
    await prisma.community.update({ where: { id: community.id }, data: { active: false } });
    assert.equal((await edit(post, professional, { content })).status, 404);
    await prisma.community.update({ where: { id: community.id }, data: { active: true } });
    assert.equal(await prisma.content_moderation_event.count(), before);
  });

  step = "summary";
  if (phase === "baseline") {
    assert.deepEqual([...failed].sort(), expectedBaselineFailures.sort());
    console.log("VULNERABLE_REPRODUCED", failed.length);
  } else {
    assert.deepEqual(failed, []);
    console.log("COMMUNITY_POSTGRES_OK");
  }
})()
  .catch((error) => {
    console.error(
      "COMMUNITY_PROBE_FAILED",
      step,
      /^[A-Z0-9_]+$/.test(error?.code || "") ? error.code : "runtime_or_barrier",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await monitor.end();
    await prisma.$disconnect();
  });
