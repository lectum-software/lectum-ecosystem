import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildStripeBillingReturnUrl,
  cleanStripeBillingReturnSearch,
  getStripeElementErrorMessage,
  isStripeBillingQuoteValid,
  isStripePublishableKey,
  readStripeBillingReturn,
  STRIPE_BILLING_RETURN_PATH,
  stripeCompletedOperationDestination,
  stripeInactiveBillingCopy,
} from "./stripe-billing.ts";
import { hasSubscriptionBenefits } from "./subscription-period.ts";

const quote = {
  revision: "offer-revision",
  amount_cents: 2990,
  amount_due_now_cents: 2990,
  currency: "brl",
  interval: "month",
  intent: "subscription",
  scheduled_start_at: null,
};
const id = "00000000-0000-4000-8000-000000000001";
const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Stripe inativa descreve ausência de período vigente sem afirmar primeiro pagamento pendente", () => {
  const copy = stripeInactiveBillingCopy({ gateway: "stripe", status: "inativa" });
  assert.deepEqual(copy, {
    label: "Sem período ativo",
    title: "Confira sua assinatura",
    message:
      "Não há período pago vigente confirmado. Confira o histórico de pagamentos e o status da assinatura antes de tentar novamente.",
  });
  assert.doesNotMatch(
    copy.message,
    /será ativada|já foi enviada|primeiro pagamento|pague|assine novamente|não houve cobrança/i,
  );
  for (const subscription of [
    null,
    undefined,
    { gateway: "mercadopago", status: "inativa" },
    { gateway: "stripe", status: "ativa" },
    { gateway: "stripe", status: "inadimplente" },
    { gateway: "stripe", status: "cancelada" },
    { status: "inativa" },
  ])
    assert.equal(stripeInactiveBillingCopy(subscription), null);
  const page = source("../app/app/professional/billing/logic.tsx");
  assert.match(page, /stripeInactiveBillingCopy\(subscription\)/);
  assert.match(page, /inactiveCopy\?\.label/);
  assert.match(page, /inactiveCopy\?\.message/);
  assert.match(
    page,
    /A assinatura já foi enviada para confirmação e será ativada quando o pagamento retornar com sucesso\./,
  );
});

test("quote servidor mantém centavos e diferencia cobrança imediata de cortesia", () => {
  assert.equal(isStripeBillingQuoteValid(quote), true);
  assert.equal(
    isStripeBillingQuoteValid({ ...quote, amount_cents: 3990, amount_due_now_cents: 3990 }),
    true,
  );
  assert.equal(isStripeBillingQuoteValid({ ...quote, amount_due_now_cents: 0 }), false);
  assert.equal(
    isStripeBillingQuoteValid({
      ...quote,
      intent: "courtesy_renewal",
      amount_due_now_cents: 0,
      scheduled_start_at: "2030-01-01T00:00:00Z",
    }),
    true,
  );
  for (const value of [
    undefined,
    { ...quote, currency: "usd" },
    { ...quote, amount_cents: 29.9 },
    { ...quote, amount_due_now_cents: -1 },
    { ...quote, amount_cents: NaN },
    { ...quote, revision: "" },
    { ...quote, intent: "courtesy_renewal" },
    { ...quote, interval: "year" },
  ]) {
    assert.equal(isStripeBillingQuoteValid(value), false);
  }
});

test("chave publicável tem formato fechado sem aceitar segredo ou coerção", () => {
  assert.equal(isStripePublishableKey(`pk_test_${"a".repeat(32)}`), true);
  assert.equal(isStripePublishableKey(`pk_live_${"a".repeat(32)}`), true);
  for (const value of [
    null,
    {},
    123,
    `sk_test_${"a".repeat(32)}`,
    `rk_test_${"a".repeat(32)}`,
    `pk_test_${"a".repeat(32)}\n`,
    "pk_test_<script>",
  ]) {
    assert.equal(isStripePublishableKey(value), false);
  }
});

