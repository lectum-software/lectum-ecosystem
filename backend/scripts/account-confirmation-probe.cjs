const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomBytes } = require("node:crypto");
const express = require("/app/node_modules/express");
const { prisma } = require("/app/dist/external/prisma/client.js");
const { encrypt } = require("/app/dist/utils/crypt/index.js");
const endpoint = require("/app/dist/main/server/imports/write.js").default;
const i18n = require("/app/dist/main/server/i18n.js").default;
let server,
  step = "setup";
const failed = [];
(async () => {
  assert.equal(process.env.NODE_ENV, "test");
  assert.match(new URL(process.env.DATABASE_URL).hostname, /^lectum-audit178-db-/);
  if (!i18n.isInitialized) await new Promise((r) => i18n.on("initialized", r));
  let password = randomBytes(24).toString("hex");
  const user = await prisma.user.create({
    data: {
      name: "Temporary Confirmation Audit",
      email: "confirmation@example.com",
      password: await encrypt(password),
      confirmed: false,
      role: "paciente",
      confirm_code: "021938",
      confirm_date: new Date(),
    },
  });
  const app = express();
  app.use(express.json());
  app.use(require("/app/node_modules/i18next-http-middleware").handle(i18n));
  app.use(endpoint);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const device = "audit-confirmation-device";
  let token;
  const request = async (path, method = "GET", body, authenticated = true) => {
    const response = await fetch(`${base}${path}`, {
      method,
      signal: AbortSignal.timeout(15000),
      headers: {
        "x-device": device,
        "x-refine": "true",
        "content-type": "application/json",
        ...(authenticated && token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };
  const login = async () => {
    const response = await request(
      "/api/public/auth/login",
      "POST",
      { email: user.email, password },
      false,
    );
    assert.equal(response.status, 200);
    token = response.body.data.user_tokens[0].token;
    assert.equal(typeof token, "string");
  };
  const check = async (name, action) => {
    step = name;
    try {
      await action();
      console.log("CHECK_OK", name);
    } catch (e) {
      failed.push(name);
      console.error(
        "INTEGRATION_FAILED",
        name,
        "actual",
        typeof e?.actual === "number" ? e.actual : "unavailable",
      );
    }
  };
  await login();
  await check("unconfirmed_business_write_rejected", async () => {
    const r = await request("/api/private/patient/onboarding", "PUT", {
      name: "Changed Without Confirmation",
    });
    assert.equal(r.status, 403);
    assert.equal(r.body.code, "email_confirmation_required");
    assert.equal(await prisma.patient_profile.count({ where: { user_id: user.id } }), 0);
    assert.equal((await prisma.user.findUnique({ where: { id: user.id } })).name, user.name);
  });
  await check("unconfirmed_private_read_rejected", async () =>
    assert.equal((await request("/api/private/posts/mine")).status, 403),
  );
  await check("unconfirmed_hydration_available", async () => {
    const r = await request("/api/private/auth/hidrate");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.confirmed, false);
  });
  await check("unconfirmed_resend_reaches_real_unconfigured_provider", async () => {
    const r = await request("/api/private/auth/confirm");
    assert.equal(r.status, 503);
    assert.equal(r.body.code, "email_provider_unavailable");
  });
  await check("password_change_does_not_confirm_email", async () => {
    const nextPassword = randomBytes(24).toString("hex");
    const r = await request("/api/private/auth/reset", "POST", {
      current_password: password,
      password: nextPassword,
      password_confirm: nextPassword,
    });
    assert.equal(r.status, 200);
    password = nextPassword;
    token = r.body.data.user_tokens[0].token;
    assert.equal((await prisma.user.findUnique({ where: { id: user.id } })).confirmed, false);
  });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      confirmed: false,
      confirmed_date: null,
      confirm_code: "021938",
      confirm_date: new Date(),
    },
  });
  await check("account_password_change_invalidates_recovery", async () => {
    const oldCode = randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { recovery_code: oldCode, recovery_date: new Date() },
    });
    const nextPassword = randomBytes(24).toString("hex");
    const result = await request("/api/private/account/password", "PUT", {
      current_password: password,
      password: nextPassword,
      password_confirm: nextPassword,
    });
    assert.equal(result.status, 200);
    password = nextPassword;
    token = result.body.data.user_tokens[0].token;
    const current = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(current.confirmed, false);
    assert.equal(current.recovery_code, null);
    assert.equal(current.recovery_date, null);
    // O pacote legado exige x-refine nos processos NODE_ENV=test; validar também o contrato real.
    assert.equal(
      (
        await request(
          `/api/public/auth/reset/${oldCode}`,
          "POST",
          {
            password: randomBytes(24).toString("hex"),
            password_confirm: "different-password",
          },
          false,
        )
      ).status,
      400,
    );
    const candidate = randomBytes(24).toString("hex");
    assert.equal(
      (
        await request(
          `/api/public/auth/reset/${oldCode}`,
          "POST",
          {
            password: candidate,
            password_confirm: candidate,
          },
          false,
        )
      ).status,
      404,
    );
  });
  await check("account_security_available_before_confirmation", async () =>
    assert.equal((await request("/api/private/account/security")).status, 200),
  );
  await check("public_feed_still_available", async () => {
    assert.equal((await request("/api/private/community/feed/posts?limit=1")).status, 200);
    assert.equal(
      (await request("/api/private/community/feed/posts?limit=1", "GET", undefined, false)).status,
      200,
    );
  });
  await prisma.patient_profile.updateMany({
    where: { user_id: user.id },
    data: { onboarding_completed_at: null, goal: null },
  });
  await check("confirmation_unlocks_business_write", async () => {
    const r = await request("/api/private/auth/code/021938", "PUT");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.confirmed, true);
    token = r.body.data.user_tokens[0].token;
    assert.equal(
      (await request("/api/private/patient/onboarding", "PUT", { goal: "conhecer_comunidade" }))
        .status,
      200,
    );
    assert.equal(
      await prisma.patient_profile.count({
        where: { user_id: user.id, goal: "conhecer_comunidade" },
      }),
      1,
    );
  });
  await check("confirmation_read_from_database_each_request", async () => {
    await prisma.user.update({ where: { id: user.id }, data: { confirmed: false } });
    assert.equal((await request("/api/private/patient/onboarding", "PUT", {})).status, 403);
  });
  await check("session_still_required_for_bootstrap", async () =>
    assert.equal((await request("/api/private/auth/hidrate", "GET", undefined, false)).status, 401),
  );
  await check("unconfirmed_post_creation_rejected_before_domain_write", async () => {
    assert.equal((await request("/api/private/community/audit/posts", "POST", {})).status, 403);
  });
  await check("temporary_password_blocks_business_but_keeps_bootstrap", async () => {
    await prisma.user.update({
      where: { id: user.id },
      data: { confirmed: true, need_reset: true },
    });
    const blocked = await request("/api/private/patient/onboarding", "PUT", {});
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.code, "password_reset_required");
    assert.equal((await request("/api/private/auth/hidrate")).status, 200);
  });
  await check("temporary_password_reset_unlocks_confirmed_account", async () => {
    const nextPassword = randomBytes(24).toString("hex");
    const result = await request("/api/private/auth/need_reset", "POST", {
      password: nextPassword,
      password_confirm: nextPassword,
    });
    assert.equal(result.status, 200);
    token = result.body.data.user_tokens[0].token;
    password = nextPassword;
    assert.equal(result.body.data.need_reset, false);
    assert.equal((await request("/api/private/patient/onboarding", "PUT", {})).status, 200);
  });
  await check("confirmed_account_still_requires_correct_role", async () => {
    assert.equal((await request("/api/private/psychologist/cfp", "POST", {})).status, 403);
    await prisma.user.update({ where: { id: user.id }, data: { confirmed: false } });
  });
  await check("unconfirmed_logout_revokes_session", async () => {
    assert.equal((await request("/api/private/account/logout", "POST", {})).status, 200);
    assert.equal((await request("/api/private/auth/hidrate")).status, 401);
  });
  await check("account_email_repository_invalidates_old_mail_recovery", async () => {
    const oldCode = randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { recovery_code: oldCode, recovery_date: new Date() },
    });
    const {
      AccountRepository,
    } = require("/app/dist/modules/api/private/account/repositories/AccountRepository.js");
    await new AccountRepository().updateUserAndClearTokens(user.id, {
      email: "new-mail@example.com",
      confirmed: false,
    });
    const current = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(current.recovery_code, null);
    assert.equal(current.recovery_date, null);
    assert.equal(current.confirmed, false);
    const candidate = randomBytes(24).toString("hex");
    assert.equal(
      (
        await request(
          `/api/public/auth/reset/${oldCode}`,
          "POST",
          { password: candidate, password_confirm: candidate },
          false,
        )
      ).status,
      404,
    );
  });
  step = "aggregate";
  assert.equal(failed.length, 0);
  console.log("ACCOUNT_CONFIRMATION_POSTGRES_HTTP_OK");
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
