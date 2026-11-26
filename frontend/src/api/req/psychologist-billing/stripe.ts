import { getApiErrorHttpStatus } from "@/api/errors";
import { callEndpoint } from "@/api/generator";
import type {
  StripeBillingCheckoutPayload,
  StripeBillingConfig,
  StripeBillingKind,
  StripeBillingOperationResponse,
} from "@/api/generator/types/stripe-billing";
import { handleReq } from "@/api/handle";
import {
  pendingGoogleCheckout,
  rememberGoogleCheckout,
} from "@/components/analytics/google-billing";
import { googleActionScope } from "@/components/analytics/google-runtime";

const route = "/api/private/psychologist/billing/stripe";
const flowVersion = "credit_only_v1";

export const getStripeBillingConfig = async (courtesyRenewal: boolean) => {
  try {
    return await handleReq<StripeBillingConfig>(
      callEndpoint({
        route: `${route}/config`,
        query: courtesyRenewal ? { intent: "courtesy_renewal" } : undefined,
      }),
    );
  } catch (error) {
    // Only an older backend without this route permits the legacy UI fallback.
    // Network, authorization and provider failures never select another gateway.
    if (getApiErrorHttpStatus(error) === 404) {
      return {
        enabled: false,
        checkout_provider: "mercadopago",
        payment_method_provider: "mercadopago",
      } satisfies StripeBillingConfig;
    }
    throw error;
  }
};

export const createStripeBillingCheckout = async (body: StripeBillingCheckoutPayload) => {
  const scope = googleActionScope();
  const result = await handleReq<StripeBillingOperationResponse>({
    ...callEndpoint({
      route: `${route}/checkout`,
      method: "POST",
      body: { ...body, flow_version: flowVersion },
    }),
    hideError: true,
  });

  if (
    !body.intent &&
    result.operation?.id &&
    ["requires_confirmation", "processing", "complete"].includes(result.operation.state)
  ) {
    if (pendingGoogleCheckout()?.id !== result.operation.id)
      rememberGoogleCheckout(result.operation.id, scope);
  }
  return result;
};

export const createStripeBillingPaymentMethod = (body: { request_key: string }) =>
  handleReq<StripeBillingOperationResponse>({
    ...callEndpoint({
      route: `${route}/payment-method`,
      method: "POST",
      body: { ...body, flow_version: flowVersion },
    }),
    hideError: true,
  });

export const confirmStripeBillingOperation = (
  kind: StripeBillingKind,
  id: string,
  authorizePayment = false,
) =>
  handleReq<StripeBillingOperationResponse>({
    ...callEndpoint({
      route: `${route}/${kind === "checkout" ? "checkout" : "payment-method"}/${encodeURIComponent(id)}/confirm`,
      method: "POST",
      body: {
        flow_version: flowVersion,
        confirm_payment: kind === "checkout" && authorizePayment === true,
      },
    }),
    hideError: true,
  });
