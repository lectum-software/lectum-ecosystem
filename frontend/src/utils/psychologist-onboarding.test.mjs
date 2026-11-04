import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import test from "node:test";

const {
  getPaidSubscriptionNextPath,
  isPaidRegistryVerificationComplete,
  PSYCHOLOGIST_ONBOARDING_PATHS: paths,
} = await import("./psychologist-onboarding.ts");
const { getProfileBillingAddress } = await import("./upgrade-address.ts");

const subscription = {
  status: "ativa",
  source: "mercadopago",
  plan: { slug: "profissional", active: true },
};
const user = {
  role: "psicologo",
  psychologist_profile: { whatsapp: "5511999999999", crp_status: "aprovado" },
};

test("upgrade completo vai aos beneficios, sem repetir dados nem perfil", () => {
  assert.equal(getPaidSubscriptionNextPath(user, subscription, true), paths.completion);
});
test("dados faltantes seguem endereco, WhatsApp e registro nesta ordem", () => {
  const empty = { role: "psicologo", psychologist_profile: {} };
  assert.equal(getPaidSubscriptionNextPath(empty, subscription, false), paths.billingAddress);
  assert.equal(getPaidSubscriptionNextPath(empty, subscription, true), paths.phone);
  assert.equal(
    getPaidSubscriptionNextPath(
      { ...user, psychologist_profile: { whatsapp: "5511999999999" } },
      subscription,
      true,
    ),
    paths.cfp,
  );
});
test("aprovacao automatica ou manual dispensa nova consulta; cortesia sozinha nao", () => {
  assert.equal(isPaidRegistryVerificationComplete({ cfp_verified_at: "2026-01-01" }), true);
  assert.equal(isPaidRegistryVerificationComplete({ crp_status: "aprovado" }), true);
  assert.equal(isPaidRegistryVerificationComplete({}), false);
  assert.equal(
    getPaidSubscriptionNextPath(
      { ...user, psychologist_profile: { whatsapp: "5511999999999" } },
      { ...subscription, source: "admin_grant" },
      false,
    ),
    paths.cfp,
  );
});
test("assinatura pendente, expirada ou ausente nao libera beneficios", () => {
  for (const current of [
    null,
    { ...subscription, status: "inativa" },
    { ...subscription, current_period_end: "2000-01-01" },
    { ...subscription, current_period_end: "invalid" },
  ]) {
    assert.equal(getPaidSubscriptionNextPath(user, current, true), paths.plans);
  }
});
test("contrato antigo nao presume endereco fiscal e telefone vazio nao vale", () => {
  assert.equal(getPaidSubscriptionNextPath(user, subscription, undefined), paths.billingAddress);
  assert.equal(
    getPaidSubscriptionNextPath(
      { ...user, psychologist_profile: { whatsapp: " " } },
      subscription,
      true,
    ),
    paths.phone,
  );
});
test("reutiliza e normaliza endereco salvo, preservando campos ausentes", () => {
  assert.deepEqual(
    getProfileBillingAddress({
      professional_address_zip: "01310-100",
      professional_address_street: " Avenida Paulista ",
      professional_address_number: "1000",
      professional_address_state: "sp",
    }),
    {
      zip: "01310100",
      street: "Avenida Paulista",
      number: "1000",
      complement: "",
      district: "",
      city: "",
      state: "SP",
    },
  );
});
