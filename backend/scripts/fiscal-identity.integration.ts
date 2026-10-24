import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prisma from "../src/infra/database/prisma";
import { FiscalIdentityRepository } from "../src/modules/api/admin/private/psychologists/registry-verification/repositories/FiscalIdentityRepository";
import { CfpRepository } from "../src/modules/api/private/psychologist/cfp/repositories/CfpRepository";
import { getFiscalIdentity } from "../src/modules/billing/invoices/fiscal-identity";
import { grantProfessionalSubscription } from "../src/operations/subscriptions/grant-professional-subscription-service";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55432");
  assert.equal(url.pathname, "/lectum_whatsapp_dev_20261017");
  const tag = "fiscal-identity-test-" + randomUUID();
  const repo = new FiscalIdentityRepository();
  try {
    await prisma.admin.create({
      data: { id: tag, name: "Admin temporario", email: tag + "@example.invalid" },
    });
    const user = await prisma.user.create({
      data: {
        id: tag,
        name: "Nome Publico",
        email: tag + "@example.invalid",
        role: "psicologo",
        psychologist_profile: { create: { cpf: "52998224725" } },
      },
      include: { psychologist_profile: true },
    });
    const profileId = user.psychologist_profile!.id;
    const result = {
      key: "selected",
      nome: "Nome Completo Interno",
      registro: "123456",
      nome_regional: "06",
      active: true,
      situacao: "ATIVO",
      data_inscricao: "01/01/2020",
    };
    // Local persistence fixture, not a call to or an approval from the CFP provider.
    const check = await prisma.professional_registry_check.create({
      data: {
        psychologist_id: profileId,
        cpf: "52998224725",
        provider: "infosimples",
        found: true,
        raw: {
          provider: "infosimples",
          request: { cpf: "52998224725" },
          normalized_results: [result],
        },
      },
    });
    const cfp = new CfpRepository();
    assert.equal((await cfp.confirmResult({ check, result })).ok, true);
    assert.equal((await cfp.confirmResult({ check, result })).ok, true);
    assert.equal(
      await prisma.fiscal_identity_event.count({ where: { psychologist_id: profileId } }),
      1,
    );
    let profile = await prisma.psychologist_profile.findUniqueOrThrow({ where: { id: profileId } });
    assert.equal((await getFiscalIdentity(profile))?.full_name, result.nome);
    // Exercise legacy evidence reuse only on the temporary fixture.
    await prisma.fiscal_identity_event.deleteMany({ where: { psychologist_id: profileId } });
    assert.equal((await getFiscalIdentity(profile))?.full_name, result.nome);
    let state = (await repo.read(profileId))!;
    const input = {
      full_name: "Nome Fiscal Corrigido",
      revision: state.revision,
      profile_revision: state.profile_revision,
    };
    assert.equal(await repo.save(profileId, input, tag), "saved");
    assert.equal(await repo.save(profileId, input, tag), "changed");
    state = (await repo.read(profileId))!;
    assert.equal(state.current?.source, "manual_admin");
    assert.equal(state.history[0].actor_id, tag);
    assert.equal(state.history[0].actor_name, "Admin temporario");
    assert.equal(
      (await prisma.user.findUniqueOrThrow({ where: { id: tag } })).name,
      "Nome Publico",
    );
    assert.equal(JSON.stringify(profile).includes("Nome Fiscal Corrigido"), false);
    const competing = await Promise.all(
      ["Nome Fiscal Um", "Nome Fiscal Dois"].map((full_name) =>
        repo.save(
          profileId,
          { full_name, revision: state.revision, profile_revision: state.profile_revision },
          tag,
        ),
      ),
    );
    assert.deepEqual(competing.sort(), ["changed", "saved"]);
    assert.equal(
      await prisma.fiscal_identity_event.count({ where: { psychologist_id: profileId } }),
      2,
    );
    state = (await repo.read(profileId))!;
    await repo.save(
      profileId,
      {
        full_name: "Nome Fiscal Posterior",
        revision: state.revision,
        profile_revision: state.profile_revision,
      },
      tag,
    );
    await prisma.user.update({ where: { id: tag }, data: { name: "Novo Nome Publico" } });
    assert.equal((await getFiscalIdentity(profile))?.full_name, "Nome Fiscal Posterior");
    profile = await prisma.psychologist_profile.update({
      where: { id: profileId },
      data: { cpf: "11144477735" },
    });
    assert.equal(await getFiscalIdentity(profile), null);
    state = (await repo.read(profileId))!;
    const courtesyInput = {
      actor: tag,
      fiscalActorId: tag,
      psychologistProfileId: profileId,
      days: 90,
      cpf: "52998224725",
      notes: "Teste local temporario",
      fiscalIdentity: {
        full_name: "Nome Fiscal da Cortesia",
        revision: state.revision,
        profile_revision: state.profile_revision,
      },
    };
    const granted = await grantProfessionalSubscription(courtesyInput);
    profile = await prisma.psychologist_profile.findUniqueOrThrow({ where: { id: profileId } });
    assert.equal(profile.cpf, "52998224725");
    assert.equal((await getFiscalIdentity(profile))?.full_name, "Nome Fiscal da Cortesia");
    assert.equal(granted.subscription.source, "admin_grant");
    await assert.rejects(grantProfessionalSubscription(courtesyInput), /fiscal_identity_changed/);
    state = (await repo.read(profileId))!;
    await assert.rejects(
      grantProfessionalSubscription({
        ...courtesyInput,
        cpf: null,
        fiscalIdentity: {
          full_name: "Nome Que Nao Deve Ser Salvo",
          revision: state.revision,
          profile_revision: state.profile_revision,
        },
      }),
      /cpf_invalid/,
    );
    assert.equal((await repo.read(profileId))?.revision, state.revision);
    assert.equal(
      (await prisma.psychologist_profile.findUniqueOrThrow({ where: { id: profileId } })).cpf,
      "52998224725",
    );
    assert.equal(
      (
        await prisma.professional_subscription.findUniqueOrThrow({
          where: { id: granted.subscription.id },
        })
      ).status,
      "ativa",
    );
    assert.equal(
      await prisma.professional_subscription.count({ where: { psychologist_id: profileId } }),
      1,
    );
    console.log(
      "PASS courtesy fiscal name/CPF saved atomically, stale revision refused, failed grant rolled back.",
    );
    console.log(
      "PASS CFP confirmation/idempotency, historical evidence, manual audit, stale/concurrent edits, CPF binding and public-name isolation.",
    );
  } finally {
    await prisma.user.deleteMany({ where: { id: tag } });
    await prisma.admin.deleteMany({ where: { id: tag } });
    await prisma.$disconnect();
  }
}
main().catch(() => {
  console.error("Fiscal identity integration failed; no provider called.");
  process.exitCode = 1;
});
