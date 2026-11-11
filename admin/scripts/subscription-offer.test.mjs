import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const base = new URL("../src/app/(admin)/configuracoes/assinatura/", import.meta.url);
const offerSource = new URL("components/checkout-offer-card.tsx", base);
const planSource = new URL("components/plan-definition-card.tsx", base);
const supportSource = new URL("modules/offer-presentation.ts", base);
const utils = new URL("../src/lib/utils.ts", import.meta.url);
const sources = [offerSource.href, planSource.href, supportSource.href, utils.href];
// Execute the production components and pure formatter, not substituted hooks or providers.
const hooks = registerHooks({
  resolve(specifier, context, next) {
    const aliases = {
      "@/lib/utils": utils,
      "../modules/offer-presentation": supportSource,
    };
    return next(aliases[specifier] ? fileURLToPath(aliases[specifier]) : specifier, context);
  },
  load(url, context, next) {
    if (!sources.includes(url)) return next(url, context);
    return {
      format: "commonjs",
      source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        fileName: fileURLToPath(url),
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      shortCircuit: true,
    };
  },
});
let CheckoutOfferCard,
  PlanDefinitionCard,
  getOfferPresentation,
  formatOfferMoney,
  formatOfferCadence,
  formatOfferDate;
try {
  const load = createRequire(import.meta.url);
  ({ CheckoutOfferCard } = load(fileURLToPath(offerSource)));
  ({ PlanDefinitionCard } = load(fileURLToPath(planSource)));
  ({ getOfferPresentation, formatOfferMoney, formatOfferCadence, formatOfferDate } = load(
    fileURLToPath(supportSource),
  ));
} finally {
  hooks.deregister();
}
const checkout = (overrides = {}) => ({
  source: "local_configuration",
  gateway: "stripe",
  mode: "live",
  status: "configured",
  remote_readiness: "not_checked",
  collection_enabled: true,
  reconciliation_enabled: true,
  offer: { revision: 2, checkout_enabled: true, updated_at: "2026-11-10T20:00:00Z" },
  price: {
    source: "billing_price_version",
    amount_cents: 2990,
    currency: "BRL",
    interval: "month",
    interval_count: 1,
    created_at: "2026-11-09T20:00:00Z",
  },
  ...overrides,
});
const plan = {
  active: true,
  name: "Plano Profissional",
  currency: "BRL",
  price_cents: 1990,
  interval: "month",
  updated_at: "2026-11-01T20:00:00Z",
  gateway_plan_configured: true,
};
const renderOffer = (value) =>
  renderToStaticMarkup(createElement(CheckoutOfferCard, { checkout: value }));
const renderPlan = (value) =>
  renderToStaticMarkup(createElement(PlanDefinitionCard, { plan: value }));

test("backend antigo não apresenta cadastro legado como oferta vigente", () => {
  const html = renderOffer(undefined);
  assert.match(html, /Oferta atual não informada/);
  assert.match(html, /não comprova o preço vigente/);
  assert.match(html, /Preço da oferta indisponível/);
  assert.doesNotMatch(html, /R\$|Habilitada na configuração local|<button|<form|<input/);
});

test("Stripe usa preço versionado e preserva distinção do cadastro legado", () => {
  const html = renderOffer(checkout());
  assert.match(html, /29,90/);
  assert.match(html, /preço versionado da oferta Stripe/);
  assert.match(html, /Habilitada na configuração local/);
  assert.match(html, /Disponibilidade do provedor/);
  assert.match(html, /Não consultada/);
  assert.match(html, /nem altera preço, vendas, cobranças ou contratos/);
  const legacy = renderPlan(plan);
  assert.match(legacy, /19,90/);
  assert.match(legacy, /Valor de referência/);
  assert.match(legacy, /Cadastro ativo/);
  assert.match(legacy, /não substitui o preço versionado Stripe/);
});

test("oferta pausada mantém valor configurado sem afirmar venda ou cancelar benefício", () => {
  const html = renderOffer(
    checkout({
      status: "paused",
      offer: { revision: 3, checkout_enabled: false, updated_at: "2026-11-10T20:00:00Z" },
    }),
  );
  assert.match(html, /Novas adesões pausadas/);
  assert.match(html, /29,90/);
  assert.match(html, /valor não disponível para novas adesões/);
  assert.match(html, /Esta consulta não altera contratos ou benefícios/);
  assert.match(renderPlan({ ...plan, active: false }), /Cadastro inativo/);
});