test("retorno conserva somente identidade local e fluxo; nunca segredo ou resultado remoto", () => {
  const clean = `?flow=checkout&operation=${id}`;
  assert.equal(
    cleanStripeBillingReturnSearch(
      `${clean}&payment_intent=pi_example&payment_intent_client_secret=synthetic&redirect_status=succeeded&email=example%40test.invalid`,
    ),
    clean,
  );
  assert.equal(
    cleanStripeBillingReturnSearch(
      `?setup_intent_client_secret=synthetic&flow=payment-method&operation=${id}`,
    ),
    `?flow=payment-method&operation=${id}`,
  );
  assert.deepEqual(readStripeBillingReturn(clean), { id, kind: "checkout" });
  assert.equal(
    buildStripeBillingReturnUrl("https://lectum.example", "checkout", id),
    `https://lectum.example${STRIPE_BILLING_RETURN_PATH}${clean}`,
  );
  for (const search of [
    "",
    "?flow=other&operation=123",
    "?flow=checkout&operation=pi_example_secret_value",
    "?flow=checkout&operation=https://evil.example",
    "?flow=payment-method&operation=../private",
  ]) {
    assert.equal(readStripeBillingReturn(search), null);
    assert.equal(cleanStripeBillingReturnSearch(search), "");
  }
  assert.throws(() =>
    buildStripeBillingReturnUrl("https://lectum.example", "checkout", "pi_secret_value"),
  );
});

test("erros Elements usam allowlist local, nunca message ou objeto remoto", () => {
  assert.equal(
    getStripeElementErrorMessage({ code: "incorrect_cvc", message: "secret=synthetic" }),
    "Confira o código de segurança do cartão.",
  );
  assert.equal(
    getStripeElementErrorMessage({ type: "validation_error", message: "raw" }),
    "Revise os dados do cartão para continuar.",
  );
  for (const code of ["constructor", "__proto__", "unknown", undefined]) {
    const message = getStripeElementErrorMessage({
      code,
      message: "user@example.test token=synthetic",
      payment_intent: { client_secret: "synthetic" },
    });
    assert.match(message, /se houve cobrança antes de tentar novamente/);
    assert.doesNotMatch(message, /secret|synthetic|example|recus|nenhuma cobrança/i);
  }
});

test("Stripe cancelado preserva somente período pago com limite exclusivo", () => {
  const end = "2030-01-02T00:00:00Z";
  const now = Date.parse("2030-01-01T00:00:00Z");
  for (const gateway of ["stripe", "mercadopago"]) {
    const value = { status: "cancelada", source: gateway, current_period_end: end };
    assert.equal(hasSubscriptionBenefits(value, now), true);
    assert.equal(hasSubscriptionBenefits(value, Date.parse(end)), false);
    assert.equal(hasSubscriptionBenefits({ ...value, current_period_end: null }, now), false);
  }
  assert.equal(
    hasSubscriptionBenefits(
      { status: "cancelada", source: "admin_grant", current_period_end: end },
      now,
    ),
    false,
  );
  assert.equal(
    hasSubscriptionBenefits({ status: "inativa", source: "stripe", current_period_end: end }, now),
    false,
  );
});

