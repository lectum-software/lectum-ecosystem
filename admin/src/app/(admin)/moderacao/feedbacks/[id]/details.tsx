"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, RefreshCw, Save } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useFeedback, useUpdateFeedback } from "@/api/callers/feedback";
import { resolveApiError } from "@/api/handle";
import type { FeedbackDetail } from "@/api/req/feedback";
import { actionClass, categories, controlClass, dateLabel, statuses } from "../shared";
import { PrivateCapture } from "./capture";

const schema = z.object({
  status: z.enum(["new", "reviewing", "resolved"]),
  category: z.enum(["unclassified", "technical", "suggestion"]),
  internal_note: z.string().trim().max(4000, "Use até 4.000 caracteres."),
});
type Values = z.infer<typeof schema>;

function Management({ data }: { data: FeedbackDetail }) {
  const mutation = useUpdateFeedback(data.id);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: data });
  return (
    <form
      className="space-y-4 border-t border-border pt-6"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await mutation.mutateAsync({ ...values, revision: data.revision });
          toast.success("Feedback atualizado.");
        } catch (err) {
          form.setError("root", { message: resolveApiError(err) });
        }
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold">
          Status
          <select
            className={controlClass}
            disabled={mutation.isPending}
            {...form.register("status")}
          >
            {Object.entries(statuses).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Classificação interna
          <select
            className={controlClass}
            disabled={mutation.isPending}
            {...form.register("category")}
          >
            {Object.entries(categories).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-sm font-semibold">
        Notas internas
        <textarea
          rows={5}
          maxLength={4000}
          className={controlClass}
          disabled={mutation.isPending}
          {...form.register("internal_note")}
        />
      </label>
      <p role="alert" className="min-h-5 text-sm text-danger">
        {form.formState.errors.internal_note?.message ?? form.formState.errors.root?.message}
      </p>
      <button
        type="submit"
        className={`${actionClass} bg-primary text-primary-foreground hover:bg-primary/90`}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}{" "}
        Salvar
      </button>
    </form>
  );
}

export function FeedbackDetails({ id }: { id: string }) {
  const query = useFeedback(id);
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6">
      <header className="flex items-center gap-4">
        <Link
          aria-label="Voltar aos feedbacks"
          title="Voltar aos feedbacks"
          href="/moderacao/feedbacks"
          className={actionClass}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="flex-1 text-xl font-bold">Feedback</h1>
        <button
          aria-label="Recarregar feedback"
          title="Recarregar feedback"
          type="button"
          className={actionClass}
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>
      {query.isPending ? (
        <p role="status">Carregando feedback...</p>
      ) : query.isError ? (
        <p role="alert" className="text-danger">
          {resolveApiError(query.error)}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap justify-between gap-3 border-b border-border pb-4">
            <div className="min-w-0 flex-1">
              <span className="break-words font-semibold">{query.data.user.name}</span>
              <p className="text-sm text-muted">
                {query.data.user.role === "psicologo" ? "Psicólogo" : "Paciente"}
              </p>
            </div>
            <p className="text-sm text-muted">{dateLabel(query.data.created_at)}</p>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-7">
            {query.data.description}
          </p>
          {query.data.attachments.length ? (
            <section aria-label="Capturas anexadas" className="grid gap-4 sm:grid-cols-3">
              {query.data.attachments.map((file, index) => (
                <PrivateCapture key={file.id} feedbackId={id} id={file.id} index={index + 1} />
              ))}
            </section>
          ) : null}
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-muted">
            <div>
              <dt>Versão da Lectum</dt>
              <dd>{query.data.app_version ?? "Não informada"}</dd>
            </div>
            <div>
              <dt>Tamanho da tela</dt>
              <dd>{query.data.viewport ?? "Não informado"}</dd>
            </div>
          </dl>
          <Management key={`${id}-${query.data.revision}`} data={query.data} />
        </>
      )}
    </main>
  );
}
