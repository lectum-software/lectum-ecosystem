"use client";

import {
  Award,
  BadgePercent,
  CalendarCheck,
  Check,
  HandHeart,
  type LucideIcon,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import type {
  DirectoryCatalogItem,
  DirectoryPsychologistFilters,
} from "@/api/generator/types/directory";
import { cn } from "@/lib/utils";
import { CITY_OPTIONS_BY_STATE } from "../../professional/profile/setup/brazil-cities";
import { STATE_OPTIONS } from "../../professional/profile/setup/options";
import { PATIENT_MODALITY_FILTER_OPTIONS, type PsychologistsFilterForm } from "../use-form";
import { normalizeFormValues } from "./profile-format";

export type PsychologistFilterKey = keyof PsychologistsFilterForm;

type ActiveFilterChip = {
  key: PsychologistFilterKey;
  label: string;
};

type LabelOption = {
  label: string;
  value: boolean | number | string;
};

const BOOLEAN_FILTER_LABELS = {
  verified: "Somente verificados",
  more_experienced: "Mais experientes",
  discount_first_session: "Desconto 1ª sessão",
  accepts_insurance: "Aceita convênio",
  social_value: "Valor social",
  available_today: "Disponível hoje",
} satisfies Partial<Record<PsychologistFilterKey, string>>;

export type FilterFeatureKey = Extract<
  PsychologistFilterKey,
  | "verified"
  | "more_experienced"
  | "discount_first_session"
  | "accepts_insurance"
  | "social_value"
  | "available_today"
>;

type FilterFeatureOption = {
  name: FilterFeatureKey;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const FILTER_FEATURE_OPTIONS: FilterFeatureOption[] = [
  {
    name: "available_today",
    label: "Disponível hoje",
    description: "Psicólogos com disponibilidade para atendimento ainda hoje.",
    icon: CalendarCheck,
  },
  {
    name: "verified",
    label: "Somente verificados",
    description: "Psicólogos com registro verificado junto ao Conselho Federal de Psicologia",
    icon: ShieldCheck,
  },
  {
    name: "more_experienced",
    label: "Mais experientes",
    description: "Psicólogos com mais de 10 anos de experiência.",
    icon: Award,
  },
  {
    name: "discount_first_session",
    label: "Desconto na 1ª sessão",
    description: "Psicólogos com condição especial para a primeira consulta.",
    icon: BadgePercent,
  },
  {
    name: "accepts_insurance",
    label: "Aceita convênios",
    description: "Psicólogos que atendem por planos de saúde.",
    icon: Stethoscope,
  },
  {
    name: "social_value",
    label: "Valor social",
    description: "Para a população de baixa renda.",
    icon: HandHeart,
  },
];

const DIRECTORY_FILTER_TRACKING_FIELDS = [
  { name: "specialty", targetType: "psychologist_filter_specialty" },
  { name: "service", targetType: "psychologist_filter_service" },
  { name: "modality", targetType: "psychologist_filter_modality" },
  { name: "approach", targetType: "psychologist_filter_approach" },
  { name: "target_audience", targetType: "psychologist_filter_target_audience" },
  { name: "state", targetType: "psychologist_filter_state" },
  { name: "city", targetType: "psychologist_filter_city" },
  { name: "gender", targetType: "psychologist_filter_gender" },
  { name: "race_color", targetType: "psychologist_filter_race_color" },
  { name: "religion", targetType: "psychologist_filter_religion" },
  { name: "language", targetType: "psychologist_filter_language" },
] as const satisfies ReadonlyArray<{
  name: keyof PsychologistsFilterForm;
  targetType: string;
}>;

const DIRECTORY_FILTER_FEATURE_TRACKING_FIELDS = [
  "available_today",
  "verified",
  "more_experienced",
  "discount_first_session",
  "accepts_insurance",
  "social_value",
] as const satisfies ReadonlyArray<FilterFeatureKey>;

const normalizeFilterTrackingTargetId = (value: unknown) => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed.slice(0, 128);
};

export const buildDirectoryFilterSearchTrackingItems = (values: PsychologistsFilterForm) => {
  const items: Array<{ targetId: string; targetType: string }> = [];

  for (const field of DIRECTORY_FILTER_TRACKING_FIELDS) {
    const baseTargetId = normalizeFilterTrackingTargetId(values[field.name]);
    const state = normalizeFilterTrackingTargetId(values.state)?.toUpperCase() ?? null;
    const targetId =
      field.name === "city" && baseTargetId && state ? `${baseTargetId}/${state}` : baseTargetId;

    if (!targetId) continue;

    items.push({
      targetId,
      targetType: field.targetType,
    });
  }

  for (const feature of DIRECTORY_FILTER_FEATURE_TRACKING_FIELDS) {
    if (!values[feature]) continue;

    items.push({
      targetId: feature,
      targetType: "psychologist_filter_feature",
    });
  }

  return items;
};

export const FilterFeatureCard = ({
  checked,
  onToggle,
  option,
}: {
  checked: boolean;
  onToggle: (name: FilterFeatureKey) => void;
  option: FilterFeatureOption;
}) => {
  const Icon = option.icon;

  return (
    <button
      aria-pressed={checked}
      className={cn(
        "group flex w-full items-start gap-3 rounded-[22px] border p-3.5 text-left transition duration-200 ease-out sm:p-4",
        checked
          ? "border-primary/45 bg-surface shadow-[0_12px_28px_rgb(48_140_232_/_10%)]"
          : "border-border/70 bg-surface shadow-[0_8px_22px_rgb(15_23_42_/_4%)] hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_14px_32px_rgb(15_23_42_/_7%)]",
      )}
      onClick={() => onToggle(option.name)}
      type="button"
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-2xl transition duration-200 ease-out",
          checked
            ? "bg-primary-soft text-primary ring-1 ring-primary/20"
            : "bg-primary-soft/70 text-primary",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold leading-5 text-foreground">
          {option.label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted">{option.description}</span>
      </span>
      <span
        className={cn(
          "mt-1 flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition duration-200 ease-out",
          checked
            ? "border-primary/45 bg-primary"
            : "border-border bg-surface-muted group-hover:border-primary/25",
        )}
      >
        <span
          className={cn(
            "grid h-5 w-5 place-items-center rounded-full bg-surface text-transparent shadow-[0_2px_8px_rgb(15_23_42_/_12%)] transition duration-200 ease-out",
            checked && "translate-x-5 text-primary",
          )}
        >
          <Check className="h-3 w-3" aria-hidden="true" strokeWidth={2.8} />
        </span>
      </span>
    </button>
  );
};

const humanizeFilterValue = (value: string) =>
  value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("pt-BR"));

const findOptionLabel = (options: readonly LabelOption[], value?: string | null) => {
  if (!value) return null;

  return options.find((option) => String(option.value) === value)?.label ?? null;
};

const findCatalogLabel = (
  items: readonly DirectoryCatalogItem[] | undefined,
  value?: string | null,
) => {
  if (!value) return null;

  return (
    items?.find((item) => item.slug === value || item.id === value || item.name === value)?.name ??
    null
  );
};

export const buildActiveFilterChips = (
  values: PsychologistsFilterForm,
  filters?: Pick<
    DirectoryPsychologistFilters,
    | "approaches"
    | "genders"
    | "languages"
    | "race_colors"
    | "religions"
    | "services"
    | "specialties"
    | "target_audiences"
  >,
) => {
  const normalizedValues = normalizeFormValues(values);
  const chips: ActiveFilterChip[] = [];
  const addChip = (key: PsychologistFilterKey, label?: string | null) => {
    const normalizedLabel = label?.trim();

    if (!normalizedLabel) return;

    chips.push({
      key,
      label: normalizedLabel,
    });
  };

  addChip("search", normalizedValues.search);
  addChip(
    "specialty",
    findCatalogLabel(filters?.specialties, normalizedValues.specialty) ??
      (normalizedValues.specialty ? humanizeFilterValue(normalizedValues.specialty) : null),
  );
  addChip(
    "service",
    findCatalogLabel(filters?.services, normalizedValues.service) ??
      (normalizedValues.service ? humanizeFilterValue(normalizedValues.service) : null),
  );
  addChip("modality", findOptionLabel(PATIENT_MODALITY_FILTER_OPTIONS, normalizedValues.modality));
  addChip(
    "approach",
    findCatalogLabel(filters?.approaches, normalizedValues.approach) ??
      (normalizedValues.approach ? humanizeFilterValue(normalizedValues.approach) : null),
  );
  addChip(
    "target_audience",
    findCatalogLabel(filters?.target_audiences, normalizedValues.target_audience) ??
      (normalizedValues.target_audience
        ? humanizeFilterValue(normalizedValues.target_audience)
        : null),
  );
  addChip(
    "state",
    findOptionLabel(STATE_OPTIONS, normalizedValues.state) ??
      (normalizedValues.state ? humanizeFilterValue(normalizedValues.state) : null),
  );
  addChip(
    "city",
    findOptionLabel(
      normalizedValues.state ? (CITY_OPTIONS_BY_STATE[normalizedValues.state] ?? []) : [],
      normalizedValues.city,
    ) ?? normalizedValues.city,
  );
  addChip(
    "gender",
    findCatalogLabel(filters?.genders, normalizedValues.gender) ??
      (normalizedValues.gender ? humanizeFilterValue(normalizedValues.gender) : null),
  );
  addChip(
    "race_color",
    findCatalogLabel(filters?.race_colors, normalizedValues.race_color) ??
      (normalizedValues.race_color ? humanizeFilterValue(normalizedValues.race_color) : null),
  );
  addChip(
    "religion",
    findCatalogLabel(filters?.religions, normalizedValues.religion) ??
      (normalizedValues.religion ? humanizeFilterValue(normalizedValues.religion) : null),
  );
  addChip(
    "language",
    findCatalogLabel(filters?.languages, normalizedValues.language) ??
      (normalizedValues.language ? humanizeFilterValue(normalizedValues.language) : null),
  );

  for (const [key, label] of Object.entries(BOOLEAN_FILTER_LABELS)) {
    if (normalizedValues[key as PsychologistFilterKey]) {
      addChip(key as PsychologistFilterKey, label);
    }
  }

  return chips;
};

export const buildBenefitChips = (
  psychologist:
    | {
        accepts_insurance?: boolean | null;
        discount_first_session?: boolean | null;
        social_value?: boolean | null;
      }
    | null
    | undefined,
) => {
  if (!psychologist) return [];

  const badges: Array<{
    id: string;
    label: string;
  }> = [];

  if (psychologist.discount_first_session) {
    badges.push({
      id: "discount-first-session",
      label: "Desconto 1ª sessão",
    });
  }

  if (psychologist.social_value) {
    badges.push({
      id: "social-value",
      label: "Valor social",
    });
  }

  if (psychologist.accepts_insurance) {
    badges.push({
      id: "accepts-insurance",
      label: "Aceita convênios",
    });
  }

  return badges;
};
