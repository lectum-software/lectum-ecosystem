import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prisma from "../src/infra/database/prisma";
import { AdminPsychologistRegistryVerificationRepository } from "../src/modules/api/admin/private/psychologists/registry-verification/repositories/AdminPsychologistRegistryVerificationRepository";
import { approveRegistryVerification } from "../src/modules/api/admin/private/psychologists/registry-verification/use-cases/services/registry-decisions";
import { getFiscalIdentity } from "../src/modules/billing/invoices/fiscal-identity";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55432");
  assert.equal(url.pathname, "/lectum_courtesy_review_20261104");
  const id = "manual-fiscal-test-" + randomUUID();
  const plan = await prisma.subscription_plan.findFirstOrThrow({
    where: { slug: "profissional", active: true, deleted: false },
  });
  try {
    await prisma.user.create({
      data: {
        id,
        name: "Local validation",
        email: id + "@example.invalid",
        role: "psicologo",
        active: true,
        psychologist_profile: { create: { id, crp_status: "pendente" } },
      },
    });
    await prisma.professional_subscription.create({
      data: {
        psychologist_id: id,
        plan_id: plan.id,
        source: "mercadopago",
        status: "ativa",
        current_period_end: new Date(Date.now() + 86400000),
      },
    });
    const repository = new AdminPsychologistRegistryVerificationRepository();
    const profile = await repository.findPsychologist(id);
    assert.ok(profile);
    const invalid = await approveRegistryVerification({
      p: { id },
      b: {
        confirmation: "APROVAR CRP",
        situation_confirmed: true,
        cpf: "52998224725",
        full_name: " ",
        regional_crp: "06",
        crp: "123456",
        crp_registration_date: "2020-01-01",
      },
    } as Parameters<typeof approveRegistryVerification>[0]);
    assert.equal(invalid.status, 400);
    assert.equal(await prisma.fiscal_identity_event.count({ where: { psychologist_id: id } }), 0);
    const args = {
      expectedProfile: profile,
      checkedAt: new Date(),
      cpf: "52998224725",
      crp: "06/123456",
      registrationNumber: "123456",
      regionalCrp: "06",
      registrationDate: new Date("2020-01-01"),
      fullName: "Nome Fiscal Confirmado",
      actorId: "local-test-admin",
      raw: { source: "manual_admin" },
    };
    // Invalid audit date happens after the fiscal insert: the whole decision must roll back.
    await assert.rejects(
      repository.approveManual(id, {
        ...args,
        checkedAt: new Date("invalid"),
      }),
    );
    assert.equal(await prisma.fiscal_identity_event.count({ where: { psychologist_id: id } }), 0);
    assert.equal((await repository.findPsychologist(id))?.crp_status, "pendente");
    assert.ok(await repository.approveManual(id, args));
    const approved = await repository.findPsychologist(id);
    assert.ok(approved);
    assert.equal(approved.crp_status, "aprovado");
    assert.equal(approved.registry_checks.length, 1);
    assert.equal((await getFiscalIdentity(approved))?.full_name, args.fullName);
    assert.equal(await repository.approveManual(id, args), null);
    assert.equal(await prisma.fiscal_identity_event.count({ where: { psychologist_id: id } }), 1);
    console.log(
      "Manual approval: required name, atomic rollback, fiscal identity and stale decision passed.",
    );
  } finally {
    await prisma.fiscal_identity_event.deleteMany({ where: { psychologist_id: id } });
    await prisma.professional_registry_check.deleteMany({ where: { psychologist_id: id } });
    await prisma.professional_subscription.deleteMany({ where: { psychologist_id: id } });
    await prisma.psychologist_profile.deleteMany({ where: { id } });
    await prisma.user.deleteMany({ where: { id } });
  }
}
main().finally(() => prisma.$disconnect());
