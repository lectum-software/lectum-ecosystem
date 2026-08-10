import type { Prisma } from "@/external/generated/prisma/client";
import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type { IAdminPatientDetailDTO } from "../../detail/DTOs/IAdminPatientDetailDTO";
import { showAdminPatient } from "../../detail/use-cases/services";
import type { IAdminPatientUpdatePersonalDataDTO } from "../DTOs/IAdminPatientProfileEditDTO";
import {
  type AdminPatientPersonalProfileUpdate,
  type AdminPatientPersonalUserUpdate,
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

const normalizeDisplayName = (value?: string | null) => {
  const normalized = value?.replace(/\s+/g, " ").trim();
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
  changedFieldKeys,
  nextDisplayName,
  nextGender,
  patient,
  previousDisplayName,
  previousGender,
  reason,
}: {
  adminId: string;
  changedFieldKeys: string[];
  nextDisplayName: string;
  nextGender: string | null;
  patient: AdminPatientProfileEditRecord;
  previousDisplayName: string;
  previousGender: string | null;
  reason: string | null;
}): AdminPatientProfileEditAudit | null => {
  if (changedFieldKeys.length === 0) return null;

  const changedFields: string[] = [];
  const safeBefore: Record<string, string | null> = {};
  const safeAfter: Record<string, string | null> = {};

  if (changedFieldKeys.includes("display_name")) {
    changedFields.push("Nome de exibição");
    safeBefore["Nome de exibição"] = previousDisplayName;
    safeAfter["Nome de exibição"] = nextDisplayName;
  }

  if (changedFieldKeys.includes("gender")) {
    changedFields.push("Gênero");
    safeBefore.Gênero = previousGender;
    safeAfter.Gênero = nextGender;
  }

  return {
    adminId,
    changedFields,
    metadata: {
      changed_field_keys: changedFieldKeys,
      profile_was_missing_or_deleted:
        !patient.patient_profile || Boolean(patient.patient_profile.deleted),
      readonly_fields: ["user.email", "patient_profile.city/state"],
      source: ADMIN_SOURCE,
      user_field_keys: changedFieldKeys.filter((key) => key === "display_name"),
    } as Prisma.InputJsonObject,
    reason,
    safeAfter: safeAfter as Prisma.InputJsonObject,
    safeBefore: safeBefore as Prisma.InputJsonObject,
    targetId: patient.id,
  };
};

export const updateAdminPatientPersonalData = async (
  data: IAdminPatientUpdatePersonalDataDTO,
): Promise<Resolve> => {
  const adminId = trimToNull(data.admin?.id);
  if (!adminId) return adminRequired();

  const repository = new AdminPatientProfileEditRepository();
  const patient = await repository.findPatient(data.p.id);
  if (!patient) return patientNotFound();

  const previousDisplayName = normalizeDisplayName(patient.name) || patient.name;
  const nextDisplayName = Object.hasOwn(data.b, "display_name")
    ? normalizeDisplayName(data.b.display_name)
    : previousDisplayName;

  if (!nextDisplayName || nextDisplayName.length < 2 || nextDisplayName.length > 120) {
    return {
      status: 400,
      ...error("admin_patient_profile_invalid_display_name", {}),
    };
  }

  const previousGender =
    patient.patient_profile && !patient.patient_profile.deleted
      ? normalizeGender(patient.patient_profile.gender)
      : null;
  const nextGender = Object.hasOwn(data.b, "gender")
    ? normalizeGender(data.b.gender)
    : previousGender;

  if (nextGender && !ALLOWED_GENDERS.has(nextGender)) {
    return {
      status: 400,
      ...error("admin_patient_profile_invalid_gender", {}),
    };
  }

  const changedFieldKeys: string[] = [];
  if (previousDisplayName !== nextDisplayName) changedFieldKeys.push("display_name");
  if (previousGender !== nextGender) changedFieldKeys.push("gender");

  if (changedFieldKeys.length === 0) {
    return detailResponse(patient.id, "admin_patient_profile_no_changes");
  }

  const audit = buildPersonalAudit({
    adminId,
    changedFieldKeys,
    nextDisplayName,
    nextGender,
    patient,
    previousDisplayName,
    previousGender,
    reason: trimToNull(data.b.reason),
  });

  const userUpdate: AdminPatientPersonalUserUpdate | null = changedFieldKeys.includes(
    "display_name",
  )
    ? { name: nextDisplayName }
    : null;

  const profileUpdate: AdminPatientPersonalProfileUpdate | null = changedFieldKeys.includes(
    "gender",
  )
    ? { gender: nextGender }
    : null;

  await repository.updatePersonalData(patient, {
    audit,
    profile: profileUpdate,
    user: userUpdate,
  });

  return detailResponse(patient.id, "admin_patient_profile_personal_updated");
};

export default async (data: IAdminPatientUpdatePersonalDataDTO): Promise<Resolve> => {
  return updateAdminPatientPersonalData(data);
};
