"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPendingTestimonials } from "@/api/req/pending-testimonials";
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
              <li key={item.psychologist_id} className="flex min-w-0 items-start gap-4 py-5">
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
                <div className="grid min-w-0 flex-1 justify-items-start">
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
                  <Button
                    asChild
                    className="mt-3 min-h-11 max-w-full whitespace-normal rounded-lg px-4 py-2 text-center text-sm font-semibold shadow-none"
                  >
                    <Link
                      href={`/app/avaliacoes/nova?psychologist_id=${encodeURIComponent(item.psychologist_id)}`}
                    >
                      Avaliar
                    </Link>
                  </Button>
                </div>
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
