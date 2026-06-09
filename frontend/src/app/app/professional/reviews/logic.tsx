"use client";

import { ArrowLeft, MessageSquareReply, RefreshCcw, Star, UserRound } from "lucide-react";
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
  <span className="inline-flex text-[#f7c51e]" role="img" aria-label={`${rating} de 5 estrelas`}>
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
    <section className="rounded-[22px] border border-[#e5e7eb] bg-white px-5 py-[30px] shadow-[0_2px_8px_rgb(15_23_42_/_5%)]">
      <p className="text-[48px] font-extrabold leading-none tracking-[-0.05em] text-[#111827]">
        {averageLabel(summary)}
      </p>
      <div className="mt-3">
        <Stars rating={Math.round((summary?.rating_avg || 0) / 100)} size="lg" />
      </div>
      <p className="mt-2 text-[15px] text-[#64748b]">
        Total de {total.toLocaleString("pt-BR")} avaliações
      </p>

      <div className="mt-[29px] grid gap-[13px]">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = summary?.distribution[rating as 1 | 2 | 3 | 4 | 5] || 0;
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div className="grid grid-cols-[12px_1fr_34px] items-center gap-[13px]" key={rating}>
              <span className="text-[12px] font-semibold text-[#334155]">{rating}</span>
              <div className="h-[7px] overflow-hidden rounded-full bg-[#eef2f7]">
                <div
                  className="h-full rounded-full bg-[#308ce8]"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-right text-[12px] font-medium text-[#64748b]">{percent}%</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

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
      <div className="mt-2 rounded-[16px] border-l-[4px] border-[#308ce8] bg-[#f2f7ff] px-4 py-[14px]">
        <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#308ce8]">
          <MessageSquareReply className="h-[13px] w-[13px]" aria-hidden />
          Sua resposta
        </p>
        <p className="mt-3 text-[14px] leading-[21px] text-[#334155]">“{review.response}”</p>
        <button
          className="mt-3 text-[13px] font-bold text-[#308ce8] hover:text-[#247bd1]"
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
        <p className="text-[13px] text-[#94a3b8]">Aguardando sua resposta</p>
        <button
          className="inline-flex h-9 items-center justify-center gap-1 rounded-full border border-[#e2e8f0] bg-white px-4 text-[14px] font-extrabold text-[#308ce8] shadow-sm transition hover:bg-[#f8fbff]"
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
          className="h-9 rounded-full bg-[#308ce8] px-5 text-[14px] font-extrabold shadow-none hover:bg-[#247bd1]"
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
  <article className="rounded-[22px] border border-[#eef2f7] bg-white px-5 py-[18px] shadow-[0_2px_8px_rgb(15_23_42_/_4%)]">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-[16px] font-extrabold tracking-[-0.01em] text-[#111827]">
          {review.author.name}
        </h2>
        <div className="mt-0.5">
          <Stars rating={review.rating} />
        </div>
      </div>
      <time className="shrink-0 text-[12px] text-[#94a3b8]" dateTime={review.created_at}>
        {formatDate(review.created_at)}
      </time>
    </div>

    {review.comment ? (
      <p className="mt-[18px] text-[14px] leading-[24px] text-[#374151]">{review.comment}</p>
    ) : (
      <p className="mt-[18px] text-[14px] text-[#94a3b8]">Avaliação sem depoimento textual.</p>
    )}

    <div className="mt-[22px]">
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
  const firstUnansweredId = items.find((review) => !review.response)?.id;

  const errorMessage = reviews.isError ? resolveApiError(reviews.error) : null;
  const isProfessionalPlanError = Boolean(errorMessage?.includes("Plano Profissional"));

  return (
    <PrivateTemplate showNavigation={false}>
      <section className="mx-auto my-0 min-h-screen w-full max-w-[430px] bg-[#f5f6f8] pb-10 sm:rounded-[24px] sm:border sm:border-[#e5e7eb] sm:overflow-hidden lg:max-w-[760px]">
        <header className="grid h-[72px] grid-cols-[72px_1fr_72px] items-center border-b border-[#e5e7eb] bg-white">
          <Link
            aria-label="Voltar para perfil"
            className="grid h-full place-items-center text-[#308ce8]"
            href="/app/profile"
          >
            <ArrowLeft className="h-[22px] w-[22px]" aria-hidden />
          </Link>
          <h1 className="text-center text-[18px] font-extrabold tracking-[-0.02em] text-[#111827]">
            Minhas Avaliações
          </h1>
          <span />
        </header>

        <div className="grid gap-[27px] px-4 pt-[17px]">
          {reviews.isLoading && limit === INITIAL_LIMIT ? (
            <LoadingState label="Carregando avaliações" />
          ) : null}

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

          {!reviews.isLoading && !reviews.isError && items.length === 0 ? (
            <EmptyState
              className="rounded-[22px] bg-white"
              icon={UserRound}
              title="Nenhuma avaliação recebida"
              description="Quando pacientes com contato registrado avaliarem seu perfil, os depoimentos aparecerão aqui."
            />
          ) : null}

          {items.length > 0 ? (
            <section className="grid gap-[17px]" aria-labelledby="professional-reviews-list-title">
              <h2
                id="professional-reviews-list-title"
                className="text-[19px] font-extrabold tracking-[-0.02em] text-[#111827]"
              >
                Depoimentos Recentes
              </h2>

              {items.map((review) => (
                <ReviewCard
                  defaultOpenResponse={review.id === firstUnansweredId}
                  key={review.id}
                  review={review}
                />
              ))}
            </section>
          ) : null}

          {(data?.count || 0) > items.length ? (
            <button
              className="h-[54px] rounded-[22px] border border-dashed border-[#bddaf3] bg-white text-[15px] font-extrabold text-[#308ce8] transition hover:bg-[#f8fbff] disabled:opacity-60"
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

          {!reviews.isError && items.length > 0 ? (
            <button
              className="mx-auto hidden items-center gap-2 text-sm font-semibold text-[#64748b]"
              onClick={() => reviews.refetch()}
              type="button"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden />
              Atualizar
            </button>
          ) : null}
        </div>
      </section>
    </PrivateTemplate>
  );
};
