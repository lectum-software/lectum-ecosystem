import { error, msg } from "@/helpers/translate";
import type { IAddressDTO } from "../DTOs/IAddressDTO";
import { AddressRepository } from "../repositories/AddressRepository";

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

  const activeProfessional = await repository.findActiveProfessionalSubscription(profile.id!);

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
