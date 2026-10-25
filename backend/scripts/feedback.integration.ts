import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prisma from "../src/infra/database/prisma";
import { FeedbackRepository } from "../src/modules/api/private/feedback/repositories/FeedbackRepository";

async function main() {
  const db = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(db.hostname, "127.0.0.1");
  assert.equal(db.port, "55432");
  assert.equal(db.pathname, "/lectum_whatsapp_dev_20261017");
  const tag = `feedback-test-${randomUUID()}`;
  const repo = new FeedbackRepository();
  try {
    await prisma.user.create({
      data: { id: tag, email: `${tag}@example.invalid`, name: tag, confirmed: true },
    });
    await prisma.admin.create({ data: { id: tag, email: `${tag}@example.invalid`, name: "QA" } });
    const input = {
      description: "Problema tecnico temporario",
      request_id: randomUUID(),
      app_version: "0.1.712",
      viewport: "390x844",
    };
    const results = await Promise.all([
      repo.create(tag, input, [Buffer.from("fixture")], "hash"),
      repo.create(tag, input, [Buffer.from("fixture")], "hash"),
    ]);
    assert.ok(results.every((result) => "id" in result));
    const id = "id" in results[0] ? results[0].id : "";
    assert.equal(await prisma.user_feedback.count({ where: { user_id: tag } }), 1);
    assert.equal((await repo.create(tag, input, [], "changed")).error, "feedback_conflict");
    const detail = await repo.detail(id);
    assert.ok(detail);
    assert.equal(detail.status, "new");
    assert.equal(detail.internal_note, "");
    assert.equal("content" in detail.attachments[0], false);
    assert.equal((await repo.attachment(id, detail.attachments[0].id))?.size, 7);
    assert.equal(await repo.attachment("other-feedback", detail.attachments[0].id), null);
    const updates = await Promise.all([
      repo.update(id, tag, {
        revision: 0,
        status: "reviewing",
        category: "technical",
        internal_note: "Privado",
      }),
      repo.update(id, tag, {
        revision: 0,
        status: "resolved",
        category: "suggestion",
        internal_note: "Outro",
      }),
    ]);
    assert.equal(updates.filter((result) => "id" in result).length, 1);
    assert.equal(updates.filter((result) => result.error === "feedback_conflict").length, 1);
    assert.equal(
      await prisma.admin_activity_log.count({ where: { admin_id: tag, domain: "feedback" } }),
      1,
    );
    for (let index = 0; index < 4; index++)
      await repo.create(tag, { ...input, request_id: randomUUID() }, [], "hash");
    assert.equal(
      (await repo.create(tag, { ...input, request_id: randomUUID() }, [], "hash")).error,
      "feedback_limit",
    );
    assert.equal((await repo.list({ q: tag, role: "paciente" })).total, 5);
    assert.equal((await repo.list({ q: tag, role: "psicologo" })).total, 0);
    console.log(
      "PASS feedback persistence/idempotency/concurrency/limits/filters/private metadata/audit",
    );
  } finally {
    await prisma.user.deleteMany({ where: { id: tag } });
    await prisma.admin_activity_log.deleteMany({ where: { admin_id: tag } });
    await prisma.admin.deleteMany({ where: { id: tag } });
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
