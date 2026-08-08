"use client";

import Link from "next/link";
import type {
  DirectoryPsychologistProfileReview,
  DirectoryReviewSummary,
} from "@/api/generator/types/directory";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";

import {
  formatDate,
  formatRatingNumber,
  PROFILE_CARD_SURFACE,
  resolveErrorMessage,
} from "../modules/support";

import {
  InfiniteProfileListLoader,
  ProfileSectionCard,
  ProfileTabHeaderCard,
  SectionChipLink,
  StarRating,
  ViewAllChipButton,
} from "./shared";

export const ReviewPreviewCard = ({ review }: { review: DirectoryPsychologistProfileReview }) => {
  return (
    <article className="mt-3 box-border rounded-[18px] border border-border bg-surface-muted p-3.5 shadow-lectum-soft">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-[12px] font-extrabold text-primary-hover shadow-lectum-soft">
          {review.author.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-extrabold text-foreground">
                {review.author.name}
              </p>
              <p className="mt-0.5 text-[12px] text-muted">{formatDate(review.created_at)}</p>
            </div>
            <StarRating rating={review.rating} />
          </div>

          <p className="mt-2.5 line-clamp-3 text-[13px] leading-[1.6] text-muted">
            &ldquo;{review.comment || "Avaliação publicada sem comentário textual."}&rdquo;
          </p>
        </div>
      </div>
    </article>
  );
};

export const ReviewsPreviewSection = ({
  canReviewProfile,
  highlightedReview,
  isVerifiedSubscriber,
  isError,
  isLoading,
  onViewAll,
  psychologistId,
  reviews,
  summary,
}: {
  canReviewProfile: boolean;
  isVerifiedSubscriber: boolean;
  isError: boolean;
  isLoading: boolean;
  onViewAll: () => void;
  psychologistId: string;
  highlightedReview?: DirectoryPsychologistProfileReview | null;
  reviews: DirectoryPsychologistProfileReview[];
  summary: DirectoryReviewSummary;
}) => {
  const featuredReview = highlightedReview ?? reviews[0];
  const hasReviews = summary.rating_count > 0 || reviews.length > 0;
  const action = isVerifiedSubscriber ? (
    hasReviews ? (
      <ViewAllChipButton onClick={onViewAll}>Ver todas</ViewAllChipButton>
    ) : canReviewProfile ? (
      <SectionChipLink href={`/app/avaliacoes/nova?psychologist_id=${psychologistId}`}>
        Avaliar
      </SectionChipLink>
    ) : null
  ) : null;

  return (
    <ProfileSectionCard action={action} title="Avaliações">
      {hasReviews ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-end gap-2">
              <p className="text-[30px] font-extrabold leading-none tracking-[-0.03em] text-foreground">
                {formatRatingNumber(summary.rating_avg, summary.rating_count)}
              </p>
              <p className="pb-0.5 text-[13px] font-medium text-muted">
                {summary.rating_count} avaliações
              </p>
            </div>
            <div className="mt-1.5">
              <StarRating rating={summary.rating_avg / 100} />
            </div>
          </div>
        </div>
      ) : null}

      {isError ? (
        <p className="mt-3 rounded-[12px] border border-danger-border bg-danger-soft px-3 py-2 text-[11px] leading-[1.4] text-danger">
          Não foi possível carregar a prévia de avaliações.
        </p>
      ) : null}

      {isLoading ? <LoadingState label="Carregando avaliações" /> : null}

      {!isLoading && !isError && featuredReview ? (
        <ReviewPreviewCard review={featuredReview} />
      ) : null}

      {!isLoading && !isError && !featuredReview ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[13px] leading-[1.6] text-muted">
            Este profissional ainda não possui avaliações.
          </p>
        </div>
      ) : null}
    </ProfileSectionCard>
  );
};

