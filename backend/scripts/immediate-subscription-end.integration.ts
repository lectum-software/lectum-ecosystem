import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prisma from "../src/infra/database/prisma";
import { AdminPsychologistBillingRepository } from "../src/modules/api/admin/private/psychologists/billing/repositories/AdminPsychologistBillingRepository";
import { cancelSubscription } from "../src/modules/api/admin/private/psychologists/billing/use-cases/services";
import { resolveCancellationState } from "../src/modules/billing/cancellation-period";
import { activeProfessionalEntitlementWhere } from "../src/utils/subscription-entitlement";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55432");
  assert.equal(url.pathname, "/lectum_courtesy_review_20261104");
  const id = `immediate-end-${randomUUID()}`;
  const repository = new AdminPsychologistBillingRepository();
  const plan = await prisma.subscription_plan.findFirstOrThrow({
    where: { slug: "profissional", active: true, deleted: false },
  });
  const end = new Date(Date.now() + 86400000);
  const verifiedAt = new Date();
  try {
    await prisma.admin.create({
      data: { id, name: "Local validation", email: `${id}@example.invalid` },
    });
    await prisma.user.create({
      data: {
        id,
        name: "Local validation",
        email: `${id}@example.invalid`,
        role: "psicologo",
        psychologist_profile: {
          create: { id, crp_status: "aprovado", cfp_verified_at: verifiedAt },
        },
      },
    });
    const subscription = await prisma.professional_subscription.create({
      data: {
        psychologist_id: id,
        plan_id: plan.id,
        source: "mercadopago",
        gateway: "mercadopago",
        gateway_subscription_id: id,
        status: "ativa",
        current_period_end: end,
      },
    });
    const audit = {
      adminId: id,
      targetId: id,
      reason: "Encerramento solicitado apos estorno externo",
      changedFields: ["Status"],
      metadata: {},
      safeBefore: {},
      safeAfter: {},
    };
    const current = await repository.findCurrentSubscription(id);
    assert.ok(current);
    const request = {
      p: { id },
      auth: { id },
      b: {
        mode: "immediate",
        subscription_id: current.id,
        confirmation: "ENCERRAR AGORA",
        reason: audit.reason,
      },
    } as Parameters<typeof cancelSubscription>[0];
    assert.equal((await cancelSubscription({ ...request, auth: undefined })).status, 403);
    assert.equal(
      (
        await cancelSubscription({
          ...request,
          b: { ...request.b, confirmation: "CANCELAR ASSINATURA" },
        })
      ).status,
      400,
    );
    assert.equal(
      (await cancelSubscription({ ...request, b: { ...request.b, reason: "" } })).status,
      400,
    );
    assert.equal(
      (
        await cancelSubscription({
          ...request,
          b: { ...request.b, subscription_id: "stale-selection" },
        })
      ).status,
      409,
    );
    const normal = await repository.cancelSubscription({
      subscription: current,
      gatewaySubscriptionId: id,
      audit,
    });
    assert.equal(normal.current_period_end?.getTime(), end.getTime());
    assert.equal(
      await prisma.professional_subscription.count({
        where: { psychologist_id: id, ...activeProfessionalEntitlementWhere() },
      }),
      1,
    );
    const cancelled = await repository.findCurrentSubscription(id);
    assert.ok(cancelled);
    await assert.rejects(
      repository.cancelSubscription({
        subscription: cancelled,
        gatewaySubscriptionId: `${id}-wrong`,
        immediate: true,
        audit,
      }),
    );
    assert.equal(
      (
        await prisma.professional_subscription.findUniqueOrThrow({ where: { id: subscription.id } })
      ).current_period_end?.getTime(),
      end.getTime(),
    );
    const result = await repository.cancelSubscription({
      subscription: cancelled,
      gatewaySubscriptionId: id,
      immediate: true,
      audit,
    });
    assert.equal(result.status, "cancelada");
    assert.ok(result.current_period_end && result.current_period_end.getTime() <= Date.now());
    assert.ok(result.billing_downgraded_at);
    assert.equal(
      await prisma.professional_subscription.count({
        where: { psychologist_id: id, ...activeProfessionalEntitlementWhere() },
      }),
      0,
    );
    assert.equal((await repository.findCurrentSubscription(id))?.plan.slug, "gratuito");
    const profile = await prisma.psychologist_profile.findUniqueOrThrow({ where: { id } });
    assert.equal(profile.crp_status, "aprovado");
    assert.equal(profile.cfp_verified_at?.getTime(), verifiedAt.getTime());
    const log = await prisma.admin_activity_log.findFirstOrThrow({
      where: { admin_id: id, action: "psychologist_subscription_terminated" },
    });
    assert.equal(log.reason, audit.reason);
    const delayed = resolveCancellationState(result, { status: "ativa", currentPeriodEnd: end });
    await prisma.professional_subscription.update({
      where: { id: subscription.id },
      data: delayed,
    });
    assert.equal(
      await prisma.professional_subscription.count({
        where: { psychologist_id: id, ...activeProfessionalEntitlementWhere() },
      }),
      0,
    );
    console.log(
      "Immediate end: period preservation, wrong-target rejection, audit, free plan, registry preservation and delayed update passed.",
    );
  } finally {
    await prisma.admin_activity_log.deleteMany({ where: { admin_id: id } });
    await prisma.professional_subscription.deleteMany({ where: { psychologist_id: id } });
    await prisma.psychologist_profile.deleteMany({ where: { id } });
    await prisma.user.deleteMany({ where: { id } });
    await prisma.admin.deleteMany({ where: { id } });
  }
}
main().finally(() => prisma.$disconnect());
