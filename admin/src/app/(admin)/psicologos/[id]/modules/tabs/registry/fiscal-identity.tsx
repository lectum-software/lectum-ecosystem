"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  useFiscalIdentity,
  useSaveFiscalIdentity,
} from "@/api/callers/psychologists/fiscal-identity";
import { resolveApiError } from "@/api/handle";
import { InputController } from "@/components/controllers";
import { ErrorState } from "../../components/shared";

const schema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, "Informe o nome completo.")
    .max(150, "Use até 150 caracteres.")
    .refine(
      (value) => [...value].every((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127),
      "Revise o nome informado.",
    ),
});
type Values = z.infer<typeof schema>;
const sourceLabel = (source: string) =>
  source === "infosimples" ? "CFP / Infosimples" : "Administrador";
const dateLabel = (value: string) => new Date(value).toLocaleString("pt-BR");

export function FiscalIdentityForm({ id }: { id: string }) {
  const query = useFiscalIdentity(id);
  const mutation = useSaveFiscalIdentity(id);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { full_name: "" } });
  useEffect(() => {
    if (query.data && !form.formState.isDirty)
      form.reset({ full_name: query.data.current?.full_name ?? "" });
  }, [query.data, form, form.formState.isDirty]);
  if (query.isLoading) return <div className="mt-5 h-24 animate-pulse bg-surface-muted" />;
  if (query.isError)
    return (
      <ErrorState message={resolveApiError(query.error)} onRetry={() => void query.refetch()} />
    );
  const data = query.data;
  if (!data) return null;
  return (
    <section className="mt-5 border-t border-border pt-5">
      <FormProvider {...form}>
        <form
          noValidate
          className="space-y-3"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await mutation.mutateAsync({
                ...values,
                revision: data.revision,
                profile_revision: data.profile_revision,
              });
              form.reset(values);
              toast.success("Nome fiscal atualizado.");
            } catch (error) {
              toast.error(resolveApiError(error));
              await query.refetch();
            }
          })}
        >
          <InputController<Values>
            name="full_name"
            label="Nome completo para emissão fiscal"
            autoComplete="off"
            maxLength={150}
            required
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {data.current
                ? `${sourceLabel(data.current.source)} · ${dateLabel(data.current.updated_at)}`
                : "Pendente"}
            </p>
            <button
              type="submit"
              disabled={!form.formState.isDirty || mutation.isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-primary px-4 text-sm font-bold text-primary disabled:opacity-50"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4" aria-hidden />
              )}
              Salvar nome fiscal
            </button>
          </div>
        </form>
      </FormProvider>
      {data.history.length > 0 ? (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer py-2 font-semibold">Histórico do nome fiscal</summary>
          <ol className="divide-y divide-border">
            {data.history.map((event) => (
              <li key={event.id} className="break-words py-3">
                <p className="font-semibold">{event.full_name}</p>
                <p className="mt-1 text-xs text-muted">
                  {sourceLabel(event.source)} · {dateLabel(event.created_at)}
                  {event.actor_name || event.actor_id
                    ? ` · ${event.actor_name || event.actor_id}`
                    : ""}
                </p>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}
