import assert from "node:assert/strict";
import { test } from "node:test";
import type { professional_subscription } from "@/interfaces/objects";
import { resolveEffectiveBillingSubscription } from "./effective-subscription";

const subscription = (status: string, planSlug: string): professional_subscription =>
  ({
    id: `${planSlug}-${status}`,
    status,
    plan: {
      slug: planSlug,
    },
  }) as professional_subscription;

test("resolveEffectiveBillingSubscription prioriza entitlement profissional ativo", () => {
  const activeProfessional = subscription("ativa", "profissional");
  const activeFree = subscription("ativa", "gratuito");

  assert.equal(
    resolveEffectiveBillingSubscription({
      activeProfessional,
      activeFree,
    }),
    activeProfessional,
  );
});

test("resolveEffectiveBillingSubscription preserva assinatura profissional acionavel", () => {
  const actionableGatewayProfessional = subscription("inativa", "profissional");
  const activeFree = subscription("ativa", "gratuito");

  assert.equal(
    resolveEffectiveBillingSubscription({
      actionableGatewayProfessional,
      activeFree,
    }),
    actionableGatewayProfessional,
  );
});

test("resolveEffectiveBillingSubscription usa plano gratuito quando nao ha profissional vigente", () => {
  const activeFree = subscription("ativa", "gratuito");

  assert.equal(
    resolveEffectiveBillingSubscription({
      activeFree,
    }),
    activeFree,
  );
});

test("resolveEffectiveBillingSubscription nao usa assinatura encerrada como plano atual", () => {
  assert.equal(resolveEffectiveBillingSubscription({}), null);
});
