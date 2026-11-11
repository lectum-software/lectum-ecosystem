"use client";

import { z } from "zod";
import type { ExpenseList, ExpenseQuery } from "@/api/req/finance/expenses";
import { InputController, SelectController } from "@/components/controllers";
import { Form, useFormList } from "@/hooks/form";
import { expenseCategories, isExpenseCivilDate } from "../modules/expense-policy";

const optionalDate = z
  .string()
  .refine((value) => !value || isExpenseCivilDate(value), "Informe uma data válida.");
const schema = z
  .object({
    competence_from: optionalDate,
    competence_to: optionalDate,
    search: z.string().trim().max(120, "Use até 120 caracteres."),
    category: z.enum(["", ...expenseCategories]),
    status: z.enum(["active", "voided", "all"]),
  })
  .refine(
    (value) =>
      !value.competence_from ||
      !value.competence_to ||
      value.competence_from <= value.competence_to,
    { path: ["competence_to"], message: "Revise a ordem das datas." },
  );
type Filters = z.infer<typeof schema>;
export const ExpenseFilters = ({
  query,
  categories,
  onApply,
  onClear,
}: {
  query: ExpenseQuery;
  categories: ExpenseList["categories"];
  onApply: (query: ExpenseQuery) => void;
  onClear: () => void;
}) => {
  const form = useFormList<Filters>({
    fields: [],
    schema,
    defaultValues: {
      competence_from: query.competence_from ?? "",
      competence_to: query.competence_to ?? "",
      category: query.category ?? "",
      status: query.status ?? "active",
      search: query.search ?? "",
    },
  });
  return (
    <Form
      className="grid min-w-0 gap-x-3 border-b border-border p-4 sm:grid-cols-2 xl:grid-cols-3"
      form={form}
      onSubmit={(values) =>
        onApply({
          competence_from: values.competence_from || undefined,
          competence_to: values.competence_to || undefined,
          category: values.category || undefined,
          status: values.status,
          search: values.search || undefined,
        })
      }
    >
      <InputController<Filters>
        label="Competência de"
        min="2000-01-01"
        max="2100-12-31"
        name="competence_from"
        type="date"
      />
      <InputController<Filters>
        label="Competência até"
        min="2000-01-01"
        max="2100-12-31"
        name="competence_to"
        type="date"
      />
      <SelectController<Filters>
        label="Categoria"
        name="category"
        options={[
          { value: "", label: "Todas as categorias" },
          ...categories.map((item) => ({ value: item.id, label: item.label })),
        ]}
      />
      <SelectController<Filters>
        label="Situação"
        name="status"
        options={[
          { value: "active", label: "Ativos" },
          { value: "voided", label: "Anulados" },
          { value: "all", label: "Todos" },
        ]}
      />
      <InputController<Filters>
        autoComplete="off"
        label="Buscar descrição"
        name="search"
        maxLength={120}
      />
      <div className="flex flex-col gap-2 pb-5 sm:flex-row sm:items-start sm:pt-7">
        <button
          className="min-h-12 flex-1 rounded-control bg-primary px-4 text-sm font-bold text-primary-foreground"
          type="submit"
        >
          Aplicar filtros
        </button>
        <button
          className="min-h-12 rounded-control border border-border px-4 text-sm font-bold text-muted"
          onClick={onClear}
          type="button"
        >
          Limpar
        </button>
      </div>
    </Form>
  );
};
