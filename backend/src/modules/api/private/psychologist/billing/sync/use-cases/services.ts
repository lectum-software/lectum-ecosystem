import { error, msg } from "@/helpers/translate";
import { isPaymentGatewayConfigurationError } from "@/modules/billing/payment-gateway";
import { syncMercadoPagoSubscriptionRecord } from "@/modules/billing/sync-mercado-pago-subscription";
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
    const synced = await syncMercadoPagoSubscriptionRecord({
      localSubscription,
      repository,
    });

    return {
      status: 200,
      ...msg("billing_subscription_synced", {}),
      data: {
        current: synced?.current ?? null,
        gateway_status: synced?.gatewaySubscription.gateway_status ?? null,
        synced: Boolean(synced),
      },
    };
  } catch (err) {
    console.error("[BILLING] Mercado Pago subscription sync failed", sanitizeGatewayError(err));

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
};
