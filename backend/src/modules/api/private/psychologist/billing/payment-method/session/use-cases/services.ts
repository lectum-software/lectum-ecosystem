import { error, msg } from "@/helpers/translate";
import {
  getPaymentGateway,
  isPaymentGatewayConfigurationError,
  resolvePaymentGatewayPublicError,
} from "@/modules/billing/payment-gateway";
import { normalizeDeviceSessionId } from "@/modules/billing/payment-gateway/device-session";
import {
  type BillingOperationContext,
  logBillingAttempt,
  logBillingFailure,
  logBillingResult,
} from "@/modules/billing/payment-gateway/observability";
import type { IPaymentMethodSessionDTO } from "../DTOs/IPaymentMethodSessionDTO";
import { PaymentMethodSessionRepository } from "../repositories/PaymentMethodSessionRepository";

const normalizeLast4 = (last4?: string | null) => {
  if (!last4) return null;

  return last4.replace(/\D/g, "").slice(-4) || null;
};

export default async (data: IPaymentMethodSessionDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  if (data.b.payment_type_id !== "credit_card") {
    return {
      status: 400,
      ...error("billing_payment_method_credit_card_only", {}),
    };
  }

  const repository = new PaymentMethodSessionRepository();
  const profile = await repository.findProfileByUserId(data.auth.id!);

  if (!profile || profile.deleted) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  const subscription = await repository.findManageableSubscription(profile.id!);

  if (!subscription?.gateway_subscription_id) {
    return {
      status: 409,
      ...error("billing_payment_method_subscription_required", {}),
    };
  }

  const deviceSessionId = normalizeDeviceSessionId(data.b.device_session_id);
  const operationContext: BillingOperationContext = {
    operation: "update_subscription_card",
    subscriptionId: subscription.id!,
    deviceSessionPresent: Boolean(deviceSessionId),
  };

  let gatewayCompleted = false;
  try {
    const gateway = getPaymentGateway();
    logBillingAttempt(operationContext);
    const gatewayResult = await gateway.updateSubscriptionCard({
      gatewaySubscriptionId: subscription.gateway_subscription_id,
      cardToken: data.b.card_token,
      deviceSessionId,
    });
    gatewayCompleted = true;
    logBillingResult(operationContext);

    const paymentMethod = await repository.savePaymentMethod(data.auth.id!, {
      gatewaySubscriptionId: gatewayResult.gateway_subscription_id,
      brand: data.b.brand,
      last4: normalizeLast4(data.b.last4),
      exp_month: data.b.exp_month,
      exp_year: data.b.exp_year,
    });

    return {
      status: 200,
      ...msg("billing_payment_method_updated", {}),
      data: {
        current: subscription,
        subscription,
        payment_method: paymentMethod,
        gateway_status: gatewayResult.gateway_status,
        pending_confirmation: false,
      },
    };
  } catch (err) {
    logBillingFailure(operationContext, err, gatewayCompleted ? "local_after_gateway" : "gateway");
    const configError = isPaymentGatewayConfigurationError(err);
    const publicError = resolvePaymentGatewayPublicError(
      err,
      "billing_gateway_payment_method_failed",
    );

    return {
      status: configError ? 503 : publicError.status,
      ...error(configError ? "billing_gateway_config_error" : publicError.code, {}),
    };
  }
};
