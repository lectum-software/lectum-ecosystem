import { error, msg } from "@/helpers/translate";
import {
  isPaymentGatewayConfigurationError,
  sanitizePaymentGatewayError,
} from "@/modules/billing/payment-gateway";
import { syncMercadoPagoSubscriptionRecord } from "@/modules/billing/sync-mercado-pago-subscription";
import type { IAddressDTO } from "../DTOs/IAddressDTO";
import { AddressRepository } from "../repositories/AddressRepository";

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
      "[BILLING] Falha na confirmação da assinatura externa.",
      sanitizePaymentGatewayError(err),
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
      const configError = isPaymentGatewayConfigurationError(err);

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

  const address = await repository.saveAddress(data.auth.id!, profile.id!, data.b);

  return {
    status: 200,
    ...msg("billing_address_saved", {}),
    data: {
      address,
      next_path: "/app/profissional/whatsapp/verificar",
    },
  };
};
