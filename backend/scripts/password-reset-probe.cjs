// Executado somente pelo runner de integração, dentro da imagem e banco descartáveis.
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomBytes } = require("node:crypto");
const express = require("/app/node_modules/express");
const { prisma } = require("/app/dist/external/prisma/client.js");
const {
  LoginRepository,
} = require("/app/dist/modules/api/public/auth/login/repositories/LoginRepository.js");
const resetRouter = require("/app/dist/modules/api/public/auth/reset/index.js").default;
const { encrypt, compare } = require("/app/dist/utils/crypt/index.js");
const { encrypt: encryptRecovery } = require("/app/dist/utils/crypt/bcrypt.js");
const i18n = require("/app/dist/main/server/i18n.js").default;
let server,
  step = "setup";
const failed = [];
(async () => {
  assert.equal(process.env.NODE_ENV, "test");
  assert.match(new URL(process.env.DATABASE_URL).hostname, /^lectum-audit178-db-/);
  assert.equal(process.env.CODE_API_USER_VALID_MINUTES, "1");
  if (!i18n.isInitialized) await new Promise((r) => i18n.on("initialized", r));
  const device = "audit-reset-device";
  const originalHash = await encrypt(randomBytes(24).toString("hex"));
  const newPassword = randomBytes(24).toString("hex");
  const user = await prisma.user.create({
    data: {
      name: "Temporary Recovery Audit",
      email: "recovery@example.com",
      password: originalHash,
      confirmed: true,
      role: "paciente",
    },
  });
  const app = express();
  app.use(express.json());
  app.use(require("/app/node_modules/i18next-http-middleware").handle(i18n));
  app.use("/api/public/auth/reset", resetRouter);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const setCode = async (ageMs, c = randomBytes(32).toString("hex")) => {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: originalHash,
        recovery_code: c,
        recovery_date: new Date(Date.now() - ageMs),
      },
    });
    return c;
  };
  const reset = async (c, password = newPassword) => {
    const r = await fetch(`${base}/api/public/auth/reset/${encodeURIComponent(c)}`, {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { "x-device": device, "content-type": "application/json" },
      body: JSON.stringify({ password, password_confirm: password }),
    });
    return { status: r.status, body: await r.json() };
  };
  const probe = async (name, fn) => {
    step = name;
    try {
      await fn();
      console.log("CHECK_OK", name);
    } catch (e) {
      failed.push(name);
      console.error(
        "INTEGRATION_FAILED",
        name,
        e?.code || e?.name,
        "actual",
        typeof e?.actual === "number" ? e.actual : "unavailable",
      );
    }
  };
  await probe("expired_exact_window_rejected", async () => {
    const c = await setCode(61000);
    const r = await reset(c);
    assert.equal(r.status, 400);
    assert.equal((await prisma.user.findUnique({ where: { id: user.id } })).password, originalHash);
  });
  await probe("future_issuance_rejected", async () => {
    const c = await setCode(-60000);
    assert.equal((await reset(c)).status, 400);
  });
  await probe("valid_reset_revokes_sessions_and_replay", async () => {
    // Mesmo formato opaco já emitido pelo fluxo público/Admin, inclusive '$' e '.'.
    const legacyCode = (await encryptRecovery(randomBytes(32).toString("hex"))).replace(/\//g, "");
    const c = await setCode(0, legacyCode);
    const old = await new LoginRepository("audit-old-device").hidrate(user, "audit-old-device");
    const oldToken = old.user_tokens[0].token;
    assert.equal((await reset(c)).status, 200);
    assert.equal(await prisma.user_token.count({ where: { token: oldToken } }), 0);
    const stored = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(stored.recovery_code, null);
    assert.equal(await compare(newPassword, stored.password), true);
    assert.equal((await reset(c)).status, 404);
  });
  await probe("concurrent_reset_one_winner", async () => {
    const c = await setCode(0);
    const candidates = [newPassword, randomBytes(24).toString("hex")];
    const results = await Promise.all(candidates.map((value) => reset(c, value)));
    assert.equal(results.filter((v) => v.status === 200).length, 1);
    assert.equal(results.filter((v) => v.status === 404).length, 1);
    const stored = await prisma.user.findUnique({ where: { id: user.id } });
    for (const [index, candidate] of candidates.entries()) {
      assert.equal(await compare(candidate, stored.password), results[index].status === 200);
    }
  });
  await probe("authenticated_password_change_invalidates_recovery", async () => {
    await setCode(0);
    const updated = await new LoginRepository(device).updateAndClearTokens({
      p: { id: user.id },
      b: { password: await encrypt(newPassword) },
      auth: user,
    });
    assert.equal((await prisma.user.findUnique({ where: { id: user.id } })).recovery_code, null);
    assert.deepEqual(updated.user_tokens, []);
  });

  await probe("resend_snapshot_preserves_password_and_sessions", async () => {
    const c = await setCode(0);
    const row = await prisma.user.findUnique({ where: { id: user.id } });
    const snapshot = new Date(row.recovery_date.getTime() - 1);
    const count = await prisma.user_token.count({ where: { user_id: user.id } });
    const {
      ResetRepository,
    } = require("/app/dist/modules/api/public/auth/reset/repositories/ResetRepository.js");
    const consumed = await new ResetRepository(device).consume({
      userId: user.id,
      code: c,
      issuedAt: snapshot,
      verifiedAt: new Date(),
      validityMinutes: 1,
      passwordHash: await encrypt(newPassword),
    });
    assert.equal(consumed, false);
    assert.equal((await prisma.user.findUnique({ where: { id: user.id } })).recovery_code, c);
    assert.equal((await prisma.user.findUnique({ where: { id: user.id } })).password, originalHash);
    assert.equal(await prisma.user_token.count({ where: { user_id: user.id } }), count);
  });
  await probe("missing_date_does_not_change_password", async () => {
    const c = await setCode(0);
    await prisma.user.update({ where: { id: user.id }, data: { recovery_date: null } });
    assert.equal((await reset(c)).status, 400);
    assert.equal((await prisma.user.findUnique({ where: { id: user.id } })).password, originalHash);
  });
  await probe("wrong_link_does_not_clear_existing_sessions", async () => {
    const c = await setCode(0);
    const count = await prisma.user_token.count({ where: { user_id: user.id } });
    assert.equal((await reset(`${c}x`)).status, 404);
    assert.equal(await prisma.user_token.count({ where: { user_id: user.id } }), count);
  });
  assert.equal(failed.length, 0);
  console.log("RESET_POSTGRES_HTTP_OK");
})()
  .catch(() => {
    console.error("INTEGRATION_FAILED", step, "scenario_failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
    }
    await prisma.$disconnect();
  });
