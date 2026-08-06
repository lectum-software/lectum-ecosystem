import { isIP } from "node:net";
import { error, msg } from "@/helpers/translate";
import {
  getPaymentGateway,
  isPaymentGatewayConfigurationError,
} from "@/modules/billing/payment-gateway";
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
type ActiveProfessionalSubscription = NonNullable<
  Awaited<ReturnType<CheckoutRepository["findActiveProfessionalSubscription"]>>
>;

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

const isGatewayResourceNotFoundError = (err: unknown) => sanitizeGatewayError(err).status === 404;

const getConfiguredGatewayPlanId = () =>
  process.env.MERCADO_PAGO_PREAPPROVAL_PLAN_ID?.trim() || null;

const getConfiguredBackUrl = () => process.env.MERCADO_PAGO_BACK_URL?.trim() || null;

const getGatewayEnv = () => process.env.MERCADO_PAGO_ENV?.trim().toLowerCase() || null;

const getSandboxPayerEmail = () => process.env.MERCADO_PAGO_SANDBOX_PAYER_EMAIL?.trim() || null;

const resolvePayerEmail = (authenticatedEmail?: string | null) => {
  if (getGatewayEnv() === "sandbox") {
    const sandboxPayerEmail = getSandboxPayerEmail();

    if (!sandboxPayerEmail) {
      throw new Error("MERCADO_PAGO_SANDBOX_PAYER_EMAIL_NOT_CONFIGURED");
    }

    return sandboxPayerEmail;
  }

  return authenticatedEmail?.trim() || null;
};

const isPrivateIpv4 = (hostname: string) => {
  const [first = 0, second = 0] = hostname.split(".").map(Number);

  if (first === 10 || first === 127) return true;
  if (first === 169) return second === 254;
  if (first === 192) return second === 168;

  return first === 172 && second >= 16 && second <= 31;
};

const isLocalOrPrivateHostname = (hostname: string) => {
  const normalizedHostname = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname === "0.0.0.0" ||
    normalizedHostname === "::1" ||
    normalizedHostname.endsWith(".local")
  ) {
    return true;
  }

  const ipVersion = isIP(normalizedHostname);

  if (ipVersion === 4) {
    return isPrivateIpv4(normalizedHostname);
  }

  if (ipVersion === 6) {
    return (
      normalizedHostname.startsWith("fc") ||
      normalizedHostname.startsWith("fd") ||
      normalizedHostname.startsWith("fe80")
    );
  }

  return false;
};

const isPublicHttpsUrl = (value?: string | null) => {
  if (!value) return false;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    return url.protocol === "https:" && !isLocalOrPrivateHostname(hostname);
  } catch {
    return false;
  }
};

const resolveGatewayBackUrl = () => {
  const configuredBackUrl = getConfiguredBackUrl();

  if (!isPublicHttpsUrl(configuredBackUrl)) {
    throw new Error("MERCADO_PAGO_BACK_URL_NOT_CONFIGURED");
  }

  return configuredBackUrl!;
};

const buildPlanIdempotencyKey = (plan: ProfessionalPlan) =>
  `lectum-preapproval-plan-${plan.slug || plan.id}-${plan.price_cents}`;

const readCompatibleGatewayPlanId = async ({
  gateway,
  gatewayPlanId,
  plan,
}: {
  gateway: PaymentGateway;
  gatewayPlanId: string;
  plan: ProfessionalPlan;
}) => {
  const gatewayPlan = await gateway.getSubscriptionPlan(gatewayPlanId);
  const expectedAmountCents = plan.price_cents ?? null;

  if (gatewayPlan.amount_cents === expectedAmountCents) {
    return gatewayPlan.gateway_plan_id || gatewayPlanId;
  }

  console.warn("[BILLING] Mercado Pago plan amount mismatch", {
    expected_amount_cents: expectedAmountCents,
    gateway_amount_cents: gatewayPlan.amount_cents,
    gateway_plan_id: gatewayPlanId,
    plan_id: plan.id,
    plan_slug: plan.slug,
  });

  return null;
};

const readPersistedGatewayPlanId = async ({
  gateway,
  gatewayPlanId,
  plan,
}: {
  gateway: PaymentGateway;
  gatewayPlanId: string;
  plan: ProfessionalPlan;
}) => {
  try {
    return await readCompatibleGatewayPlanId({
      gateway,
      gatewayPlanId,
      plan,
    });
  } catch (err) {
    if (!isGatewayResourceNotFoundError(err)) {
      throw err;
    }

    console.warn("[BILLING] Mercado Pago persisted plan not found, resetting local reference", {
      ...sanitizeGatewayError(err),
      gateway_plan_id: gatewayPlanId,
      plan_id: plan.id,
      plan_slug: plan.slug,
    });

    return null;
  }
};

