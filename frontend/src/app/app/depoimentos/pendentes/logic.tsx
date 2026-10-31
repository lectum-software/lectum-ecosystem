"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { MessageSquare, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPendingTestimonials } from "@/api/req/pending-testimonials";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteListLoader } from "@/components/ui/infinite-list-loader";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { flattenListPages, nextListPage } from "@/utils/infinite-list";

export const PendingTestimonialsLogic = ({ batch }: { batch?: string }) => {
  const user = useAppSelector((state) => state.user);
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
      <section className="mx-auto w-full max-w-2xl px-4 py-4 sm:px-6 sm:py-6">
        <AppPageHeader
          backHref="/app/notificacoes"
          backLabel="Voltar para notificações"
          title="Deixar depoimentos"
        />
        {!user || (isPatient && query.isLoading) ? (
          <LoadingState label="Carregando psicólogos" />
        ) : null}
        {user && !isPatient ? (
          <InlineAlert title="Área de pacientes">
            Entre com seu perfil de paciente para deixar depoimentos.
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
            icon={MessageSquare}
            title="Nenhum depoimento pendente"
            description="Quando um psicólogo elegível responder você, ele aparecerá aqui."
          />
        ) : null}
        {isPatient && items.length > 0 ? (
          <ul className="mt-4 divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.psychologist_id}
                className="flex flex-wrap items-center gap-3 py-5 sm:flex-nowrap sm:gap-4"
              >
                <Link
                  href={`/psicologos/${encodeURIComponent(item.psychologist_id)}`}
                  aria-label={`Perfil de ${item.name}`}
                  className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-primary"
                >
                  {item.avatar ? (
                    <Image src={item.avatar} alt="" fill sizes="48px" className="object-cover" />
                  ) : (
                    <UserRound className="size-6" aria-hidden />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    className="break-words font-semibold text-foreground"
                    href={`/psicologos/${encodeURIComponent(item.psychologist_id)}`}
                  >
                    {item.name}
                    {item.verified ? (
                      <VerifiedBadgeIcon
                        className="ml-1 inline size-4"
                        aria-label="Perfil verificado"
                      />
                    ) : null}
                  </Link>
                  {item.headline ? (
                    <p className="mt-1 break-words text-sm text-muted">{item.headline}</p>
                  ) : null}
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="ml-15 min-h-11 max-w-full whitespace-normal sm:ml-0 sm:shrink-0"
                >
                  <Link
                    href={`/app/avaliacoes/nova?psychologist_id=${encodeURIComponent(item.psychologist_id)}`}
                  >
                    Deixar depoimento
                  </Link>
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
    </PrivateTemplate>
  );
};
