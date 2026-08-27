"use client";

import { MessageCircle, Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useCommunityDetail,
  useFollowCommunity,
  useInfiniteCommunityPosts,
  useUnfollowCommunity,
} from "@/api/callers/community";
import type { CommunityPost } from "@/api/generator/types/community";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useLectumShareDialog } from "@/hooks/use-lectum-share-dialog";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import {
  createLectumShareLinkTarget,
  createLectumSharePostMediaTarget,
} from "@/utils/lectum-share-target";
import { navigateBackWithFallback } from "@/utils/navigation-history";
import {
  CommunityContextSearchHeader,
  CommunityDetailSkeleton,
  CommunityHeader,
  CommunityPostSortChips,
  CommunityRulesCard,
} from "../components/community-header";
import { InfinitePostLoader, PostCard } from "../components/post-card";
import {
  COMMUNITY_FLOATING_CREATE_POST_CLASSNAME,
  CommunityPublishOnboarding,
} from "../components/publish-onboarding";
import { useCommunityFeedScrollRestoration } from "../hooks/use-community-feed-scroll-restoration";
import {
  type CommunityPostSelectedPeriods,
  type CommunityPostSort,
  communityCreatePostHref,
  communityDetailHref,
  flattenCommunityPostPages,
  PAGE_LIMIT,
  resolveCommunityDetailError,
  resolveFeedError,
  sortCommunityPosts,
} from "../modules/feed-support";
import { CreateCommunityPostLogic } from "../post/new/logic";

export type CommunityRouteLogicProps = {
  suppressPublishOnboarding?: boolean;
};

