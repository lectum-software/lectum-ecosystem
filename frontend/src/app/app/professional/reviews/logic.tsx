"use client";

import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Filter,
  MessageSquareReply,
  RefreshCcw,
  Send,
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
  PsychologistReviewsQuery,
} from "@/api/generator/types/psychologist-reviews";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { useReviewResponseForm } from "./use-form";

const LIMIT = 10;
const STAR_KEYS = [1, 2, 3, 4, 5] as const;
const PERIOD_OPTIONS: Array<{
  label: string;
  value: NonNullable<PsychologistReviewsQuery["period"]>;
}> = [
  { label: "Todo período", value: "all" },
  { label: "Últimos 7 dias", value: "7d" },
  { label: "Últimos 30 dias", value: "30d" },
  { label: "Últimos 90 dias", value: "90d" },
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const resolveApiError = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return "Não foi possível conectar à API agora. Tente novamente em instantes.";
};

const Stars = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) => (
  <span className="inline-flex text-warning" role="img" aria-label={`${rating} de 5 estrelas`}>
    {STAR_KEYS.map((star) => (
      <Star
        key={star}
        className={cn(size === "lg" ? "h-6 w-6" : "h-4 w-4", star <= rating && "fill-current")}
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
    <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-6 shadow-[var(--lectum-shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-5xl font-black tracking-tight text-foreground">
            {averageLabel(summary)}
          </p>
          <div className="mt-2">
            <Stars rating={Math.round((summary?.rating_avg || 0) / 100)} size="lg" />
          </div>
          <p className="mt-2 text-sm text-muted">
            Total de {total} avalia{total === 1 ? "ção" : "ções"}
          </p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary">
          <BarChart3 className="h-5 w-5" aria-hidden />
        </span>
      </div>

      <div className="mt-6 grid gap-3">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = summary?.distribution[rating as 1 | 2 | 3 | 4 | 5] || 0;
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div className="grid grid-cols-[1.25rem_1fr_3rem] items-center gap-3" key={rating}>
              <span className="text-sm font-semibold text-muted">{rating}</span>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
              <span className="text-right text-xs font-semibold text-subtle">{percent}%</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const Filters = ({
  period,
  rating,
  onPeriodChange,
  onRatingChange,
}: {
  period: NonNullable<PsychologistReviewsQuery["period"]>;
  rating: number | null;
  onPeriodChange: (value: NonNullable<PsychologistReviewsQuery["period"]>) => void;
  onRatingChange: (value: number | null) => void;
}) => (
  <section className="grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
      <Filter className="h-4 w-4 text-primary" aria-hidden />
      Filtros
    </div>

    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">Filtrar por nota</legend>
      <button
        className={cn(
          "rounded-full border px-3 py-2 text-xs font-bold transition",
          rating === null
            ? "border-primary bg-primary text-white"
            : "border-border bg-surface text-muted hover:border-primary hover:text-primary",
        )}
        onClick={() => onRatingChange(null)}
        type="button"
      >
        Todas
      </button>
      {[5, 4, 3, 2, 1].map((value) => (
        <button
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-bold transition",
            rating === value
              ? "border-primary bg-primary text-white"
              : "border-border bg-surface text-muted hover:border-primary hover:text-primary",
          )}
          key={value}
          onClick={() => onRatingChange(value)}
          type="button"
        >
          {value}
          <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
        </button>
      ))}
    </fieldset>

    <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-subtle">
      Data
      <select
        className="h-12 rounded-[var(--lectum-control-radius)] border border-border bg-surface px-4 text-sm font-semibold normal-case tracking-normal text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
        onChange={(event) =>
          onPeriodChange(event.target.value as NonNullable<PsychologistReviewsQuery["period"]>)
        }
        value={period}
      >
        {PERIOD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  </section>
);

const ReviewResponseForm = ({ review }: { review: PsychologistReview }) => {
  const [isEditing, setIsEditing] = useState(!review.response);
  const form = useReviewResponseForm(review.response || "");
  const { Form, formProps, hook } = form;
  const mutation = useRespondPsychologistReview({
    onSuccess: (data) => {
      hook.reset({ response: data.review.response || "" });
      setIsEditing(false);
    },
  });

  if (review.response && !isEditing) {
    return (
      <div className="rounded-3xl border-l-4 border-primary bg-primary-soft/50 px-4 py-3">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-primary">
          <MessageSquareReply className="h-3.5 w-3.5" aria-hidden />
          Sua resposta
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">{review.response}</p>
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

  return (
    <Form
      className="grid gap-3"
      {...formProps}
      onSubmit={hook.handleSubmit((values) =>
        mutation.mutate({ id: review.id, body: { response: values.response } }),
      )}
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {review.response ? (
          <Button
            className="h-10 rounded-full px-4"
            onClick={() => setIsEditing(false)}
            type="button"
            variant="ghost"
          >
            Cancelar
          </Button>
        ) : null}
        <Button className="h-10 rounded-full px-5" disabled={mutation.isPending} type="submit">
          <Send className="h-4 w-4" aria-hidden />
          {mutation.isPending ? "Salvando..." : "Responder"}
        </Button>
      </div>
    </Form>
  );
};

const ReviewCard = ({ review }: { review: PsychologistReview }) => (
  <article className="grid gap-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
          {review.author.initials}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-extrabold text-foreground">
            {review.author.name}
          </h2>
          <Stars rating={review.rating} />
        </div>
      </div>
      <time className="shrink-0 text-xs text-subtle" dateTime={review.created_at}>
        {formatDate(review.created_at)}
      </time>
    </div>

    {review.comment ? (
      <p className="text-sm leading-6 text-muted">{review.comment}</p>
    ) : (
      <p className="text-sm text-subtle">Avaliação sem depoimento textual.</p>
    )}

    <ReviewResponseForm review={review} />
  </article>
);

export const ProfessionalReviewsLogic = () => {
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState<number | null>(null);
  const [period, setPeriod] = useState<NonNullable<PsychologistReviewsQuery["period"]>>("all");
  const query = useMemo(
    () => ({ page, limit: LIMIT, rating: rating || undefined, period }),
    [page, rating, period],
  );
  const reviews = usePsychologistReviews(query);
  const data = reviews.data;
  const items = data?.data ?? [];

  const errorMessage = reviews.isError ? resolveApiError(reviews.error) : null;
  const isProfessionalPlanError = Boolean(errorMessage?.includes("Plano Profissional"));
  const hasFilters = rating !== null || period !== "all";

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-3xl">
        <header className="flex items-center justify-between border-b border-border bg-surface px-1 pb-4">
          <Button asChild variant="ghost" className="h-10 w-10 px-0">
            <Link aria-label="Voltar para perfil" href="/app/profile">
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Link>
          </Button>
          <h1 className="text-lg font-extrabold text-foreground">Minhas Avaliações</h1>
          <span className="h-10 w-10" />
        </header>

        {reviews.isLoading && page === 1 ? <LoadingState label="Carregando avaliações" /> : null}

        {errorMessage ? (
          <InlineAlert
            title="Não foi possível carregar"
            variant={isProfessionalPlanError ? "warning" : "error"}
          >
            <div className="grid gap-3">
              <p>{errorMessage}</p>
              {isProfessionalPlanError ? (
                <Button asChild className="h-10 rounded-full px-4" variant="outline">
                  <Link href="/app/professional/billing/subscription">Ver assinatura</Link>
                </Button>
              ) : null}
            </div>
          </InlineAlert>
        ) : null}

        {!reviews.isError ? <RatingSummary summary={data?.summary} /> : null}

        {!reviews.isError ? (
          <Filters
            period={period}
            rating={rating}
            onPeriodChange={(value) => {
              setPeriod(value);
              setPage(1);
            }}
            onRatingChange={(value) => {
              setRating(value);
              setPage(1);
            }}
          />
        ) : null}

        {!reviews.isLoading && !reviews.isError && items.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title={hasFilters ? "Nenhuma avaliação neste filtro" : "Nenhuma avaliação recebida"}
            description={
              hasFilters
                ? "Ajuste os filtros para visualizar outras avaliações reais recebidas."
                : "Quando pacientes com contato registrado avaliarem seu perfil, os depoimentos aparecerão aqui."
            }
            action={
              hasFilters ? (
                <Button
                  onClick={() => {
                    setRating(null);
                    setPeriod("all");
                    setPage(1);
                  }}
                  type="button"
                  variant="outline"
                >
                  <RefreshCcw className="h-4 w-4" aria-hidden />
                  Limpar filtros
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {items.length > 0 ? (
          <section className="grid gap-4" aria-labelledby="professional-reviews-list-title">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-subtle">
                  <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
                  Depoimentos recentes
                </p>
                <h2
                  id="professional-reviews-list-title"
                  className="mt-1 text-xl font-extrabold text-foreground"
                >
                  Avaliações recebidas
                </h2>
              </div>
              {reviews.isFetching && page > 1 ? <LoadingState label="Atualizando" /> : null}
            </div>

            {items.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </section>
        ) : null}

        {(data?.pages || 0) > page ? (
          <Button
            className="rounded-full border-dashed"
            disabled={reviews.isFetching}
            onClick={() => setPage((current) => current + 1)}
            type="button"
            variant="outline"
          >
            {reviews.isFetching ? "Carregando..." : "Carregar avaliações anteriores"}
          </Button>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
