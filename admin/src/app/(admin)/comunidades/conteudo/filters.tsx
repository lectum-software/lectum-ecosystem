"use client";

import { RotateCcw, Search } from "lucide-react";
import { z } from "zod";
import type { ContentCommunity } from "@/api/req/communities/global-content";
import { InputController, SelectController } from "@/components/controllers";
import { Form, useFormList } from "@/hooks/form";

export const contentFiltersSchema = z
  .object({
    q: z.string().trim().max(120),
    psychologist: z.string().trim().max(120),
    community: z.string().max(120),
    type: z.enum(["all", "posts", "replies"]),
    period: z.enum(["all", "today", "7d", "30d", "90d", "custom"]),
    sort: z.enum(["recent", "oldest"]),
    status: z.enum(["published", "removed"]),
    from: z.string(),
    to: z.string(),
  })
  .refine(
    (value) =>
      value.period !== "custom" || Boolean(value.from && value.to && value.from <= value.to),
    {
      message: "Informe as duas datas, com a inicial menor ou igual à final.",
      path: ["to"],
    },
  );
export type ContentFilters = z.infer<typeof contentFiltersSchema>;
export const defaultFilters: ContentFilters = {
  q: "",
  psychologist: "",
  community: "",
  type: "all",
  period: "all",
  sort: "recent",
  status: "published",
  from: "",
  to: "",
};

export function ContentFiltersForm({
  initial,
  communities,
  onApply,
}: {
  initial: ContentFilters;
  communities: ContentCommunity[];
  onApply: (filters: ContentFilters) => void;
}) {
  const form = useFormList({ defaultValues: initial, fields: [], schema: contentFiltersSchema });
  const period = form.watch("period");
  const communityOptions = [
    { value: "", label: "Todas as comunidades" },
    ...communities.map((item) => ({ value: item.id, label: item.name })),
  ];
  if (initial.community && !communityOptions.some((item) => item.value === initial.community))
    communityOptions.push({ value: initial.community, label: "Comunidade selecionada" });

  return (
    <Form className="border-b border-border py-5" form={form} onSubmit={onApply}>
      <div className="grid min-w-0 gap-x-4 sm:grid-cols-2 xl:grid-cols-4">
        <InputController
          label="Buscar conteúdo"
          name="q"
          placeholder="Título ou texto"
          type="search"
          maxLength={120}
        />
        <InputController
          label="Psicólogo"
          name="psychologist"
          placeholder="Nome do psicólogo"
          type="search"
          maxLength={120}
        />
        <SelectController label="Comunidade" name="community" options={communityOptions} />
        <SelectController
          label="Status"
          name="status"
          options={[
            { value: "published", label: "Publicados" },
            { value: "removed", label: "Removidos" },
          ]}
        />
        <SelectController
          label="Tipo de conteúdo"
          name="type"
          options={[
            { value: "all", label: "Posts e respostas" },
            { value: "posts", label: "Posts" },
            { value: "replies", label: "Respostas" },
          ]}
        />
        <SelectController
          label="Período"
          name="period"
          options={[
            { value: "all", label: "Todo o período" },
            { value: "today", label: "Hoje" },
            { value: "7d", label: "Últimos 7 dias" },
            { value: "30d", label: "Últimos 30 dias" },
            { value: "90d", label: "Últimos 90 dias" },
            { value: "custom", label: "Personalizado" },
          ]}
        />
        <SelectController
          label="Ordenar por"
          name="sort"
          options={[
            { value: "recent", label: "Mais recentes" },
            { value: "oldest", label: "Mais antigos" },
          ]}
        />
        {period === "custom" ? (
          <>
            <InputController label="De" name="from" type="date" />
            <InputController label="Até" name="to" type="date" />
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold hover:bg-surface-muted"
          onClick={() => {
            form.reset(defaultFilters);
            onApply(defaultFilters);
          }}
          type="button"
        >
          <RotateCcw aria-hidden className="h-4 w-4" />
          Limpar
        </button>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
          type="submit"
        >
          <Search aria-hidden className="h-4 w-4" />
          Aplicar filtros
        </button>
      </div>
    </Form>
  );
}
