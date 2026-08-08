import { z } from "zod";
import { error } from "@/helpers/translate";
import type {
  FreeProfessionalProfileAcademic,
  FreeProfessionalProfileAddress,
  FreeProfessionalProfileResponse,
  FreeProfessionalProfileUpdateBody,
} from "../../DTOs/IFreeProfileDTO";

export const trimToNull = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || null;
};

export const emptyTextToNull = (value: unknown) => {
  if (typeof value !== "string") return value;

  return value.trim() ? value : null;
};

export const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

export const normalizeCpf = (value?: string | null) => {
  const digits = onlyDigits(value);
  return digits || null;
};

export const normalizeWhatsapp = (value?: string | null) => {
  const digits = onlyDigits(value);
  if (!digits) return null;
  return `+${digits.slice(0, 15)}`;
};

export const normalizeBirthdate = (value?: string | null) => {
  const rawValue = value?.trim();
  if (!rawValue) return null;

  const dateOnly = rawValue.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!match) return null;

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const time = Date.UTC(year, month - 1, day);
  const parsed = new Date(time);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  const todayTime = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const minimumBirthdateTime = Date.UTC(1900, 0, 1);

  if (time > todayTime || time < minimumBirthdateTime) return null;

  return parsed;
};

export const normalizeList = (value?: string[]) => {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.map((item) => item.trim()).filter(Boolean)));
};

export const hasLockedProfessionalIdentityFields = (profile: FreeProfessionalProfileResponse) =>
  profile.profile.identity_fields_locked;

export const requiresPaidRegistryVerification = (profile: FreeProfessionalProfileResponse) =>
  !profile.plan.is_free &&
  profile.plan.source !== "admin_grant" &&
  profile.profile.crp_status !== "aprovado" &&
  !profile.profile.cfp_verified_at;

export const paidRegistryVerificationRequired = () => ({
  status: 403,
  ...error("professional_registry_verification_required", {}),
});

export const academicFormationSchema = z.object({
  title: z.string().trim().max(160).nullable().optional(),
  institution: z.string().trim().max(160).nullable().optional(),
  graduation_year: z.string().trim().max(20).nullable().optional(),
});

export const academicSchema = academicFormationSchema.optional();

export const academicFormationsSchema = z.array(academicFormationSchema).max(5).optional();

export const addressSchema = z
  .object({
    street: z.string().trim().max(160).nullable().optional(),
    number: z.string().trim().max(40).nullable().optional(),
    complement: z.string().trim().max(80).nullable().optional(),
    district: z.string().trim().max(120).nullable().optional(),
    zip: z.string().trim().max(20).nullable().optional(),
    city: z.string().trim().max(120).nullable().optional(),
    state: z.string().trim().max(2).nullable().optional(),
  })
  .optional();

export const normalizeAcademic = (
  value?: z.infer<typeof academicSchema>,
): FreeProfessionalProfileAcademic => ({
  title: trimToNull(value?.title),
  institution: trimToNull(value?.institution),
  graduation_year: trimToNull(value?.graduation_year),
});

export const hasAcademicContent = (value: FreeProfessionalProfileAcademic) => {
  return Boolean(value.title || value.institution || value.graduation_year);
};

export const normalizeAcademicFormations = (
  value?: z.infer<typeof academicFormationsSchema>,
): FreeProfessionalProfileAcademic[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => normalizeAcademic(item)).filter(hasAcademicContent);
};

export const normalizeAddress = (
  value?: z.infer<typeof addressSchema>,
): FreeProfessionalProfileAddress => ({
  street: trimToNull(value?.street),
  number: trimToNull(value?.number),
  complement: trimToNull(value?.complement),
  district: trimToNull(value?.district),
  zip: trimToNull(value?.zip),
  city: trimToNull(value?.city),
  state: trimToNull(value?.state)?.toUpperCase() || null,
});

export const updateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  professional_first_name: z.string().trim().min(2).max(80),
  professional_last_name: z.string().trim().min(1).max(120),
  cpf: z.string().nullable().optional(),
  birthdate: z.string().trim().nullable().optional(),
  gender: z.string().trim().max(40).nullable().optional(),
  race_color: z.string().trim().max(40).nullable().optional(),
  religion: z.string().trim().max(80).nullable().optional(),
  crp_region: z.string().trim().max(120).nullable().optional(),
  crp_number: z.string().trim().max(40).nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  headline: z.preprocess(emptyTextToNull, z.string().trim().min(3).max(120).nullable().optional()),
  bio: z.preprocess(emptyTextToNull, z.string().trim().min(20).max(2000).nullable().optional()),
  modality: z.enum(["online", "presencial", "hibrido"]).nullable().optional(),
  languages: z.array(z.string().trim().min(2).max(40)).max(8).optional(),
  target_audience: z.array(z.string().trim().min(2).max(40)).max(8).optional(),
  discount_first_session: z.boolean().optional(),
  social_value: z.boolean().optional(),
  accepts_insurance: z.boolean().optional(),
  show_experience_tag: z.boolean().optional(),
  academic: academicSchema,
  academic_formations: academicFormationsSchema,
  available_days: z.array(z.string().trim().min(2).max(20)).max(7).optional(),
  address: addressSchema,
  specialty_ids: z.array(z.string().min(8).max(80)).optional(),
  service_ids: z.array(z.string().min(8).max(80)).optional(),
  approach_ids: z.array(z.string().min(8).max(80)).optional(),
  published: z.boolean().optional(),
});

export const hasPresentationVideo = (value?: string | null) => Boolean(value?.trim());

export const hasRequiredPublishingFields = (
  body: Required<FreeProfessionalProfileUpdateBody>,
  profile: { video_url?: string | null },
) => {
  return Boolean(
    body.name &&
      hasPresentationVideo(profile.video_url) &&
      body.modality &&
      body.specialty_ids.length > 0 &&
      body.service_ids.length > 0 &&
      body.approach_ids.length > 0 &&
      body.target_audience.length > 0 &&
      body.gender &&
      body.cpf &&
      body.birthdate &&
      body.crp_region &&
      body.crp_number &&
      body.address.state &&
      body.address.city,
  );
};

export const assertCatalogIds = (
  selectedIds: string[],
  validIds: string[],
  key: "specialty" | "service" | "approach",
) => {
  const valid = new Set(validIds);
  const invalid = selectedIds.filter((id) => !valid.has(id));

  if (invalid.length > 0) {
    return error("invalid_catalog_selection", { catalog: key });
  }

  return null;
};

export const publicFileUrl = (key: string) => {
  const rawBase = String(process.env.BASE || "").trim();
  let base = rawBase.replace(/\/$/, "");

  try {
    base = rawBase ? new URL(rawBase).origin : "";
  } catch (_err) {
    base = rawBase.replace(/\/$/, "");
  }

  const publicPath = `/public/files/${key}`;

  return base ? `${base}${publicPath}` : publicPath;
};
