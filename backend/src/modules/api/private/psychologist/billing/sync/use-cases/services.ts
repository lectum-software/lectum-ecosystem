import { error, msg } from "@/helpers/translate";
import {
  isPaymentGatewayConfigurationError,
  sanitizePaymentGatewayError,
} from "@/modules/billing/payment-gateway";
import { syncMercadoPagoSubscriptionRecord } from "@/modules/billing/sync-mercado-pago-subscription";
import type { ISyncDTO } from "../DTOs/ISyncDTO";
import { SyncRepository } from "../repositories/SyncRepository";

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
    console.error(
      "[BILLING] Falha na sincronização da assinatura externa.",
      sanitizePaymentGatewayError(err),
    );

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