for (const status of [
  "not_configured",
  "invalid_configuration",
  "invalid_offer",
  "unexpected",
  "constructor",
  "__proto__",
]) {
  test(`estado ${status} não exibe preço como oferta`, () => {
    const html = renderOffer(checkout({ status }));
    assert.match(html, /Preço da oferta indisponível/);
    assert.doesNotMatch(html, /29,90|Habilitada na configuração local/);
  });
}

test("configuração ausente ou desativada tem apresentação conservadora", () => {
  const html = renderOffer(
    checkout({
      gateway: "disabled",
      mode: null,
      status: "paused",
      offer: null,
      price: null,
      collection_enabled: false,
      reconciliation_enabled: false,
    }),
  );
  assert.match(html, /Novas adesões desativadas/);
  assert.match(html, /Sem oferta vinculada/);
  assert.doesNotMatch(html, /29,90|Habilitado localmente/);
});

test("Stripe nunca apresenta preço legado nem identidade externa da resposta", () => {
  const data = checkout();
  const html = renderOffer({
    ...data,
    account_id: "account-private",
    price: { ...data.price, source: "subscription_plan", id: "price-private" },
  });
  assert.match(html, /Preço da oferta indisponível/);
  assert.doesNotMatch(html, /29,90|account-private|price-private/);
});

test("MP explicita fonte legada sem apresentar preço Stripe como catálogo MP", () => {
  const data = checkout({ gateway: "mercadopago", mode: null, offer: null });
  const html = renderOffer({
    ...data,
    price: { ...data.price, source: "subscription_plan", amount_cents: 1990 },
  });
  assert.match(html, /19,90/);
  assert.match(html, /cadastro do plano para Mercado Pago/);
  assert.doesNotMatch(html, /preço versionado da oferta Stripe/);
  assert.equal(getOfferPresentation(data).price, null);
});

test("teste e flags são locais, sem confundir com disponibilidade remota", () => {
  const html = renderOffer(
    checkout({
      mode: "test",
      collection_enabled: false,
      reconciliation_enabled: false,
      status: "paused",
    }),
  );
  assert.match(html, /Teste · sem valor real/);
  assert.match(html, /Desabilitado localmente/);
  assert.match(html, /Desabilitada localmente/);
  assert.match(html, /Não consultada/);
  assert.doesNotMatch(html, /<button|<form|<input/);
});

test("formatação não presume BRL/mês e rejeita valores/cadências inválidos", () => {
  assert.match(formatOfferMoney(12500, "USD"), /125,00/);
  assert.equal(formatOfferCadence("month", 3), "a cada 3 meses");
  assert.equal(formatOfferCadence("year"), "/ ano");
  for (const value of [-1, NaN, Infinity, 0.1, Number.MAX_SAFE_INTEGER + 1])
    assert.equal(formatOfferMoney(value), null);
  assert.equal(formatOfferMoney(2990, "invalid-currency"), null);
  for (const value of ["__proto__", "constructor", "forever"])
    assert.equal(formatOfferCadence(value), null);
  assert.equal(formatOfferCadence("month", 0), null);
  assert.equal(formatOfferDate("invalid"), "Não informado");
  const data = checkout();
  assert.equal(
    getOfferPresentation({ ...data, price: { ...data.price, interval_count: 0 } }).price,
    null,
  );
});

test("fonte ou readiness desconhecidos não afirmam habilitação local", () => {
  for (const overrides of [{ source: "unknown" }, { remote_readiness: "checked" }]) {
    const html = renderOffer(checkout(overrides));
    assert.match(html, /Configuração indisponível/);
    assert.match(html, /Preço da oferta indisponível/);
    assert.doesNotMatch(html, /29,90|Habilitada na configuração local/);
  }
});

test("configuração declarada sem preço utilizável exige revisão", () => {
  for (const price of [
    null,
    { ...checkout().price, source: "subscription_plan" },
    { ...checkout().price, amount_cents: -1 },
  ]) {
    const html = renderOffer(checkout({ price }));
    assert.match(html, /Oferta precisa de revisão/);
    assert.doesNotMatch(html, /Habilitada na configuração local/);
  }
});
