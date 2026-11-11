import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  billingAddressAccess,
  billingMaintenanceSubscription,
  canManageBillingContract,
  shouldExplainStripeInvoice,
} from "./billing-management.ts";
import "./billing-plan-offer.test.mjs";
import {
  buildStripeBillingReturnUrl,
  canReplaceStripePendingCard,
  canRetryStripeBillingOperation,
  cleanStripeBillingReturnSearch,
  getStripeElementErrorMessage,
  isStripeBillingActionPending,
  isStripeBillingQuoteValid,
  isStripePublishableKey,
  readStripeBillingConfirmation,
  readStripeBillingReturn,
  STRIPE_BILLING_RETURN_PATH,
  stripeBillingConfirmationKind,
  stripeBillingOperationErrorCode,
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
  assert.match(req, /const flowVersion = "credit_only_v1"/);
  assert.equal(req.match(/flow_version: flowVersion/g)?.length, 3);
  assert.match(req, /authorizePayment = false/);
  assert.match(req, /confirm_payment: kind === "checkout" && authorizePayment === true/);
});

test("somente setup e autenticação manual atravessam a política do cliente", () => {
  const response = (type, client_secret, confirmation_kind = type) => ({
    operation: {
      id,
      kind: "checkout",
      state: "requires_confirmation",
      confirmation_kind,
      confirmation: { type, client_secret },
    },
  });
  const setup = response("setup", "seti_contracttest_secret_transient");
  const action = response("action", "pi_contracttest_secret_transient");
  assert.deepEqual(readStripeBillingConfirmation(setup), setup.operation.confirmation);
  assert.deepEqual(readStripeBillingConfirmation(action), action.operation.confirmation);
  assert.equal(stripeBillingConfirmationKind("setup"), "setup");
  assert.equal(stripeBillingConfirmationKind("action"), "action");
  for (const value of ["payment", "unknown", null, undefined, {}, true])
    assert.equal(stripeBillingConfirmationKind(value), null);
  for (const invalid of [
    null,
    { operation: { state: "requires_confirmation", confirmation: null } },
    response("payment", "pi_contracttest_secret_transient"),
    response("setup", "pi_contracttest_secret_transient"),
    response("action", "seti_contracttest_secret_transient"),
    response("action", "pi_contracttest_secret_transient", "setup"),
    response("setup", "seti_contracttest_secret_transient", "payment"),
    response("setup", "seti_contracttest_secret_transient\n"),
    response("setup", `seti_contracttest_secret_${"a".repeat(512)}`),
    response("setup", "raw-provider-response"),
    response("action", null),
    { operation: { ...action.operation, state: "processing" } },
    { operation: { ...action.operation, state: "complete" } },
  ])
    assert.equal(readStripeBillingConfirmation(invalid), null);
});

test("reinício explícito exige falha terminal confirmada pelo backend", () => {
  assert.equal(canRetryStripeBillingOperation("failed"), true);
  for (const state of [
    "reserved",
    "creating",
    "requires_confirmation",
    "processing",
    "complete",
    "review_required",
    null,
    undefined,
    "unknown",
  ])
    assert.equal(canRetryStripeBillingOperation(state), false);
});

test("código público de troca necessária não transporta detalhe técnico", () => {
  assert.equal(
    stripeBillingOperationErrorCode("billing_payment_method_update_required"),
    "billing_payment_method_update_required",
  );
  assert.equal(
    stripeBillingOperationErrorCode("billing_payment_method_credit_card_only"),
    "billing_payment_method_credit_card_only",
  );
  for (const value of [null, undefined, "decline_code", "unknown", {}, "constructor"])
    assert.equal(stripeBillingOperationErrorCode(value), null);
});

test("pagamento pendente retoma autenticação sem exigir nova assinatura nem perder período vigente", () => {
  const operation = {
    id,
    kind: "checkout",
    state: "requires_confirmation",
    confirmation_kind: "action",
  };
  assert.equal(isStripeBillingActionPending(operation), true);
  assert.equal(isStripeBillingActionPending({ ...operation, state: "processing" }), true);
  for (const value of [
    null,
    undefined,
    { ...operation, kind: "payment_method" },
    { ...operation, confirmation_kind: "setup" },
    { ...operation, confirmation_kind: null },
    { ...operation, state: "complete" },
    { ...operation, state: "failed" },
  ])
    assert.equal(isStripeBillingActionPending(value), false);
  const checkout = source("../app/app/professional/billing/checkout/stripe-logic.tsx");
  assert.match(checkout, /const redirectActive = alreadyActive && !resumingAction/);
  assert.match(checkout, /isStripeBillingActionPending\(config.pending_operation\)/);
  assert.match(checkout, /Confirmar pagamento pendente/);
});

