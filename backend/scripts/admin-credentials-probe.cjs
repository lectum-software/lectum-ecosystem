// Somente no runner Docker isolado: repositórios, transações, FK e HTTP reais.
// Não chama SMTP nem representa um teste de entrega do e-mail administrativo.
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
const express = require("/app/node_modules/express");
const { prisma } = require("/app/dist/external/prisma/client.js");
const { encrypt, compare } = require("/app/dist/utils/crypt/index.js");
const i18n = require("/app/dist/main/server/i18n.js").default;
const resetRouter = require("/app/dist/modules/api/public/auth/reset/index.js").default;
const {
  ResetRepository,
} = require("/app/dist/modules/api/public/auth/reset/repositories/ResetRepository.js");
const {
  AdminPatientAccountRepository,
} = require("/app/dist/modules/api/admin/private/patients/account/repositories/AdminPatientAccountRepository.js");
const {
  AdminPsychologistAccountRepository,
} = require("/app/dist/modules/api/admin/private/psychologists/account/repositories/AdminPsychologistAccountRepository.js");
let server,
  step = "setup";
const failed = [];
const {
  RecoveryRepository,
} = require("/app/dist/modules/api/public/auth/recovery/repositories/RecoveryRepository.js");
const {
  ConfirmRepository,
} = require("/app/dist/modules/api/private/auth/confirm/repositories/ConfirmRepository.js");
(async () => {
  assert.equal(process.env.NODE_ENV, "test");
  assert.match(new URL(process.env.DATABASE_URL).hostname, /^lectum-audit178-db-/);
  if (!i18n.isInitialized) await new Promise((r) => i18n.on("initialized", r));
  const admin = await prisma.admin.create({
    data: {
      name: "Isolated Audit Admin",
      email: "admin@example.com",
      confirmed: true,
    },
  });
  const originalHash = await encrypt(randomBytes(24).toString("hex"));
  const nextPassword = randomBytes(24).toString("hex");
  const app = express();
  app.use(express.json());
  app.use(require("/app/node_modules/i18next-http-middleware").handle(i18n));
  app.use("/api/public/auth/reset", resetRouter);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const reset = async (code) => {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/public/auth/reset/${code}`,
      {
        method: "POST",
        signal: AbortSignal.timeout(15000),
        headers: {
          "content-type": "application/json",
          "x-device": "audit-admin-email",
          "x-refine": "true",
        },
        body: JSON.stringify({ password: nextPassword, password_confirm: nextPassword }),
      },
    );
    return response.status;
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
  for (const [role, kind, repository] of [
    ["paciente", "patient", new AdminPatientAccountRepository()],
    ["psicologo", "psychologist", new AdminPsychologistAccountRepository()],
  ]) {
    const user = await prisma.user.create({
      data: {
        name: "Isolated Email Audit",
        email: `${kind}@example.com`,
        password: originalHash,
        confirmed: true,
        role,
      },
    });
    const where = { id: user.id };
    const fresh = async () => {
      const recoveryCode = randomBytes(32).toString("hex");
      await prisma.user.update({
        where,
        data: {
          email: `${kind}@example.com`,
          password: originalHash,
          confirmed: true,
          confirmed_date: new Date(),
          confirm_code: null,
          confirm_date: null,
          recovery_code: recoveryCode,
          recovery_date: new Date(),
          need_reset: false,
        },
      });
      const session = await prisma.user_token.create({
        data: {
          user_id: user.id,
          device_id: "audit-admin-credentials",
          token: randomBytes(32).toString("hex"),
        },
      });
      return { recoveryCode, session };
    };
    const change = (adminId = admin.id) =>
      repository.changeEmail({
        userId: user.id,
        email: `new-${kind}@example.com`,
        confirmCode: "012345",
        audit: {
          adminId,
          action: `${kind}_account_email_changed`,
          changedFields: ["E-mail"],
          metadata: {},
          reason: "Auditoria em banco descartável",
          safeBefore: {},
          safeAfter: {},
          targetId: user.id,
        },
      });
    await check(`${kind}_email_change_invalidates_recovery_and_sessions`, async () => {
      await fresh();
      await change();
      const row = await prisma.user.findUnique({ where });
      assert.equal(row.email, `new-${kind}@example.com`);
      assert.equal(row.recovery_code, null);
      assert.equal(row.recovery_date, null);
      assert.equal(row.password, originalHash);
      assert.equal(row.confirmed, false);
      assert.equal(row.confirm_code, "012345");
      assert.equal(row.confirmed_date, null);
      assert.equal(await prisma.user_token.count({ where: { user_id: user.id } }), 0);
      assert.equal(await prisma.admin_activity_log.count({ where: { target_id: user.id } }), 1);
    });
    await check(`${kind}_old_link_cannot_reset_or_confirm_new_email`, async () => {
      const { recoveryCode } = await fresh();
      await change();
      assert.equal(await reset(recoveryCode), 404);
      const row = await prisma.user.findUnique({ where });
      assert.equal(row.password, originalHash);
      assert.equal(row.confirmed, false);
    });
    await check(`${kind}_old_snapshot_cannot_consume_after_email_change`, async () => {
      const { recoveryCode } = await fresh();
      const snapshot = await prisma.user.findUnique({ where });
      await change();
      assert.equal(
        await new ResetRepository().consume({
          userId: user.id,
          code: recoveryCode,
          issuedAt: snapshot.recovery_date,
          verifiedAt: new Date(),
          validityMinutes: 1,
          passwordHash: await encrypt(nextPassword),
        }),
        false,
      );
      assert.equal((await prisma.user.findUnique({ where })).password, originalHash);
    });
    await check(`${kind}_new_recovery_remains_usable`, async () => {
      await fresh();
      await change();
      const code = randomBytes(32).toString("hex");
      await repository.savePasswordReset({
        userId: user.id,
        credentialSnapshot: { email: `new-${kind}@example.com`, password: originalHash },
        recoveryCode: code,
        audit: {
          adminId: admin.id,
          action: `${kind}_account_password_reset_sent`,
          changedFields: [],
          metadata: {},
          reason: "Auditoria isolada",
          safeBefore: {},
          safeAfter: {},
          targetId: user.id,
        },
      });
      assert.equal(await reset(code), 200);
      const row = await prisma.user.findUnique({ where });
      assert.equal(await compare(nextPassword, row.password), true);
      assert.equal(row.email, `new-${kind}@example.com`);
      assert.equal(row.confirmed, true);
      assert.equal(await reset(code), 404);
    });
    await check(`${kind}_audit_failure_rolls_back_credentials_and_sessions`, async () => {
      const { recoveryCode, session } = await fresh();
      const auditCount = await prisma.admin_activity_log.count({ where: { target_id: user.id } });
      await assert.rejects(change("missing-admin"), (e) => e.code === "P2003");
      const row = await prisma.user.findUnique({ where });
      assert.equal(row.email, `${kind}@example.com`);
      assert.equal(row.confirmed, true);
      assert.equal(row.recovery_code, recoveryCode);
      assert.equal(row.password, originalHash);
      assert.equal(await prisma.user_token.count({ where: { id: session.id } }), 1);
      assert.equal(
        await prisma.admin_activity_log.count({ where: { target_id: user.id } }),
        auditCount,
      );
    });
    await check(`${kind}_temporary_password_still_invalidates_recovery`, async () => {
      const { recoveryCode } = await fresh();
      await repository.setTemporaryPassword({
        userId: user.id,
        passwordHash: await encrypt(nextPassword),
        audit: {
          adminId: admin.id,
          action: `${kind}_account_temporary_password_set`,
          changedFields: [],
          metadata: {},
          reason: "Auditoria isolada",
          safeBefore: {},
          safeAfter: {},
          targetId: user.id,
        },
      });
      assert.equal(await reset(recoveryCode), 404);
      const row = await prisma.user.findUnique({ where });
      assert.equal(row.need_reset, true);
      assert.equal(row.recovery_date, null);
      assert.equal(await compare(nextPassword, row.password), true);
      assert.equal(await prisma.user_token.count({ where: { user_id: user.id } }), 0);
    });
    const auditInput = {
      adminId: admin.id,
      action: `${kind}_account_password_reset_sent`,
      changedFields: [],
      metadata: {},
      reason: "Auditoria isolada",
      safeBefore: {},
      safeAfter: {},
      targetId: user.id,
    };
    await check(`${kind}_admin_stale_recovery_after_email_change_rejected`, async () => {
      await fresh();
      const snapshot = await prisma.user.findUnique({ where });
      await change();
      const code = randomBytes(32).toString("hex");
      const saved = await repository.savePasswordReset({
        userId: user.id,
        recoveryCode: code,
        credentialSnapshot: snapshot,
        audit: auditInput,
      });
      assert.notEqual((await prisma.user.findUnique({ where })).recovery_code, code);
      assert.equal(saved, false);
    });
    await check(`${kind}_admin_stale_confirmation_after_email_change_rejected`, async () => {
      await fresh();
      const snapshot = await prisma.user.findUnique({ where });
      await change();
      const saved = await repository.saveEmailConfirmation({
        userId: user.id,
        confirmCode: "987654",
        credentialSnapshot: snapshot,
        audit: { ...auditInput, action: `${kind}_account_email_confirmation_sent` },
      });
      assert.equal((await prisma.user.findUnique({ where })).confirm_code, "012345");
      assert.equal(saved, false);
    });
    await check(`${kind}_public_stale_recovery_after_email_change_rejected`, async () => {
      await fresh();
      const snapshot = await prisma.user.findUnique({ where });
      await change();
      const code = randomBytes(32).toString("hex");
      const saved = await new RecoveryRepository().recoveryCode({
        ...snapshot,
        recovery_code: code,
        recovery_date: new Date(),
      });
      assert.notEqual((await prisma.user.findUnique({ where })).recovery_code, code);
      assert.equal(saved, false);
    });
    await check(`${kind}_private_stale_confirmation_after_email_change_rejected`, async () => {
      await fresh();
      const snapshot = await prisma.user.findUnique({ where });
      await change();
      const saved = await new ConfirmRepository().confirmCode({
        ...snapshot,
        confirmed: false,
        confirm_code: "987654",
        confirm_date: new Date(),
      });
      assert.equal((await prisma.user.findUnique({ where })).confirm_code, "012345");
      assert.equal(saved, false);
    });
    await check(`${kind}_stale_recovery_after_password_change_rejected`, async () => {
      await fresh();
      const snapshot = await prisma.user.findUnique({ where });
      await prisma.user.update({ where, data: { password: await encrypt(nextPassword) } });
      const code = randomBytes(32).toString("hex");
      const saved = await new RecoveryRepository().recoveryCode({
        ...snapshot,
        recovery_code: code,
        recovery_date: new Date(),
      });
      assert.notEqual((await prisma.user.findUnique({ where })).recovery_code, code);
      assert.equal(saved, false);
    });
    await check(`${kind}_old_delivery_failure_does_not_clear_new_link`, async () => {
      const { recoveryCode } = await fresh();
      const snapshot = await prisma.user.findUnique({ where });
      const code = randomBytes(32).toString("hex");
      await prisma.user.update({ where, data: { recovery_code: code, recovery_date: new Date() } });
      await new RecoveryRepository().recoveryCode(
        { ...snapshot, recovery_code: null, recovery_date: null },
        recoveryCode,
      );
      assert.equal((await prisma.user.findUnique({ where })).recovery_code, code);
    });
    await check(`${kind}_fresh_confirmation_is_saved`, async () => {
      await fresh();
      await change();
      const snapshot = await prisma.user.findUnique({ where });
      assert.equal(
        await repository.saveEmailConfirmation({
          userId: user.id,
          confirmCode: "987654",
          credentialSnapshot: snapshot,
          audit: { ...auditInput, action: `${kind}_account_email_confirmation_sent` },
        }),
        true,
      );
      assert.equal((await prisma.user.findUnique({ where })).confirm_code, "987654");
      assert.equal(
        await new ConfirmRepository().confirmCode({
          ...snapshot,
          confirm_code: "321654",
          confirm_date: new Date(),
        }),
        true,
      );
      assert.equal((await prisma.user.findUnique({ where })).confirm_code, "321654");
    });
    await check(`${kind}_fresh_public_recovery_and_current_cleanup_work`, async () => {
      await fresh();
      const snapshot = await prisma.user.findUnique({ where });
      const code = randomBytes(32).toString("hex");
      const repo = new RecoveryRepository();
      assert.equal(
        await repo.recoveryCode({ ...snapshot, recovery_code: code, recovery_date: new Date() }),
        true,
      );
      assert.equal((await prisma.user.findUnique({ where })).recovery_code, code);
      assert.equal(
        await repo.recoveryCode({ ...snapshot, recovery_code: null, recovery_date: null }, code),
        true,
      );
      assert.equal((await prisma.user.findUnique({ where })).recovery_code, null);
    });
  }
  assert.equal(failed.length, 0);
  console.log("ADMIN_CREDENTIALS_POSTGRES_HTTP_OK");
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
