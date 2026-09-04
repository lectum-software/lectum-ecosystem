import type {
  DirectoryPsychologist,
  DirectoryPsychologistsQuery,
} from "@/api/generator/types/directory";
import { normalizeProfessionalDisplayName } from "../../../../utils/professional-name";
import { normalizePatientModalityFilter, type PsychologistsFilterForm } from "../use-form";
import { PAGE_LIMIT } from "./onboarding";

export const formatRating = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "0,0";

  return (ratingAvg / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

export const formatProfileTitle = (
  gender?: string | null,
  formationYears?: number | null,
  showExperienceTag?: boolean | null,
) => {
  const base =
    gender?.toLowerCase() === "feminino" || gender?.toLowerCase() === "mulher"
      ? "Psicóloga"
      : "Psicólogo";

  if (showExperienceTag === false) {
    return base;
  }

  const years = formationYears ?? 0;
  const yearsLabel = years === 1 ? "1 ano exp." : `${years} anos exp.`;

  return `${base} • ${yearsLabel}`;
};

export const formatDisplayName = (name: string) => {
  return normalizeProfessionalDisplayName(name) || name.replace(/\s+/g, " ").trim();
};

const normalizePsychologistSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export const filterPsychologistsByName = (
  psychologists: readonly DirectoryPsychologist[] | undefined,
  query: string,
  limit = 8,
) => {
  const typedName = normalizePsychologistSearchText(query);
  if (typedName.length < 2) return [];

  const seen = new Set<string>();

  return (psychologists ?? [])
    .filter((psychologist) =>
      normalizePsychologistSearchText(psychologist.name).includes(typedName),
    )
    .filter((psychologist) => {
      if (seen.has(psychologist.id)) return false;
      seen.add(psychologist.id);
      return true;
    })
    .slice(0, limit);
};

export const splitNameForBadge = (name: string) => {
  const words = formatDisplayName(name).trim().split(/\s+/).filter(Boolean);

  if (words.length <= 1) {
    return {
      firstPart: "",
      lastPart: words[0] ?? "",
    };
  }

  return {
    firstPart: words.slice(0, -1).join(" "),
    lastPart: words[words.length - 1],
  };
};

type RawPsychologistsFilterFormValues = Omit<Partial<PsychologistsFilterForm>, "modality"> & {
  modality?: string | null;
};

export const normalizeFormValues = (
  values: RawPsychologistsFilterFormValues,
): PsychologistsFilterForm => ({
  search: values.search?.trim() || "",
  specialty: values.specialty?.trim() || null,
  service: values.service?.trim() || null,
  modality: normalizePatientModalityFilter(values.modality),
  approach: values.approach?.trim() || null,
  target_audience: values.target_audience?.trim() || null,
  state: values.state?.trim() || null,
  city: values.city?.trim() || null,
  gender: values.gender?.trim() || null,
  race_color: values.race_color?.trim() || null,
  religion: values.religion?.trim() || null,
  language: values.language?.trim() || null,
  more_experienced: Boolean(values.more_experienced),
  discount_first_session: Boolean(values.discount_first_session),
  accepts_insurance: Boolean(values.accepts_insurance),
  social_value: Boolean(values.social_value),
  available_today: Boolean(values.available_today),
  verified: Boolean(values.verified),
});

export const toQuery = (
  values: PsychologistsFilterForm,
  page: number,
): DirectoryPsychologistsQuery => ({
  page,
  limit: PAGE_LIMIT,
  search: values.search?.trim() || undefined,
  specialty: values.specialty || undefined,
  service: values.service || undefined,
  modality: values.modality || undefined,
  approach: values.approach || undefined,
  target_audience: values.target_audience || undefined,
  state: values.state || undefined,
  city: values.city || undefined,
  gender: values.gender || undefined,
  race_color: values.race_color || undefined,
  religion: values.religion || undefined,
  language: values.language || undefined,
  more_experienced: values.more_experienced || undefined,
  discount_first_session: values.discount_first_session || undefined,
  accepts_insurance: values.accepts_insurance || undefined,
  social_value: values.social_value || undefined,
  available_today: values.available_today || undefined,
  verified: values.verified || undefined,
});

export const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};
