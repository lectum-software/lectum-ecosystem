"use client";

import { CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useInfiniteCommunityFeedPosts } from "@/api/callers/community";
import type { CommunityFeedScope, CommunityPost } from "@/api/generator/types/community";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { LectumShareVideoModal } from "@/components/share/lectum-share-video-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useLectumShareTracking } from "@/hooks/use-lectum-share-tracking";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import {
  COMMUNITY_CREATE_POST_HREF,
  COMMUNITY_EXPLORE_HREF,
  COMMUNITY_FEED_SLUG,
  getCommunityFeedChip,
} from "@/utils/community";
import {
  createLectumShareLinkTarget,
  createLectumSharePostMediaTarget,
  type LectumShareChannel,
  type LectumShareVideoTarget,
} from "@/utils/lectum-share-target";
import { FeedCommunitySelect, FeedSearchMenu, FilterMenu } from "../components/feed-controls";
import { InfinitePostLoader, PostCard } from "../components/post-card";
import {
  COMMUNITY_FLOATING_CREATE_POST_CLASSNAME,
  CommunityPublishOnboarding,
} from "../components/publish-onboarding";
import { flattenCommunityPostPages, PAGE_LIMIT, resolveFeedError } from "../modules/feed-support";
import { CreateCommunityPostLogic } from "../post/new/logic";
import type { CommunityRouteLogicProps } from "./community-detail";

