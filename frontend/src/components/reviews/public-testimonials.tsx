"use client";

import type { ComponentProps } from "react";
import { useDirectoryPsychologist } from "@/api/callers/directory";
import type { ReviewsTab } from "@/app/app/psychologist/[id]/components/reviews";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/registry/new-york-v4/ui/button";
import { TestimonialCard } from "./testimonial-card";
import { TESTIMONIAL_DESCRIPTION, type TestimonialProfessional } from "./testimonial-professional";
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
  return (
    <section className="grid gap-3 px-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          Depoimentos
          <span className="text-sm font-medium tabular-nums text-muted">
            {summary.rating_count.toLocaleString("pt-BR")}
          </span>
        </h2>
        {!readOnly ? (
          <TestimonialInvitation
            psychologistId={profileId}
            className="h-11 px-3 text-xs"
            allowGuest
          />
        ) : null}
      </div>
      <p className="text-sm leading-6 text-muted">{TESTIMONIAL_DESCRIPTION}</p>
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
      <div className="divide-y divide-border">
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
