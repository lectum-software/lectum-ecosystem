"use client";

import {
  ArrowRight,
  Award,
  CheckCircle2,
  MessageSquareReply,
  RefreshCcw,
  Star,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  usePsychologistReviews,
  useRespondPsychologistReview,
} from "@/api/callers/psychologist-reviews";
import type {
  PsychologistReview,
  PsychologistReviewSummary,
} from "@/api/generator/types/psychologist-reviews";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { useReviewResponseForm } from "./use-form";

const INITIAL_LIMIT = 10;
const LOAD_STEP = 10;
const STAR_KEYS = [1, 2, 3, 4, 5] as const;
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const resolveApiError = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return "Não foi possível conectar à API agora. Tente novamente em instantes.";
};

const firstName = (name: string) => name.split(/\s+/).filter(Boolean)[0] || "paciente";

const Stars = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) => (
  <span className="inline-flex text-warning" role="img" aria-label={`${rating} de 5 estrelas`}>
    {STAR_KEYS.map((star) => (
      <Star
        key={star}
        className={cn(
          size === "lg" ? "h-[22px] w-[22px]" : "h-[14px] w-[14px]",
          star <= rating && "fill-current",
        )}
        aria-hidden
      />
    ))}
  </span>
);

const averageLabel = (summary?: PsychologistReviewSummary) =>
  ((summary?.rating_avg || 0) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const summaryTotal = (summary?: PsychologistReviewSummary) => {
  const distributionTotal = STAR_KEYS.reduce(
    (acc, rating) => acc + (summary?.distribution[rating] || 0),
    0,
  );
  return summary?.rating_count || distributionTotal;
};

const RatingSummary = ({ summary }: { summary?: PsychologistReviewSummary }) => {
  const total = summaryTotal(summary);

  return (
    <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-7 shadow-[var(--lectum-shadow-soft)]">
      <p className="text-5xl font-extrabold leading-none tracking-[-0.05em] text-foreground">
        {averageLabel(summary)}
      </p>
      <div className="mt-3">
        <Stars rating={Math.round((summary?.rating_avg || 0) / 100)} size="lg" />
      </div>
      <p className="mt-2 text-sm text-muted">Total de {total.toLocaleString("pt-BR")} avaliações</p>

      <div className="mt-7 grid gap-3">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = summary?.distribution[rating as 1 | 2 | 3 | 4 | 5] || 0;
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div className="grid grid-cols-[12px_1fr_34px] items-center gap-3" key={rating}>
              <span className="text-xs font-semibold text-foreground">{rating}</span>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
              <span className="text-right text-xs font-medium text-muted">{percent}%</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const premiumReviewBenefits = [
  "Receba avaliações de pacientes",
  "Exiba depoimentos no seu perfil",
  "Fortaleça sua reputação profissional",
  "Aumente sua credibilidade na plataforma",
];

const PremiumReviewsState = () => (
  <section className="relative overflow-hidden rounded-[var(--lectum-card-radius)] border border-primary/20 bg-surface p-5 shadow-[var(--lectum-shadow-soft)] md:p-7">
    <div aria-hidden className="absolute inset-x-0 top-0 h-44 bg-primary-soft" />
    <div
      aria-hidden
      className="-right-10 -top-14 absolute h-36 w-36 rounded-full bg-surface/70 blur-3xl"
    />

    <div className="relative grid justify-items-center text-center">
      <span className="relative grid h-[72px] w-[72px] place-items-center rounded-3xl bg-surface text-primary shadow-[var(--lectum-shadow-soft)]">
        <Award className="h-8 w-8" aria-hidden />
        <span className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full border border-primary/20 bg-surface text-primary">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
        </span>
      </span>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-primary">
        Recurso profissional
      </p>
      <h2 className="mt-2 text-2xl font-extrabold leading-tight text-foreground">
        Desbloqueie avaliações de pacientes
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base md:leading-7">
        Ao fazer upgrade para o Plano Profissional, seus pacientes poderão registrar avaliações e
        depoimentos sobre seus atendimentos. As avaliações recebidas aparecerão aqui e ajudarão a
        fortalecer sua credibilidade na Lectum.
      </p>
    </div>

    <div className="relative mt-6 grid gap-3 md:grid-cols-2">
      {premiumReviewBenefits.map((benefit) => (
        <div
          className="flex min-w-0 items-start gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4"
          key={benefit}
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          <span className="min-w-0 text-sm font-semibold leading-5 text-muted">{benefit}</span>
        </div>
      ))}
    </div>

    <Button
      asChild
      className="relative mt-6 h-12 w-full rounded-full text-base md:mx-auto md:w-auto md:px-8"
    >
      <Link href="/app/professional/billing/subscription">
        Fazer upgrade
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </Button>
  </section>
);

const ReviewResponseForm = ({
  defaultOpen,
  review,
}: {
  defaultOpen: boolean;
  review: PsychologistReview;
}) => {
  const [isEditing, setIsEditing] = useState(defaultOpen);
  const form = useReviewResponseForm(
    review.response || "",
    `Escreva uma resposta para ${firstName(review.author.name)}...`,
  );
  const { Form, formProps, hook } = form;
  const mutation = useRespondPsychologistReview({
    onSuccess: (data) => {
      hook.reset({ response: data.review.response || "" });
      setIsEditing(false);
    },
  });

  if (review.response && !isEditing) {
    return (
      <div className="mt-2 rounded-[var(--lectum-control-radius)] border-l-[4px] border-primary bg-primary-soft px-4 py-3.5">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em] text-primary">
          <MessageSquareReply className="h-3.5 w-3.5" aria-hidden />
          Sua resposta
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">“{review.response}”</p>
        <button
          className="mt-3 text-sm font-bold text-primary hover:text-primary-hover"
          onClick={() => setIsEditing(true)}
          type="button"
        >
          Editar resposta
        </button>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-sm text-subtle">Aguardando sua resposta</p>
        <button
          className="inline-flex h-9 items-center justify-center gap-1 rounded-full border border-border bg-surface px-4 text-sm font-extrabold text-primary shadow-sm transition hover:bg-primary-soft"
          onClick={() => setIsEditing(true)}
          type="button"
        >
          ↩ Responder
        </button>
      </div>
    );
  }

  return (
    <Form
      className="mt-2 grid gap-0"
      {...formProps}
      onSubmit={hook.handleSubmit((values) =>
        mutation.mutate({ id: review.id, body: { response: values.response } }),
      )}
    >
      <div className="flex justify-end">
        <Button
          className="h-9 rounded-full px-5 text-sm font-extrabold"
          disabled={mutation.isPending}
          type="submit"
        >
          {mutation.isPending ? "Salvando..." : "Responder"}
        </Button>
      </div>
    </Form>
  );
};

const ReviewCard = ({
  defaultOpenResponse,
  review,
}: {
  defaultOpenResponse: boolean;
  review: PsychologistReview;
}) => (
  <article className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-4 shadow-[var(--lectum-shadow-soft)]">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-base font-extrabold tracking-[-0.01em] text-foreground">
          {review.author.name}
        </h2>
        <div className="mt-1">
          <Stars rating={review.rating} />
        </div>
      </div>
      <time className="shrink-0 text-xs text-subtle" dateTime={review.created_at}>
        {formatDate(review.created_at)}
      </time>
    </div>

    {review.comment ? (
      <p className="mt-4 text-sm leading-6 text-muted">{review.comment}</p>
    ) : (
      <p className="mt-4 text-sm text-subtle">Avaliação sem depoimento textual.</p>
    )}

    <div className="mt-5">
      <ReviewResponseForm defaultOpen={defaultOpenResponse} review={review} />
    </div>
  </article>
);

export const ProfessionalReviewsLogic = () => {
  const [limit, setLimit] = useState(INITIAL_LIMIT);
  const query = useMemo(() => ({ page: 1, limit, period: "all" as const }), [limit]);
  const reviews = usePsychologistReviews(query);
  const data = reviews.data;
  const items = data?.data ?? [];
  const errorMessage = reviews.isError ? resolveApiError(reviews.error) : null;
  const isProfessionalPlanError = Boolean(errorMessage?.includes("Plano Profissional"));
  const shouldShowError = Boolean(errorMessage && !isProfessionalPlanError);
  const isReviewsPreview = data?.access.mode === "preview" || isProfessionalPlanError;
  const canReceiveReviews = !isReviewsPreview && (data?.access.can_receive_reviews ?? true);
  const displayItems = canReceiveReviews ? items : [];
  const firstUnansweredId = displayItems.find((review) => !review.response)?.id;

  return (
    <PrivateTemplate desktopSidebarDefaultCollapsed showMobileNavigation={false}>
      <section className="mx-auto grid w-full max-w-[430px] grid-cols-[minmax(0,1fr)] gap-4 md:max-w-3xl">
        <AppPageHeader backLabel="Voltar para perfil" title="Minhas Avaliações" />

        {reviews.isLoading && limit === INITIAL_LIMIT ? (
          <LoadingState label="Carregando avaliações" />
        ) : null}

        {shouldShowError ? (
          <InlineAlert title="Erro ao consultar avaliações" variant="error">
            <p>{errorMessage}</p>
          </InlineAlert>
        ) : null}

        {!shouldShowError && canReceiveReviews ? <RatingSummary summary={data?.summary} /> : null}

        {!reviews.isLoading && !shouldShowError && !canReceiveReviews ? (
          <PremiumReviewsState />
        ) : null}

        {!reviews.isLoading &&
        !shouldShowError &&
        canReceiveReviews &&
        displayItems.length === 0 ? (
          <EmptyState
            className="rounded-[var(--lectum-card-radius)] bg-surface"
            icon={UserRound}
            title="Nenhuma avaliação recebida"
            description="Quando pacientes com contato registrado avaliarem seu perfil, os depoimentos aparecerão aqui."
          />
        ) : null}

        {displayItems.length > 0 ? (
          <section className="grid gap-4" aria-labelledby="professional-reviews-list-title">
            <h2
              id="professional-reviews-list-title"
              className="text-lg font-extrabold tracking-[-0.02em] text-foreground"
            >
              Depoimentos Recentes
            </h2>

            {displayItems.map((review) => (
              <ReviewCard
                defaultOpenResponse={review.id === firstUnansweredId}
                key={review.id}
                review={review}
              />
            ))}
          </section>
        ) : null}

        {canReceiveReviews && (data?.count || 0) > displayItems.length ? (
          <button
            className="h-12 rounded-[var(--lectum-card-radius)] border border-dashed border-primary/30 bg-surface text-sm font-extrabold text-primary transition hover:bg-primary-soft disabled:opacity-60"
            disabled={reviews.isFetching}
            onClick={() => setLimit((current) => current + LOAD_STEP)}
            type="button"
          >
            {reviews.isFetching ? "Carregando..." : "Carregar avaliações anteriores"}
          </button>
        ) : null}

        {reviews.isFetching && limit > INITIAL_LIMIT ? (
          <LoadingState label="Atualizando avaliações" />
        ) : null}

        {!shouldShowError && displayItems.length > 0 ? (
          <button
            className="mx-auto hidden items-center gap-2 text-sm font-semibold text-muted"
            onClick={() => reviews.refetch()}
            type="button"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden />
            Atualizar
          </button>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
