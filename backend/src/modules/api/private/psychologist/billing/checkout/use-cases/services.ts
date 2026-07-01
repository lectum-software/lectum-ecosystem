import { error, msg } from "@/helpers/translate";
import { getPaymentGateway } from "@/modules/billing/payment-gateway";
import type { PaymentGateway } from "@/modules/billing/payment-gateway/PaymentGateway";
import type { ICheckoutDTO } from "../DTOs/ICheckoutDTO";
import { CheckoutRepository } from "../repositories/CheckoutRepository";

type GatewayErrorLog = {
  name?: string;
  message?: string;
  operation?: string;
  cause_message?: string;
  status?: number;
  code?: string;
  blocked_by?: string;
};

type ProfessionalPlan = NonNullable<Awaited<ReturnType<CheckoutRepository["findPlanBySlug"]>>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toSafeString = (value: unknown) => (typeof value === "string" ? value : undefined);

const toSafeNumber = (value: unknown) => (typeof value === "number" ? value : undefined);

const sanitizeGatewayError = (err: unknown): GatewayErrorLog => {
  if (err instanceof Error) {
    const errorWithDetails = err as Error & { details?: unknown };
    const details = isRecord(errorWithDetails.details) ? errorWithDetails.details : null;

    return {
      name: err.name,
      message: err.message,
      operation: toSafeString(details?.operation),
      cause_message: toSafeString(details?.cause_message),
      status: toSafeNumber(details?.status),
      code: toSafeString(details?.code),
      blocked_by: toSafeString(details?.blocked_by),
    };
  }

  if (!isRecord(err)) {
    return {
      message: "Unknown gateway error",
    };
  }

  return {
    message: toSafeString(err.message),
    status: toSafeNumber(err.status),
    code: toSafeString(err.code),
    blocked_by: toSafeString(err.blocked_by),
  };
};

const isMercadoPagoSandbox = () => process.env.MERCADO_PAGO_ENV?.trim().toLowerCase() === "sandbox";

const resolvePayerEmail = (fallbackEmail: string) => {
  if (!isMercadoPagoSandbox()) {
    return fallbackEmail;
  }

  const testPayerEmail = process.env.MERCADO_PAGO_TEST_PAYER_EMAIL?.trim();

  return testPayerEmail || fallbackEmail;
};

const getConfiguredGatewayPlanId = () =>
  process.env.MERCADO_PAGO_PREAPPROVAL_PLAN_ID?.trim() || null;

const getConfiguredBackUrl = () => process.env.MERCADO_PAGO_BACK_URL?.trim() || null;

const getWebUrl = () => process.env.WEB_URL?.split(",")[0]?.trim() || null;

const SANDBOX_BACK_URL_FALLBACK = "https://www.mercadopago.com.br";

const isGatewayBackUrlCandidate = (value?: string | null) => {
  if (!value) return false;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname !== "0.0.0.0"
    );
  } catch {
    return false;
  }
};

const resolveGatewayBackUrl = (returnUrl?: string | null) => {
  const configuredBackUrl = getConfiguredBackUrl();
  if (isGatewayBackUrlCandidate(configuredBackUrl)) return configuredBackUrl;

  if (isGatewayBackUrlCandidate(returnUrl)) return returnUrl!;

  const webUrl = getWebUrl();
  if (isGatewayBackUrlCandidate(webUrl)) {
    return `${webUrl!.replace(/\/$/, "")}/app/professional/billing/address`;
  }

  if (isMercadoPagoSandbox()) {
    return SANDBOX_BACK_URL_FALLBACK;
  }

  return null;
};

const buildPlanIdempotencyKey = (plan: ProfessionalPlan) =>
  `lectum-preapproval-plan-${plan.slug || plan.id}-${plan.price_cents}`;

