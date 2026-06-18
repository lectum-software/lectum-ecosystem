"use client";

import { ChevronRight, Compass, UsersRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCommunities, useFollowCommunity } from "@/api/callers/community";
import type { Community } from "@/api/generator/types/community";
import { CommunityFollowButton } from "@/components/community/community-follow-button";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

const FOLLOWING_LIMIT = 24;
const RECOMMENDED_LIMIT = 12;

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const resolveCommunityError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar comunidades seguidas.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar suas comunidades seguidas agora.";
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const formatCommunityCount = (value: number) =>
  `${value.toLocaleString("pt-BR")} ${value === 1 ? "Comunidade" : "Comunidades"}`;

const formatNewPosts = (value: number) => {
  if (value === 0) return "0 Hoje";

  return `${value.toLocaleString("pt-BR")} Hoje`;
};

const formatNewBadge = (value: number) => {
  if (value === 0) return "Sem novos";

  return `${value.toLocaleString("pt-BR")} ${value === 1 ? "Novo" : "Novos"}`;
};

const formatMembers = (value: number) => {
  if (value === 1) return "1 membro";

  if (value >= 1000) {
    return `${new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 1,
      notation: "compact",
    }).format(value)} membros`;
  }

  return `${value.toLocaleString("pt-BR")} membros`;
};

const SectionTitle = ({ children }: { children: string }) => (
  <h2 className="text-sm font-black uppercase tracking-[0.06em] text-[#738198]">{children}</h2>
);

const ActivityCard = ({
  followingCount,
  newPostsToday,
}: {
  followingCount: number;
  newPostsToday: number;
}) => (
  <section className="grid gap-5">
    <SectionTitle>Minha atividade</SectionTitle>
    <div className="grid grid-cols-[1fr_auto_1fr] items-center rounded-[18px] border border-[#E0E7F0] bg-white px-4 py-5 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
      <div className="grid justify-items-center gap-1 text-center">
        <p className="text-sm font-semibold text-[#738198]">Seguindo</p>
        <strong className="text-xl font-black leading-none text-[#131A2A]">
          {formatCommunityCount(followingCount)}
        </strong>
      </div>
      <span className="h-16 w-px bg-[#D9E1EC]" aria-hidden="true" />
      <div className="grid justify-items-center gap-1 text-center">
        <p className="text-sm font-semibold text-[#738198]">Novos Posts</p>
        <strong className="text-xl font-black leading-none text-primary">
          {formatNewPosts(newPostsToday)}
        </strong>
      </div>
    </div>
  </section>
);

const CommunityVisual = ({
  community,
  size = "md",
}: {
  community: Community;
  size?: "sm" | "md" | "lg";
}) => {
  const variants = [
    "from-[#BFE7FF] via-[#F6FBFF] to-[#84D7D7] text-[#1A7FCB]",
    "from-[#F5F1FF] via-[#DCEBFF] to-[#A6B9FF] text-[#4263EB]",
    "from-[#E8F8EF] via-[#F6FBFF] to-[#B7E4C7] text-[#168A4A]",
    "from-[#FFF0D8] via-[#F6FBFF] to-[#FFD6A5] text-[#B7791F]",
  ];
  const variant =
    variants[Math.abs(community.slug.length + community.name.length) % variants.length];

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-[18px] bg-gradient-to-br font-black shadow-inner",
        variant,
        size === "lg" && "h-24 w-24 text-xl",
        size === "md" && "h-20 w-20 text-lg",
        size === "sm" && "h-14 w-14 text-sm",
      )}
    >
      <span className="absolute -left-4 top-2 h-12 w-12 rounded-full bg-white/50 blur-xl" />
      <span className="absolute -right-4 bottom-0 h-16 w-16 rounded-full bg-black/10 blur-2xl" />
      <span className="relative z-10">{getInitials(community.name)}</span>
    </span>
  );
};

