import { type ReactNode, useEffect, useMemo } from "react";
import { z } from "zod";
import type { DirectoryPsychologistFilters } from "@/api/generator/types/directory";
import { type Field, type FieldOption, useFormList } from "@/hooks/form";
import { CITY_OPTIONS_BY_STATE } from "../professional/profile/setup/brazil-cities";
import {
  GENDER_OPTIONS,
  RACE_COLOR_OPTIONS,
  RELIGION_OPTIONS,
  STATE_OPTIONS,
} from "../professional/profile/setup/options";
import {
  toCatalogOptions,
  toGroupedSpecialtyOptions,
  toLanguageOptions,
  toServiceOptions,
} from "./filter-options";

export type PatientModalityFilter = "online" | "presencial";

export const PATIENT_MODALITY_FILTER_OPTIONS = [
  { label: "Online", value: "online" },
  { label: "Presencial", value: "presencial" },
] satisfies FieldOption[];

export const normalizePatientModalityFilter = (
  value?: string | null,
): PatientModalityFilter | null => {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "online" || normalized === "presencial") return normalized;

  return null;
};

export const psychologistsFilterSchema = z.object({
  search: z.string().max(120, "Use até 120 caracteres na busca").optional(),
  specialty: z.string().nullable().optional(),
  service: z.string().nullable().optional(),
  modality: z.enum(["online", "presencial"]).nullable().optional(),
  approach: z.string().nullable().optional(),
  target_audience: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  race_color: z.string().nullable().optional(),
  religion: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  more_experienced: z.boolean().optional(),
  discount_first_session: z.boolean().optional(),
  accepts_insurance: z.boolean().optional(),
  social_value: z.boolean().optional(),
  available_today: z.boolean().optional(),
  verified: z.boolean().optional(),
});

export type PsychologistsFilterForm = z.infer<typeof psychologistsFilterSchema>;

export const defaultPsychologistsFilterValues: Required<PsychologistsFilterForm> = {
  search: "",
  specialty: null,
  service: null,
  modality: null,
  approach: null,
  target_audience: null,
  state: null,
  city: null,
  gender: null,
  race_color: null,
  religion: null,
  language: null,
  more_experienced: false,
  discount_first_session: false,
  accepts_insurance: false,
  social_value: false,
  available_today: false,
  verified: false,
};

const normalizeFilterOptionText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const withoutPreferNotInform = (options: FieldOption[]) =>
  options.filter((option) => normalizeFilterOptionText(option.label) !== "prefiro nao informar");

const GENDER_FILTER_OPTIONS = withoutPreferNotInform(GENDER_OPTIONS);
const RACE_COLOR_FILTER_OPTIONS = withoutPreferNotInform(RACE_COLOR_OPTIONS);
const RELIGION_FILTER_OPTIONS = withoutPreferNotInform(RELIGION_OPTIONS);

type UsePsychologistsFilterFormProps = {
  filters?: DirectoryPsychologistFilters;
  loading?: boolean;
  onSearchChange?: (value: string) => void;
  searchSuggestionsSlot?: ReactNode;
  values?: Partial<PsychologistsFilterForm>;
};

