"use client";

import { usePsychologistReviews } from "@/api/callers/psychologist-reviews";
import { getSafeApiErrorMessage } from "@/api/errors";
import { PremiumReviewsState, ReviewsLinkCard } from "@/components/reviews/reviews-link-card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";

export const OwnReviewsLink = ({ profileId }: { profileId: string }) => {
  const reviews = usePsychologistReviews({ page: 1, limit: 1, period: "all" });
  const errorMessage = reviews.isError
    ? getSafeApiErrorMessage(reviews.error, "Não foi possível carregar o acesso às avaliações.")
    : null;
  const isPlanError = Boolean(errorMessage?.includes("Plano Profissional"));
  const locked =
    reviews.isError ||
    reviews.data?.access.mode !== "full" ||
    reviews.data?.access.can_receive_reviews !== true;
  const preview =
    reviews.data?.access.mode === "preview" ||
    isPlanError ||
    reviews.data?.access.can_receive_reviews === false;
  const link =
    typeof window === "undefined"
      ? "lectum.com.br/app/avaliacoes/nova"
      : `${window.location.origin}/app/avaliacoes/nova?psychologist_id=${encodeURIComponent(profileId)}`;

  return (
    <>
      <ReviewsLinkCard link={link} locked={locked} />
      {reviews.isLoading ? <LoadingState label="Carregando acesso às avaliações" /> : null}
      {errorMessage && !isPlanError ? (
        <InlineAlert title="Erro ao consultar avaliações" variant="error">
          {errorMessage}
        </InlineAlert>
      ) : null}
      {preview ? <PremiumReviewsState /> : null}
    </>
  );
};
