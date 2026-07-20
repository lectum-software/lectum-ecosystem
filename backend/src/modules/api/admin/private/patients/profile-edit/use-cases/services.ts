import type { Prisma } from "@/external/generated/prisma/client";
import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type { IAdminPatientDetailDTO } from "../../detail/DTOs/IAdminPatientDetailDTO";
import { showAdminPatient } from "../../detail/use-cases/services";
import type { IAdminPatientUpdatePersonalDataDTO } from "../DTOs/IAdminPatientProfileEditDTO";
import {
  type AdminPatientPersonalProfileUpdate,
  type AdminPatientProfileEditAudit,
  type AdminPatientProfileEditRecord,
  AdminPatientProfileEditRepository,
} from "../repositories/AdminPatientProfileEditRepository";

const ADMIN_SOURCE = "admin_panel";
const ALLOWED_GENDERS = new Set([
  "feminino",
  "masculino",
  "nao_binario",
  "outro",
  "prefiro_nao_dizer",
]);

const trimToNull = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || null;
};

const normalizeGender = (value?: string | null) => trimToNull(value);

const patientNotFound = () => ({
  status: 404,
  ...error("not_found", { model: "patient" }),
});

const adminRequired = () => ({
  status: 403,
  ...error("role_not_authorized", {}),
});

const detailResponse = async (id: string, messageKey: string): Promise<Resolve> => {
  const detail = await showAdminPatient({
    p: { id },
    q: { period: "month" },
  } as IAdminPatientDetailDTO);

  return {
    status: detail.status ?? 200,
    ...msg(messageKey, {}),
    data: detail.data,
  };
};

const buildPersonalAudit = ({
  adminId,
  nextGender,
  patient,
  previousGender,
  reason,
}: {
  adminId: string;
  nextGender: string | null;
  patient: AdminPatientProfileEditRecord;
  previousGender: string | null;
  reason: string | null;
}): AdminPatientProfileEditAudit => ({
  adminId,
  changedFields: ["Gênero"],
  metadata: {
    changed_field_keys: ["gender"],
    profile_was_missing_or_deleted:
      !patient.patient_profile || Boolean(patient.patient_profile.deleted),
    readonly_fields: ["user.email", "visitor_location.city/state/country"],
    source: ADMIN_SOURCE,
  } as Prisma.InputJsonObject,
  reason,
  safeAfter: {
    Gênero: nextGender,
  } as Prisma.InputJsonObject,
  safeBefore: {
    Gênero: previousGender,
  } as Prisma.InputJsonObject,
  targetId: patient.id,
});

export const updateAdminPatientPersonalData = async (
  data: IAdminPatientUpdatePersonalDataDTO,
): Promise<Resolve> => {
  const adminId = trimToNull(data.admin?.id);
  if (!adminId) return adminRequired();

  const repository = new AdminPatientProfileEditRepository();
  const patient = await repository.findPatient(data.p.id);
  if (!patient) return patientNotFound();

  const previousGender = normalizeGender(patient.patient_profile?.gender);
  const nextGender = Object.hasOwn(data.b, "gender")
    ? normalizeGender(data.b.gender)
    : previousGender;

  if (nextGender && !ALLOWED_GENDERS.has(nextGender)) {
    return {
      status: 400,
      ...error("admin_patient_profile_invalid_gender", {}),
    };
  }

  if (
    previousGender === nextGender &&
    patient.patient_profile &&
    !patient.patient_profile.deleted
  ) {
    return detailResponse(patient.id, "admin_patient_profile_no_changes");
  }

  const audit = buildPersonalAudit({
    adminId,
    nextGender,
    patient,
    previousGender,
    reason: trimToNull(data.b.reason),
  });

  const profileUpdate: AdminPatientPersonalProfileUpdate = {
    gender: nextGender,
  };

  await repository.updatePersonalData(patient, { audit, profile: profileUpdate });

  return detailResponse(patient.id, "admin_patient_profile_personal_updated");
};

export default async (data: IAdminPatientUpdatePersonalDataDTO): Promise<Resolve> => {
  return updateAdminPatientPersonalData(data);
};
