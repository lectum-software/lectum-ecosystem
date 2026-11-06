"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { getPendingTestimonials } from "@/api/req/pending-testimonials";
import { TestimonialComposer } from "@/components/reviews/testimonials-sheet";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteListLoader } from "@/components/ui/infinite-list-loader";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { ReviewsIcon } from "@/components/ui/reviews-icon";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { flattenListPages, nextListPage } from "@/utils/infinite-list";

export const PendingTestimonialsLogic = ({ batch }: { batch?: string }) => {
  const user = useAppSelector((state) => state.user);
  const [selectedPsychologistId, setSelectedPsychologistId] = useState<string | null>(null);
  const isPatient = user?.role === "paciente";
  const query = useInfiniteQuery({
    queryKey: ["testimonial-pending", user?.id, batch],
    queryFn: ({ pageParam }) => getPendingTestimonials(pageParam, batch),
    initialPageParam: 1,
    getNextPageParam: nextListPage,
    enabled: isPatient,
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  });
  const items = flattenListPages(query.data?.pages);
  return (
    <PrivateTemplate desktopSidebarDefaultCollapsed showMobileNavigation={false}>
      <section className="mx-auto grid w-full max-w-[430px] min-w-0 gap-4 md:max-w-3xl">
        <AppPageHeader
          backHref="/app/notificacoes"
          backLabel="Voltar para notificações"
          title="Avaliar"
        />
        {!user || (isPatient && query.isLoading) ? (
          <LoadingState label="Carregando psicólogos" />
        ) : null}
        {user && !isPatient ? (
          <InlineAlert title="Área de pacientes">
            Entre com seu perfil de usuário para avaliar.
          </InlineAlert>
        ) : null}
        {isPatient && query.isError && !query.data ? (
          <InlineAlert title="Não foi possível carregar os psicólogos" variant="error">
            <Button variant="ghost" onClick={() => query.refetch()}>
              Tentar novamente
            </Button>
          </InlineAlert>
        ) : null}
        {isPatient && !query.isLoading && !query.isError && !items.length ? (
          <EmptyState
            icon={ReviewsIcon}
            title="Nenhuma avaliação pendente"
            description="Quando um psicólogo elegível responder você, ele aparecerá aqui."
          />
        ) : null}
        {isPatient && items.length > 0 ? (
          <ul className="min-w-0 divide-y divide-border border-y border-border">
            {items.map((item) => (
              <li key={item.psychologist_id} className="flex min-w-0 items-center gap-3 py-4">
                <Link
                  href={`/psicologos/${encodeURIComponent(item.psychologist_id)}`}
                  aria-label={`Perfil de ${item.name}`}
                  className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-primary"
                >
                  {item.avatar ? (
                    <Image src={item.avatar} alt="" fill sizes="40px" className="object-cover" />
                  ) : (
                    <UserRound className="size-6" aria-hidden />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    className="flex min-w-0 items-center gap-1 font-semibold text-foreground"
                    title={item.name}
                    href={`/psicologos/${encodeURIComponent(item.psychologist_id)}`}
                  >
                    <span className="truncate">{item.name}</span>
                    {item.verified ? (
                      <VerifiedBadgeIcon
                        className="size-4 shrink-0"
                        aria-label="Perfil verificado"
                      />
                    ) : null}
                  </Link>
                  {item.headline ? (
                    <p className="mt-1 truncate text-sm text-muted" title={item.headline}>
                      {item.headline}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  onClick={() => setSelectedPsychologistId(item.psychologist_id)}
                  className="h-8 min-h-8 shrink-0 rounded-lg px-3 py-1 text-sm font-semibold shadow-none"
                >
                  Avaliar
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        {isPatient && query.data ? (
          <InfiniteListLoader
            hasNextPage={query.hasNextPage}
            isFetching={query.isFetching && !query.isLoading}
            isError={query.isError}
            label="Carregando psicólogos"
            onLoadMore={query.fetchNextPage}
            onRetry={query.isFetchNextPageError ? query.fetchNextPage : query.refetch}
          />
        ) : null}
      </section>
      {selectedPsychologistId ? (
        <TestimonialComposer
          psychologistId={selectedPsychologistId}
          open
          onClose={() => setSelectedPsychologistId(null)}
        />
      ) : null}
    </PrivateTemplate>
  );
};
