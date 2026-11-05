import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";
import prisma from "../src/infra/database/prisma";
import { AdminPsychologistRegistryVerificationRepository } from "../src/modules/api/admin/private/psychologists/registry-verification/repositories/AdminPsychologistRegistryVerificationRepository";
import { grantProfessionalSubscription } from "../src/operations/subscriptions/grant-professional-subscription-service";
import { loginInclude } from "../src/query/login";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55432");
  assert.equal(url.pathname, "/lectum_courtesy_review_20261104");
  const prefix = `courtesy-test-${randomUUID()}`;
  const ids = Array.from({ length: 6 }, (_, index) => `${prefix}-${index}`);
  const sql = readFileSync(
    "prisma/migrations/20261104210000_courtesy_registry_approval/migration.sql",
    "utf8",
  );
  const plan = await prisma.subscription_plan.findFirstOrThrow({
    where: { slug: "profissional", active: true, deleted: false },
  });
  const old = new Date("2020-01-01T00:00:00Z");
  try {
    for (const id of ids) {
      await prisma.user.create({
        data: {
          id,
          name: "Local courtesy validation",
          email: `${id}@example.invalid`,
          role: "psicologo",
          psychologist_profile: { create: { id, crp_status: "pendente" } },
        },
      });
    }
    for (const id of ids.slice(0, 4)) {
      await prisma.professional_subscription.create({
        data: {
          psychologist_id: id,
          plan_id: plan.id,
          source: "admin_grant",
          status: "cancelada",
          grant_started_at: old,
          current_period_end: new Date("2020-02-01T00:00:00Z"),
          granted_by: "Local test administrator",
        },
      });
    }
    await prisma.psychologist_profile.update({
      where: { id: ids[1] },
      data: { crp_status: "rejeitado" },
    });
    await prisma.professional_registry_check.create({
      data: { psychologist_id: ids[2], provider: "manual_admin", found: false },
    });
    await prisma.professional_registry_check.create({
      data: {
        psychologist_id: ids[3],
        provider: "infosimples",
        found: false,
        raw: { attempt_status: "provider_rate_limited" },
      },
    });
    await prisma.$executeRawUnsafe(sql);
    for (const index of [0, 3]) {
      assert.equal(
        (await prisma.psychologist_profile.findUniqueOrThrow({ where: { id: ids[index] } }))
          .crp_status,
        "aprovado",
      );
      assert.equal(
        await prisma.professional_registry_check.count({
          where: { psychologist_id: ids[index], provider: "manual_admin", found: true },
        }),
        1,
      );
    }
    assert.equal(
      (await prisma.psychologist_profile.findUniqueOrThrow({ where: { id: ids[1] } })).crp_status,
      "rejeitado",
    );
    assert.equal(
      (await prisma.psychologist_profile.findUniqueOrThrow({ where: { id: ids[2] } })).crp_status,
      "pendente",
    );
    await prisma.$executeRawUnsafe(sql);
    assert.equal(
      await prisma.professional_registry_check.count({
        where: { psychologist_id: ids[0], provider: "manual_admin" },
      }),
      1,
    );
    const grant = await grantProfessionalSubscription({
      actor: "Local test administrator",
      psychologistProfileId: ids[4],
      days: 1,
    });
    assert.equal(
      await prisma.professional_registry_check.count({
        where: { psychologist_id: ids[4], provider: "manual_admin", found: true },
      }),
      1,
    );
    await prisma.professional_subscription.update({
      where: { id: grant.subscription.id },
      data: { status: "cancelada", current_period_end: old },
    });
    const session = await prisma.user.findUniqueOrThrow({
      where: { id: ids[4] },
      include: loginInclude(),
    });
    assert.equal(session.psychologist_profile?.crp_status, "aprovado");
    assert.equal(session.psychologist_profile?.subscriptions.length, 0);
    await prisma.professional_registry_check.createMany({
      data: Array.from({ length: 12 }, () => ({
        psychologist_id: ids[4],
        provider: "infosimples",
        found: false,
        raw: { attempt_status: "provider_unavailable" },
      })),
    });
    const history = await new AdminPsychologistRegistryVerificationRepository().findPsychologist(
      ids[4],
    );
    assert.equal(history?.registry_checks.length, 13);
    assert.equal(history?.registry_checks.at(-1)?.provider, "manual_admin");
    assert.equal(history?.crp_status, "aprovado");
    await prisma.professional_subscription.create({
      data: {
        psychologist_id: ids[5],
        plan_id: plan.id,
        source: "admin_grant",
        status: "cancelada",
        grant_started_at: old,
        current_period_end: old,
        granted_by: "Local test administrator",
      },
    });
    const administrator = new Client({ connectionString: url.toString() });
    const migration = new Client({ connectionString: url.toString() });
    await administrator.connect();
    await migration.connect();
    let pending: Promise<unknown> | undefined;
    try {
      await administrator.query("BEGIN");
      await administrator.query(
        "UPDATE psychologist_profiles SET crp_status = 'rejeitado', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [ids[5]],
      );
      const pid = (await migration.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
      pending = migration.query(sql);
      let blocked = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const state = await administrator.query(
          "SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1",
          [pid],
        );
        if (state.rows[0]?.wait_event_type === "Lock") {
          blocked = true;
          break;
        }
        await delay(50);
      }
      assert.equal(blocked, true, "Migration must actually contend with the administrative write");
      await administrator.query("COMMIT");
      await pending;
      assert.equal(
        (await prisma.psychologist_profile.findUniqueOrThrow({ where: { id: ids[5] } })).crp_status,
        "rejeitado",
      );
      assert.equal(
        await prisma.professional_registry_check.count({
          where: { psychologist_id: ids[5], found: true },
        }),
        0,
      );
    } finally {
      await administrator.query("ROLLBACK");
      await pending?.catch(() => undefined);
      await administrator.end();
      await migration.end();
    }
    console.log(
      "PASS: expired courtesy, API failures, manual rejection, idempotency, new grant, full history, no expired benefits and concurrent rejection preserved.",
    );
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}
main().catch(() => {
  console.error("Local courtesy integration failed");
  process.exitCode = 1;
});
