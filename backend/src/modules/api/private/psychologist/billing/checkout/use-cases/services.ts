import { error, msg } from "@/helpers/translate";
import { getPaymentGateway } from "@/modules/billing/payment-gateway";
import type { ICheckoutDTO } from "../DTOs/ICheckoutDTO";
import { CheckoutRepository } from "../repositories/CheckoutRepository";

export default async (data: ICheckoutDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  if (data.b.payment_type_id !== "credit_card") {
    return {
      status: 400,
      ...error("billing_checkout_credit_card_only", {}),
    };
  }

  const repository = new CheckoutRepository();
  const profile = await repository.findProfileByUserId(data.auth.id!);

  if (!profile || profile.deleted) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  const professionalPlan = await repository.findPlanBySlug("profissional");

  if (!professionalPlan?.id || !professionalPlan.price_cents) {
    return {
      status: 404,
      ...error("not_found", { model: "subscription_plan" }),
    };
  }

  const activeProfessional = await repository.findActiveProfessionalSubscription(profile.id!);

  if (activeProfessional) {
    return {
      status: 409,
      ...error("professional_subscription_active", {}),
    };
  }

  const email = data.auth.email;

  if (!email) {
    return {
      status: 400,
      ...error("billing_checkout_email_required", {}),
    };
  }

  const pendingSubscription = await repository.createPendingSubscription(
    profile.id!,
    professionalPlan.id,
  );

  try {
    const gateway = getPaymentGateway();
    const gatewayResult = await gateway.createSubscription({
      subscriptionId: pendingSubscription.id!,
      planName: professionalPlan.name || "Plano Profissional Lectum",
      amountCents: professionalPlan.price_cents,
      cardToken: data.b.card_token,
      payerEmail: email,
      returnUrl: data.b.return_url,
    });

    const current = await repository.setGatewaySubscriptionId(
      pendingSubscription.id!,
      gatewayResult.gateway_subscription_id,
    );

    return {
      status: 200,
      ...msg("billing_checkout_started", {}),
      data: {
        current,
        gateway_status: gatewayResult.gateway_status,
        pending_confirmation: true,
        init_point: gatewayResult.init_point,
      },
    };
  } catch (err) {
    await repository.cancelSubscription(pendingSubscription.id!);

    const message = err instanceof Error ? err.message : "";
    const configError = message.includes("MERCADO_PAGO_ACCESS_TOKEN_NOT_CONFIGURED");

    return {
      status: configError ? 503 : 502,
      ...error(
        configError ? "billing_gateway_config_error" : "billing_gateway_checkout_failed",
        {},
      ),
    };
  }
};