test("provedores usam módulos lazy distintos e config é autoridade, sem env Stripe pública", () => {
  for (const route of ["checkout", "card"]) {
    const wrapper = source(`../app/app/professional/billing/${route}/logic.tsx`);
    assert.match(wrapper, /dynamic\(/);
    assert.match(wrapper, /useStripeBillingConfig/);
    assert.doesNotMatch(wrapper, /@mercadopago|@stripe\/|initMercadoPago|loadStripe/);
    assert.match(wrapper, /provider === "mercadopago"/);
    assert.match(wrapper, /provider === "stripe"/);
  }
  const req = source("../api/req/psychologist-billing/stripe.ts");
  assert.match(req, /getApiErrorHttpStatus\(error\) === 404/);
  assert.doesNotMatch(req, /NEXT_PUBLIC_STRIPE|card_token|price_id|client_secret/);
});

test("validação antecede begin, SDK confirma e backend verifica sem sucesso otimista", () => {
  const form = source("../app/app/professional/billing/components/stripe-payment-form.tsx");
  assert.ok(form.indexOf("await elements.submit()") < form.indexOf("await operation.begin()"));
  assert.ok(
    form.indexOf("await stripe.confirmPayment(options)") < form.indexOf("await operation.verify()"),
  );
  assert.match(form, /redirect: "if_required"/);
  assert.match(form, /mode: "subscription", amount: config.quote.amount_due_now_cents/);
  assert.match(form, /mode: "setup"/);
  assert.match(form, /allowedPaymentMethodTypes: \["card"\]/);
  assert.match(form, /link: "never"/);
  assert.match(form, /submitLock.current/);
  assert.doesNotMatch(
    form,
    /localStorage|sessionStorage|console\.|confirmed\.paymentIntent\.status|confirmed\.setupIntent\.status/,
  );
  const operation = source("../app/app/professional/billing/components/use-stripe-operation.ts");
  assert.match(operation, /requestKeyRef.current \?\?= crypto.randomUUID\(\)/);
  assert.match(operation, /mutation.reset\(\)/);
  assert.doesNotMatch(operation, /client_secret|setQueryData/);
  assert.match(operation, /pollCountRef.current >= 20/);
});

test("scrub servidor precede auth redirect e retorno não carrega SDK de cobrança", () => {
  const proxy = source("../proxy.ts");
  assert.ok(
    proxy.indexOf("pathname === STRIPE_BILLING_RETURN_PATH") <
      proxy.indexOf("const currentPathWithSearch"),
  );
  assert.match(proxy, /Cache-Control", "no-store"/);
  assert.match(proxy, /Referrer-Policy", "no-referrer"/);
  const page = source("../app/app/professional/billing/return/logic.tsx");
  assert.doesNotMatch(
    page,
    /@stripe|client_secret|createStripeBillingCheckout|createStripeBillingPaymentMethod/,
  );
  assert.match(page, /getPsychologistBillingCurrent/);
  const csp = source("../../next.config.ts");
  assert.match(csp, /https:\/\/js\.stripe\.com/);
  assert.match(csp, /https:\/\/hooks\.stripe\.com/);
  assert.match(csp, /https:\/\/api\.stripe\.com/);
  assert.match(csp, /incomingRequests: \{ ignore:/);
  assert.doesNotMatch(csp, /https:\/\/\*\.stripe\.com|https:\/\/link\.com/);
});

test("operação concluída não inventa benefício: retorno e checkout distinguem vigência atual", () => {
  for (const kind of ["checkout", "payment_method"]) {
    for (const hasCurrentProfessionalBenefits of [true, false]) {
      for (const courtesy of [true, false]) {
        assert.equal(
          stripeCompletedOperationDestination({ kind, hasCurrentProfessionalBenefits, courtesy }),
          kind === "checkout" && hasCurrentProfessionalBenefits && !courtesy
            ? "onboarding"
            : "billing",
        );
      }
    }
  }
  for (const route of ["checkout", "return"]) {
    const code = source(
      `../app/app/professional/billing/${route}/stripe-logic.tsx`.replace(
        "return/stripe-logic",
        "return/logic",
      ),
    );
    assert.match(code, /stripeCompletedOperationDestination\(/);
    assert.match(
      code,
      /hasCurrentProfessionalBenefits: isProfessionalSubscriptionActive\(fresh.current\)/,
    );
    assert.match(code, /destination === "onboarding"/);
    assert.doesNotMatch(
      code,
      /if \(!isProfessionalSubscriptionActive\(fresh.current\)\) return false/,
    );
  }
  // The generic hook still supports transient incomplete handling for other operation kinds.
  assert.match(
    source("../app/app/professional/billing/components/use-stripe-operation.ts"),
    /if \(!completed && mountedRef.current\)/,
  );
});
