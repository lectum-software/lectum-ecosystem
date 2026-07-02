import { error, msg } from "@/helpers/translate";
import { getPaymentGateway } from "@/modules/billing/payment-gateway";
import type { ISyncDTO } from "../DTOs/ISyncDTO";
import { SyncRepository } from "../repositories/SyncRepository";

type GatewayErrorLog = {
  name?: string;
  message?: string;
  operation?: string;
  cause_message?: string;
  status?: number;
  code?: string;
  blocked_by?: string;
};

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

  return {
    message: "Unknown gateway error",
  };
};

const parseDate = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const isGatewayConfigError = (err: unknown) => {
  const message = err instanceof Error ? err.message : "";

  return (
    message.includes("MERCADO_PAGO_ACCESS_TOKEN_NOT_CONFIGURED") ||
    message.includes("MERCADO_PAGO_ENV_INVALID")
  );
};

export default async (data: ISyncDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new SyncRepository();
  const profile = await repository.findProfileByUserId(data.auth.id!);

  if (!profile || profile.deleted) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  const localSubscription = await repository.findLatestGatewaySubscription(profile.id!);

  if (!localSubscription?.id || !localSubscription.gateway_subscription_id) {
    return {
      status: 404,
      ...error("billing_subscription_sync_required", {}),
    };
  }

  try {
    const gateway = getPaymentGateway();
    const gatewaySubscription = await gateway.getSubscription(
      localSubscription.gateway_subscription_id,
    );

    const current = await repository.updateSubscriptionStatus({
      subscriptionId: localSubscription.id,
      gatewaySubscriptionId: gatewaySubscription.gateway_subscription_id,
      status: gatewaySubscription.status,
      currentPeriodEnd: parseDate(gatewaySubscription.next_payment_date),
    });

    return {
      status: 200,
      ...msg("billing_subscription_synced", {}),
      data: {
        current,
        gateway_status: gatewaySubscription.gateway_status,
        synced: true,
      },
    };
  } catch (err) {
    console.error("[BILLING] Mercado Pago subscription sync failed", sanitizeGatewayError(err));

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
};
