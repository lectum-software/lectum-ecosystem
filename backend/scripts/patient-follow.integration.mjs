import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";

// Dedicated, empty local PostgreSQL only. Never reuse a development/published database.
assert.equal(process.argv.length, 3, "Informe somente --port=PORTA_LOCAL_DESCARTAVEL");
const port = Number(process.argv[2].match(/^--port=(\d+)$/)?.[1]);
assert.ok(Number.isInteger(port) && port > 0 && port <= 65535, "Porta local inválida");
process.env.DATABASE_URL = `postgresql://postgres@127.0.0.1:${port}/lectum_follow_audit`;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET_KEY = randomBytes(32).toString("hex");

const { prisma } = await import("../src/infra/database/prisma/index.ts");
const { action, index } = await import(
  "../src/modules/api/private/patient/follows/use-cases/services.ts"
);
const { default: i18next } = await import("../src/main/server/i18n.ts");
if (!i18next.isInitialized) await new Promise((resolve) => i18next.once("initialized", resolve));
await test("seguimentos em PostgreSQL descartável", async (t) => {
  const created = [];
  t.after(async () => {
    try {
      await prisma.user.deleteMany({ where: { id: { in: created } } });
      assert.equal(await prisma.user.count(), 0, "Os registros locais devem ser removidos");
    } finally {
      await prisma.$disconnect();
    }
  });
  assert.equal(await prisma.user.count(), 0, "Use um banco descartável vazio");

  const createUser = async (role) => {
    const user = await prisma.user.create({
      data: {
        name: "Auditoria local de seguimento",
        role,
        email: `${randomUUID()}@example.invalid`,
      },
    });
    created.push(user.id);
    return user;
  };
  const setup = async () => {
    const patient = await createUser("paciente");
    const other = await createUser("paciente");
    const professional = await createUser("psicologo");
    await prisma.psychologist_profile.create({
      data: {
        user_id: professional.id,
        published: true,
        // An inert fixture value for the publication predicate; no media request is made.
        video_url: "https://example.invalid/local-fixture.mp4",
      },
    });
    return { patient, other, professional };
  };
  const perform = (actor, professionalId, operation) =>
    action({ auth: actor, p: { id: professionalId } }, operation);
  const relation = (actor, professional) =>
    prisma.psychologist_follow.findUnique({
      where: { user_id_psychologist_id: { user_id: actor.id, psychologist_id: professional.id } },
    });

  await t.test("seguir profissional publicado continua idempotente", async () => {
    const { patient, professional } = await setup();
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await perform(patient, professional.id, "follow");
      assert.equal(response.status, 200);
      assert.equal(response.data.followed, true);
    }
    assert.equal(await prisma.psychologist_follow.count({ where: { user_id: patient.id } }), 1);
  });

  for (const [label, userPatch, profilePatch] of [
    ["despublicado", {}, { published: false }],
    ["conta inativa", { active: false }, {}],
    ["conta removida logicamente", { deleted: true }, {}],
    ["perfil removido logicamente", {}, { deleted: true }],
    ["sem vídeo", {}, { video_url: null }],
    ["vídeo vazio legado", {}, { video_url: "" }],
  ]) {
    await t.test(`remover próprio seguimento: ${label}`, async () => {
      const { patient, other, professional } = await setup();
      assert.equal((await perform(patient, professional.id, "follow")).status, 200);
      assert.equal((await perform(other, professional.id, "follow")).status, 200);
      if (Object.keys(userPatch).length) {
        await prisma.user.update({ where: { id: professional.id }, data: userPatch });
      }
      if (Object.keys(profilePatch).length) {
        await prisma.psychologist_profile.update({
          where: { user_id: professional.id },
          data: profilePatch,
        });
      }
      const response = await perform(patient, professional.id, "unfollow");
      assert.equal(response.status, 200);
      assert.equal(response.code, "unfollow_success");
      assert.equal(response.data.followed, false);
      const removed = await relation(patient, professional);
      assert.equal(removed.deleted, true);
      assert.ok(removed.deletedAt);
      assert.equal((await relation(other, professional)).deleted, false);
      assert.equal((await perform(patient, professional.id, "follow")).status, 404);
      assert.equal((await index({ auth: patient, q: {} })).data.count, 0);
      const repeats = await Promise.all(
        Array.from({ length: 4 }, () => perform(patient, professional.id, "unfollow")),
      );
      assert.ok(repeats.every((result) => result.status === 200 && !result.data.followed));
      assert.equal(
        (await relation(patient, professional)).deletedAt.getTime(),
        removed.deletedAt.getTime(),
      );
    });
  }

  await t.test("remover sem relação não cria vínculo nem revela existência", async () => {
    const patient = await createUser("paciente");
    const response = await perform(patient, randomUUID(), "unfollow");
    assert.equal(response.status, 200);
    assert.equal(response.data.followed, false);
    assert.equal(await prisma.psychologist_follow.count({ where: { user_id: patient.id } }), 0);
  });

  await t.test("papel não autorizado continua bloqueado nos dois comandos", async () => {
    const { professional } = await setup();
    for (const operation of ["follow", "unfollow"]) {
      const response = await perform(professional, professional.id, operation);
      assert.equal(response.status, 403);
      assert.equal(response.code, "role_not_authorized");
    }
  });

  await t.test("remoções concorrentes não afetam o seguimento de outro paciente", async () => {
    const { patient, other, professional } = await setup();
    await perform(patient, professional.id, "follow");
    await perform(other, professional.id, "follow");
    const responses = await Promise.all(
      Array.from({ length: 2 }, () => perform(patient, professional.id, "unfollow")),
    );
    assert.ok(responses.every((response) => response.status === 200));
    assert.equal((await relation(patient, professional)).deleted, true);
    assert.equal((await relation(other, professional)).deleted, false);
  });
});