const createAndPersistGatewayPlanId = async ({
  gateway,
  plan,
  repository,
  returnUrl,
}: {
  gateway: PaymentGateway;
  plan: ProfessionalPlan;
  repository: CheckoutRepository;
  returnUrl: string;
}) => {
  const gatewayPlan = await gateway.createSubscriptionPlan({
    amountCents: plan.price_cents!,
    idempotencyKey: buildPlanIdempotencyKey(plan),
    planName: plan.name || "Plano Profissional Lectum",
    returnUrl,
  });

  await repository.setGatewayPlanId(plan.id!, gatewayPlan.gateway_plan_id);

  return gatewayPlan.gateway_plan_id;
};

const ensureGatewayPlanId = async ({
  gateway,
  plan,
  repository,
  returnUrl,
}: {
  gateway: PaymentGateway;
  plan: ProfessionalPlan;
  repository: CheckoutRepository;
  returnUrl: string;
}) => {
  if (plan.gateway_plan_id) {
    const compatibleGatewayPlanId = await readPersistedGatewayPlanId({
      gateway,
      gatewayPlanId: plan.gateway_plan_id,
      plan,
    });

    if (compatibleGatewayPlanId) {
      return compatibleGatewayPlanId;
    }

    await repository.setGatewayPlanId(plan.id!, null);
  }

  const configuredGatewayPlanId = getConfiguredGatewayPlanId();

  if (configuredGatewayPlanId) {
    const compatibleConfiguredPlanId = await readCompatibleGatewayPlanId({
      gateway,
      gatewayPlanId: configuredGatewayPlanId,
      plan,
    });

    if (compatibleConfiguredPlanId) {
      await repository.setGatewayPlanId(plan.id!, compatibleConfiguredPlanId);
      return compatibleConfiguredPlanId;
    }
  }

  return createAndPersistGatewayPlanId({
    gateway,
    plan,
    repository,
    returnUrl,
  });
};

const resolveGatewayPlanId = async ({
  gateway,
  plan,
  repository,
  returnUrl,
}: {
  gateway: PaymentGateway;
  plan: ProfessionalPlan;
  repository: CheckoutRepository;
  returnUrl: string;
}) => {
  const configuredGatewayPlanId = getConfiguredGatewayPlanId();

  if (configuredGatewayPlanId) {
    const compatibleConfiguredPlanId = await readCompatibleGatewayPlanId({
      gateway,
      gatewayPlanId: configuredGatewayPlanId,
      plan,
    });

    if (compatibleConfiguredPlanId) {
      await repository.setGatewayPlanId(plan.id!, compatibleConfiguredPlanId);
      return compatibleConfiguredPlanId;
    }

    await repository.setGatewayPlanId(plan.id!, null);
    throw new Error("MERCADO_PAGO_PREAPPROVAL_PLAN_INCOMPATIBLE");
  }

  return ensureGatewayPlanId({
    gateway,
    plan,
    repository,
    returnUrl,
  });
};

const isActiveCourtesySubscription = (subscription?: ActiveProfessionalSubscription | null) =>
  subscription?.source === "admin_grant" &&
  subscription.status === "ativa" &&
  subscription.plan?.slug === "profissional";

const resolveCourtesyStartDate = (subscription: ActiveProfessionalSubscription) => {
  if (!subscription.current_period_end) return null;

  const date = new Date(subscription.current_period_end);

  if (Number.isNaN(date.getTime()) || date <= new Date()) return null;

  return date;
};

const resolveCourtesyNextPath = async ({
  profile,
  repository,
  userId,
}: {
  profile: NonNullable<Awaited<ReturnType<CheckoutRepository["findProfileByUserId"]>>>;
  repository: CheckoutRepository;
  userId: string;
}) => {
  const hasBillingAddress = await repository.hasBillingAddress({
    profile,
    userId,
  });

  return hasBillingAddress
    ? "/app/profissional/assinatura"
    : "/app/profissional/assinatura/endereco?intent=courtesy-renewal";
};

const normalizeLast4 = (last4?: string | null) => {
  const digits = last4?.replace(/\D/g, "").slice(-4) || null;

  return digits && digits.length === 4 ? digits : null;
};

