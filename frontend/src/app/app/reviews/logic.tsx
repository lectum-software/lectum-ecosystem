"use client";

import { ArrowLeft, MessageSquareReply, Star, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePatientReviews } from "@/api/callers/reviews";
import type { PatientReview } from "@/api/generator/types/reviews";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

const LIMIT = 10;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );
const STAR_KEYS = [1, 2, 3, 4, 5];
const Stars = ({ rating }: { rating: number }) => (
  <span className="inline-flex text-warning" role="img" aria-label={`${rating} de 5 estrelas`}>
    {STAR_KEYS.map((star) => (
      <Star key={star} className={`h-4 w-4 ${star <= rating ? "fill-current" : ""}`} aria-hidden />
    ))}
  </span>
);

const ReviewCard = ({ review }: { review: PatientReview }) => (
  <article className="grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-extrabold text-foreground">{review.psychologist_name}</h2>
        <Stars rating={review.rating} />
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
    {review.response ? (
      <div className="rounded-2xl border-l-4 border-primary bg-primary-soft/60 px-4 py-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase text-primary">
          <MessageSquareReply className="h-3.5 w-3.5" />
          Resposta do profissional
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">{review.response}</p>
      </div>
    ) : null}
    {review.status === "oculta" ? (
      <InlineAlert title="Avaliação moderada" variant="warning">
        Esta avaliação está oculta publicamente, mas permanece registrada na sua conta.
      </InlineAlert>
    ) : null}
  </article>
);

export const ReviewsLogic = () => {
  const [page, setPage] = useState(1);
  const query = useMemo(() => ({ page, limit: LIMIT }), [page]);
  const reviews = usePatientReviews(query);
  const data = reviews.data;

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[390px] gap-5 sm:max-w-[430px] lg:max-w-3xl">
        <header className="flex items-center justify-between border-b border-border bg-surface px-1 pb-4">
          <Button asChild variant="ghost" className="h-10 w-10 px-0">
            <Link aria-label="Voltar para perfil" href="/app/profile">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-extrabold text-foreground">Avaliações feitas</h1>
          <span className="h-10 w-10" />
        </header>

        {reviews.isLoading ? <LoadingState label="Carregando avaliações" /> : null}
        {reviews.isError ? (
          <InlineAlert title="Não foi possível carregar" variant="error">
            Não foi possível conectar à API agora. Tente novamente em instantes.
          </InlineAlert>
        ) : null}

        {!reviews.isLoading && !reviews.isError && (data?.data.length || 0) === 0 ? (
          <EmptyState
            icon={UserRound}
            title="Nenhuma avaliação feita"
            description="Depois de registrar contato real com um psicólogo, você poderá avaliá-lo aqui."
            action={
              <Button asChild>
                <Link href="/app/psychologists">Encontrar psicólogos</Link>
              </Button>
            }
          />
        ) : null}

        <div className="grid gap-4">
          {data?.data.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        {(data?.pages || 0) > 1 ? (
          <Button
            disabled={reviews.isFetching || page >= (data?.pages || 1)}
            onClick={() => setPage((current) => current + 1)}
            type="button"
            variant="outline"
          >
            Carregar mais avaliações
          </Button>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
