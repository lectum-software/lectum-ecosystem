import { error, msg } from "@/helpers/translate";
import { billingAddressAccess } from "@/modules/billing/invoices/address-access";
import { withContractedPlan } from "@/modules/billing/subscription-provider";
import type { ICurrentDTO } from "../DTOs/ICurrentDTO";
import { CurrentRepository } from "../repositories/CurrentRepository";

export default async (data: ICurrentDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new CurrentRepository();
  const current = await repository.show(data.auth.id!);
  const addressAccess = await billingAddressAccess(data.auth.id!);

  return {
    status: 200,
    ...msg("show", {}),
    data: {
      current: current ? withContractedPlan(current) : null,
      billing_address_complete: await repository.hasBillingAddress(data.auth.id!),
      billing_address_editable: addressAccess.editable,
      billing_address_maintenance_only: addressAccess.maintenanceOnly,
      capabilities: { device_session_id: true, device_session_id_dotted: true },
    },
  };
};