const resolvePaymentMethodDisplay = (body: ICheckoutDTO["b"]) => ({
  brand: body.brand?.trim() || null,
  last4: normalizeLast4(body.last4),
});

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
  const isCourtesyRenewal = data.b.intent === "courtesy_renewal";
  const isActiveCourtesy = isActiveCourtesySubscription(activeProfessional);

  if (isCourtesyRenewal && !isActiveCourtesy) {
    return {
      status: 409,
      ...error("billing_courtesy_renewal_required", {}),
    };
  }

  if (activeProfessional && !isCourtesyRenewal) {
    return {
      status: 409,
      ...error("professional_subscription_active", {}),
    };
  }

  const courtesyStartDate =
    isCourtesyRenewal && activeProfessional ? resolveCourtesyStartDate(activeProfessional) : null;

  if (isCourtesyRenewal && !courtesyStartDate) {
    return {
      status: 409,
      ...error("billing_courtesy_renewal_required", {}),
    };
  }

  let payerEmail: string | null;

  try {
    payerEmail = resolvePayerEmail(data.auth.email);
  } catch (err) {
    console.error("[BILLING] Mercado Pago payer setup failed", sanitizeGatewayError(err));

    return {
      status: 503,
      ...error("billing_gateway_config_error", {}),
    };
  }

  if (!payerEmail) {
    return {
      status: 400,
      ...error("billing_checkout_email_required", {}),
    };
  }

  let gateway: PaymentGateway;
  let gatewayPlanId: string;
  let gatewayReturnUrl: string;

  try {
    gatewayReturnUrl = resolveGatewayBackUrl();
    gateway = getPaymentGateway();
    gatewayPlanId = await resolveGatewayPlanId({
      gateway,
      plan: professionalPlan,
      repository,
      returnUrl: gatewayReturnUrl,
    });
  } catch (err) {
    console.error("[BILLING] Mercado Pago plan setup failed", sanitizeGatewayError(err));

    return {
      status: isPaymentGatewayConfigurationError(err) ? 503 : 502,
      ...error(
        isPaymentGatewayConfigurationError(err)
          ? "billing_gateway_config_error"
          : "billing_gateway_checkout_failed",
        {},
      ),
    };
  }

  let pendingSubscription: Awaited<
    ReturnType<CheckoutRepository["createPendingSubscription"]>
  > | null = null;
  const paymentMethodDisplay = resolvePaymentMethodDisplay(data.b);

  try {
    if (isCourtesyRenewal) {
      const scheduledSubscription = await repository.findScheduledGatewaySubscription(profile.id!);

      if (scheduledSubscription?.id && scheduledSubscription.gateway_subscription_id) {
        const gatewayResult = await gateway.updateSubscriptionCard({
          cardToken: data.b.card_token,
          gatewaySubscriptionId: scheduledSubscription.gateway_subscription_id,
        });
        const current = await repository.setGatewaySubscriptionId(
          scheduledSubscription.id,
          gatewayResult.gateway_subscription_id,
          {
            currentPeriodEnd: null,
            status: "inativa",
          },
        );
        const paymentMethod = await repository.savePaymentMethodReference(data.auth.id!, {
          gatewaySubscriptionId: gatewayResult.gateway_subscription_id,
          ...paymentMethodDisplay,
        });

        return {
          status: 200,
          ...msg("billing_courtesy_card_scheduled", {}),
          data: {
            current,
            gateway_status: gatewayResult.gateway_status,
            init_point: gatewayResult.init_point,
            next_path: await resolveCourtesyNextPath({
              profile,
              repository,
              userId: data.auth.id!,
            }),
            payment_method: paymentMethod,
            pending_confirmation: false,
            scheduled_start_date: courtesyStartDate?.toISOString() ?? null,
          },
        };
      }
    }

    pendingSubscription = await repository.createPendingSubscription(
      profile.id!,
      professionalPlan.id,
    );
    const gatewayResult = await gateway.createSubscription({
      subscriptionId: pendingSubscription.id!,
      gatewayPlanId,
      planName: professionalPlan.name || "Plano Profissional Lectum",
      amountCents: professionalPlan.price_cents,
      cardToken: data.b.card_token,
      payerEmail,
      returnUrl: gatewayReturnUrl,
      startDate: courtesyStartDate,
    });

    const current = await repository.setGatewaySubscriptionId(
      pendingSubscription.id!,
      gatewayResult.gateway_subscription_id,
      isCourtesyRenewal
        ? {
            currentPeriodEnd: null,
            status: "inativa",
          }
        : undefined,
    );
    const paymentMethod = await repository.savePaymentMethodReference(data.auth.id!, {
      gatewaySubscriptionId: gatewayResult.gateway_subscription_id,
      ...paymentMethodDisplay,
    });

    return {
      status: 200,
      ...msg(
        isCourtesyRenewal ? "billing_courtesy_card_scheduled" : "billing_checkout_started",
        {},
      ),
      data: {
        current,
        gateway_status: gatewayResult.gateway_status,
        init_point: gatewayResult.init_point,
        next_path: isCourtesyRenewal
          ? await resolveCourtesyNextPath({
              profile,
              repository,
              userId: data.auth.id!,
            })
          : undefined,
        payment_method: paymentMethod,
        pending_confirmation: !isCourtesyRenewal,
        scheduled_start_date: courtesyStartDate?.toISOString() ?? null,
      },
    };
  } catch (err) {
    if (pendingSubscription?.id) {
      await repository.cancelSubscription(pendingSubscription.id);
    }

    console.error("[BILLING] Mercado Pago checkout failed", sanitizeGatewayError(err));

    const configError = isPaymentGatewayConfigurationError(err);

    return {
      status: configError ? 503 : 502,
      ...error(
        configError ? "billing_gateway_config_error" : "billing_gateway_checkout_failed",
        {},
      ),
    };
  }
};
