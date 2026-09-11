import type {
  AdminPsychologistPersonalProfileUpdate,
  AdminPsychologistProfessionalProfileUpdate,
} from "../../repositories/AdminPsychologistProfileEditRepository";
import type { buildPersonalPlan } from "./personal";
import type { buildProfessionalAudit } from "./professional";

type PersonalNext = ReturnType<typeof buildPersonalPlan>["next"];
type ProfessionalNext = Parameters<typeof buildProfessionalAudit>[0]["next"];

const personalColumns = {
  address_city: "professional_address_city",
  address_complement: "professional_address_complement",
  address_district: "professional_address_district",
  address_number: "professional_address_number",
  address_state: "professional_address_state",
  address_street: "professional_address_street",
  address_zip: "professional_address_zip",
  birthdate: "birthdate",
  cpf: "cpf",
  gender: "gender",
  race_color: "race_color",
  religion: "religion",
  whatsapp: "whatsapp",
} as const satisfies Record<keyof PersonalNext, keyof AdminPsychologistPersonalProfileUpdate>;

export const buildPersonalProfileUpdate = (next: PersonalNext, changedFields: readonly string[]) =>
  Object.fromEntries(
    Object.entries(personalColumns)
      .filter(([key]) => changedFields.includes(key))
      .map(([key, column]) => [column, next[key as keyof PersonalNext]]),
  ) as AdminPsychologistPersonalProfileUpdate;

export const buildProfessionalChanges = (
  next: ProfessionalNext,
  changedFields: readonly string[],
) => {
  const profile: AdminPsychologistProfessionalProfileUpdate = {};
  if (changedFields.includes("languages")) profile.languages = next.languages;
  if (changedFields.includes("modality")) profile.modality = next.modality;
  if (changedFields.includes("target_audience")) profile.target_audience = next.target_audience;
  return {
    profile,
    ...(changedFields.includes("approach_ids") ? { approachIds: next.approach_ids } : {}),
    ...(changedFields.includes("service_ids") ? { serviceIds: next.service_ids } : {}),
    ...(changedFields.includes("specialty_ids") ? { specialtyIds: next.specialty_ids } : {}),
  };
};
