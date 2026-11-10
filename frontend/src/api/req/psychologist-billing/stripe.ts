import { getApiErrorHttpStatus } from "@/api/errors";
import { callEndpoint } from "@/api/generator";
import type {
  StripeBillingCheckoutPayload,
  StripeBillingConfig,
  StripeBillingKind,
  StripeBillingOperationResponse,
} from "@/api/generator/types/stripe-billing";
import { handleReq } from "@/api/handle";

const route = "/api/private/psychologist/billing/stripe";

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

export const createStripeBillingCheckout = (body: StripeBillingCheckoutPayload) =>
  handleReq<StripeBillingOperationResponse>({
    ...callEndpoint({ route: `${route}/checkout`, method: "POST", body }),
    hideError: true,
  });

export const createStripeBillingPaymentMethod = (body: { request_key: string }) =>
  handleReq<StripeBillingOperationResponse>({
    ...callEndpoint({ route: `${route}/payment-method`, method: "POST", body }),
    hideError: true,
  });

export const confirmStripeBillingOperation = (kind: StripeBillingKind, id: string) =>
  handleReq<StripeBillingOperationResponse>({
    ...callEndpoint({
      route: `${route}/${kind === "checkout" ? "checkout" : "payment-method"}/${encodeURIComponent(id)}/confirm`,
      method: "POST",
    }),
    hideError: true,
  });
