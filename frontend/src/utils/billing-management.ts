import type {
  BillingPaymentHistoryItem,
  BillingSubscriptionResponse,
  ProfessionalSubscription,
} from "@/api/generator/types/billing";

export const canManageBillingContract = (subscription?: ProfessionalSubscription | null) =>
  Boolean(
    subscription?.plan?.slug === "profissional" &&
      (subscription.source === "stripe" || subscription.source === "mercadopago") &&
      subscription.gateway === subscription.source &&
      subscription.gateway_subscription_id &&
      ["ativa", "inativa", "inadimplente"].includes(subscription.status),
  );

/** A courtesy is an entitlement, not the separate scheduled contract it may hide. */
export const billingMaintenanceSubscription = (response?: BillingSubscriptionResponse) => {
  if (!response) return null;
  const contract =
    response.maintenance_subscription !== undefined
      ? response.maintenance_subscription
      : (response.subscription ?? response.current);
  return canManageBillingContract(contract) ? contract : null;
};

/** A missing fiscal row is not proof of emission. Never label unpaid/adjusted rows as pending. */
export const shouldExplainStripeInvoice = (item: BillingPaymentHistoryItem) =>
  item.gateway === "stripe" &&
  item.status === "pago" &&
  Number(item.amount_cents) > 0 &&
  !item.invoice;

export const billingAddressAccess = (
  capability:
    | { billing_address_editable?: boolean; billing_address_maintenance_only?: boolean }
    | undefined,
  activeProfessional: boolean,
  activeCourtesy: boolean,
) => {
  const editable = capability?.billing_address_editable ?? (activeProfessional && !activeCourtesy);
  return {
    editable,
    maintenanceOnly:
      editable && (capability?.billing_address_maintenance_only === true || activeCourtesy),
  };
};