export const CommunityFeedLogic = ({
  suppressPublishOnboarding = false,
}: CommunityRouteLogicProps = {}) => {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const conversion = useProgressiveConversion();
  const routeSlug = typeof params.slug === "string" ? params.slug : COMMUNITY_FEED_SLUG;
  const communityFromQuery = getCommunityFeedChip(searchParams.get("community"));
  const communityFromLegacySlug =
    routeSlug !== COMMUNITY_FEED_SLUG ? getCommunityFeedChip(routeSlug) : null;
  const selectedCommunitySlug = communityFromQuery?.slug ?? communityFromLegacySlug?.slug ?? null;
  const [scope, setScope] = useState<CommunityFeedScope>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [communityMenuOpen, setCommunityMenuOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const lastScrollY = useRef(0);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const createPostHref = selectedCommunitySlug
    ? `${COMMUNITY_CREATE_POST_HREF}?community=${encodeURIComponent(selectedCommunitySlug)}`
    : COMMUNITY_CREATE_POST_HREF;
  const query = useMemo(
    () => ({
      limit: PAGE_LIMIT,
      scope,
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(selectedCommunitySlug ? { community: selectedCommunitySlug } : {}),
    }),
    [deferredSearch, scope, selectedCommunitySlug],
  );
  const feed = useInfiniteCommunityFeedPosts(query);
  const [shareVideoTarget, setShareVideoTarget] = useState<LectumShareVideoTarget | null>(null);
  const trackLectumShare = useLectumShareTracking(shareVideoTarget);
  const posts = useMemo(() => flattenCommunityPostPages(feed.data?.pages), [feed.data?.pages]);
  const errorMessage = feed.isError ? resolveFeedError(feed.error) : null;
  const firstFeedPage = feed.data?.pages[0];
  const hasNoFollowedCommunities =
    scope === "following" && (firstFeedPage?.following_count ?? 0) === 0;
  const isInitialFeedLoading = (feed.isLoading || feed.isPending) && posts.length === 0;
  const {
    fetchNextPage: fetchNextFeedPage,
    hasNextPage: hasNextFeedPage,
    isFetching: isFetchingFeed,
    isFetchingNextPage: isFetchingNextFeedPage,
  } = feed;
  const loadMoreFeedPosts = useCallback(() => {
    if (!hasNextFeedPage || isFetchingFeed || isFetchingNextFeedPage) return;

    void fetchNextFeedPage();
  }, [fetchNextFeedPage, hasNextFeedPage, isFetchingFeed, isFetchingNextFeedPage]);

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

  const handleSearchOpenChange = (open: boolean) => {
    setSearchOpen(open);
    if (open) {
      setCommunityMenuOpen(false);
      setFilterOpen(false);
    }
  };

  const handleCommunityMenuOpenChange = (open: boolean) => {
    setCommunityMenuOpen(open);
    if (open) {
      setSearchOpen(false);
      setFilterOpen(false);
    }
  };

  const handleFilterOpenChange = (open: boolean) => {
    setFilterOpen(open);
    if (open) {
      setSearchOpen(false);
      setCommunityMenuOpen(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY.current;

      if (currentScrollY < 48) {
        setHeaderHidden(false);
      } else if (Math.abs(currentScrollY - lastScrollY.current) > 8) {
        setHeaderHidden(isScrollingDown);
      }

      lastScrollY.current = currentScrollY;
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const sharePost = async (post: CommunityPost) => {
    if (typeof window === "undefined") return;

    const socialTarget = createLectumSharePostMediaTarget(post);
    setShareVideoTarget(socialTarget ?? createLectumShareLinkTarget(post));
  };

  const handleShareVideoShared = (channel: LectumShareChannel) => {
    if (!shareVideoTarget) return;

    trackLectumShare(channel);
    setShareFeedback(shareVideoTarget.replyId ?? shareVideoTarget.postId);
    window.setTimeout(() => setShareFeedback(null), 2400);
  };

  return (
    <PrivateTemplate
      allowAnonymous
      autoHideNavigation
      contentClassName="lectum-mobile-main-scrollbar-hidden bg-background"
      navigationTheme="solidWhite"
      showHeader
    >
      <section className="mx-auto grid w-full max-w-[430px] gap-4 sm:max-w-2xl lg:max-w-[760px]">
        <header
          className={cn(
            "sticky top-0 z-30 -mx-5 px-5 py-2.5 transition-[transform,opacity] duration-300 ease-out",
            headerHidden
              ? "pointer-events-none -translate-y-[calc(100%+8px)] opacity-0"
              : "translate-y-0 opacity-100",
          )}
        >
          <div className="mx-auto flex max-w-[430px] items-center gap-2 p-1.5 sm:max-w-2xl lg:max-w-[760px]">
            <FeedSearchMenu
              onOpenChange={handleSearchOpenChange}
              onSearchChange={setSearch}
              open={searchOpen}
              search={search}
            />

            <FeedCommunitySelect
              activeSlug={selectedCommunitySlug}
              onOpenChange={handleCommunityMenuOpenChange}
              open={communityMenuOpen}
            />

            <FilterMenu
              onScopeChange={setScope}
              open={filterOpen}
              scope={scope}
              setOpen={handleFilterOpenChange}
            />
          </div>
        </header>

        {isInitialFeedLoading ? (
          <div className="grid min-h-[45vh] place-items-center rounded-[22px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
            <LoadingState label="Carregando feed da comunidade" />
          </div>
        ) : null}

        {errorMessage ? (
          <InlineAlert title="Feed indisponível" variant="error">
            {errorMessage}
          </InlineAlert>
        ) : null}

        {shareFeedback ? (
          <InlineAlert title="Link preparado" variant="success">
            Link do post copiado ou enviado para compartilhamento.
          </InlineAlert>
        ) : null}

        {!isInitialFeedLoading && !errorMessage && posts.length === 0 ? (
          <EmptyState
            action={
              hasNoFollowedCommunities ? (
                <Button asChild variant="outline">
                  <Link href={COMMUNITY_EXPLORE_HREF}>Encontrar comunidades</Link>
                </Button>
              ) : scope === "following" ? null : (
                <Button asChild variant="outline">
                  <Link href={COMMUNITY_EXPLORE_HREF}>Explorar comunidades</Link>
                </Button>
              )
            }
            description={
              hasNoFollowedCommunities
                ? "Siga suas comunidades favoritas para acompanhar conversas, receber apoio e descobrir conteúdos que contribuam para o seu bem-estar."
                : scope === "following"
                  ? "As comunidades que você segue ainda não possuem publicações para este filtro."
                  : "Nenhum destaque publicado para este recorte do feed. Apenas conteúdos publicados aparecem aqui."
            }
            icon={CalendarDays}
            title={
              hasNoFollowedCommunities
                ? "Você ainda não segue nenhuma comunidade"
                : scope === "following"
                  ? "Nenhuma publicação encontrada"
                  : "Nenhum post publicado"
            }
          />
        ) : null}

        {posts.length > 0 ? (
          <div className="grid gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} onShare={sharePost} post={post} />
            ))}
          </div>
        ) : null}

        {feed.isFetching && !feed.isFetchingNextPage && !isInitialFeedLoading ? (
          <LoadingState label="Atualizando feed" />
        ) : null}

        <InfinitePostLoader
          hasNextPage={Boolean(hasNextFeedPage)}
          isLoading={isFetchingNextFeedPage}
          label="Carregando mais posts"
          onLoadMore={loadMoreFeedPosts}
        />
      </section>

      <Link
        aria-label="Criar publicação na comunidade"
        className={COMMUNITY_FLOATING_CREATE_POST_CLASSNAME}
        href={createPostHref}
        onClick={(event) => handleCreatePostClick(event, createPostHref)}
        scroll={false}
        title="Criar publicação"
      >
        <Plus
          className="h-8 w-8 stroke-[2.4] transition group-hover:scale-105"
          aria-hidden="true"
        />
        <span className="sr-only">Criar publicação</span>
      </Link>

      {!suppressPublishOnboarding ? (
        <CommunityPublishOnboarding
          createPostHref={createPostHref}
          onCreatePostClick={handleCreatePostClick}
          variant="floating"
        />
      ) : null}

      <LectumShareVideoModal
        onClose={() => setShareVideoTarget(null)}
        onShared={handleShareVideoShared}
        target={shareVideoTarget}
      />

      {createPostModalOpen ? (
        <CreateCommunityPostLogic
          asModalSlot
          onCloseComplete={() => setCreatePostModalOpen(false)}
        />
      ) : null}

      <style>{`
        @keyframes lectum-desktop-create-float {
          0%,
          100% {
            transform: translateY(0);
            box-shadow: 0 18px 36px
              color-mix(in srgb, var(--lectum-primary) 28%, transparent);
          }
          50% {
            transform: translateY(-5px);
            box-shadow: 0 22px 44px
              color-mix(in srgb, var(--lectum-primary) 34%, transparent);
          }
        }
      `}</style>
    </PrivateTemplate>
  );
};
