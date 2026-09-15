import { error, msg } from "@/helpers/translate";
import {
  getPaymentGateway,
  isPaymentGatewayConfigurationError,
} from "@/modules/billing/payment-gateway";
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
    paymentMethodSubscription?.source === "mercadopago" &&
      paymentMethodSubscription.gateway === "mercadopago" &&
      paymentMethodSubscription.gateway_subscription_id &&
      paymentMethodSubscription.status !== "cancelada",
  );
  const paymentMethodGatewayToken = paymentMethodSubscription?.gateway_subscription_id ?? null;
  const [paymentMethod, paymentHistory] = await Promise.all([
    shouldExposePaymentMethod
      ? repository.showPaymentMethod(data.auth.id!, paymentMethodGatewayToken)
      : Promise.resolve(null),
    repository.showPaymentHistory(subscription),
  ]);

  return {
    status: 200,
    ...msg("show", {}),
    data: {
      current: subscription,
      subscription,
      payment_method: paymentMethod,
      payment_history: paymentHistory,
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
    const gateway = getPaymentGateway();
    const gatewayResult = await gateway.cancelSubscription({
      gatewaySubscriptionId: subscription.gateway_subscription_id,
    });

    if (gatewayResult.status !== "cancelada") {
      return {
        status: 502,
        ...error("billing_gateway_cancel_failed", {}),
      };
    }

    const cancellation = await repository.cancelSubscription({
      subscriptionId: subscription.id!,
      gatewaySubscriptionId: gatewayResult.gateway_subscription_id,
    });

    return {
      status: 200,
      ...msg("billing_subscription_cancelled", {}),
      data: {
        current: cancellation.current,
        subscription: cancellation.cancelled,
        gateway_status: gatewayResult.gateway_status,
        canceled: true,
      },
    };
  } catch (err) {
    const configError = isPaymentGatewayConfigurationError(err);

    return {
      status: configError ? 503 : 502,
      ...error(configError ? "billing_gateway_config_error" : "billing_gateway_cancel_failed", {}),
    };
  }
};

export default showSubscription;
