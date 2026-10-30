"use client";

import type { ComponentProps } from "react";
import type { ReviewsTab } from "@/app/app/psychologist/[id]/components/reviews";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/registry/new-york-v4/ui/button";
import { TestimonialCard } from "./testimonial-card";
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
}: ComponentProps<typeof ReviewsTab> & { readOnly?: boolean; onRetry?: () => void }) => (
  <section className="grid gap-3 px-3 py-4 sm:px-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-base font-bold">
        Depoimentos <span className="font-normal text-muted">{summary.rating_count}</span>
      </h2>
      {!readOnly ? <TestimonialInvitation psychologistId={profileId} allowGuest /> : null}
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
    {!isLoading && !isError && !reviews.length ? (
      <p className="py-10 text-center text-muted">Ainda não há depoimentos.</p>
    ) : null}
    {reviews.map((review) => (
      <TestimonialCard key={review.id} review={review} />
    ))}
    {hasNextPage ? (
      <Button variant="ghost" disabled={isFetchingNextPage} onClick={onLoadMore}>
        Ver mais depoimentos
      </Button>
    ) : null}
  </section>
);
