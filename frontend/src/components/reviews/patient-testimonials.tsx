"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useInfinitePatientReviews } from "@/api/callers/reviews";
import type { PatientReview } from "@/api/generator/types/reviews";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
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
          <div className="flex">
            <Button
              variant="ghost"
              className="h-10 w-10 p-0"
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
          <div className="py-10 text-center">
            <p>Você ainda não publicou depoimentos.</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/psicologos">Explorar psicólogos</Link>
            </Button>
          </div>
        ) : null}
        <div className="divide-y divide-border bg-surface px-4" data-testimonial-list>
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
