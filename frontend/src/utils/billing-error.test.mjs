import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/api/errors") {
      return { shortCircuit: true, url: new URL("../api/errors.ts", import.meta.url).href };
    }
    return nextResolve(specifier, context);
  },
});

const { getBillingMutationErrorMessage } = await import("./billing-error.ts");
const { getSafeApiErrorMessage } = await import("../api/errors.ts");
const messages = {
  billing_gateway_checkout_failed:
    "Não foi possível concluir a assinatura agora. Verifique o status da assinatura e se houve cobrança antes de tentar novamente.",
  billing_gateway_payment_method_failed:
    "Não foi possível concluir a atualização do cartão agora. Verifique o cartão cadastrado, o status da assinatura e se houve cobrança antes de tentar novamente.",
  billing_gateway_card_declined:
    "Não foi possível aprovar este cartão. Revise os dados ou tente outro cartão.",
  billing_gateway_card_insufficient_amount:
    "O cartão foi recusado por limite ou saldo insuficiente. Tente outro cartão.",
  billing_gateway_card_security_code: "Confira o código de segurança do cartão e tente novamente.",
  billing_checkout_credit_card_only: "Use um cartão de crédito para assinar o Plano Profissional.",
  billing_checkout_email_required: "E-mail da conta não encontrado para iniciar a assinatura.",
  billing_courtesy_renewal_required:
    "A cortesia profissional ativa precisa ter data de expiração para cadastrar o cartão de cobrança futura.",
  billing_payment_method_credit_card_only:
    "Use um cartão de crédito para atualizar o método de pagamento.",
  billing_payment_method_subscription_required:
    "É preciso ter uma assinatura profissional ativa com método de pagamento cadastrado para alterar o cartão.",
};
const backendError = (status, code, error = "Texto remoto não deve ser exibido.") => ({
  response: { status, data: { status, success: false, code, error } },
});
const operations = [
  ["checkout", "billing_gateway_checkout_failed"],
  ["payment-method", "billing_gateway_payment_method_failed"],
];

test("gateway sem classificação usa orientação cautelosa, não diagnóstico de rede ou cartão", () => {
  for (const [operation, code] of operations) {
    const fallback = messages[code];
    assert.match(fallback, /se houve cobrança antes de tentar novamente/);
    assert.doesNotMatch(fallback, /recus|conectar|não houve|nenhuma cobrança/i);
    for (const status of [400, 402, 409, 422, 500, 502, 503, 504]) {
      const error = backendError(status, code, "Não foi possível conectar ao serviço.");
      error.response.data.diagnostic = "provider_error_unclassified";
      error.response.data.diagnostic_hints = ["card_validation", "rejected"];
      assert.equal(getBillingMutationErrorMessage(error, operation), fallback);
    }
  }
});

test("timeout e ausência de resposta não afirmam o resultado financeiro", () => {
  const normalizedTransportError = Object.assign(
    new Error("Não foi possível conectar ao serviço."),
    { data: { status: 400, method: "POST" } },
  );
  for (const [operation, code] of operations) {
    for (const error of [
      undefined,
      new Error("Network Error"),
      new Error("timeout of 30000ms exceeded"),
      normalizedTransportError,
      backendError(408),
    ]) {
      assert.equal(getBillingMutationErrorMessage(error, operation), messages[code]);
    }
  }
});

test("recusas classificadas usam apenas a cópia controlada do código público", () => {
  for (const [code, message] of Object.entries(messages)) {
    if (!code.startsWith("billing_gateway_card_")) continue;
    for (const [operation] of operations) {
      assert.equal(
        getBillingMutationErrorMessage(
          backendError(402, code, "cc_rejected_high_risk user@example.test token=synthetic"),
          operation,
        ),
        message,
      );
      const normalizedError = Object.assign(new Error("ignored"), {
        httpStatus: 402,
        data: { status: 402, code, error: "Texto não confiável." },
      });
      assert.equal(getBillingMutationErrorMessage(normalizedError, operation), message);
    }
  }
});

test("códigos desconhecidos, diagnósticos, dados pessoais e propriedades herdadas não viram copy", () => {
  for (const [operation, fallbackCode] of operations) {
    for (const code of [
      undefined,
      "unknown",
      "constructor",
      "__proto__",
      "cc_rejected_high_risk",
      "card_validation",
      "provider_error_unclassified",
    ]) {
      assert.equal(
        getBillingMutationErrorMessage(
          backendError(400, code, "O cartão de user@example.test foi recusado. token=synthetic"),
          operation,
        ),
        messages[fallbackCode],
      );
    }
  }
});

test("401/403 preservam sessão e permissão e não confiam no body", () => {
  for (const [operation] of operations) {
    for (const status of [401, 403, 404, 429]) {
      assert.equal(
        getBillingMutationErrorMessage(
          backendError(status, "billing_gateway_card_declined", "Texto arbitrário."),
          operation,
        ),
        getSafeApiErrorMessage({ status }),
      );
    }
  }
});

test("erros conhecidos de entrada mantêm orientação sem exibir body técnico", () => {
  for (const code of [
    "billing_checkout_credit_card_only",
    "billing_checkout_email_required",
    "billing_courtesy_renewal_required",
    "billing_payment_method_credit_card_only",
    "billing_payment_method_subscription_required",
  ]) {
    assert.equal(
      getBillingMutationErrorMessage(backendError(400, code, "Invalid input"), "checkout"),
      messages[code],
    );
  }
});

test("5xx prevalece sobre um código conflitante de recusa e não infere resultado", () => {
  assert.equal(
    getBillingMutationErrorMessage(backendError(502, "billing_gateway_card_declined"), "checkout"),
    messages.billing_gateway_checkout_failed,
  );
});

test("somente os dois submits usam toast de domínio; admin view-as continua silencioso", () => {
  const req = readFileSync(
    new URL("../api/req/psychologist-billing/index.ts", import.meta.url),
    "utf8",
  );
  for (const response of ["BillingCheckoutResponse", "BillingPaymentMethodResponse"]) {
    assert.ok(req.includes(`handleReq<${response}>({ ...handle, hideError: true })`));
  }
  for (const [route, operation] of [
    ["checkout", "checkout"],
    ["card", "payment-method"],
  ]) {
    const source = readFileSync(
      new URL(`../app/app/professional/billing/${route}/logic.tsx`, import.meta.url),
      "utf8",
    );
    assert.ok(
      source.includes(
        `if (!isAdminViewAsReadOnlyError(error)) {\n          toast.error(getBillingMutationErrorMessage(error, "${operation}"));`,
      ),
    );
    if (route === "card")
      assert.match(
        source,
        /getBillingMutationErrorMessage\(\s*billing\.paymentMethod\.error,\s*"payment-method",?\s*\)/,
      );
  }
});

test("mensagens públicas genéricas não mudam fora do domínio de billing", () => {
  assert.equal(
    getSafeApiErrorMessage(new Error("Network Error"), "Não foi possível conectar ao serviço."),
    "Não foi possível conectar ao serviço.",
  );
  assert.equal(
    getSafeApiErrorMessage(backendError(502, "billing_gateway_checkout_failed")),
    "Serviço temporariamente indisponível. Tente novamente.",
  );
});
