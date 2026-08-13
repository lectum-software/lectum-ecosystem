import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type { admin } from "@/interfaces/objects";
import {
  getPaymentGateway,
  isPaymentGatewayConfigurationError,
} from "@/modules/billing/payment-gateway";
import {
  grantProfessionalSubscription,
  parseGrantCrpRegistrationDate,
} from "@/operations/subscriptions/grant-professional-subscription-service";
import { parseStoredCrp } from "@/utils/professional-registry";
import type {
  AdminPsychologistBillingDTO,
  AdminPsychologistBillingPaymentHistory,
  AdminPsychologistBillingPlan,
  IAdminPsychologistBillingCancelDTO,
  IAdminPsychologistBillingGrantDTO,
  IAdminPsychologistBillingRevokeDTO,
  IAdminPsychologistBillingShowDTO,
} from "../DTOs/IAdminPsychologistBillingDTO";
import {
  type AdminPsychologistBillingPaymentMetrics,
  type AdminPsychologistBillingRecord,
  AdminPsychologistBillingRepository,
  type AdminPsychologistBillingSubscription,
} from "../repositories/AdminPsychologistBillingRepository";

const COURTESY_PERIOD_OPTIONS = [
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
  { days: 180, label: "180 dias" },
  { days: 365, label: "1 ano" },
];
const COURTESY_GRANT_CONFIRMATION = "CONCEDER CORTESIA";
export const SUBSCRIPTION_CANCEL_CONFIRMATION = "CANCELAR ASSINATURA";
const CANCEL_REASON_MIN_LENGTH = 10;

const trimOrNull = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const splitCrp = (crp: string | null) => {
  const { crp_number, crp_region } = parseStoredCrp(crp);

  return {
    regional_crp: trimOrNull(crp_region),
    registration_number: trimOrNull(crp_number),
  };
};

const isActiveAt = (subscription: AdminPsychologistBillingSubscription | null, date: Date) => {
  if (!subscription) return false;
  if (subscription.status !== "ativa") return false;
  if (subscription.createdAt > date) return false;

  return !subscription.current_period_end || subscription.current_period_end > date;
};

const hasExternalBilling = (subscription: AdminPsychologistBillingSubscription | null) =>
  Boolean(
    subscription &&
      subscription.status !== "cancelada" &&
      (subscription.source === "mercadopago" ||
        subscription.gateway ||
        subscription.gateway_subscription_id),
  );

const isAdminCancelableGatewaySubscription = (
  subscription: AdminPsychologistBillingSubscription | null,
) =>
  Boolean(
    subscription &&
      subscription.source === "mercadopago" &&
      (!subscription.gateway || subscription.gateway === "mercadopago") &&
      subscription.gateway_subscription_id &&
      subscription.plan.slug === "profissional" &&
      subscription.status !== "cancelada",
  );

const hasBlockingExternalSubscription = (profile: AdminPsychologistBillingRecord) =>
  profile.subscriptions.some((subscription) => hasExternalBilling(subscription));

const gatewayLabel = (subscription: AdminPsychologistBillingSubscription | null) => {
  const value = (subscription?.gateway || subscription?.source || "").toLowerCase();
  if (value.includes("mercadopago") || value.includes("mercado_pago")) return "Mercado Pago";

  return subscription?.gateway || null;
};

const sourceLabel = (source?: string | null) => {
  if (source === "admin_grant") return "Cortesia administrativa";
  if (source === "mercadopago") return "Mercado Pago";
  if (source === "free_signup") return "Cadastro gratuito";
  if (source === "legacy") return "Legado";

  return source ?? null;
};

const subscriptionStartedAt = (subscription: AdminPsychologistBillingSubscription | null) =>
  subscription?.grant_started_at ?? subscription?.createdAt ?? null;

const buildPlan = (
  subscription: AdminPsychologistBillingSubscription | null,
  paymentMetrics: AdminPsychologistBillingPaymentMetrics,
): AdminPsychologistBillingPlan => ({
  can_cancel: isAdminCancelableGatewaySubscription(subscription),
  can_change_payment_method: false,
  current_period_end: subscription?.current_period_end ?? null,
  gateway: subscription?.gateway ?? null,
  gateway_label: gatewayLabel(subscription),
  grant_notes: subscription?.grant_notes ?? null,
  grant_reason: subscription?.grant_reason ?? null,
  grant_started_at: subscription?.grant_started_at ?? null,
  granted_by: subscription?.granted_by ?? null,
  has_external_billing: hasExternalBilling(subscription),
  id: subscription?.id ?? null,
  interval: subscription?.plan.interval ?? null,
  is_courtesy: subscription?.source === "admin_grant",
  is_paid: subscription?.source === "mercadopago" && (subscription.plan.price_cents ?? 0) > 0,
  lifetime_value_available: paymentMetrics.lifetimeValueAvailable,
  lifetime_value_cents: paymentMetrics.lifetimeValueCents,
  lifetime_value_unavailable_reason: paymentMetrics.lifetimeValueUnavailableReason,
  paid_installments_count: paymentMetrics.paidInstallmentsCount,
  plan_name: subscription?.plan.name ?? null,
  plan_slug: subscription?.plan.slug ?? null,
  price_cents: subscription?.plan.price_cents ?? null,
  source: subscription?.source ?? null,
  source_label: sourceLabel(subscription?.source),
  started_at: subscriptionStartedAt(subscription),
  status: subscription?.status ?? null,
});

