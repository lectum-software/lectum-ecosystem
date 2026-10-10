"use client";

import { ChevronRight, Compass, UsersRound } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useCommunities, useInfiniteCommunities } from "@/api/callers/community";
import { getSafeApiErrorMessage } from "@/api/errors";
import type { Community } from "@/api/generator/types/community";
import { CommunityAvatar } from "@/components/community/community-avatar";
import { CommunityRecommendationsCarousel } from "@/components/community/community-recommendations-carousel";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteListLoader } from "@/components/ui/infinite-list-loader";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { flattenListPages } from "@/utils/infinite-list";

const FOLLOWING_LIMIT = 24;
const RECOMMENDED_LIMIT = 12;

const resolveCommunityError = (error: unknown) => {
  const rawMessage = getSafeApiErrorMessage(error, "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar comunidades seguidas.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar ao serviço agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar suas comunidades seguidas agora.";
};

const formatCommunityCount = (value: number) =>
  `${value.toLocaleString("pt-BR")} ${value === 1 ? "comunidade" : "comunidades"}`;

const formatNewPosts = (value: number) => {
  if (value === 0) return "Nenhum post novo hoje";

  return `${value.toLocaleString("pt-BR")} ${value === 1 ? "post novo" : "posts novos"} hoje`;
};

const formatCommunityActivity = (value: number) => {
  if (value === 0) return "Nenhum post novo";

  return `${value.toLocaleString("pt-BR")} ${value === 1 ? "post novo" : "posts novos"}`;
};

const FollowingSummary = ({
  followingCount,
  newPostsToday,
}: {
  followingCount: number;
  newPostsToday: number;
}) => (
  <div className="flex items-end justify-between gap-4">
    <div className="min-w-0">
      <h2 className="text-base font-semibold text-foreground">Minhas comunidades</h2>
      <p className="mt-0.5 text-xs font-medium text-muted">
        {formatCommunityCount(followingCount)} seguindo
      </p>
    </div>
    <p
      className={cn(
        "max-w-[11rem] shrink-0 text-right text-xs font-medium leading-4 text-muted",
        newPostsToday > 0 && "font-semibold text-primary",
      )}
    >
      {formatNewPosts(newPostsToday)}
    </p>
  </div>
);

const CommunityVisual = ({ community }: { community: Community }) => (
  <CommunityAvatar
    avatarUrl={community.avatar_url}
    className="h-16 w-16 rounded-[18px] border-[3px] border-media-foreground bg-primary-soft text-sm font-semibold text-primary shadow-lectum-soft dark:border-background"
    name={community.name}
    sizes="64px"
  />
);

const MyCommunityCard = ({ community }: { community: Community }) => (
  <li>
    <Link
      aria-label={`Abrir comunidade ${community.name}`}
      className="grid min-h-[90px] grid-cols-[64px_minmax(0,1fr)_20px] items-center gap-3 rounded-[22px] border border-border bg-surface p-3 shadow-lectum-soft transition-[border-color,background-color,transform] hover:border-primary/25 hover:bg-surface-muted active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      href={`/comunidades/${community.slug}`}
    >
      <CommunityVisual community={community} />
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-5 text-foreground">
          {community.name}
        </h3>
        <p
          className={cn(
            "mt-1 text-xs font-medium text-muted",
            (community.new_posts_count ?? 0) > 0 && "font-semibold text-primary",
          )}
        >
          {formatCommunityActivity(community.new_posts_count ?? 0)}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted" aria-hidden="true" />
    </Link>
  </li>
);

export const FollowingCommunitiesLogic = () => {
  const followingQuery = useInfiniteCommunities({ limit: FOLLOWING_LIMIT, scope: "following" });
  const recommendedQuery = useCommunities({ limit: RECOMMENDED_LIMIT, page: 1 });
  const followingCommunities = useMemo(
    () => flattenListPages(followingQuery.data?.pages),
    [followingQuery.data?.pages],
  );
  const allRecommendedCommunities = useMemo(
    () => recommendedQuery.data?.data ?? [],
    [recommendedQuery.data?.data],
  );
  const followedIds = useMemo(
    () => new Set(followingCommunities.map((community) => community.id)),
    [followingCommunities],
  );
  const recommendedCommunities = allRecommendedCommunities.filter(
    (community) => !community.following && !followedIds.has(community.id),
  );
  const followingCount =
    followingQuery.data?.pages[0]?.following_count ?? followingCommunities.length;
  const newPostsToday = followingQuery.data?.pages[0]?.new_posts_today_count ?? 0;
  const errorMessage =
    followingQuery.isError && !followingQuery.data
      ? resolveCommunityError(followingQuery.error)
      : null;
  const recommendedError = recommendedQuery.isError
    ? "Não foi possível carregar recomendações agora."
    : null;
  const isInitialLoading = followingQuery.isLoading || followingQuery.isPending;

  return (
    <PrivateTemplate
      contentClassName="bg-background px-0 py-0"
      navigationTheme="solidWhite"
      showHeader
    >
      <main className="mx-auto min-h-screen w-full max-w-[430px] px-5 py-5 sm:max-w-2xl md:py-8 lg:max-w-3xl">
        <AppPageHeader
          backHref="/app/perfil"
          backLabel="Voltar ao perfil"
          className="mb-4"
          title="Comunidades seguidas"
        />

        <div className="grid gap-7">
          {isInitialLoading ? (
            <div className="grid min-h-[45vh] place-items-center rounded-[22px] bg-surface shadow-[var(--lectum-shadow-soft)]">
              <LoadingState label="Carregando comunidades seguidas" />
            </div>
          ) : null}

          {errorMessage ? (
            <InlineAlert title="Não foi possível carregar" variant="error">
              {errorMessage}
              <Button onClick={() => followingQuery.refetch()} type="button" variant="outline">
                Tentar novamente
              </Button>
            </InlineAlert>
          ) : null}

          {!isInitialLoading && !errorMessage ? (
            <>
              <section className="grid gap-3.5">
                <FollowingSummary followingCount={followingCount} newPostsToday={newPostsToday} />
                {followingCommunities.length > 0 ? (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {followingCommunities.map((community) => (
                      <MyCommunityCard community={community} key={community.id} />
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    action={
                      <Button asChild className="rounded-full">
                        <Link href="/comunidades">
                          <Compass className="h-4 w-4" aria-hidden="true" />
                          Explorar comunidades
                        </Link>
                      </Button>
                    }
                    description="Quando você participar de comunidades, elas aparecerão aqui."
                    icon={UsersRound}
                    title="Você ainda não segue comunidades"
                  />
                )}
                <InfiniteListLoader
                  hasNextPage={followingQuery.hasNextPage}
                  isFetching={followingQuery.isFetching && !isInitialLoading}
                  isError={followingQuery.isError}
                  label="Carregando comunidades seguidas"
                  onLoadMore={followingQuery.fetchNextPage}
                  onRetry={
                    followingQuery.isFetchNextPageError
                      ? followingQuery.fetchNextPage
                      : followingQuery.refetch
                  }
                />
              </section>

              <section>
                {recommendedError ? (
                  <InlineAlert title="Recomendações indisponíveis" variant="error">
                    {recommendedError}
                  </InlineAlert>
                ) : null}

                {recommendedQuery.isLoading || recommendedQuery.isPending ? (
                  <LoadingState label="Buscando recomendações" />
                ) : null}

                {recommendedCommunities.length > 0 ? (
                  <CommunityRecommendationsCarousel communities={recommendedCommunities} />
                ) : null}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </PrivateTemplate>
  );
};
