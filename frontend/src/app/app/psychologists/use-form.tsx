import { useMemo } from "react";
import { z } from "zod";
import type { DirectoryPsychologistFilters } from "@/api/generator/types/directory";
import { type Field, useFormList } from "@/hooks/form";

export const psychologistsFilterSchema = z.object({
  search: z.string().max(120, "Use até 120 caracteres na busca").optional(),
  specialty: z.string().nullable().optional(),
  service: z.string().nullable().optional(),
  approach: z.string().nullable().optional(),
});

export type PsychologistsFilterForm = z.infer<typeof psychologistsFilterSchema>;

export const defaultPsychologistsFilterValues: Required<PsychologistsFilterForm> = {
  search: "",
  specialty: null,
  service: null,
  approach: null,
};

type UsePsychologistsFilterFormProps = {
  filters?: DirectoryPsychologistFilters;
  loading?: boolean;
  values?: Partial<PsychologistsFilterForm>;
};

const toOptions = (items: DirectoryPsychologistFilters[keyof DirectoryPsychologistFilters] = []) =>
  items.map((item) => ({
    label: item.name,
    value: item.slug,
  }));

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
        placeholder: "Buscar profissional...",
        autoComplete: "off",
      },
      {
        name: "specialty",
        field: "select",
        label: "Especialidades",
        emptyLabel: "Todas",
        inputClassName: "w-full",
        loading,
        options: toOptions(filters?.specialties),
      },
      {
        name: "service",
        field: "select",
        label: "Serviços",
        emptyLabel: "Todos os serviços",
        inputClassName: "w-full",
        loading,
        options: toOptions(filters?.services),
      },
      {
        name: "approach",
        field: "select",
        label: "Abordagens",
        emptyLabel: "Todas as abordagens",
        inputClassName: "w-full",
        loading,
        options: toOptions(filters?.approaches),
      },
    ],
    [filters?.approaches, filters?.services, filters?.specialties, loading],
  );

  return useFormList<PsychologistsFilterForm>({
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
};