const FeaturedCommunity = ({ community }: { community: Community }) => (
  <section className="grid gap-5">
    <SectionTitle>Em destaque</SectionTitle>
    <Link
      className="group relative min-h-[168px] overflow-hidden rounded-[22px] bg-[#101A22] p-6 text-white shadow-[0_14px_30px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(15,23,42,0.16)]"
      href={`/app/community/${community.slug}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_28%,rgba(255,255,255,0.28),transparent_18%),linear-gradient(180deg,rgba(120,143,150,0.70)_0%,rgba(24,37,43,0.86)_52%,rgba(6,12,18,0.98)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(ellipse_at_center,rgba(44,67,76,0.95),rgba(5,11,16,0.92)_62%,rgba(0,0,0,0.96))]" />
      <div className="relative z-10 flex min-h-[120px] flex-col justify-end gap-3">
        <span className="w-fit rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-[0.04em]">
          {community.new_posts_count ? "Novidade" : "Seguindo"}
        </span>
        <h3 className="line-clamp-2 text-[1.7rem] font-black leading-tight tracking-[-0.04em]">
          {community.name}
        </h3>
        <span className="inline-flex h-11 w-fit items-center rounded-full bg-white px-5 text-base font-black text-[#131A2A] transition group-hover:translate-x-1">
          Explorar
        </span>
      </div>
    </Link>
  </section>
);

const MyCommunityCard = ({ community }: { community: Community }) => (
  <Link
    className="grid min-h-[158px] justify-items-center gap-3 rounded-[18px] bg-white px-4 py-6 text-center shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]"
    href={`/app/community/${community.slug}`}
  >
    <CommunityVisual community={community} />
    <div className="grid gap-3">
      <h3 className="line-clamp-2 text-lg font-black leading-tight text-[#131A2A]">
        {community.name}
      </h3>
      <span className="mx-auto rounded-full bg-[#EAF4FF] px-4 py-1.5 text-sm font-black text-primary">
        {formatNewBadge(community.new_posts_count ?? 0)}
      </span>
    </div>
  </Link>
);

const RecommendedCard = ({
  community,
  disabled,
  isPending,
  onFollow,
}: {
  community: Community;
  disabled?: boolean;
  isPending?: boolean;
  onFollow: (community: Community) => void;
}) => (
  <article className="grid w-[178px] shrink-0 justify-items-center gap-4 rounded-[18px] bg-white p-5 text-center shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
    <CommunityVisual community={community} size="sm" />
    <div className="grid gap-1">
      <h3 className="line-clamp-2 text-base font-black leading-tight text-[#131A2A]">
        {community.name}
      </h3>
      <p className="text-sm font-semibold text-[#738198]">
        {formatMembers(community.members_count)}
      </p>
    </div>
    <CommunityFollowButton
      aria-label={`Seguir ${community.name}`}
      className="w-full"
      disabled={disabled}
      following={false}
      onClick={() => onFollow(community)}
      pending={isPending}
      type="button"
    />
  </article>
);

export const FollowingCommunitiesLogic = () => {
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const followingQuery = useCommunities({ limit: FOLLOWING_LIMIT, page: 1, scope: "following" });
  const recommendedQuery = useCommunities({ limit: RECOMMENDED_LIMIT, page: 1 });
  const followMutation = useFollowCommunity({
    onSuccess: () => setPendingSlug(null),
    onError: () => setPendingSlug(null),
  });
  const followingCommunities = useMemo(
    () => followingQuery.data?.data ?? [],
    [followingQuery.data?.data],
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
  const featuredCommunity = [...followingCommunities].sort(
    (a, b) => (b.new_posts_count ?? 0) - (a.new_posts_count ?? 0),
  )[0];
  const followingCount = followingQuery.data?.following_count ?? followingCommunities.length;
  const newPostsToday = followingQuery.data?.new_posts_today_count ?? 0;
  const errorMessage = followingQuery.isError ? resolveCommunityError(followingQuery.error) : null;
  const recommendedError = recommendedQuery.isError
    ? "Não foi possível carregar recomendações agora."
    : null;
  const isInitialLoading = followingQuery.isLoading || followingQuery.isPending;

  const handleFollow = (community: Community) => {
    if (followMutation.isPending) return;

    setPendingSlug(community.slug);
    followMutation.mutate(community.slug);
  };

  return (
    <PrivateTemplate
      contentClassName="bg-[#F4F6F8] px-0 py-0"
      navigationTheme="solidWhite"
      showHeader
    >
      <main className="mx-auto min-h-screen w-full max-w-[430px] px-5 py-5 sm:max-w-2xl md:py-8 lg:max-w-3xl">
        <AppPageHeader
          backHref="/app/profile"
          backLabel="Voltar ao perfil"
          className="mb-4"
          title="Comunidades seguidas"
        />

        <div className="grid gap-8">
          {isInitialLoading ? (
            <div className="grid min-h-[45vh] place-items-center rounded-[22px] bg-white shadow-[var(--lectum-shadow-soft)]">
              <LoadingState label="Carregando comunidades seguidas" />
            </div>
          ) : null}

          {errorMessage ? (
            <InlineAlert title="Não foi possível carregar" variant="error">
              {errorMessage}
            </InlineAlert>
          ) : null}

          {!isInitialLoading && !errorMessage ? (
            <>
              <ActivityCard followingCount={followingCount} newPostsToday={newPostsToday} />

              {featuredCommunity ? <FeaturedCommunity community={featuredCommunity} /> : null}

              <section className="grid gap-5">
                <SectionTitle>Minhas comunidades</SectionTitle>
                {followingCommunities.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {followingCommunities.map((community) => (
                      <MyCommunityCard community={community} key={community.id} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    action={
                      <Button asChild className="rounded-full">
                        <Link href="/app/community">
                          <Compass className="h-4 w-4" aria-hidden="true" />
                          Explorar comunidades
                        </Link>
                      </Button>
                    }
                    description="Quando você participar de comunidades reais, elas aparecerão aqui."
                    icon={UsersRound}
                    title="Você ainda não segue comunidades"
                  />
                )}
              </section>

              <section className="grid gap-5">
                <div className="flex items-center justify-between gap-3">
                  <SectionTitle>Recomendados para você</SectionTitle>
                  <Link
                    className="inline-flex items-center gap-1 text-xs font-black text-primary"
                    href="/app/community"
                  >
                    Ver todos
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>

                {recommendedError ? (
                  <InlineAlert title="Recomendações indisponíveis" variant="error">
                    {recommendedError}
                  </InlineAlert>
                ) : null}

                {recommendedQuery.isLoading || recommendedQuery.isPending ? (
                  <LoadingState label="Buscando recomendações" />
                ) : null}

                {recommendedCommunities.length > 0 ? (
                  <div className="-mx-5 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
                    <div className="flex min-w-max gap-4">
                      {recommendedCommunities.map((community) => (
                        <RecommendedCard
                          community={community}
                          disabled={followMutation.isPending}
                          isPending={pendingSlug === community.slug && followMutation.isPending}
                          key={community.id}
                          onFollow={handleFollow}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </PrivateTemplate>
  );
};