export const ReviewSummaryCard = ({
  canReviewProfile,
  psychologistId,
  summary,
}: {
  canReviewProfile: boolean;
  psychologistId: string;
  summary: DirectoryReviewSummary;
}) => {
  if (summary.rating_count <= 0) {
    return (
      <article className={cn(PROFILE_CARD_SURFACE, "p-4 sm:p-5")}>
        <p className="text-[13px] leading-[1.6] text-muted">
          Este profissional ainda não possui avaliações.
        </p>
      </article>
    );
  }

  const max = Math.max(1, summary.rating_count);

  return (
    <article className={cn(PROFILE_CARD_SURFACE, "grid gap-4 p-4 sm:p-5")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[36px] font-extrabold leading-none tracking-[-0.04em] text-foreground">
            {formatRatingNumber(summary.rating_avg, summary.rating_count)}
          </p>
          <div className="mt-1.5">
            <StarRating rating={summary.rating_avg / 100} />
          </div>
          <p className="mt-1.5 text-[13px] font-medium text-muted">
            {summary.rating_count} avaliações
          </p>
        </div>
        {canReviewProfile ? (
          <Button
            asChild
            className="h-10 shrink-0 cursor-pointer rounded-full border-border bg-surface px-4 text-[12.5px] font-extrabold text-primary-hover hover:border-border hover:bg-surface-muted hover:text-primary-hover focus-visible:outline-primary sm:px-[18px] sm:text-[13px]"
            variant="outline"
          >
            <Link href={`/app/avaliacoes/nova?psychologist_id=${psychologistId}`}>Avaliar</Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-2.5">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = summary.distribution[rating as 1 | 2 | 3 | 4 | 5] ?? 0;
          const percent = Math.round((count / max) * 100);

          return (
            <div className="grid grid-cols-[20px_1fr_42px] items-center gap-2.5" key={rating}>
              <span className="text-[11px] font-semibold text-muted">{rating}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                <span
                  className="block h-full rounded-full bg-rating"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="text-right text-[11px] font-semibold text-muted">{percent}%</span>
            </div>
          );
        })}
      </div>
    </article>
  );
};

export const ReviewCard = ({ review }: { review: DirectoryPsychologistProfileReview }) => {
  return (
    <article className={cn(PROFILE_CARD_SURFACE, "p-4 sm:p-5")}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-[12px] font-extrabold text-primary-hover shadow-lectum-soft">
          {review.author.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[13.5px] font-extrabold tracking-[-0.01em] text-foreground">
                {review.author.name}
              </h2>
              <p className="mt-0.5 text-[12px] text-muted">{formatDate(review.created_at)}</p>
            </div>
            <StarRating rating={review.rating} />
          </div>

          {review.comment ? (
            <p className="mt-3 text-[13px] leading-[1.62] text-muted">
              &ldquo;{review.comment}&rdquo;
            </p>
          ) : (
            <p className="mt-3 text-[13px] leading-[1.62] text-muted">
              Avaliação publicada sem comentário textual.
            </p>
          )}
          {review.response ? (
            <div className="mt-3 rounded-[16px] border border-border border-l-[3px] border-l-primary bg-surface-muted px-3.5 py-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.075em] text-primary-hover">
                Resposta do profissional
              </p>
              <p className="mt-1.5 text-[13px] leading-[1.6] text-foreground">
                &ldquo;{review.response}&rdquo;
              </p>
              {review.responded_at ? (
                <p className="mt-1.5 text-[11px] text-muted">
                  Respondido em {formatDate(review.responded_at)}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export const ReviewsTab = ({
  canReviewProfile,
  error,
  hasNextPage,
  isError,
  isFetching,
  isFetchingNextPage,
  isLoading,
  onBackToOverview,
  onLoadMore,
  profileId,
  reviews,
  summary,
}: {
  canReviewProfile: boolean;
  error: unknown;
  hasNextPage: boolean;
  isError: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  onBackToOverview: () => void;
  onLoadMore: () => void;
  profileId: string;
  reviews: DirectoryPsychologistProfileReview[];
  summary: DirectoryReviewSummary;
}) => {
  return (
    <div className="grid gap-3.5 bg-surface-muted px-3 pb-1 pt-3.5 dark:bg-background sm:px-4 sm:pt-4">
      <ProfileTabHeaderCard
        count={summary.rating_count}
        countLabelPlural="avaliações"
        countLabelSingular="avaliação"
        onBack={onBackToOverview}
        title="Avaliações"
      />
      <ReviewSummaryCard
        canReviewProfile={canReviewProfile}
        psychologistId={profileId}
        summary={summary}
      />

      {isError ? (
        <InlineAlert title="Não foi possível carregar avaliações" variant="error">
          {resolveErrorMessage(error, "Não foi possível carregar as avaliações deste perfil.")}
        </InlineAlert>
      ) : null}

      {isLoading ? (
        <div className="box-border grid min-h-[30vh] place-items-center rounded-[22px] border border-border bg-surface">
          <LoadingState label="Carregando avaliações" />
        </div>
      ) : null}

      {!isLoading && !isError && reviews.length > 0 ? (
        <div className="grid gap-3.5">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : null}

      {isFetching && !isFetchingNextPage && !isLoading ? (
        <LoadingState label="Atualizando avaliações" />
      ) : null}

      <InfiniteProfileListLoader
        hasNextPage={hasNextPage}
        isLoading={isFetchingNextPage}
        label="Carregando mais avaliações"
        onLoadMore={onLoadMore}
      />
    </div>
  );
};