const buildPaymentHistory = (
  items: AdminPsychologistBillingPaymentHistory["items"],
  subscription: AdminPsychologistBillingSubscription | null,
): AdminPsychologistBillingPaymentHistory => {
  if (items.length > 0) {
    return {
      available: true,
      items,
      reason: null,
      source: "payment_event",
    };
  }

  const reason =
    subscription?.source === "mercadopago"
      ? "Nenhum pagamento confirmado foi encontrado para esta assinatura."
      : "Este plano não possui cobrança financeira.";

  return {
    available: false,
    items: [],
    reason,
    source: "payment_event",
  };
};

const buildCourtesy = (
  profile: AdminPsychologistBillingRecord,
  subscription: AdminPsychologistBillingSubscription | null,
) => {
  const { regional_crp, registration_number } = splitCrp(profile.crp);
  const externalBillingActive =
    hasBlockingExternalSubscription(profile) || hasExternalBilling(subscription);
  const hasActiveCourtesy = Boolean(
    subscription?.source === "admin_grant" && isActiveAt(subscription, new Date()),
  );

  return {
    active_grant_id: hasActiveCourtesy ? (subscription?.id ?? null) : null,
    blocked_reason: externalBillingActive
      ? "Existe uma assinatura vinculada ao provedor de pagamento. A concessão administrativa só pode ocorrer após a cobrança ser conciliada ou cancelada."
      : hasActiveCourtesy
        ? "Este psicologo ja possui cortesia ativa. Revogue a cortesia atual antes de conceder uma nova."
        : null,
    can_grant: !externalBillingActive && !hasActiveCourtesy,
    can_revoke: hasActiveCourtesy,
    cpf: trimOrNull(profile.cpf),
    crp: trimOrNull(profile.crp),
    crp_registration_date: profile.crp_registration_date,
    period_options: COURTESY_PERIOD_OPTIONS,
    regional_crp,
    registration_number,
    requires_crp_registration_date: !profile.crp_registration_date,
  };
};

const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist_profile" }),
});

const adminActor = (adminUser: admin | undefined) => {
  if (!adminUser) return "admin:unknown";

  const email = trimOrNull(adminUser.email);
  const name = trimOrNull(adminUser.name);
  const id = trimOrNull(adminUser.id);

  return [name, email, id ? `(${id})` : null].filter(Boolean).join(" ") || "admin:unknown";
};

const adminId = (adminUser: admin | undefined) => trimOrNull(adminUser?.id);

const planLabel = (subscription: AdminPsychologistBillingSubscription | null) =>
  subscription?.plan.name?.trim() || "Plano Profissional";

const statusLabel = (status?: string | null) => {
  const labels: Record<string, string> = {
    ativa: "Ativa",
    cancelada: "Cancelada",
    inadimplente: "Inadimplente",
    inativa: "Inativa",
  };

  return labels[status || ""] ?? status ?? "Nao informado";
};

const mapGrantError = (err: unknown): Resolve => {
  const message = err instanceof Error ? err.message : "unknown";
  const copy: Record<string, string> = {
    crp_registration_date_future: "A data de inscricao no CRP nao pode estar no futuro.",
    crp_registration_date_invalid: "A data de inscricao no CRP e invalida.",
    cpf_invalid: "Informe um CPF valido com 11 digitos.",
    external_billing_subscription_blocks_admin_grant:
      "Existe uma assinatura vinculada ao provedor de pagamento. Concilie ou cancele a cobrança antes de conceder cortesia.",
    professional_plan_not_found: "Plano profissional ativo nao encontrado.",
    psychologist_profile_not_found_for_grant: "Psicologo nao encontrado para concessao.",
    psychologist_user_not_found_for_grant: "Psicologo nao encontrado para concessao.",
  };
  const knownCode = Object.hasOwn(copy, message) ? message : "admin_courtesy_grant_failed";
  const status =
    knownCode === "external_billing_subscription_blocks_admin_grant"
      ? 409
      : knownCode === "professional_plan_not_found" ||
          knownCode === "psychologist_profile_not_found_for_grant" ||
          knownCode === "psychologist_user_not_found_for_grant"
        ? 404
        : 400;

  return {
    status,
    success: false,
    code: knownCode,
    error: copy[knownCode] ?? "Nao foi possivel conceder a cortesia.",
  };
};

