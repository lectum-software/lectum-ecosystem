import { callEndpoint } from "@/api/generator";
import type {
  BillingAddressPayload,
  BillingAddressResponse,
  BillingCheckoutPayload,
  BillingCheckoutResponse,
  BillingCurrentResponse,
  BillingPaymentMethodPayload,
  BillingPaymentMethodResponse,
  BillingPlansResponse,
  BillingSelectFreeResponse,
  BillingSubscriptionResponse,
} from "@/api/generator/types/billing";
import { handleReq } from "@/api/handle";

export const getPsychologistBillingPlans = async () => {
  const handle = callEndpoint({
    route: "/api/private/psychologist/billing/plans",
  });

  return handleReq<BillingPlansResponse>(handle);
};

export const getPsychologistBillingCurrent = async () => {
  const handle = callEndpoint({
    route: "/api/private/psychologist/billing/current",
  });

  return handleReq<BillingCurrentResponse>(handle);
};

export const getPsychologistBillingSubscription = async () => {
  const handle = callEndpoint({
    route: "/api/private/psychologist/billing/subscription",
  });

  return handleReq<BillingSubscriptionResponse>(handle);
};

export const selectPsychologistBillingFreePlan = async () => {
  const handle = callEndpoint({
    route: "/api/private/psychologist/billing/select-free",
    method: "POST",
  });

  return handleReq<BillingSelectFreeResponse>(handle);
};

export const createPsychologistBillingCheckout = async (body: BillingCheckoutPayload) => {
  const handle = callEndpoint({
    route: "/api/private/psychologist/billing/checkout",
    method: "POST",
    body,
  });

  return handleReq<BillingCheckoutResponse>(handle);
};

export const savePsychologistBillingAddress = async (body: BillingAddressPayload) => {
  const handle = callEndpoint({
    route: "/api/private/psychologist/billing/address",
    method: "PUT",
    body,
  });

  return handleReq<BillingAddressResponse>(handle);
};

export const updatePsychologistBillingPaymentMethod = async (body: BillingPaymentMethodPayload) => {
  const handle = callEndpoint({
    route: "/api/private/psychologist/billing/payment-method/session",
    method: "POST",
    body,
  });

  return handleReq<BillingPaymentMethodResponse>(handle);
};
