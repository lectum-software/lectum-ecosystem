import { getNewSubscriptionGatewayName, getStripeGateway } from "../payment-gateway";
import type { StripeIdentity } from "../payment-gateway/stripe-types";
import {
  hasScopedStripeCardMaintenance,
  isStripeCheckoutPriceAvailable,
  type StripePriceSnapshot,
  stripeConfigPendingOperation,
} from "./config-policy";
import { type CheckoutIntent, StripeBillingError } from "./policy";
import { StripeBillingRepository } from "./repository";

export const assertStripePrice = async (price: StripePriceSnapshot, identity: StripeIdentity) => {
  const remote = await getStripeGateway().getStripePlan(price.external_price_id);
  if (!isStripeCheckoutPriceAvailable(price, identity, remote)) {
    throw new StripeBillingError("billing_checkout_disabled", 503);
  }
};

export const stripeBillingConfig = async (userId: string, intent: CheckoutIntent) => {
  const repository = new StripeBillingRepository();
  const profile = await repository.profile(userId);
  if (!profile) throw new StripeBillingError("billing_operation_not_found", 404);
  const contracts = await repository.subscriptions(profile.id);
  const now = new Date();
  const current = contracts.find(
    (row) =>
      row.gateway_subscription_id &&
      (["ativa", "inativa", "inadimplente"].includes(row.status) ||
        (row.current_period_end && row.current_period_end > now)),
  );
  const legacyPaymentMethodProvider =
    current?.gateway === "mercadopago" ? "mercadopago" : "disabled";
  const checkoutProvider = getNewSubscriptionGatewayName();
  const base = {
    enabled: false,
    checkout_provider: checkoutProvider,
    payment_method_provider: legacyPaymentMethodProvider,
    pending_operation: null,
  };
  if (checkoutProvider !== "stripe" && !contracts.some((row) => row.gateway === "stripe"))
    return base;
  const gateway = getStripeGateway();
  const identity = gateway.identity;
  const pending = await repository.pending(userId, identity);
  const customer = await repository.customerForUser(userId, identity);
  const preserved = { ...base, pending_operation: stripeConfigPendingOperation(pending) };
  try {
    await gateway.verifyIdentity();
  } catch {
    // Never serve another merchant's SDK configuration, nor erase a durable pending operation.
    return preserved;
  }
  const maintenance = {
    ...preserved,
    payment_method_provider: hasScopedStripeCardMaintenance({
      userId,
      profileId: profile.id,
      currentContractId: current?.id ?? null,
      identity,
      contracts,
      customer,
      pending,
    })
      ? "stripe"
      : legacyPaymentMethodProvider,
    publishable_key: gateway.publicConfiguration.publishableKey,
  };
  // A setup for an existing contract neither quotes a new price nor depends on a sales offer.
  if (pending?.kind === "payment_method" || checkoutProvider !== "stripe") return maintenance;
  try {
    await gateway.verifyCheckoutReadiness();
  } catch {
    return maintenance;
  }
  const configured = await repository.offer(identity);
  const price = pending?.price_version_id
    ? await repository.price(pending.price_version_id, identity)
    : configured?.price;
  if (!price) return maintenance;
  try {
    await assertStripePrice(price, identity);
  } catch {
    // An archived/unavailable sales price blocks only new checkout, not scoped card maintenance.
    return maintenance;
  }
  const courtesy = contracts.find(
    (row) =>
      row.source === "admin_grant" &&
      row.status === "ativa" &&
      row.current_period_end &&
      row.current_period_end > now,
  );
  const effectiveIntent =
    pending?.intent === "courtesy_renewal" ? "courtesy_renewal" : pending ? "subscription" : intent;
  const start = pending
    ? pending.scheduled_start_at
    : effectiveIntent === "courtesy_renewal"
      ? (courtesy?.current_period_end ?? null)
      : null;
  if (!pending && effectiveIntent === "courtesy_renewal" && !start)
    throw new StripeBillingError("billing_courtesy_unavailable");
  return {
    ...maintenance,
    enabled: Boolean(configured || pending),
    quote: {
      revision:
        pending?.quote_revision ??
        (configured ? `${configured.offer.id}:${configured.offer.revision}` : "unavailable"),
      amount_cents: price.amount_cents,
      amount_due_now_cents: start || pending?.kind === "payment_method" ? 0 : price.amount_cents,
      currency: "brl",
      interval: "month",
      intent: effectiveIntent,
      scheduled_start_at: start?.toISOString() ?? null,
    },
  };
};
