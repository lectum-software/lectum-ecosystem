"use client";

import { MessageSquareReply, RefreshCcw, Star, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  useInfinitePsychologistReviews,
  useRespondPsychologistReview,
} from "@/api/callers/psychologist-reviews";
import { getSafeApiErrorMessage } from "@/api/errors";
import type {
  PsychologistReview,
  PsychologistReviewSummary,
} from "@/api/generator/types/psychologist-reviews";
import { ReviewsLinkCard } from "@/components/reviews/reviews-link-card";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteListLoader } from "@/components/ui/infinite-list-loader";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { flattenListPages } from "@/utils/infinite-list";
import { useReviewResponseForm } from "./use-form";

const INITIAL_LIMIT = 10;
const STAR_KEYS = [1, 2, 3, 4, 5] as const;
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const resolveApiError = (error: unknown) =>
  getSafeApiErrorMessage(
    error,
    "Não foi possível conectar ao serviço agora. Tente novamente em instantes.",
  );

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

const ReviewResponseForm = ({
  canRespond,
  defaultOpen,
  review,
}: {
  canRespond: boolean;
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

  if (review.response && (!isEditing || !canRespond)) {
    return (
      <div className="mt-2 rounded-[var(--lectum-control-radius)] border-l-[4px] border-primary bg-primary-soft px-4 py-3.5">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em] text-primary">
          <MessageSquareReply className="h-3.5 w-3.5" aria-hidden />
          Sua resposta
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">“{review.response}”</p>
        {canRespond ? (
          <button
            className="mt-3 text-sm font-bold text-primary hover:text-primary-hover"
            onClick={() => setIsEditing(true)}
            type="button"
          >
            Editar resposta
          </button>
        ) : null}
      </div>
    );
  }

  if (!canRespond) return null;

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
  canRespond,
  defaultOpenResponse,
  review,
}: {
  canRespond: boolean;
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
      <ReviewResponseForm
        canRespond={canRespond}
        defaultOpen={defaultOpenResponse}
        review={review}
      />
    </div>
  </article>
);

export const ProfessionalReviewsLogic = () => {
  const user = useAppSelector((state) => state.user);
  const reviews = useInfinitePsychologistReviews({ limit: INITIAL_LIMIT, period: "all" });
  const data = reviews.data?.pages[0];
  const items = useMemo(() => flattenListPages(reviews.data?.pages), [reviews.data?.pages]);
  const errorMessage = reviews.isError && !data ? resolveApiError(reviews.error) : null;
  const isProfessionalPlanError = Boolean(errorMessage?.includes("Plano Profissional"));
  const shouldShowError = Boolean(errorMessage && !isProfessionalPlanError);
  const isReviewsPreview = data?.access.mode === "preview" || isProfessionalPlanError;
  const canReceiveReviews = !isReviewsPreview && (data?.access.can_receive_reviews ?? true);
  const displayItems = items;
  const firstUnansweredId = displayItems.find((review) => !review.response)?.id;
  const hasReceivedReviews = summaryTotal(data?.summary) > 0 || displayItems.length > 0;
  const reviewLink =
    typeof window === "undefined"
      ? "lectum.com.br/app/avaliacoes/nova"
      : `${window.location.origin}/app/avaliacoes/nova${user?.id ? `?psychologist_id=${user.id}` : ""}`;

  return (
    <PrivateTemplate desktopSidebarDefaultCollapsed showMobileNavigation={false}>
      <section className="mx-auto grid w-full max-w-[430px] grid-cols-[minmax(0,1fr)] gap-4 md:max-w-3xl">
        <AppPageHeader backLabel="Voltar para perfil" title="Minhas Avaliações" />

        {!shouldShowError ? <ReviewsLinkCard link={reviewLink} locked={isReviewsPreview} /> : null}

        {reviews.isLoading ? <LoadingState label="Carregando avaliações" /> : null}

        {shouldShowError ? (
          <InlineAlert title="Erro ao consultar avaliações" variant="error">
            <p>{errorMessage}</p>
          </InlineAlert>
        ) : null}

        {!shouldShowError ? <RatingSummary summary={data?.summary} /> : null}

        {!reviews.isLoading && !shouldShowError && isReviewsPreview && hasReceivedReviews ? (
          <InlineAlert title="Avaliações ocultas no perfil público" variant="warning">
            <div className="grid gap-3">
              <p>
                Suas avaliações continuam salvas aqui, mas não estão visíveis para pacientes no seu
                perfil público. Para torná-las públicas novamente, faça o upgrade para o Plano
                Profissional.
              </p>
              <Button asChild className="h-10 w-full rounded-full sm:w-fit sm:px-5">
                <Link href="/app/profissional/assinatura">Fazer upgrade</Link>
              </Button>
            </div>
          </InlineAlert>
        ) : null}

        {!reviews.isLoading && !shouldShowError && displayItems.length === 0 ? (
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
                canRespond={canReceiveReviews}
                defaultOpenResponse={review.id === firstUnansweredId}
                key={review.id}
                review={review}
              />
            ))}
          </section>
        ) : null}

        <InfiniteListLoader
          hasNextPage={reviews.hasNextPage}
          isFetching={reviews.isFetching && !reviews.isLoading}
          isError={reviews.isError && !isProfessionalPlanError}
          label="Carregando avaliações"
          onLoadMore={reviews.fetchNextPage}
          onRetry={reviews.isFetchNextPageError ? reviews.fetchNextPage : reviews.refetch}
        />

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
