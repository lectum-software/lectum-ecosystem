import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import prisma from "../src/infra/database/prisma";
import { signAdminJwt } from "../src/modules/api/admin/shared/auth/jwt";
import { generateToken } from "../src/modules/api/middlewares/_auth/utils/generateToken";

async function main() {
  const db = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(db.hostname, "127.0.0.1");
  assert.equal(db.port, "55432");
  assert.equal(db.pathname, "/lectum_whatsapp_dev_20261017");
  const base = "http://localhost:3011";
  const tag = `feedback-http-${randomUUID()}`;
  const ids: string[] = [];
  try {
    await prisma.admin.create({
      data: { id: tag, name: "QA", email: `${tag}@example.invalid`, confirmed: true },
    });
    const token = signAdminJwt({
      id: tag,
      email: `${tag}@example.invalid`,
      device_id: tag,
      randomId: randomUUID(),
      type: "admin",
    });
    await prisma.admin_token.create({ data: { admin_id: tag, device_id: tag, token } });
    const adminHeaders = { Authorization: `Bearer ${token}`, "x-device": tag };
    const png = await sharp({
      create: { width: 80, height: 60, channels: 3, background: "#3287ed" },
    })
      .png()
      .toBuffer();
    assert.equal((await fetch(`${base}/api/private/feedback`, { method: "POST" })).status, 401);
    for (const role of ["paciente", "psicologo"] as const) {
      const id = `${tag}-${role}`;
      ids.push(id);
      await prisma.user.create({
        data: { id, name: id, email: `${id}@example.invalid`, role, confirmed: true, active: true },
      });
      const userToken = generateToken({ id, email: `${id}@example.invalid` }, "user", id);
      await prisma.user_token.create({ data: { user_id: id, device_id: id, token: userToken } });
      const headers = { Authorization: `Bearer ${userToken}`, "x-device": id };
      const requestId = randomUUID();
      function body(invalid = false, count = 3) {
        const form = new FormData();
        form.append("description", "Problema tecnico temporario de validacao");
        form.append("request_id", requestId);
        form.append("app_version", "0.1.713");
        form.append("viewport", "390x900");
        for (let index = 0; index < count; index++)
          form.append(
            "attachments",
            new Blob([new Uint8Array(invalid ? Buffer.from("<svg/>") : png)], {
              type: "image/png",
            }),
            `screen-${index}.png`,
          );
        return form;
      }
      const bad = await fetch(`${base}/api/private/feedback`, {
        method: "POST",
        headers,
        body: body(true),
      });
      assert.equal(bad.status, 400);
      const excess = await fetch(`${base}/api/private/feedback`, {
        method: "POST",
        headers,
        body: body(false, 4),
      });
      assert.equal(excess.status, 400);
      const sent = await fetch(`${base}/api/private/feedback`, {
        method: "POST",
        headers,
        body: body(),
      });
      assert.equal(sent.status, 201, await sent.clone().text());
      const data = (await sent.json()).data;
      assert.ok(data.id);
      const repeated = await fetch(`${base}/api/private/feedback`, {
        method: "POST",
        headers,
        body: body(),
      });
      assert.equal((await repeated.json()).data.id, data.id);
      assert.equal(await prisma.user_feedback.count({ where: { user_id: id } }), 1);
      const detailPath = `${base}/api/admin/private/feedback/${data.id}`;
      for (const path of [`${base}/api/admin/private/feedback`, detailPath]) {
        assert.equal((await fetch(path)).status, 401);
        assert.equal((await fetch(path, { headers })).status, 401);
      }
      const detailResponse = await fetch(detailPath, { headers: adminHeaders });
      assert.equal(detailResponse.status, 200, await detailResponse.clone().text());
      const detail = (await detailResponse.json()).data;
      assert.equal(detail.status, "new");
      assert.equal(detail.attachments.length, 3);
      assert.equal("content" in detail.attachments[0], false);
      const imagePath = `${detailPath}/attachments/${detail.attachments[0].id}`;
      assert.equal((await fetch(imagePath)).status, 401);
      assert.equal((await fetch(imagePath, { headers })).status, 401);
      const image = await fetch(imagePath, { headers: adminHeaders });
      assert.equal(image.status, 200);
      assert.match(image.headers.get("cache-control") ?? "", /no-store/);
      assert.equal((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).format, "jpeg");
      const update = {
        status: "resolved",
        category: "technical",
        internal_note: "Nota privada QA",
        revision: 0,
      };
      const updated = await fetch(detailPath, {
        method: "PUT",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      assert.equal(updated.status, 200, await updated.clone().text());
      assert.equal(
        (
          await fetch(detailPath, {
            method: "PUT",
            headers: { ...adminHeaders, "Content-Type": "application/json" },
            body: JSON.stringify(update),
          })
        ).status,
        409,
      );
      assert.equal(
        (await prisma.user_feedback.findUniqueOrThrow({ where: { id: data.id } })).internal_note,
        "Nota privada QA",
      );
    }
    console.log(
      "PASS real HTTP: patient/psychologist submission, image validation, retry, admin isolation, private download, revision conflict",
    );
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.admin_activity_log.deleteMany({ where: { admin_id: tag } });
    await prisma.admin.deleteMany({ where: { id: tag } });
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
