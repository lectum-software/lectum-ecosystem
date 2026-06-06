"use client";

import { ArrowLeft, Send, Star, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useCreatePatientReview, useReviewEligibility } from "@/api/callers/reviews";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { useReviewForm } from "./use-form";

const criteria = ["Acolhimento", "Clareza", "Pontualidade"];

const reasonText = (reason?: string) => {
  if (reason === "contact_required")
    return "Você precisa registrar um contato pelo WhatsApp com este profissional antes de avaliar.";
  if (reason === "already_reviewed")
    return "Você já avaliou este profissional. Consulte sua lista de avaliações feitas.";
  if (reason === "own_profile") return "Não é possível avaliar o próprio perfil.";
  return "Não foi possível liberar a avaliação para este profissional.";
};

export const ReviewsNewLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const psychologistId = searchParams.get("psychologist_id") || searchParams.get("id") || "";
  const eligibility = useReviewEligibility(psychologistId, Boolean(psychologistId));
  const form = useReviewForm(psychologistId);
  const { Form, formProps, hook } = form;
  const mutation = useCreatePatientReview({
    onSuccess: (data) =>
      router.replace(`/app/reviews/success?psychologist_id=${data.psychologist_id}`),
  });
  const professional = eligibility.data;
  const stars = useMemo(() => Array.from({ length: 5 }, (_, index) => index + 1), []);

  if (!psychologistId) {
    return (
      <PrivateTemplate>
        <EmptyState
          icon={UserRound}
          title="Escolha um psicólogo para avaliar"
          description="A avaliação precisa estar vinculada a um profissional real com quem você já registrou contato."
          action={
            <Button asChild>
              <Link href="/app/psychologists">Buscar psicólogos</Link>
            </Button>
          }
        />
      </PrivateTemplate>
    );
  }

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-2xl">
        <header className="flex items-center justify-between border-b border-border bg-surface px-1 pb-4">
          <Button asChild variant="ghost" className="h-10 w-10 px-0">
            <Link aria-label="Voltar" href={`/app/psychologist/${psychologistId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-extrabold text-foreground">Avaliar Profissional</h1>
          <span className="h-10 w-10" />
        </header>

        {eligibility.isLoading ? <LoadingState label="Verificando elegibilidade" /> : null}
        {eligibility.isError ? (
          <InlineAlert title="Não foi possível verificar" variant="error">
            Não foi possível conectar à API agora. Tente novamente em instantes.
          </InlineAlert>
        ) : null}

        {professional && !professional.eligible ? (
          <EmptyState
            icon={Star}
            title="Avaliação indisponível"
            description={reasonText(professional.reason)}
            action={
              <Button asChild variant="outline">
                <Link
                  href={
                    professional.reason === "already_reviewed"
                      ? "/app/reviews"
                      : `/app/psychologist/${psychologistId}`
                  }
                >
                  Continuar
                </Link>
              </Button>
            }
          />
        ) : null}

        {professional?.eligible ? (
          <>
            <section className="grid justify-items-center gap-2 rounded-[var(--lectum-card-radius)] border border-border bg-surface px-6 py-6 text-center shadow-[var(--lectum-shadow-soft)]">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-primary-soft text-3xl font-bold text-primary">
                {professional.psychologist_name.slice(0, 1)}
              </div>
              <h2 className="text-2xl font-extrabold text-foreground">
                {professional.psychologist_name}
              </h2>
              {professional.psychologist_headline ? (
                <p className="text-sm text-muted">{professional.psychologist_headline}</p>
              ) : null}
            </section>

            <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface-muted/60 p-4 text-center">
              <p className="text-sm font-bold text-foreground">Sua nota para o profissional</p>
              <div className="mt-3 flex justify-center gap-3 text-warning">
                {stars.map((star) => (
                  <Star key={star} className="h-7 w-7 fill-current" aria-hidden />
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                Avalie acolhimento, clareza e experiência geral.
              </p>
            </section>

            <div className="grid grid-cols-3 gap-2">
              {criteria.map((item) => (
                <span
                  className="rounded-2xl border border-border bg-surface px-3 py-2 text-center text-xs font-semibold text-muted"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>

            <Form
              className="grid gap-4"
              {...formProps}
              onSubmit={hook.handleSubmit((values) =>
                mutation.mutate({ ...values, rating: Number(values.rating) }),
              )}
            >
              <Button className="w-full" disabled={mutation.isPending} type="submit">
                <Send className="h-4 w-4" />
                {mutation.isPending ? "Enviando..." : "Enviar Avaliação"}
              </Button>
            </Form>
          </>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
