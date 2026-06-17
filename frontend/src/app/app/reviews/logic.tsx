"use client";

import { ArrowUpRight, MessageSquareReply, Star, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePatientReviews } from "@/api/callers/reviews";
import type { PatientReview } from "@/api/generator/types/reviews";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { SecondaryPageHeader } from "@/components/ui/secondary-page-header";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { formatCrpLabel } from "@/utils/crp";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

const LIMIT = 10;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

const formatRating = (rating: number) =>
  rating.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 0 });

const getPsychologistTitle = (gender?: string | null) => {
  const normalized = gender?.toLowerCase();

  return normalized === "feminino" || normalized === "mulher" ? "Psicóloga" : "Psicólogo";
};

const formatPsychologistCredential = (review: PatientReview) =>
  `${getPsychologistTitle(review.psychologist_gender)} • ${formatCrpLabel(review.psychologist_crp)}`;

const ReviewPsychologistAvatar = ({ review }: { review: PatientReview }) => {
  const avatarSrc = resolvePublicMediaUrl(review.psychologist_avatar);

  return (
    <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary-soft via-white to-primary-soft text-sm font-black text-primary ring-1 ring-border dark:via-surface">
      {avatarSrc ? (
        <Image
          alt={review.psychologist_name}
          className="object-cover"
          fill
          sizes="56px"
          src={avatarSrc}
          unoptimized={isPublicMediaUrl(review.psychologist_avatar)}
        />
      ) : (
        getInitials(review.psychologist_name)
      )}
    </span>
  );
};

const ReviewCard = ({ review }: { review: PatientReview }) => (
  <article className="grid gap-4 rounded-[24px] border border-border bg-surface p-4 shadow-[0_14px_34px_rgb(15_23_42_/_6%)] sm:p-5">
    <div className="flex items-start gap-3">
      <ReviewPsychologistAvatar review={review} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h2 className="truncate text-base font-black text-foreground">
            {review.psychologist_name}
          </h2>
          {review.psychologist_verified ? (
            <VerifiedBadgeIcon className="h-4 w-4" aria-hidden="true" />
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs font-semibold text-muted">
          {formatPsychologistCredential(review)}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-black text-warning">
            <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            {formatRating(review.rating)}
          </span>
        </div>
      </div>

      <Button asChild className="h-9 w-9 shrink-0 rounded-full p-0 text-muted" variant="ghost">
        <Link href={`/app/psychologist/${review.psychologist_id}`} aria-label="Abrir perfil">
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </div>

    {review.comment ? (
      <p className="rounded-2xl bg-background px-4 py-3 text-sm leading-6 text-muted">
        “{review.comment}”
      </p>
    ) : (
      <p className="rounded-2xl bg-background px-4 py-3 text-sm text-subtle">
        Avaliação sem depoimento textual.
      </p>
    )}

    <div className="flex items-center gap-3">
      <time className="text-xs font-semibold text-subtle" dateTime={review.created_at}>
        {formatDate(review.created_at)}
      </time>
    </div>

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
    <PrivateTemplate
      contentClassName="bg-background px-0 py-0"
      desktopSidebarDefaultCollapsed
      showMobileNavigation={false}
    >
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-background px-5 py-5 sm:max-w-xl md:py-8">
        <SecondaryPageHeader
          backHref="/app/profile"
          backLabel="Voltar para perfil"
          className="mb-4"
          title="Avaliações feitas"
        />

        <div className="grid gap-4 py-2">
          {reviews.isLoading ? (
            <div className="grid min-h-[45vh] place-items-center rounded-[22px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
              <LoadingState label="Carregando avaliações" />
            </div>
          ) : null}
          {reviews.isError ? (
            <InlineAlert title="Não foi possível carregar" variant="error">
              Não foi possível conectar à API agora. Tente novamente em instantes.
            </InlineAlert>
          ) : null}

          {!reviews.isLoading && !reviews.isError && (data?.data.length || 0) === 0 ? (
            <EmptyState
              icon={UserRound}
              title="Nenhuma avaliação feita"
              description="As avaliações que você fizer sobre psicólogos aparecerão aqui."
              className="border-border bg-surface shadow-[var(--lectum-shadow-soft)]"
              action={
                <Button asChild className="rounded-full px-5">
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
        </div>
      </section>
    </PrivateTemplate>
  );
};