export const usePsychologistsFilterForm = ({
  filters,
  loading = false,
  onSearchChange,
  searchSuggestionsSlot,
  values,
}: UsePsychologistsFilterFormProps = {}) => {
  const filterFieldClassName = "col-span-2";
  const filterCompactSelectClassName = "col-span-1 min-w-0";
  const filterSelectInputClassName =
    "h-12 rounded-2xl border-border/80 bg-surface pr-11 text-sm font-semibold text-foreground shadow-sm shadow-border/30 hover:border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-surface-muted disabled:text-muted disabled:shadow-none disabled:[&>span]:text-muted [&>span]:text-foreground";

  const fields = useMemo<Field<PsychologistsFilterForm>[]>(
    () => [
      {
        name: "search",
        field: "input",
        className: filterFieldClassName,
        label: "Pesquisa",
        placeholder: "Buscar por nome ou CRP",
        leadingIcon: "search",
        onChangeCallback: (value) => onSearchChange?.(String(value ?? "")),
        after: searchSuggestionsSlot,
        inputClassName:
          "h-12 rounded-2xl border-border/80 bg-surface text-sm text-foreground shadow-sm shadow-border/30 placeholder:text-muted hover:border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-surface-muted disabled:text-muted disabled:shadow-none",
      },
      {
        name: "specialty",
        field: "select",
        className: filterFieldClassName,
        label: "Especialidade",
        emptyLabel: "Todas",
        inputClassName: filterSelectInputClassName,
        loading,
        options: toGroupedSpecialtyOptions(filters?.specialties),
        searchable: true,
        searchMode: "dropdown",
        searchPlaceholder: "Digite para filtrar especialidades",
      },
      {
        name: "service",
        field: "select",
        className: filterFieldClassName,
        label: "Serviços",
        emptyLabel: "Todos os serviços",
        inputClassName: filterSelectInputClassName,
        loading,
        options: toServiceOptions(filters?.services),
        searchable: true,
        searchMode: "dropdown",
      },
      {
        name: "modality",
        field: "select",
        className: filterFieldClassName,
        label: "Modalidades de atendimento",
        emptyLabel: "Todas as modalidades",
        inputClassName: filterSelectInputClassName,
        options: PATIENT_MODALITY_FILTER_OPTIONS,
        searchable: true,
        searchMode: "dropdown",
      },
      {
        name: "approach",
        field: "select",
        className: filterFieldClassName,
        label: "Abordagens",
        emptyLabel: "Todas as abordagens",
        inputClassName: filterSelectInputClassName,
        loading,
        options: toCatalogOptions(filters?.approaches),
        searchable: true,
        searchMode: "dropdown",
      },
      {
        name: "target_audience",
        field: "select",
        className: filterFieldClassName,
        label: "Público atendido",
        emptyLabel: "Todos os públicos",
        inputClassName: filterSelectInputClassName,
        loading,
        options: toCatalogOptions(filters?.target_audiences),
        searchable: true,
        searchMode: "dropdown",
      },
      {
        name: "state",
        field: "select",
        className: filterCompactSelectClassName,
        label: "Estado",
        emptyLabel: "Todos",
        inputClassName: filterSelectInputClassName,
        options: STATE_OPTIONS,
        searchable: true,
        searchMode: "dropdown",
      },
      {
        name: "city",
        field: "select",
        className: filterCompactSelectClassName,
        label: "Cidade",
        emptyLabel: "Todas as cidades",
        inputClassName: filterSelectInputClassName,
        searchable: true,
        searchMode: "dropdown",
        optionsByField: {
          name: "state",
          options: CITY_OPTIONS_BY_STATE,
          emptyLabel: "Selecione Estado",
        },
      },
      {
        name: "gender",
        field: "select",
        className: filterFieldClassName,
        label: "Gênero do psicólogo",
        emptyLabel: "Todos os gêneros",
        inputClassName: filterSelectInputClassName,
        options: GENDER_FILTER_OPTIONS,
        searchable: true,
        searchMode: "dropdown",
      },
      {
        name: "race_color",
        field: "select",
        className: filterFieldClassName,
        label: "Raça do psicólogo",
        emptyLabel: "Todas as raças/cores",
        inputClassName: filterSelectInputClassName,
        options: RACE_COLOR_FILTER_OPTIONS,
        searchable: true,
        searchMode: "dropdown",
      },
      {
        name: "religion",
        field: "select",
        className: filterFieldClassName,
        label: "Religião do psicólogo",
        emptyLabel: "Todas as religiões",
        inputClassName: filterSelectInputClassName,
        options: RELIGION_FILTER_OPTIONS,
        searchable: true,
        searchMode: "dropdown",
      },
      {
        name: "language",
        field: "select",
        className: filterFieldClassName,
        label: "Idiomas de atendimento",
        emptyLabel: "Todos os idiomas",
        inputClassName: filterSelectInputClassName,
        loading,
        options: toLanguageOptions(filters?.languages),
        searchable: true,
        searchMode: "dropdown",
      },
      {
        name: "verified",
        field: "checkbox",
        hide: true,
      },
      {
        name: "more_experienced",
        field: "checkbox",
        hide: true,
      },
      {
        name: "discount_first_session",
        field: "checkbox",
        hide: true,
      },
      {
        name: "accepts_insurance",
        field: "checkbox",
        hide: true,
      },
      {
        name: "social_value",
        field: "checkbox",
        hide: true,
      },
      {
        name: "available_today",
        field: "checkbox",
        hide: true,
      },
    ],
    [
      filters?.approaches,
      filters?.languages,
      filters?.services,
      filters?.specialties,
      filters?.target_audiences,
      loading,
      onSearchChange,
      searchSuggestionsSlot,
    ],
  );

  const form = useFormList<PsychologistsFilterForm>({
    fields,
    schema: psychologistsFilterSchema,
    defaultValues: defaultPsychologistsFilterValues,
    values: {
      ...defaultPsychologistsFilterValues,
      ...values,
    },
    resetOptions: {
      keepDefaultValues: true,
    },
  });

  const selectedState = form.hook.watch("state");
  const selectedCity = form.hook.watch("city");

  useEffect(() => {
    if (!selectedCity || !selectedState) return;
    const cityOptions = CITY_OPTIONS_BY_STATE[selectedState] || [];
    if (cityOptions.some((item) => item.value === selectedCity)) return;

    form.hook.setValue("city", null, { shouldDirty: true, shouldValidate: true });
  }, [form.hook, selectedCity, selectedState]);

  return form;
};
