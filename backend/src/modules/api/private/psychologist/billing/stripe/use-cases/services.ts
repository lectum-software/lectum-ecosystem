import {
  beginStripeCardUpdate,
  confirmStripeCardUpdate,
} from "@/modules/billing/stripe/card-service";
import {
  beginStripeCheckout,
  confirmStripeCheckout,
} from "@/modules/billing/stripe/checkout-service";
import { stripeBillingConfig } from "@/modules/billing/stripe/config-service";
import { StripeBillingError } from "@/modules/billing/stripe/policy";
import type { IStripeBillingDTO } from "../DTOs/IStripeBillingDTO";

const userId = (data: IStripeBillingDTO) => {
  if (data.auth?.role !== "psicologo" || !data.auth.id)
    throw new StripeBillingError("role_not_authorized", 403);
  return data.auth.id;
};
const compatibleUser = (data: IStripeBillingDTO) => {
  const id = userId(data);
  if (data.b?.flow_version !== "credit_only_v1")
    throw new StripeBillingError("billing_checkout_refresh_required", 409);
  return id;
};

export const config = (data: IStripeBillingDTO) =>
  stripeBillingConfig(userId(data), data.q.intent ?? "subscription");
export const checkout = (data: IStripeBillingDTO) =>
  beginStripeCheckout({
    userId: compatibleUser(data),
    email: data.auth.email!,
    requestKey: data.b.request_key!,
    quoteRevision: data.b.quote_revision!,
    intent: data.b.intent ?? "subscription",
  });
export const checkoutConfirm = (data: IStripeBillingDTO) =>
  confirmStripeCheckout(compatibleUser(data), data.p.id!, {
    allowPayment: data.b?.confirm_payment === true,
  });
export const paymentMethod = (data: IStripeBillingDTO) =>
  beginStripeCardUpdate(compatibleUser(data), data.b.request_key!);
export const paymentMethodConfirm = (data: IStripeBillingDTO) =>
  confirmStripeCardUpdate(compatibleUser(data), data.p.id!);
