import assert from "node:assert/strict";
import test from "node:test";
import type {
  AdminPsychologistRegistryVerificationCheck,
  AdminPsychologistRegistryVerificationRecord,
} from "../../repositories/AdminPsychologistRegistryVerificationRepository";
import { buildResponse, summarizeVerification } from "./registry-summary";

const approvedAt = new Date("2026-09-10T12:00:00.000Z");
const rejectedAt = new Date("2026-09-11T12:00:00.000Z");

const manualCheck = (found: boolean): AdminPsychologistRegistryVerificationCheck => ({
  id: found ? "unit-manual-approval" : "unit-manual-rejection",
  checked_at: found ? approvedAt : rejectedAt,
  createdAt: found ? approvedAt : rejectedAt,
  cpf: null,
  found,
  provider: "manual_admin",
  raw: {
    source: "manual_admin",
    decision: found ? "approved" : "rejected",
    ...(found ? { notes: "Revisão anterior" } : { reason: "Revisão humana atual" }),
  },
  registro: "3324",
  uf: "PI",
});

const makeProfile = (
  overrides: Partial<AdminPsychologistRegistryVerificationRecord> = {},
): AdminPsychologistRegistryVerificationRecord => ({
  id: "unit-profile",
  user_id: "unit-user",
  updatedAt: rejectedAt,
  cpf: null,
  crp: "21ª Região - PI/3324",
  crp_registration_date: null,
  crp_status: "rejeitado",
  cfp_verified_at: null,
  registry_checks: [manualCheck(false), manualCheck(true)],
  user: {
    id: "unit-user",
    active: true,
    role: "psicologo",
    email: "registry-unit@example.invalid",
    name: "Perfil unitário",
  },
  subscriptions: [
    {
      id: "unit-subscription",
      createdAt: approvedAt,
      current_period_end: null,
      grant_notes: null,
      grant_reason: null,
      grant_started_at: null,
      granted_by: null,
      plan: { name: "Profissional", slug: "profissional" },
      source: "mercadopago",
      status: "active",
    },
  ],
  ...overrides,
});

test("rejeição atual não é ocultada por aprovação manual anterior", () => {
  const profile = makeProfile();
  const before = structuredClone(profile);
  const response = buildResponse(profile);

  assert.equal(response.summary.crp_status, "rejeitado");
  assert.equal(response.summary.status, "rejeitado");
  assert.equal(response.summary.status_label, "Rejeitado");
  assert.equal(response.summary.approval_label, "Pendente");
  assert.equal(response.summary.source, "manual_admin");
  assert.equal(response.summary.latest_manual_reason, "Revisão humana atual");
  assert.deepEqual(response.summary.latest_manual_checked_at, rejectedAt);
  assert.deepEqual(
    response.latest_attempts.map((attempt) => attempt.result_label),
    ["Rejeitado manualmente", "Aprovado manualmente"],
  );
  assert.equal(response.actions.can_approve_manually, true);
  assert.equal(response.actions.can_reject_manually, true);
  assert.deepEqual(profile, before);
});

test("rejeição canônica prevalece mesmo quando só a aprovação antiga está na janela histórica", () => {
  const summary = summarizeVerification(makeProfile({ registry_checks: [manualCheck(true)] }));

  assert.equal(summary.status, "rejeitado");
  assert.equal(summary.approval_label, "Pendente");
});

test("aprovação manual atual permanece ativa e sem novas ações de revisão", () => {
  const response = buildResponse(
    makeProfile({ crp_status: "aprovado", registry_checks: [manualCheck(true)] }),
  );

  assert.equal(response.summary.status, "aprovado");
  assert.equal(response.summary.status_label, "Aprovado manualmente");
  assert.equal(response.summary.source, "manual_admin");
  assert.equal(response.summary.approval_label, "Ativo");
  assert.equal(response.actions.can_approve_manually, false);
  assert.equal(response.actions.can_reject_manually, false);
});

test("aprovação atual com evidência automática mais recente preserva a origem automática", () => {
  const summary = summarizeVerification(
    makeProfile({
      crp_status: "aprovado",
      cfp_verified_at: rejectedAt,
      registry_checks: [manualCheck(true)],
    }),
  );

  assert.equal(summary.status, "aprovado");
  assert.equal(summary.source, "api_automatica");
  assert.equal(summary.status_label, "Aprovado via API automática");
});

test("aprovação atual preserva origem manual posterior à evidência automática", () => {
  const summary = summarizeVerification(
    makeProfile({
      crp_status: "aprovado",
      cfp_verified_at: new Date("2026-09-09T12:00:00.000Z"),
      registry_checks: [manualCheck(true)],
    }),
  );

  assert.equal(summary.status, "aprovado");
  assert.equal(summary.source, "manual_admin");
});

test("aprovação atual sem histórico continua ativa", () => {
  const summary = summarizeVerification(
    makeProfile({ crp_status: "aprovado", registry_checks: [] }),
  );

  assert.equal(summary.status, "aprovado");
  assert.equal(summary.approval_label, "Ativo");
  assert.equal(summary.status_label, "Aprovado");
});

test("resumo de rejeição não apaga evidência automática legada", () => {
  const cfpVerifiedAt = new Date("2026-09-09T12:00:00.000Z");
  const profile = makeProfile({ cfp_verified_at: cfpVerifiedAt });
  const summary = summarizeVerification(profile);

  assert.equal(summary.status, "rejeitado");
  assert.equal(summary.cfp_verified_at, cfpVerifiedAt);
  assert.equal(profile.cfp_verified_at, cfpVerifiedAt);
});

for (const crpStatus of ["pendente", "rejeitado"]) {
  test(`cortesia ativa mantém ativação manual com status cadastral ${crpStatus}`, () => {
    const profile = makeProfile({ crp_status: crpStatus });
    profile.subscriptions[0].source = "admin_grant";
    const response = buildResponse(profile);

    assert.equal(response.summary.status, "aprovado");
    assert.equal(response.summary.status_label, "Ativado manualmente");
    assert.equal(response.summary.source, "admin_grant");
    assert.equal(response.summary.plan_type, "cortesia");
    assert.equal(response.summary.approval_label, "Ativo");
    assert.equal(response.summary.crp_status, crpStatus);
    assert.equal(response.actions.can_approve_manually, false);
    assert.equal(response.actions.can_reject_manually, false);
  });
}

test("histórico de aprovação não promove cadastro atualmente pendente", () => {
  const summary = summarizeVerification(makeProfile({ crp_status: "pendente" }));

  assert.equal(summary.status, "pendente");
  assert.equal(summary.approval_label, "Pendente");
});

test("plano gratuito rejeitado continua sem ações de revisão manual", () => {
  const profile = makeProfile({ subscriptions: [] });
  const response = buildResponse(profile);

  assert.equal(response.summary.status, "rejeitado");
  assert.equal(response.summary.plan_type, "gratuito");
  assert.equal(response.actions.can_approve_manually, false);
  assert.equal(response.actions.can_reject_manually, false);
});
