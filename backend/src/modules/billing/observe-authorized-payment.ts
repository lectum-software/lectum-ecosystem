import { billingReference, classifyBillingPayment } from "./payment-gateway/observability";
import type { PaymentGateway } from "./payment-gateway/PaymentGateway";

type LocalReference = {
  id?: string | null;
  gateway_subscription_id?: string | null;
  gateway?: string | null;
};

type ObservationInput = {
  gateway: Pick<PaymentGateway, "getAuthorizedPayment">;
  repository: {
    findSubscriptionByGatewayReference(input: {
      subscriptionId?: string | null;
      gatewaySubscriptionId: string;
    }): Promise<LocalReference | null>;
  };
  resourceId: string;
};

export const shouldObserveAuthorizedPayment = (type: string, created: boolean) =>
  created && type === "subscription_authorized_payment";

// Diagnostics are read-only and never participate in entitlement or charging decisions.
export const observeAuthorizedPayment = async ({
  gateway,
  repository,
  resourceId,
}: ObservationInput) => {
  const base = {
    operation: "observe_authorized_payment",
    invoice_ref: billingReference("invoice", resourceId),
    observed_at: new Date().toISOString(),
  };
  try {
    const payment = await gateway.getAuthorizedPayment(resourceId);
    const local =
      payment.external_reference && payment.gateway_subscription_id
        ? await repository.findSubscriptionByGatewayReference({
            subscriptionId: payment.external_reference,
            gatewaySubscriptionId: payment.gateway_subscription_id,
          })
        : null;
    const matchedLocalId =
      local?.id &&
      local.gateway === "mercadopago" &&
      local.id === payment.external_reference &&
      (!local.gateway_subscription_id ||
        local.gateway_subscription_id === payment.gateway_subscription_id)
        ? local.id
        : null;

    console.info("[BILLING] Resultado de fatura consultado.", {
      ...base,
      correlation: matchedLocalId ? "matched" : "unresolved",
      ...(matchedLocalId ? { attempt_ref: billingReference("attempt", matchedLocalId) } : {}),
      ...(payment.gateway_payment_id
        ? { payment_ref: billingReference("payment", payment.gateway_payment_id) }
        : {}),
      result: classifyBillingPayment(payment.status, payment.status_detail),
    });
  } catch {
    // No raw exception, provider response, retries, or change to the webhook acknowledgement.
    console.warn("[BILLING] Diagnóstico de fatura indisponível.", {
      ...base,
      result: "unavailable",
    });
  }
};