const ensureGatewayPlanId = async ({
  gateway,
  plan,
  repository,
  returnUrl,
}: {
  gateway: PaymentGateway;
  plan: ProfessionalPlan;
  repository: CheckoutRepository;
  returnUrl?: string | null;
}) => {
  if (plan.gateway_plan_id) {
    return plan.gateway_plan_id;
  }

  const configuredGatewayPlanId = getConfiguredGatewayPlanId();

  if (configuredGatewayPlanId) {
    await repository.setGatewayPlanId(plan.id!, configuredGatewayPlanId);
    return configuredGatewayPlanId;
  }

  const backUrl = resolveGatewayBackUrl(returnUrl);

  if (!backUrl) {
    throw new Error("MERCADO_PAGO_BACK_URL_NOT_CONFIGURED");
  }

  const gatewayPlan = await gateway.createSubscriptionPlan({
    amountCents: plan.price_cents!,
    idempotencyKey: buildPlanIdempotencyKey(plan),
    planName: plan.name || "Plano Profissional Lectum",
    returnUrl: backUrl,
  });

  await repository.setGatewayPlanId(plan.id!, gatewayPlan.gateway_plan_id);

  return gatewayPlan.gateway_plan_id;
};

const isGatewayConfigError = (err: unknown) => {
  const message = err instanceof Error ? err.message : "";

  return (
    message.includes("MERCADO_PAGO_ACCESS_TOKEN_NOT_CONFIGURED") ||
    message.includes("MERCADO_PAGO_BACK_URL_NOT_CONFIGURED")
  );
};

const getGatewayCauseMessage = (err: unknown) => {
  if (!(err instanceof Error)) return "";

  const errorWithDetails = err as Error & { details?: unknown };
  const details = isRecord(errorWithDetails.details) ? errorWithDetails.details : null;

  return `${err.message} ${toSafeString(details?.cause_message) || ""}`.trim();
};

const shouldFallbackToSandboxPendingSubscription = (err: unknown) => {
  if (!isMercadoPagoSandbox()) return false;

  return getGatewayCauseMessage(err).includes("Card token service not found");
};

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

  const payerEmail = resolvePayerEmail(email);
  const gatewayReturnUrl = resolveGatewayBackUrl(data.b.return_url);
  let gateway: PaymentGateway;
  let gatewayPlanId: string;

  try {
    gateway = getPaymentGateway();
    gatewayPlanId = await ensureGatewayPlanId({
      gateway,
      plan: professionalPlan,
      repository,
      returnUrl: gatewayReturnUrl,
    });
  } catch (err) {
    console.error("[BILLING] Mercado Pago plan setup failed", sanitizeGatewayError(err));

    return {
      status: isGatewayConfigError(err) ? 503 : 502,
      ...error(
        isGatewayConfigError(err)
          ? "billing_gateway_config_error"
          : "billing_gateway_checkout_failed",
        {},
      ),
    };
  }

  const pendingSubscription = await repository.createPendingSubscription(
    profile.id!,
    professionalPlan.id,
  );

  try {
    const gatewayResult = await gateway.createSubscription({
      subscriptionId: pendingSubscription.id!,
      gatewayPlanId,
      planName: professionalPlan.name || "Plano Profissional Lectum",
      amountCents: professionalPlan.price_cents,
      cardToken: data.b.card_token,
      payerEmail,
      returnUrl: gatewayReturnUrl,
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
    if (shouldFallbackToSandboxPendingSubscription(err)) {
      console.warn(
        "[BILLING] Mercado Pago authorized sandbox checkout failed; trying pending preapproval fallback",
        sanitizeGatewayError(err),
      );

      try {
        const gatewayResult = await gateway.createPendingSubscription({
          subscriptionId: pendingSubscription.id!,
          planName: professionalPlan.name || "Plano Profissional Lectum",
          amountCents: professionalPlan.price_cents,
          payerEmail,
          returnUrl: gatewayReturnUrl,
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
            sandbox_pending_payment: true,
          },
        };
      } catch (fallbackErr) {
        await repository.cancelSubscription(pendingSubscription.id!);

        console.error(
          "[BILLING] Mercado Pago pending sandbox checkout failed",
          sanitizeGatewayError(fallbackErr),
        );

        return {
          status: 502,
          ...error("billing_gateway_checkout_failed", {}),
        };
      }
    }

    await repository.cancelSubscription(pendingSubscription.id!);

    console.error("[BILLING] Mercado Pago checkout failed", sanitizeGatewayError(err));

    const configError = isGatewayConfigError(err);

    return {
      status: configError ? 503 : 502,
      ...error(
        configError ? "billing_gateway_config_error" : "billing_gateway_checkout_failed",
        {},
      ),
    };
  }
};
