import "./register-source-modules.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { FiscalRequirementsMessage } = await import(
  "../src/app/app/professional/billing/components/fiscal-requirements-message.tsx"
);
const { PaymentHistoryCard } = await import(
  "../src/app/app/professional/billing/components/payment-history-card.tsx"
);
const requirement = (next_action) => ({
  address_complete: next_action !== "billing_address",
  identity_complete: next_action === "none",
  next_action,
});
const render = (action, props = {}) =>
  renderToStaticMarkup(
    createElement(FiscalRequirementsMessage, {
      requirements: action ? requirement(action) : undefined,
      testMode: false,
      canReviewAddress: true,
      ...props,
    }),
  );

test("fiscal actions distinguish address, CFP, prior onboarding and support without retrying payment", () => {
  for (const [action, href, label] of [
    ["billing_address", "/app/profissional/assinatura/endereco", "Completar endereço fiscal"],
    ["registry_verification", "/app/profissional/cfp", "Concluir verificação no CFP"],
    ["complete_registration", "/app/profissional/assinatura/concluir", "Continuar cadastro"],
    ["support", "mailto:suporte@lectum.com.br", "Falar com o suporte"],
  ]) {
    const html = render(action);
    assert.ok(html.includes(href));
    assert.ok(html.includes(label));
    assert.match(html, /pagamento já foi confirmado/);
    assert.match(html, /não é necessário pagar novamente/);
    assert.doesNotMatch(html, /<button|recipient_incomplete|client_secret|document=|cpf=/);
  }
  assert.doesNotMatch(render("support"), /href="\/app\/profissional\/cfp"/);
  const skew = render("billing_address", { canReviewAddress: false });
  assert.match(skew, /Falar com o suporte/);
  assert.doesNotMatch(skew, /href="\/app\/profissional\/assinatura\/endereco"/);
});

test("ready data and old backends do not claim processing or government authorization", () => {
  const ready = render("none");
  assert.match(ready, /Dados fiscais completos/);
  assert.doesNotMatch(ready, /<a|Baixar|autorizada|em preparação|processamento/);
  const legacy = render();
  assert.match(legacy, /Nota fiscal ainda não disponível/);
  assert.match(legacy, /Conferir endereço fiscal/);
  assert.doesNotMatch(render(undefined, { canReviewAddress: false }), /<a/);
  assert.doesNotMatch(render("unexpected_future_action"), /<a|autorizada/);
  assert.doesNotMatch(render("__proto__"), /<a|autorizada/);
  assert.match(render("registry_verification", { testMode: true }), /sem valor fiscal/);
});

test("only positive confirmed Stripe payments without a document expose fiscal remediation", () => {
  const item = {
    id: "render-only",
    title: "Assinatura mensal",
    gateway: "stripe",
    amount_cents: 2990,
    status: "pago",
    status_label: "Sucesso",
  };
  const history = (changes) =>
    renderToStaticMarkup(
      createElement(PaymentHistoryCard, {
        items: [{ ...item, ...changes }],
        fiscalRequirements: requirement("registry_verification"),
      }),
    );
  assert.match(history({}), /Concluir verificação no CFP/);
  for (const changes of [
    { status: "pendente" },
    { status: "processado" },
    { status: "recusado" },
    { amount_cents: 0 },
    { gateway: "mercadopago" },
    { invoice: { status: "processing", downloadable: false } },
  ])
    assert.doesNotMatch(
      history(changes),
      /Concluir verificação no CFP|pagamento já foi confirmado/,
    );
  assert.match(
    history({ invoice: { status: "processing", downloadable: false } }),
    /processamento/,
  );
});
