import { error, msg } from "@/helpers/translate";
import {
  getPaymentGateway,
  isPaymentGatewayConfigurationError,
} from "@/modules/billing/payment-gateway";
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

  try {
    const gateway = getPaymentGateway();
    const gatewayResult = await gateway.updateSubscriptionCard({
      gatewaySubscriptionId: subscription.gateway_subscription_id,
      cardToken: data.b.card_token,
    });

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
    const configError = isPaymentGatewayConfigurationError(err);

    return {
      status: configError ? 503 : 502,
      ...error(
        configError ? "billing_gateway_config_error" : "billing_gateway_payment_method_failed",
        {},
      ),
    };
  }
};
