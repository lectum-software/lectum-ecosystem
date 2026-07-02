import { error, msg } from "@/helpers/translate";
import { syncMercadoPagoSubscriptionRecord } from "@/modules/billing/sync-mercado-pago-subscription";
import type { IAddressDTO } from "../DTOs/IAddressDTO";
import { AddressRepository } from "../repositories/AddressRepository";

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

const isGatewayConfigError = (err: unknown) => {
  const message = err instanceof Error ? err.message : "";

  return (
    message.includes("MERCADO_PAGO_ACCESS_TOKEN_NOT_CONFIGURED") ||
    message.includes("MERCADO_PAGO_ENV_INVALID")
  );
};

const refreshActiveProfessionalSubscription = async ({
  profileId,
  repository,
}: {
  profileId: string;
  repository: AddressRepository;
}) => {
  const localSubscription = await repository.findLatestGatewaySubscription(profileId);

  if (!localSubscription?.id || !localSubscription.gateway_subscription_id) {
    return null;
  }

  try {
    await syncMercadoPagoSubscriptionRecord({
      localSubscription,
      repository,
    });
  } catch (err) {
    console.error(
      "[BILLING] Mercado Pago address subscription confirmation failed",
      sanitizeGatewayError(err),
    );
    throw err;
  }

  return repository.findActiveProfessionalSubscription(profileId);
};

export default async (data: IAddressDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new AddressRepository();
  const profile = await repository.findProfileByUserId(data.auth.id!);

  if (!profile || profile.deleted) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  let activeProfessional = await repository.findActiveProfessionalSubscription(profile.id!);

  if (!activeProfessional) {
    try {
      activeProfessional = await refreshActiveProfessionalSubscription({
        profileId: profile.id!,
        repository,
      });
    } catch (err) {
      const configError = isGatewayConfigError(err);

      return {
        status: configError ? 503 : 502,
        ...error(
          configError ? "billing_gateway_config_error" : "billing_subscription_confirmation_failed",
          {},
        ),
      };
    }
  }

  if (!activeProfessional) {
    return {
      status: 409,
      ...error("billing_address_subscription_required", {}),
    };
  }

  const address = await repository.saveAddress(data.auth.id!, data.b);

  return {
    status: 200,
    ...msg("billing_address_saved", {}),
    data: {
      address,
      next_path: "/app/professional/whatsapp/verify",
    },
  };
};