test("SDK só salva/autentica, servidor confirma cobrança e verifica benefícios", () => {
  const form = source("../app/app/professional/billing/components/stripe-payment-form.tsx");
  assert.ok(form.indexOf("await elements.submit()") < form.indexOf("await operation.begin()"));
  assert.ok(
    form.indexOf("await stripe.confirmSetup(") < form.indexOf("await operation.verify(true)"),
  );
  assert.ok(
    form.indexOf("await operation.verify(true)") < form.indexOf("await stripe.handleNextAction("),
  );
  assert.ok(
    form.indexOf("await stripe.handleNextAction(") <
      form.lastIndexOf("await operation.verify(true)"),
  );
  assert.match(form, /readStripeBillingConfirmation\(result\)/);
  assert.match(form, /readStripeBillingConfirmation\(verified\)/);
  assert.match(form, /if \(!actionOnly && elements\)/);
  assert.match(form, /confirmation_kind === "action"/);
  assert.match(form, /redirect: "if_required"/);
  assert.match(form, /mode: "setup"/);
  assert.match(form, /isStripeBillingQuoteValid\(config.quote\)/);
  assert.match(form, /allowedPaymentMethodTypes: \["card"\]/);
  assert.match(form, /link: "never"/);
  assert.match(form, /submitLock.current/);
  assert.doesNotMatch(
    form,
    /localStorage|sessionStorage|console\.|confirmPayment|handleCardPayment|mode: "subscription"|confirmed\.paymentIntent\.status|confirmed\.setupIntent\.status/,
  );
  const operation = source("../app/app/professional/billing/components/use-stripe-operation.ts");
  assert.match(operation, /requestKeyRef.current \?\?= crypto.randomUUID\(\)/);
  assert.match(operation, /mutation.reset\(\)/);
  assert.doesNotMatch(operation, /client_secret|setQueryData/);
  assert.match(operation, /pollCountRef.current >= 20/);
  assert.match(operation, /async \(authorizePayment = false\)/);
  assert.match(operation, /if \(operationRef.current\) return verify\(true\)/);
  assert.equal(operation.match(/void verify\(\)/g)?.length, 2);
  assert.match(form, /href="\/app\/profissional\/assinatura\/cartao"/);
  assert.match(form, /Continuar pagamento/);
  assert.match(operation, /canRetryStripeBillingOperation\(operationRef.current\?\.state\)/);
  assert.match(form, /operation.retryFailed\(\)/);
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

test("financial phases remain reachable through processing/review without granting payment permission", () => {
  for (const state of ["requires_confirmation", "processing", "review_required"]) {
    assert.equal(
      isStripeBillingActionPending({
        id,
        kind: "checkout",
        state,
        payment_pending: true,
        confirmation_kind: null,
      }),
      true,
    );
  }
  for (const state of ["complete", "failed"])
    assert.equal(
      isStripeBillingActionPending({ id, kind: "checkout", state, payment_pending: true }),
      false,
    );
  const recovery = source("../app/app/professional/billing/components/stripe-recovery-action.tsx");
  assert.match(recovery, /useStripeBillingConfig/);
  assert.match(recovery, /Continuar pagamento/);
  assert.doesNotMatch(recovery, /mutate|confirmStripeBilling|verify\(true/);
});

test("only a definitive card rejection allows replacement alongside a pending checkout", () => {
  const pending = { id, kind: "checkout", state: "requires_confirmation", payment_pending: true };
  assert.equal(canReplaceStripePendingCard(null), true);
  assert.equal(canReplaceStripePendingCard({ ...pending, kind: "payment_method" }), true);
  for (const error_code of [
    "billing_payment_method_update_required",
    "billing_payment_method_credit_card_only",
  ])
    assert.equal(canReplaceStripePendingCard({ ...pending, error_code }), true);
  for (const state of ["processing", "review_required"])
    assert.equal(
      canReplaceStripePendingCard({
        ...pending,
        state,
        error_code: "billing_payment_method_update_required",
      }),
      false,
    );
  assert.equal(canReplaceStripePendingCard(pending), false);
  assert.equal(
    canReplaceStripePendingCard({
      ...pending,
      payment_pending: false,
      confirmation_kind: "setup",
      error_code: "billing_payment_method_update_required",
    }),
    false,
  );
  const card = source("../app/app/professional/billing/card/stripe-logic.tsx");
  assert.match(card, /canReplaceStripePendingCard\(config.pending_operation\)/);
});

test("courtesy benefits do not hide the scheduled contract for card maintenance and cancellation", () => {
  const courtesy = {
    id: "courtesy",
    source: "admin_grant",
    status: "ativa",
    plan: { slug: "profissional" },
  };
  const scheduled = {
    id: "scheduled",
    source: "stripe",
    gateway: "stripe",
    status: "inativa",
    gateway_subscription_id: "sub_scheduled",
    plan: { slug: "profissional" },
  };
  const response = {
    current: courtesy,
    subscription: courtesy,
    payment_method: null,
    maintenance_subscription: scheduled,
  };
  assert.equal(billingMaintenanceSubscription(response), scheduled);
  assert.equal(response.current, courtesy);
  assert.equal(canManageBillingContract(courtesy), false);
  for (const status of ["ativa", "inativa", "inadimplente"])
    assert.equal(canManageBillingContract({ ...scheduled, status }), true);
  assert.equal(canManageBillingContract({ ...scheduled, status: "cancelada" }), false);
  assert.equal(
    billingMaintenanceSubscription({ ...response, maintenance_subscription: null }),
    null,
  );
  assert.equal(
    billingMaintenanceSubscription({ ...response, maintenance_subscription: undefined }),
    null,
  );
  const legacy = { ...scheduled, source: "mercadopago", gateway: "mercadopago" };
  assert.equal(
    billingMaintenanceSubscription({ subscription: legacy, current: legacy, payment_method: null }),
    legacy,
  );
  const page = source("../app/app/professional/billing/logic.tsx");
  assert.match(page, /const canCancelSubscription = Boolean\(maintenance\)/);
  assert.match(page, /const paymentActionHref = canManageCard/);
  assert.match(page, /StripeRecoveryAction/);
  assert.match(
    source("../app/app/professional/billing/card/stripe-logic.tsx"),
    /billingMaintenanceSubscription/,
  );
});

test("incomplete fiscal onboarding does not hide cancellation or bank authentication", () => {
  const navigation = source("../templates/private/navigation.tsx");
  const guard = navigation.slice(
    navigation.indexOf("export const canStayDuringPaidOnboarding"),
    navigation.indexOf("export const getNavigationContextPathname"),
  );
  assert.match(guard, /PAID_ONBOARDING_MANAGEMENT_PATHS.has\(pathname\)/);
  assert.doesNotMatch(guard, /requiredPath === PSYCHOLOGIST_ONBOARDING_PATHS.billingAddress/);
  const paths = navigation.slice(
    navigation.indexOf("export const PAID_ONBOARDING_MANAGEMENT_PATHS"),
    navigation.indexOf("export const isPrimaryDesktopNavigationPath"),
  );
  for (const route of [
    "/app/profissional/assinatura",
    "/app/profissional/assinatura/cartao",
    "/app/profissional/assinatura/pagamento",
    "/app/profissional/assinatura/retorno",
  ])
    assert.ok(paths.includes(`"${route}"`));
});

test("fiscal maintenance capability survives cancellation/courtesy without implying benefits", () => {
  assert.deepEqual(billingAddressAccess(undefined, true, false), {
    editable: true,
    maintenanceOnly: false,
  });
  assert.deepEqual(billingAddressAccess(undefined, false, false), {
    editable: false,
    maintenanceOnly: false,
  });
  assert.deepEqual(billingAddressAccess(undefined, true, true), {
    editable: false,
    maintenanceOnly: false,
  });
  for (const active of [true, false])
    assert.deepEqual(
      billingAddressAccess(
        { billing_address_editable: true, billing_address_maintenance_only: true },
        active,
        active,
      ),
      { editable: true, maintenanceOnly: true },
    );
  assert.equal(
    billingAddressAccess({ billing_address_editable: false }, true, false).editable,
    false,
  );
  assert.deepEqual(
    billingAddressAccess(
      { billing_address_editable: true, billing_address_maintenance_only: false },
      true,
      true,
    ),
    { editable: true, maintenanceOnly: true },
  );
  const address = source("../app/app/professional/billing/address/logic.tsx");
  assert.match(
    address,
    /billingAddressAccess\(\s*billing.current.data,\s*activeProfessional,\s*activeCourtesy,?\s*\)/,
  );
  assert.match(address, /if \(isLoading \|\| currentIsError \|\| editable\) return/);
  assert.match(address, /Salvar endereço fiscal/);
  assert.match(
    address,
    /const isLoading = billing.current.isPending \|\| billing.current.isFetching/,
  );
  assert.match(
    source("../templates/private/navigation.tsx"),
    /"\/app\/profissional\/assinatura\/endereco"/,
  );
});

test("fiscal hint only describes actual paid positive Stripe history without a document", () => {
  const paid = { gateway: "stripe", status: "pago", amount_cents: 2990 };
  assert.equal(shouldExplainStripeInvoice(paid), true);
  for (const change of [
    { gateway: "mercadopago" },
    { amount_cents: 0 },
    { amount_cents: -1 },
    { status: "processado" },
    { status: "recusado" },
    { status: "pendente" },
    { invoice: { status: "authorized" } },
  ])
    assert.equal(shouldExplainStripeInvoice({ ...paid, ...change }), false);
  assert.match(
    source("../app/app/professional/billing/components/stripe-payment-form.tsx"),
    /Após o pagamento, confirme seus dados fiscais e endereço/,
  );
  assert.match(
    source("../app/app/professional/billing/components/payment-history-card.tsx"),
    /canReviewAddress/,
  );
});