export const CommunityDetailLogic = ({
  slug,
  suppressPublishOnboarding = false,
}: { slug: string } & CommunityRouteLogicProps) => {
  const router = useRouter();
  const conversion = useProgressiveConversion();
  const [sort, setSort] = useState<CommunityPostSort>("featured");
  const [sortPeriods, setSortPeriods] = useState<CommunityPostSelectedPeriods>({});
  const [communitySearchOpen, setCommunitySearchOpen] = useState(false);
  const [communitySearch, setCommunitySearch] = useState("");
  const deferredCommunitySearch = useDeferredValue(communitySearch.trim());
  const communitySearchInputRef = useRef<HTMLInputElement>(null);
  const communitySearchReturnStateRef = useRef<{ scrollY: number } | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [followingOverride, setFollowingOverride] = useState<boolean | null>(null);
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const detail = useCommunityDetail(slug);
  const postsQueryParams = useMemo(
    () => ({
      limit: PAGE_LIMIT,
      sort,
      ...(sort === "commented" && sortPeriods.commented ? { period: sortPeriods.commented } : {}),
      ...(sort === "voted" && sortPeriods.voted ? { period: sortPeriods.voted } : {}),
      ...(communitySearchOpen && deferredCommunitySearch
        ? { search: deferredCommunitySearch }
        : {}),
    }),
    [communitySearchOpen, deferredCommunitySearch, sort, sortPeriods.commented, sortPeriods.voted],
  );
  const postsQuery = useInfiniteCommunityPosts(slug, postsQueryParams, Boolean(detail.data));
  const followMutation = useFollowCommunity();
  const unfollowMutation = useUnfollowCommunity();
  const { shareDestinationDialog, shareLectumTarget } = useLectumShareDialog({
    onShared: (target) => {
      setShareFeedback(target.replyId ?? target.postId);
      window.setTimeout(() => setShareFeedback(null), 2400);
    },
  });
  const community = detail.data?.community;
  const loadedPosts = useMemo(
    () => flattenCommunityPostPages(postsQuery.data?.pages),
    [postsQuery.data?.pages],
  );
  const posts = useMemo(
    () => sortCommunityPosts(loadedPosts, sort, sortPeriods),
    [loadedPosts, sort, sortPeriods],
  );
  const detailError = detail.isError ? resolveCommunityDetailError(detail.error) : null;
  const postsError = postsQuery.isError ? resolveFeedError(postsQuery.error) : null;
  const membershipPending = followMutation.isPending || unfollowMutation.isPending;
  const following = followingOverride ?? Boolean(community?.following);
  const hasCommunitySearchTerm = communitySearchOpen && deferredCommunitySearch.length > 0;
  const isInitialPostsLoading =
    (postsQuery.isLoading || postsQuery.isPending) && posts.length === 0;
  const {
    fetchNextPage: fetchNextCommunityPostsPage,
    hasNextPage: hasNextCommunityPostsPage,
    isFetching: isFetchingCommunityPosts,
    isFetchingNextPage: isFetchingNextCommunityPostsPage,
  } = postsQuery;
  const loadMoreCommunityPosts = useCallback(() => {
    if (
      !hasNextCommunityPostsPage ||
      isFetchingCommunityPosts ||
      isFetchingNextCommunityPostsPage
    ) {
      return;
    }

    void fetchNextCommunityPostsPage();
  }, [
    fetchNextCommunityPostsPage,
    hasNextCommunityPostsPage,
    isFetchingCommunityPosts,
    isFetchingNextCommunityPostsPage,
  ]);
  useCommunityFeedScrollRestoration({
    canLoadMore: Boolean(hasNextCommunityPostsPage),
    isLoadingMore: isFetchingNextCommunityPostsPage,
    itemCount: posts.length,
    onLoadMore: loadMoreCommunityPosts,
    ready: Boolean(community) && !isInitialPostsLoading && !postsError,
  });

  useEffect(() => {
    if (!communitySearchOpen) return;

    communitySearchInputRef.current?.focus();
  }, [communitySearchOpen]);

  const openCommunitySearch = () => {
    communitySearchReturnStateRef.current = {
      scrollY: typeof window === "undefined" ? 0 : window.scrollY,
    };
    setCommunitySearch("");
    setCommunitySearchOpen(true);
  };

  const closeCommunitySearch = () => {
    const returnState = communitySearchReturnStateRef.current;

    setCommunitySearch("");
    setCommunitySearchOpen(false);

    if (returnState && typeof window !== "undefined") {
      const { scrollY } = returnState;

      window.requestAnimationFrame(() => {
        window.scrollTo({ behavior: "auto", top: scrollY });
        window.setTimeout(() => window.scrollTo({ behavior: "auto", top: scrollY }), 0);
      });
    }

    communitySearchReturnStateRef.current = null;
  };

  const sharePost = async (post: CommunityPost) => {
    if (typeof window === "undefined") return;

    const socialTarget = createLectumSharePostMediaTarget(post);
    await shareLectumTarget(socialTarget ?? createLectumShareLinkTarget(post));
  };

  const shareCommunity = async () => {
    if (!community || typeof window === "undefined") return;

    const url = `${window.location.origin}${communityDetailHref(community.slug)}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: community.name, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareFeedback(community.id);
      window.setTimeout(() => setShareFeedback(null), 2400);
    } catch {
      setShareFeedback(null);
    }
  };

  const toggleFollow = useCallback(() => {
    if (!community || membershipPending) return;

    if (!conversion.isAuthenticated) {
      conversion.requestConversion("trigger_comunidade", {
        intent: {
          payload: {
            communitySlug: community.slug,
          },
          type: "follow_community",
        },
      });
      return;
    }

    const previousFollowing = following;
    const nextFollowing = !previousFollowing;
    setFollowingOverride(nextFollowing);

    const mutation = previousFollowing ? unfollowMutation : followMutation;
    mutation.mutate(community.slug, {
      onError: () => {
        setFollowingOverride(previousFollowing);
      },
      onSuccess: (data) => {
        setFollowingOverride(data.following);
      },
    });
  }, [community, conversion, followMutation, following, membershipPending, unfollowMutation]);

  useEffect(() => {
    if (!conversion.isAuthenticated || !community || following || membershipPending) return;

    const intent = conversion.consumePendingIntent(
      (candidate) =>
        candidate.type === "follow_community" &&
        String(candidate.payload?.communitySlug ?? "") === community.slug,
    );

    if (!intent) return;

    window.setTimeout(toggleFollow, 0);
  }, [community, conversion, following, membershipPending, toggleFollow]);

  const handleCreatePostClick = (event: ReactMouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();

    if (conversion.isAuthenticated) {
      setCreatePostModalOpen(true);
      return;
    }

    conversion.requestConversion("trigger_comentar", {
      intent: {
        returnTo: href,
        type: "create_post",
      },
    });
  };

  return (
    <PrivateTemplate
      allowAnonymous
      autoHideNavigation
      contentClassName="lectum-mobile-main-scrollbar-hidden !pt-0 bg-background sm:!pt-0"
      navigationTheme="solidWhite"
      showHeader
    >
      <section className="mx-auto grid w-full max-w-[430px] gap-4 sm:max-w-2xl lg:max-w-[760px]">
        {detail.isLoading || detail.isPending ? <CommunityDetailSkeleton /> : null}

        {detailError ? (
          <EmptyState
            action={
              <Button asChild variant="outline">
                <Link href={DEFAULT_COMMUNITY_FEED_HREF}>Voltar ao feed</Link>
              </Button>
            }
            description={detailError}
            icon={UsersRound}
            title="Comunidade indisponível"
          />
        ) : null}

        {community ? (
          <>
            {communitySearchOpen ? (
              <CommunityContextSearchHeader
                communityName={community.name}
                inputRef={communitySearchInputRef}
                onBack={closeCommunitySearch}
                onSearchChange={setCommunitySearch}
                search={communitySearch}
              />
            ) : (
              <CommunityHeader
                community={community}
                following={following}
                membershipPending={membershipPending}
                onBack={() => navigateBackWithFallback(router)}
                onSearch={openCommunitySearch}
                onShare={shareCommunity}
                onToggleFollow={toggleFollow}
              />
            )}

            {communitySearchOpen ? null : (
              <CommunityRulesCard key={community.slug} rules={community.rules} />
            )}

            {shareFeedback ? (
              <InlineAlert title="Link preparado" variant="success">
                Link copiado ou enviado para compartilhamento.
              </InlineAlert>
            ) : null}

            {followMutation.isError || unfollowMutation.isError ? (
              <InlineAlert title="Não foi possível atualizar participação" variant="error">
                Tente novamente em alguns instantes.
              </InlineAlert>
            ) : null}

            <div className="grid gap-3">
              <CommunityPostSortChips
                onChange={setSort}
                onPeriodChange={(value, period) => {
                  setSort(value);
                  setSortPeriods((current) => ({ ...current, [value]: period }));
                }}
                periods={sortPeriods}
                value={sort}
              />
            </div>

            {isInitialPostsLoading ? (
              <div className="grid min-h-[220px] place-items-center rounded-[22px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
                <LoadingState label="Carregando posts da comunidade" />
              </div>
            ) : null}

            {postsError ? (
              <InlineAlert title="Posts indisponíveis" variant="error">
                {postsError}
              </InlineAlert>
            ) : null}

            {!isInitialPostsLoading && !postsError && posts.length === 0 ? (
              <EmptyState
                action={
                  hasCommunitySearchTerm ? (
                    <Button onClick={() => setCommunitySearch("")} type="button" variant="outline">
                      Limpar busca
                    </Button>
                  ) : (
                    <Button asChild>
                      <Link
                        href={communityCreatePostHref(community.slug)}
                        onClick={(event) =>
                          handleCreatePostClick(event, communityCreatePostHref(community.slug))
                        }
                        scroll={false}
                      >
                        Criar primeiro post
                      </Link>
                    </Button>
                  )
                }
                description={
                  hasCommunitySearchTerm
                    ? "Nenhum post ou comentário publicado nesta comunidade corresponde ao termo buscado."
                    : "Ainda não há publicações nesta comunidade. Seja a primeira pessoa a iniciar uma conversa."
                }
                icon={MessageCircle}
                title={
                  hasCommunitySearchTerm
                    ? "Nenhum resultado nesta comunidade"
                    : "Comunidade sem posts"
                }
              />
            ) : null}

            {posts.length > 0 ? (
              <div className="grid gap-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    onShare={sharePost}
                    post={post}
                    showCommunityHeader={false}
                  />
                ))}
              </div>
            ) : null}

            {postsQuery.isFetching && !postsQuery.isFetchingNextPage && !isInitialPostsLoading ? (
              <LoadingState label="Atualizando posts" />
            ) : null}

            <InfinitePostLoader
              hasNextPage={Boolean(hasNextCommunityPostsPage)}
              isLoading={isFetchingNextCommunityPostsPage}
              label="Carregando mais posts"
              onLoadMore={loadMoreCommunityPosts}
            />
          </>
        ) : null}
      </section>

      {community ? (
        <Link
          aria-label="Criar publicação nesta comunidade"
          className={COMMUNITY_FLOATING_CREATE_POST_CLASSNAME}
          href={communityCreatePostHref(community.slug)}
          scroll={false}
          onClick={(event) => handleCreatePostClick(event, communityCreatePostHref(community.slug))}
          title="Criar publicação"
        >
          <Plus
            className="h-8 w-8 stroke-[2.4] transition group-hover:scale-105"
            aria-hidden="true"
          />
          <span className="sr-only">Criar publicação</span>
        </Link>
      ) : null}

      {community && !suppressPublishOnboarding ? (
        <CommunityPublishOnboarding
          createPostHref={communityCreatePostHref(community.slug)}
          onCreatePostClick={handleCreatePostClick}
          variant="floating"
        />
      ) : null}

      {createPostModalOpen ? (
        <CreateCommunityPostLogic
          asModalSlot
          onCloseComplete={() => setCreatePostModalOpen(false)}
        />
      ) : null}

      {shareDestinationDialog}
    </PrivateTemplate>
  );
};