export const showAdminPsychologistBilling = async (
  data: IAdminPsychologistBillingShowDTO,
): Promise<Resolve> => {
  const repository = new AdminPsychologistBillingRepository();
  const profile = await repository.findPsychologist(data.p.id);

  if (!profile) return notFound();

  const now = new Date();
  const currentSubscription = await repository.findCurrentSubscription(profile.id);
  const scheduledGatewaySubscription =
    currentSubscription?.source === "admin_grant" && isActiveAt(currentSubscription, now)
      ? await repository.findScheduledGatewaySubscription(profile.id)
      : null;
  const paymentSource = scheduledGatewaySubscription ?? currentSubscription;
  const canUsePaymentMethod = Boolean(
    paymentSource?.source === "mercadopago" &&
      paymentSource.gateway === "mercadopago" &&
      paymentSource.status !== "cancelada",
  );
  const [paymentMethod, paymentHistoryItems, paymentMetrics] = await Promise.all([
    canUsePaymentMethod
      ? repository.findPaymentMethod(
          profile.user.id,
          paymentSource?.gateway_subscription_id ?? null,
        )
      : Promise.resolve(null),
    repository.showPaymentHistory(paymentSource),
    repository.summarizePaymentMetrics(profile.subscriptions),
  ]);

  const response: AdminPsychologistBillingDTO = {
    courtesy: buildCourtesy(profile, currentSubscription),
    payment_history: buildPaymentHistory(paymentHistoryItems, paymentSource),
    payment_method: paymentMethod
      ? {
          brand: paymentMethod.brand ?? null,
          exp_month: paymentMethod.exp_month ?? null,
          exp_year: paymentMethod.exp_year ?? null,
          gateway: paymentMethod.gateway ?? "mercadopago",
          last4: paymentMethod.last4 ?? null,
        }
      : null,
    plan: buildPlan(currentSubscription, paymentMetrics),
    source: "professional_subscription+payment_method+payment_event+admin_grant_service",
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};

export const grantCourtesy = async (data: IAdminPsychologistBillingGrantDTO): Promise<Resolve> => {
  const repository = new AdminPsychologistBillingRepository();
  const profile = await repository.findPsychologist(data.p.id);

  if (!profile) return notFound();

  if (data.b.confirmation?.trim().toUpperCase() !== COURTESY_GRANT_CONFIRMATION) {
    return {
      status: 400,
      success: false,
      code: "courtesy_grant_confirmation_invalid",
      error: `Digite ${COURTESY_GRANT_CONFIRMATION} para confirmar a concessão.`,
    };
  }

  const currentSubscription = await repository.findCurrentSubscription(profile.id);
  const currentCourtesy = buildCourtesy(profile, currentSubscription);

  if (!currentCourtesy.can_grant) {
    return {
      status: 409,
      success: false,
      code: "external_billing_subscription_blocks_admin_grant",
      error: currentCourtesy.blocked_reason ?? "Cortesia bloqueada por assinatura externa.",
    };
  }

  if (currentCourtesy.requires_crp_registration_date && !trimOrNull(data.b.crp_registration_date)) {
    return {
      status: 400,
      success: false,
      code: "crp_registration_date_required",
      error: "Informe a data de inscricao no CRP para conceder cortesia.",
    };
  }

  let registrationDate: Date | undefined;
  if (trimOrNull(data.b.crp_registration_date)) {
    try {
      registrationDate = parseGrantCrpRegistrationDate(String(data.b.crp_registration_date));
    } catch (err) {
      return mapGrantError(err);
    }
  }

  try {
    const grantResult = await grantProfessionalSubscription({
      actor: adminActor(data.auth ?? data.admin),
      cpf: data.b.cpf === undefined ? undefined : trimOrNull(data.b.cpf),
      crpNumber: data.b.crp === undefined ? undefined : trimOrNull(data.b.crp),
      crpRegion: data.b.regional_crp === undefined ? undefined : trimOrNull(data.b.regional_crp),
      days: data.b.period_days,
      notes: trimOrNull(data.b.notes) ?? undefined,
      psychologistProfileId: profile.id,
      registrationDate,
    });

    const billing = await showAdminPsychologistBilling(data);

    return {
      status: 200,
      ...msg("update", {}),
      data: {
        grant: grantResult,
        billing: billing.data,
      },
    };
  } catch (err) {
    return mapGrantError(err);
  }
};

export const revokeCourtesy = async (
  data: IAdminPsychologistBillingRevokeDTO,
): Promise<Resolve> => {
  const repository = new AdminPsychologistBillingRepository();
  const profile = await repository.findPsychologist(data.p.id);

  if (!profile) return notFound();

  const currentSubscription = await repository.findCurrentSubscription(profile.id);

  if (
    currentSubscription?.source !== "admin_grant" ||
    !isActiveAt(currentSubscription, new Date())
  ) {
    return {
      status: 409,
      success: false,
      code: "active_admin_grant_not_found",
      error: "Nao existe cortesia administrativa ativa para revogar.",
    };
  }

  await repository.revokeCourtesy(currentSubscription, adminActor(data.auth ?? data.admin));
  const billing = await showAdminPsychologistBilling(data);

  return {
    status: 200,
    ...msg("update", {}),
    data: {
      billing: billing.data,
      revoked: {
        id: currentSubscription.id,
        status: "cancelada",
      },
    },
  };
};

export const cancelSubscription = async (
  data: IAdminPsychologistBillingCancelDTO,
): Promise<Resolve> => {
  const repository = new AdminPsychologistBillingRepository();
  const profile = await repository.findPsychologist(data.p.id);

  if (!profile) return notFound();

  const actorAdmin = data.auth ?? data.admin;
  const responsibleAdminId = adminId(actorAdmin);

  if (!responsibleAdminId) {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  if (data.b.confirmation?.trim().toUpperCase() !== SUBSCRIPTION_CANCEL_CONFIRMATION) {
    return {
      status: 400,
      ...error("admin_subscription_cancel_confirmation_invalid", {}),
    };
  }

  const reason = trimOrNull(data.b.reason);

  if (!reason || reason.length < CANCEL_REASON_MIN_LENGTH) {
    return {
      status: 400,
      ...error("admin_subscription_cancel_reason_required", {}),
    };
  }

  const currentSubscription = await repository.findCurrentSubscription(profile.id);
  const scheduledGatewaySubscription =
    currentSubscription?.source === "admin_grant" && isActiveAt(currentSubscription, new Date())
      ? await repository.findScheduledGatewaySubscription(profile.id)
      : null;
  const subscription = scheduledGatewaySubscription ?? currentSubscription;

  if (
    !isAdminCancelableGatewaySubscription(subscription) ||
    !subscription?.gateway_subscription_id
  ) {
    return {
      status: 409,
      ...error("admin_subscription_cancel_unavailable", {}),
    };
  }

  try {
    const gatewayResult = await getPaymentGateway().cancelSubscription({
      gatewaySubscriptionId: subscription.gateway_subscription_id,
    });

    if (gatewayResult.status !== "cancelada") {
      return {
        status: 502,
        ...error("admin_subscription_cancel_gateway_failed", {}),
      };
    }

    const cancelledSubscription = await repository.cancelSubscription({
      audit: {
        adminId: responsibleAdminId,
        changedFields: ["Assinatura", "Status", "Provedor de pagamento"],
        metadata: {
          gateway: "mercadopago",
          gateway_status: gatewayResult.gateway_status ?? null,
          plan_slug: subscription.plan.slug,
          subscription_id: subscription.id,
        },
        reason,
        safeAfter: {
          Assinatura: planLabel(subscription),
          "Provedor de pagamento": "Mercado Pago",
          Status: "Cancelada",
        },
        safeBefore: {
          Assinatura: planLabel(subscription),
          "Provedor de pagamento": "Mercado Pago",
          Status: statusLabel(subscription.status),
        },
        targetId: profile.user.id,
      },
      gatewaySubscriptionId: gatewayResult.gateway_subscription_id,
      subscription,
    });
    const billing = await showAdminPsychologistBilling(data);

    return {
      status: 200,
      ...msg("billing_subscription_cancelled", {}),
      data: {
        billing: billing.data,
        cancelled: {
          gateway_status: gatewayResult.gateway_status,
          id: cancelledSubscription.id,
          status: "cancelada",
        },
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";

    if (
      message === "admin_subscription_cancel_target_not_found" ||
      message === "admin_subscription_cancel_already_cancelled" ||
      message === "admin_subscription_cancel_target_invalid"
    ) {
      return {
        status: 409,
        ...error("admin_subscription_cancel_unavailable", {}),
      };
    }

    const configError = isPaymentGatewayConfigurationError(err);

    return {
      status: configError ? 503 : 502,
      ...error(
        configError
          ? "admin_subscription_cancel_gateway_config_error"
          : "admin_subscription_cancel_gateway_failed",
        {},
      ),
    };
  }
};
