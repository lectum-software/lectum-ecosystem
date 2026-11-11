import { error, msg } from "@/helpers/translate";
import { fiscalRequirementsForHistory } from "@/modules/billing/invoices/fiscal-requirements";
import { withInvoiceHistory } from "@/modules/billing/invoices/history";
import {
  getStripeGateway,
  isPaymentGatewayConfigurationError,
} from "@/modules/billing/payment-gateway";
import { prepareCancellation } from "@/modules/billing/prepare-cancellation";
import {
  cancelPendingStripeCreditIntents,
  prepareStripeCreditCancellation,
} from "@/modules/billing/stripe/collection-cancellation";
import { StripeBillingError } from "@/modules/billing/stripe/policy";
import { syncStripeSubscription } from "@/modules/billing/stripe/sync";
import { assertStripeUserCancellationConfirmed } from "@/modules/billing/stripe/user-cancellation-policy";
import {
  getStoredSubscriptionGateway,
  subscriptionGatewayName,
  withContractedPlan,
} from "@/modules/billing/subscription-provider";
import type { ISubscriptionDTO } from "../DTOs/ISubscriptionDTO";
import { SubscriptionRepository } from "../repositories/SubscriptionRepository";

export const showSubscription = async (data: ISubscriptionDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new SubscriptionRepository();
  const profile = await repository.findProfileByUserId(data.auth.id!);

  if (!profile || profile.deleted) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  const subscription = await repository.showSubscription(profile.id!);
  const scheduledGatewaySubscription =
    subscription?.source === "admin_grant" &&
    subscription.status === "ativa" &&
    subscription.plan?.slug === "profissional"
      ? await repository.findScheduledGatewaySubscription(profile.id!)
      : null;
  const paymentMethodSubscription = scheduledGatewaySubscription ?? subscription;
  const shouldExposePaymentMethod = Boolean(
    subscriptionGatewayName(paymentMethodSubscription) &&
      paymentMethodSubscription?.gateway_subscription_id &&
      paymentMethodSubscription?.status !== "cancelada",
  );
  const paymentMethodGatewayToken = paymentMethodSubscription?.gateway_subscription_id ?? null;
  const [paymentMethod, paymentHistory] = await Promise.all([
    shouldExposePaymentMethod
      ? repository.showPaymentMethod(
          data.auth.id!,
          paymentMethodGatewayToken,
          paymentMethodSubscription,
        )
      : Promise.resolve(null),
    repository.showOwnedPaymentHistory(profile.id!),
  ]);
  const history = await withInvoiceHistory(data.auth.id!, paymentHistory);
  const fiscalRequirements = await fiscalRequirementsForHistory(data.auth.id!, history);

  return {
    status: 200,
    ...msg("show", {}),
    data: {
      current: subscription,
      subscription,
      // A scheduled contract can be maintained/cancelled without replacing courtesy benefits.
      maintenance_subscription:
        shouldExposePaymentMethod && paymentMethodSubscription
          ? withContractedPlan(paymentMethodSubscription)
          : null,
      payment_method: paymentMethod,
      payment_history: history,
      ...(fiscalRequirements ? { fiscal_requirements: fiscalRequirements } : {}),
    },
  };
};

export const cancelSubscription = async (data: ISubscriptionDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new SubscriptionRepository();
  const profile = await repository.findProfileByUserId(data.auth.id!);

  if (!profile || profile.deleted) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  const subscription = await repository.findCancelableSubscription(profile.id!);

  if (!subscription?.gateway_subscription_id) {
    return {
      status: 409,
      ...error("billing_subscription_cancel_required", {}),
    };
  }

  try {
    const gateway = getStoredSubscriptionGateway(subscription);
    if (subscriptionGatewayName(subscription) === "stripe") {
      const identity = getStripeGateway().identity;
      if (await prepareStripeCreditCancellation(subscription.id!, identity))
        await cancelPendingStripeCreditIntents(subscription.id!, identity);
    }
    if (subscriptionGatewayName(subscription) === "mercadopago")
      await prepareCancellation(subscription, gateway);
    const gatewayResult = await gateway.cancelSubscription({
      gatewaySubscriptionId: subscription.gateway_subscription_id,
    });

    if (
      gatewayResult.status !== "cancelada" ||
      gatewayResult.gateway_subscription_id !== subscription.gateway_subscription_id
    ) {
      return {
        status: 502,
        ...error("billing_gateway_cancel_failed", {}),
      };
    }

    if (subscriptionGatewayName(subscription) === "stripe") {
      // Payment can finish between the provider preflight and its cancellation mutation.
      // Read verified post-mutation facts before making a previously empty local period sticky.
      // A read/scope/CAS failure leaves reconciliation pending, not an irreversible null paid period.
      const synchronized = await syncStripeSubscription(
        subscription.gateway_subscription_id,
        subscription.id!,
      );
      assertStripeUserCancellationConfirmed(synchronized.remote, {
        subscriptionId: subscription.gateway_subscription_id,
        localSubscriptionId: subscription.id!,
        identity: getStripeGateway().identity,
      });
    }

    const cancellation = await repository.cancelSubscription({
      subscriptionId: subscription.id!,
      gatewaySubscriptionId: gatewayResult.gateway_subscription_id,
    });

    return {
      status: 200,
      ...msg("billing_subscription_cancelled", {}),
      data: {
        current: withContractedPlan(cancellation.current),
        subscription: withContractedPlan(cancellation.cancelled),
        gateway_status: gatewayResult.gateway_status,
        canceled: true,
      },
    };
  } catch (err) {
    if (err instanceof StripeBillingError) return { status: err.status, ...error(err.code, {}) };
    const configError = isPaymentGatewayConfigurationError(err);

    return {
      status: configError ? 503 : 502,
      ...error(configError ? "billing_gateway_config_error" : "billing_gateway_cancel_failed", {}),
    };
  }
};

export default showSubscription;
