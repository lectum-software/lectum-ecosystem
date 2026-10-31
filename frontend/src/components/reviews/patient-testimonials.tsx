"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useInfinitePatientReviews } from "@/api/callers/reviews";
import type { PatientReview } from "@/api/generator/types/reviews";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { ReviewsIcon } from "@/components/ui/reviews-icon";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { flattenListPages } from "@/utils/infinite-list";
import { DeleteReviewButton } from "./delete-review-button";
import { TestimonialCard } from "./testimonial-card";
import { TestimonialComposer } from "./testimonials-sheet";

const OwnTestimonial = ({ review }: { review: PatientReview }) => {
  const user = useAppSelector((state) => state.user);
  const [editing, setEditing] = useState(false);
  return (
    <div>
      <TestimonialCard
        context={
          <>
            Depoimento para{" "}
            <Link
              className="font-semibold text-primary"
              href={`/psicologos/${review.psychologist_id}`}
            >
              {review.psychologist_name}
            </Link>
          </>
        }
        review={{ ...review, author: { name: user?.name || "Você" } }}
        ownAuthorAvatar={user?.avatar}
        professional={{
          id: review.psychologist_id,
          name: review.psychologist_name,
          avatar: review.psychologist_avatar,
          gender: review.psychologist_gender,
          verified: review.psychologist_verified,
        }}
        responseName={review.psychologist_name}
        actions={
          <div className="flex shrink-0 items-center">
            <Button
              variant="ghost"
              className="h-9 w-9 shrink-0 p-0 text-muted"
              aria-label="Editar depoimento"
              title="Editar depoimento"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" />
            </Button>
            <DeleteReviewButton reviewId={review.id} />
          </div>
        }
      />
      <TestimonialComposer
        psychologistId={review.psychologist_id}
        initial={review}
        open={editing}
        onClose={() => setEditing(false)}
      />
    </div>
  );
};

export const PatientTestimonials = () => {
  const query = useInfinitePatientReviews({ limit: 20 });
  const items = flattenListPages(query.data?.pages);
  return (
    <PrivateTemplate desktopSidebarDefaultCollapsed showMobileNavigation={false}>
      <section className="mx-auto grid w-full max-w-2xl gap-4">
        <AppPageHeader
          backHref="/app/perfil"
          backLabel="Voltar para perfil"
          title="Meus Depoimentos"
        />
        {query.isLoading ? <LoadingState label="Carregando depoimentos" /> : null}
        {query.isError ? (
          <InlineAlert title="Não foi possível carregar" variant="error">
            <Button variant="ghost" onClick={() => query.refetch()}>
              Tentar novamente
            </Button>
          </InlineAlert>
        ) : null}
        {!query.isLoading && !query.isError && !items.length ? (
          <div data-testimonial-empty>
            <EmptyState
              className="rounded-[26px]"
              icon={ReviewsIcon}
              title="Você ainda não publicou depoimentos"
              description="Compartilhe sua experiência com os psicólogos com quem você já interagiu."
              action={
                <Button asChild className="h-9 px-4 text-sm" variant="outline">
                  <Link href="/psicologos">Explorar psicólogos</Link>
                </Button>
              }
            />
          </div>
        ) : null}
        <div
          className="overflow-hidden rounded-[26px] divide-y divide-border bg-surface px-4"
          data-testimonial-list
        >
          {items.map((review) => (
            <OwnTestimonial key={review.id} review={review} />
          ))}
        </div>
        {query.hasNextPage ? (
          <Button
            variant="ghost"
            disabled={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            Ver mais depoimentos
          </Button>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
