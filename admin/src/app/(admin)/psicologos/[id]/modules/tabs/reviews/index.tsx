"use client";

import { Star } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useAdminPsychologistReviews } from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPsychologistReviewItem,
  AdminPsychologistReviewsQuery,
} from "@/api/req/psychologists";
import { renderableImageSrc } from "@/lib/admin-media";
import { cn } from "@/lib/utils";
import { CardShell, ErrorState } from "../../components/shared";
import { numberFormatter } from "../../support/config";
import { formatDate } from "../../support/date-period";
import { initials, isPublicAdminMediaSrc } from "../../support/media";
import { PublicationsPagination } from "../publications/index";
import { EngagementLoadingState } from "../statistics/common";

const ratingStarValues = [1, 2, 3, 4, 5] as const;

const RatingStars = ({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) => (
  <span
    aria-label={`${rating} de 5 estrelas`}
    className="inline-flex items-center gap-1"
    role="img"
  >
    {ratingStarValues.map((star) => (
      <Star
        aria-hidden
        className={cn(
          size,
          star <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-border",
        )}
        key={star}
      />
    ))}
  </span>
);

const SmallAvatar = ({ name, src }: { name: string; src: string | null }) => {
  const imageSrc = renderableImageSrc(src);

  if (imageSrc) {
    return (
      <Image
        alt={name}
        className="h-12 w-12 rounded-full object-cover"
        height={48}
        src={imageSrc}
        unoptimized={isPublicAdminMediaSrc(imageSrc)}
        width={48}
      />
    );
  }

  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
      {initials(name)}
    </span>
  );
};

export const ReviewsTab = ({ id }: { id: string }) => {
  const [rating, setRating] = useState("all");
  const [page, setPage] = useState(1);
  const queryInput = useMemo<AdminPsychologistReviewsQuery>(
    () => ({
      limit: 5,
      page,
      rating: rating === "all" ? undefined : Number(rating),
    }),
    [page, rating],
  );
  const query = useAdminPsychologistReviews(id, queryInput);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) return <EngagementLoadingState rows={2} />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const reviews = query.data;
  const maxDistribution = Math.max(1, ...reviews.summary.distribution.map((item) => item.count));
  const ratingFilterLabel =
    rating === "all" ? null : `${rating} estrela${rating === "1" ? "" : "s"}`;

  return (
    <div className="space-y-5" data-psychologist-detail-tab="avaliacoes">
      <CardShell className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
              Avaliação geral
            </h2>
          </div>
          {ratingFilterLabel ? (
            <button
              className="self-start rounded-full bg-primary-soft px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 sm:self-auto"
              onClick={() => {
                setRating("all");
                setPage(1);
              }}
              type="button"
            >
              Ver todas as avaliações
            </button>
          ) : null}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[160px_1fr] lg:items-center">
          <div className="rounded-[1.5rem] border border-border/70 bg-surface-muted/50 p-5">
            <p className="text-6xl font-semibold tracking-[-0.06em] text-foreground">
              {reviews.summary.rating_avg.toLocaleString("pt-BR", {
                maximumFractionDigits: 1,
                minimumFractionDigits: 1,
              })}
            </p>
            <div className="mt-2">
              <RatingStars rating={reviews.summary.rating_avg} size="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium leading-5 text-muted">
              {numberFormatter.format(reviews.summary.rating_count)} avaliações reais
            </p>
          </div>
          <div className="w-full space-y-1.5">
            {reviews.summary.distribution.map((item) => {
              const isSelected = rating === String(item.rating);

              return (
                <button
                  aria-pressed={isSelected}
                  className={cn(
                    "grid w-full grid-cols-[88px_1fr_36px] items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition hover:bg-primary-soft focus:outline-none focus:ring-2 focus:ring-primary/30 sm:grid-cols-[104px_1fr_40px]",
                    isSelected ? "bg-primary-soft" : "bg-transparent",
                  )}
                  key={item.rating}
                  onClick={() => {
                    setRating(isSelected ? "all" : String(item.rating));
                    setPage(1);
                  }}
                  type="button"
                >
                  <span className="whitespace-nowrap text-sm font-semibold text-foreground">
                    {item.rating} estrelas
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                    <span
                      className="block h-full rounded-full bg-primary/90"
                      style={{ width: `${(item.count / maxDistribution) * 100}%` }}
                    />
                  </span>
                  <span className="text-right text-sm font-semibold text-muted">
                    {numberFormatter.format(item.count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CardShell>

      <CardShell className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
              Avaliações e depoimentos
            </h2>
            <p className="mt-1 text-sm font-medium leading-6 text-muted">
              Mostrando {numberFormatter.format(reviews.data.length)} de{" "}
              {numberFormatter.format(reviews.count)} avaliações
              {ratingFilterLabel ? ` com ${ratingFilterLabel}` : " filtradas"}.
            </p>
          </div>
        </div>

        {reviews.data.length === 0 ? (
          <p className="p-5 text-sm font-medium text-muted">
            Nenhuma avaliação real encontrada para os filtros atuais.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {reviews.data.map((item: AdminPsychologistReviewItem) => (
              <article className="p-5 sm:p-6" key={item.id}>
                <div className="flex gap-4">
                  <SmallAvatar name={item.author.name} src={item.author.avatar} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <h3 className="text-base font-semibold tracking-[-0.01em] text-foreground">
                        {item.author.name}
                      </h3>
                      <span className="text-xs font-medium text-muted">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                    <div className="mt-1">
                      <RatingStars rating={item.rating} />
                    </div>
                    <p className="mt-3 text-[15px] font-medium leading-7 text-foreground">
                      {item.comment || "Avaliação sem comentário textual."}
                    </p>
                    {item.response ? (
                      <div className="mt-4 rounded-2xl border border-primary/10 bg-primary-soft/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                          Resposta do psicólogo · {formatDate(item.responded_at)}
                        </p>
                        <p className="mt-2 text-sm font-medium leading-6 text-foreground">
                          {item.response}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="border-t border-border p-4">
          <PublicationsPagination page={reviews.page} pages={reviews.pages} setPage={setPage} />
        </div>
      </CardShell>
    </div>
  );
};
