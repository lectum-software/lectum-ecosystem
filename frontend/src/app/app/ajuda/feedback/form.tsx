"use client";
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { z } from "zod";
import { getSafeApiErrorMessage } from "@/api/errors";
import { sendFeedback } from "@/api/req/feedback";
import { type Field, useFormList } from "@/hooks/form";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { Attachments } from "./attachments";

const schema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "Descreva o problema ou a sugestão com pelo menos 10 caracteres.")
    .max(4000, "Use até 4.000 caracteres."),
});
type Values = z.infer<typeof schema>;
const fields: Field<Values>[] = [
  {
    name: "description",
    field: "textarea",
    label: "Mensagem",
    placeholder: "Descreva o problema técnico ou sua sugestão de melhoria para a Lectum.",
    rows: 7,
    max: 4000,
    required: true,
  },
];

export function FeedbackForm({ appVersion }: { appVersion?: string }) {
  const form = useFormList<Values>({ fields, schema, defaultValues: { description: "" } });
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const pending = form.hook.formState.isSubmitting;
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  const submit = async (values: Values) => {
    setError("");
    const signature = JSON.stringify([
      values.description,
      files.map((file) => [file.name, file.size, file.lastModified]),
    ]);
    if (!attempt.current || attempt.current.signature !== signature)
      attempt.current = { signature, id: crypto.randomUUID() };
    const body = new FormData();
    body.append("description", values.description);
    body.append("request_id", attempt.current.id);
    if (appVersion) body.append("app_version", appVersion);
    body.append("viewport", `${window.innerWidth}x${window.innerHeight}`);
    for (const file of files) body.append("attachments", file);
    try {
      await sendFeedback(body);
      setSent(true);
      setFiles([]);
      form.hook.reset();
    } catch (err) {
      setError(
        getSafeApiErrorMessage(
          err,
          "Não foi possível enviar. Sua mensagem foi mantida; tente novamente.",
        ),
      );
    }
  };

  return (
    <PrivateTemplate>
      <section className="mx-auto w-full max-w-2xl space-y-6">
        <header className="flex min-h-14 items-center gap-3 border-b border-border pb-3">
          <Link
            aria-label="Voltar para Ajuda e feedback"
            href="/app/ajuda"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"
          >
            <ArrowLeft aria-hidden className="h-5 w-5" />
          </Link>
          <h1 className="min-w-0 flex-1 text-base font-bold">Enviar feedback</h1>
        </header>
        {sent ? (
          <div role="status" className="grid justify-items-center gap-4 py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden />
            <h2 className="text-lg font-bold">Feedback enviado</h2>
            <p className="text-sm text-muted">Obrigado por ajudar a melhorar a Lectum.</p>
            <Button asChild variant="outline">
              <Link href="/app/ajuda">Voltar</Link>
            </Button>
          </div>
        ) : (
          <form.Form
            {...form.formProps}
            id="feedback-form"
            onlyRead={pending}
            onSubmit={(event) => void form.hook.handleSubmit(submit)(event)}
            className="space-y-5"
          >
            <Attachments files={files} onChange={setFiles} disabled={pending} onError={setError} />
            <Button
              type="submit"
              disabled={pending || !form.hook.formState.isValid}
              className="w-full rounded-lg"
            >
              {pending ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Send aria-hidden className="h-4 w-4" />
              )}
              Enviar
            </Button>
            <p role="alert" className="min-h-5 text-sm text-danger">
              {error}
            </p>
          </form.Form>
        )}
      </section>
    </PrivateTemplate>
  );
}
