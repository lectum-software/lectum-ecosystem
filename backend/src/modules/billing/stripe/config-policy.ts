import type {
  billing_customer,
  billing_operation,
  professional_subscription,
} from "@/external/generated/prisma/client";
import type { StripeIdentity, StripePlan } from "../payment-gateway/stripe-types";
import { OPEN_OPERATION_STATES, publicOperationState } from "./policy";

export type StripePriceSnapshot = {
  amount_cents: number;
  currency: string;
  interval: string;
  interval_count: number;
  external_price_id: string;
};

export const isStripeCheckoutPriceAvailable = (
  price: StripePriceSnapshot,
  identity: StripeIdentity,
  remote: StripePlan,
) =>
  remote.active &&
  remote.mode === identity.mode &&
  remote.accountId === identity.accountId &&
  remote.priceId === price.external_price_id &&
  remote.amountCents === price.amount_cents &&
  remote.currency === price.currency &&
  remote.interval === price.interval &&
  remote.intervalCount === price.interval_count &&
  price.amount_cents === 2990 &&
  price.currency === "BRL" &&
  price.interval === "month" &&
  price.interval_count === 1;

type MaintenanceContract = Pick<
  professional_subscription,
  | "id"
  | "psychologist_id"
  | "source"
  | "gateway"
  | "gateway_mode"
  | "gateway_account_id"
  | "gateway_subscription_id"
  | "status"
  | "deleted"
>;
type MaintenanceCustomer = Pick<
  billing_customer,
  "id" | "user_id" | "gateway" | "mode" | "account_id" | "external_customer_id"
>;
type MaintenanceOperation = Pick<
  billing_operation,
  | "id"
  | "user_id"
  | "psychologist_id"
  | "gateway"
  | "mode"
  | "account_id"
  | "kind"
  | "state"
  | "customer_id"
  | "subscription_id"
  | "provider_subscription_id"
>;

/** Servicing an existing contract is independent from the catalog available to new customers. */
export const hasScopedStripeCardMaintenance = (input: {
  userId: string;
  profileId: string;
  currentContractId: string | null;
  identity: StripeIdentity;
  contracts: MaintenanceContract[];
  customer: MaintenanceCustomer | null;
  pending: MaintenanceOperation | null;
}) => {
  const { identity, customer, pending } = input;
  const contracts = input.contracts.filter(
    (row) =>
      row.psychologist_id === input.profileId &&
      row.gateway === "stripe" &&
      row.source === "stripe" &&
      row.gateway_mode === identity.mode &&
      row.gateway_account_id === identity.accountId &&
      row.gateway_subscription_id &&
      !row.deleted &&
      ["ativa", "inativa", "inadimplente"].includes(row.status),
  );
  if (
    contracts.length !== 1 ||
    contracts[0].id !== input.currentContractId ||
    !customer ||
    customer.user_id !== input.userId ||
    customer.gateway !== "stripe" ||
    customer.mode !== identity.mode ||
    customer.account_id !== identity.accountId ||
    !customer.external_customer_id
  )
    return false;
  if (pending?.kind !== "payment_method") return true;
  const contract = contracts[0];
  return (
    pending.user_id === input.userId &&
    pending.psychologist_id === input.profileId &&
    pending.gateway === "stripe" &&
    pending.mode === identity.mode &&
    pending.account_id === identity.accountId &&
    pending.customer_id === customer.id &&
    pending.subscription_id === contract.id &&
    pending.provider_subscription_id === contract.gateway_subscription_id
  );
};

export const stripeConfigPendingOperation = (
  pending: Pick<billing_operation, "id" | "kind" | "state"> | null,
) =>
  pending && OPEN_OPERATION_STATES.includes(pending.state)
    ? { id: pending.id, kind: pending.kind, state: publicOperationState(pending.state) }
    : null;
