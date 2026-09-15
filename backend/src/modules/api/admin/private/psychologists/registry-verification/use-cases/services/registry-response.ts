import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { parseGrantCrpRegistrationDate } from "@/operations/subscriptions/grant-professional-subscription-service";
import { normalizeStoredCrp } from "@/utils/professional-registry";
import type { IAdminPsychologistRegistryVerificationShowDTO } from "../../DTOs/IAdminPsychologistRegistryVerificationDTO";
import {
  type AdminPsychologistRegistryVerificationPreviousRecord,
  AdminPsychologistRegistryVerificationRepository,
} from "../../repositories/AdminPsychologistRegistryVerificationRepository";
import { buildResponse } from "./registry-summary";
import { trimOrNull } from "./registry-support";

export { buildResponse, summarizeVerification } from "./registry-summary";

export const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist_profile" }),
});

export const serviceError = (status: number, code: string): Resolve => ({
  status,
  ...error(code, {}),
});

export const parseRegistrationDate = (value: string): Date => {
  try {
    return parseGrantCrpRegistrationDate(value);
  } catch (err) {
    const code = err instanceof Error ? err.message : "crp_registration_date_invalid";
    throw new Error(code);
  }
};

export const toAuditProfile = (profile: AdminPsychologistRegistryVerificationPreviousRecord) => ({
  cfp_verified_at: profile.cfp_verified_at?.toISOString() ?? null,
  cpf: trimOrNull(profile.cpf),
  crp: normalizeStoredCrp(profile.crp),
  crp_registration_date: profile.crp_registration_date?.toISOString() ?? null,
  crp_status: profile.crp_status,
  id: profile.id,
  user_id: profile.user_id,
});

export const showRegistryVerification = async (
  data: IAdminPsychologistRegistryVerificationShowDTO,
): Promise<Resolve> => {
  const repository = new AdminPsychologistRegistryVerificationRepository();
  const profile = await repository.findPsychologist(data.p.id);

  if (!profile) return notFound();

  return {
    status: 200,
    ...msg("show", {}),
    data: buildResponse(profile),
  };
};
