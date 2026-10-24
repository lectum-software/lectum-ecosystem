import { msg } from "@/helpers/translate";
import type { admin } from "@/interfaces/objects";
import { fiscalNameSchema } from "@/modules/billing/invoices/fiscal-identity";
import type { IAdminPsychologistRegistryVerificationShowDTO } from "../../DTOs/IAdminPsychologistRegistryVerificationDTO";
import { AdminPsychologistRegistryVerificationRepository } from "../../repositories/AdminPsychologistRegistryVerificationRepository";
import { FiscalIdentityRepository } from "../../repositories/FiscalIdentityRepository";
import { notFound, serviceError } from "./registry-response";
import { toActor } from "./registry-support";

type FiscalRequest = IAdminPsychologistRegistryVerificationShowDTO & {
  auth?: admin;
  admin?: admin;
  b: { full_name: string; revision: string | null; profile_revision: string };
};

export async function showFiscalIdentity(data: IAdminPsychologistRegistryVerificationShowDTO) {
  const profile = await new AdminPsychologistRegistryVerificationRepository().findPsychologist(
    data.p.id,
  );
  if (!profile) return notFound();
  return {
    status: 200,
    ...msg("show", {}),
    data: await new FiscalIdentityRepository().read(profile.id),
  };
}

export async function saveFiscalIdentity(data: FiscalRequest) {
  const actorId = toActor(data.auth ?? data.admin).id;
  if (!actorId) return serviceError(403, "unauthorized");
  const name = fiscalNameSchema.safeParse(data.b.full_name);
  if (!name.success) return serviceError(400, "admin_fiscal_name_invalid");
  const profile = await new AdminPsychologistRegistryVerificationRepository().findPsychologist(
    data.p.id,
  );
  if (!profile) return notFound();
  const repository = new FiscalIdentityRepository();
  const outcome = await repository.save(profile.id, { ...data.b, full_name: name.data }, actorId);
  if (outcome === "changed") return serviceError(409, "admin_registry_verification_changed");
  if (outcome === "cpf_missing") return serviceError(400, "admin_fiscal_cpf_required");
  return { status: 200, ...msg("update", {}), data: await repository.read(profile.id) };
}
