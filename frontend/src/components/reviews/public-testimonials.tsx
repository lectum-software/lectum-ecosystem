"use client";

import type { ComponentProps } from "react";
import { useDirectoryPsychologist } from "@/api/callers/directory";
import type { ReviewsTab } from "@/app/app/psychologist/[id]/components/reviews";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ReviewsIcon } from "@/components/ui/reviews-icon";
import { Button } from "@/registry/new-york-v4/ui/button";
import { TestimonialCard } from "./testimonial-card";
import type { TestimonialProfessional } from "./testimonial-professional";
import { TestimonialInvitation } from "./testimonials-sheet";

export const PublicTestimonials = ({
  profileId,
  reviews,
  summary,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  readOnly = false,
  onRetry,
  professional: suppliedProfessional,
}: ComponentProps<typeof ReviewsTab> & {
  readOnly?: boolean;
  onRetry?: () => void;
  professional?: TestimonialProfessional;
}) => {
  const profileQuery = useDirectoryPsychologist(suppliedProfessional ? "" : profileId);
  const professional = suppliedProfessional ?? profileQuery.data;
  const isEmpty = !isLoading && !isError && reviews.length === 0;
  return (
    <section className="grid gap-3 bg-background px-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          Depoimentos
          <span className="text-sm font-medium tabular-nums text-muted">
            {summary.rating_count.toLocaleString("pt-BR")}
          </span>
        </h2>
        {!readOnly && !isEmpty ? (
          <TestimonialInvitation psychologistId={profileId} appearance="profile" allowGuest />
        ) : null}
      </div>
      {isLoading ? <LoadingState label="Carregando depoimentos" /> : null}
      {isError ? (
        <div role="alert" className="text-sm text-danger">
          <p>Não foi possível carregar os depoimentos.</p>
          {onRetry ? (
            <Button variant="ghost" onClick={onRetry}>
              Tentar novamente
            </Button>
          ) : null}
        </div>
      ) : null}
      {isEmpty ? (
        <div data-testimonial-empty>
          <EmptyState
            className="rounded-[26px]"
            icon={ReviewsIcon}
            title="Ainda não há depoimentos"
            description={
              !readOnly
                ? "Já interagiu com este psicólogo? Seja a primeira pessoa a compartilhar sua experiência."
                : undefined
            }
            action={
              !readOnly ? (
                <TestimonialInvitation psychologistId={profileId} appearance="profile" allowGuest />
              ) : undefined
            }
          />
        </div>
      ) : null}
      <div
        className="overflow-hidden rounded-[26px] divide-y divide-border bg-surface px-4"
        data-testimonial-list
      >
        {reviews.map((review) => (
          <TestimonialCard key={review.id} review={review} professional={professional} />
        ))}
      </div>
      {hasNextPage ? (
        <Button variant="ghost" disabled={isFetchingNextPage} onClick={onLoadMore}>
          Ver mais depoimentos
        </Button>
      ) : null}
    </section>
  );
};
