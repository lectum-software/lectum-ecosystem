import { useEffect, useMemo } from "react";
import { z } from "zod";
import type { DirectoryPsychologistFilters } from "@/api/generator/types/directory";
import { type Field, useFormList } from "@/hooks/form";
import { CITY_OPTIONS_BY_STATE } from "../professional/profile/setup/brazil-cities";
import {
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  PUBLIC_TARGET_OPTIONS,
  RACE_COLOR_OPTIONS,
  RELIGION_OPTIONS,
  STATE_OPTIONS,
} from "../professional/profile/setup/options";
import { toCatalogOptions, toGroupedSpecialtyOptions, toServiceOptions } from "./filter-options";

export const psychologistsFilterSchema = z.object({
  search: z.string().max(120, "Use até 120 caracteres na busca").optional(),
  specialty: z.string().nullable().optional(),
  service: z.string().nullable().optional(),
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
});

export type PsychologistsFilterForm = z.infer<typeof psychologistsFilterSchema>;

export const defaultPsychologistsFilterValues: Required<PsychologistsFilterForm> = {
  search: "",
  specialty: null,
  service: null,
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
};

type UsePsychologistsFilterFormProps = {
  filters?: DirectoryPsychologistFilters;
  loading?: boolean;
  values?: Partial<PsychologistsFilterForm>;
};

export const usePsychologistsFilterForm = ({
  filters,
  loading = false,
  values,
}: UsePsychologistsFilterFormProps = {}) => {
  const fields = useMemo<Field<PsychologistsFilterForm>[]>(
    () => [
      {
        name: "search",
        field: "input",
        label: "Buscar profissional",
        placeholder: "Busque pelo nome ou CRP",
        leadingIcon: "search",
        autoComplete: "off",
      },
      {
        name: "specialty",
        field: "select",
        label: "Especialidade",
        emptyLabel: "Todas",
        inputClassName: "w-full bg-white text-[0.82rem]",
        loading,
        options: toGroupedSpecialtyOptions(filters?.specialties),
        searchable: true,
        searchPlaceholder: "Digite para filtrar especialidades",
      },
      {
        name: "service",
        field: "select",
        label: "Serviços",
        emptyLabel: "Todos os serviços",
        inputClassName: "w-full bg-white text-[0.82rem]",
        loading,
        options: toServiceOptions(filters?.services),
      },
      {
        name: "approach",
        field: "select",
        label: "Abordagens",
        emptyLabel: "Todas as abordagens",
        inputClassName: "w-full bg-white text-[0.82rem]",
        loading,
        options: toCatalogOptions(filters?.approaches),
      },
      {
        name: "target_audience",
        field: "select",
        label: "Público atendido",
        emptyLabel: "Todos os públicos",
        inputClassName: "w-full bg-white text-[0.82rem]",
        options: PUBLIC_TARGET_OPTIONS,
      },
      {
        name: "state",
        field: "select",
        label: "Localização — Estado",
        emptyLabel: "Todos os estados",
        inputClassName: "w-full bg-white text-[0.82rem]",
        options: STATE_OPTIONS,
      },
      {
        name: "city",
        field: "select",
        label: "Localização — Cidade",
        emptyLabel: "Todas as cidades",
        inputClassName: "w-full bg-white text-[0.82rem]",
        optionsByField: {
          name: "state",
          options: CITY_OPTIONS_BY_STATE,
          emptyLabel: "Selecione um estado primeiro",
        },
      },
      {
        name: "gender",
        field: "select",
        label: "Gênero do psicólogo",
        emptyLabel: "Todos os gêneros",
        inputClassName: "w-full bg-white text-[0.82rem]",
        options: GENDER_OPTIONS,
      },
      {
        name: "race_color",
        field: "select",
        label: "Raça do psicólogo",
        emptyLabel: "Todas as raças/cores",
        inputClassName: "w-full bg-white text-[0.82rem]",
        options: RACE_COLOR_OPTIONS,
      },
      {
        name: "religion",
        field: "select",
        label: "Religião do psicólogo",
        emptyLabel: "Todas as religiões",
        inputClassName: "w-full bg-white text-[0.82rem]",
        options: RELIGION_OPTIONS,
      },
      {
        name: "language",
        field: "select",
        label: "Idiomas de atendimento",
        emptyLabel: "Todos os idiomas",
        inputClassName: "w-full bg-white text-[0.82rem]",
        options: LANGUAGE_OPTIONS,
      },
      {
        name: "more_experienced",
        field: "checkbox",
        label: "Mais experientes",
        description: "Com mais de 10 anos de experiência.",
        className: "rounded-2xl border border-border bg-white p-3",
      },
      {
        name: "discount_first_session",
        field: "checkbox",
        label: "Desconto na 1ª sessão",
        description: "Mais acessibilidade na sessão experimental.",
        className: "rounded-2xl border border-border bg-white p-3",
      },
      {
        name: "accepts_insurance",
        field: "checkbox",
        label: "Aceita planos de saúde",
        description: "Para quem possui convênio.",
        className: "rounded-2xl border border-border bg-white p-3",
      },
      {
        name: "social_value",
        field: "checkbox",
        label: "Atende por valor social",
        description: "Para a população de baixa renda.",
        className: "rounded-2xl border border-border bg-white p-3",
      },
    ],
    [filters?.approaches, filters?.services, filters?.specialties, loading],
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
