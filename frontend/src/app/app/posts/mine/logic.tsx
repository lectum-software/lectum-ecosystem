"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useInfiniteMyPosts, useMyPosts } from "@/api/callers/posts";
import type { PostListPost, UserPostsType } from "@/api/generator/types/posts";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { PostOwnerActionMenu } from "@/components/community/post-owner-action-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { useLectumShareDialog } from "@/hooks/use-lectum-share-dialog";
import { useLectumShareDownloadDialog } from "@/hooks/use-lectum-share-download-dialog";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import {
  createLectumShareLinkTarget,
  createLectumSharePostMediaTarget,
  createLectumSharePostVideoDownloadTarget,
  createLectumShareVideoDownloadTarget,
  createLectumShareVideoTarget,
} from "@/utils/lectum-share-target";
import { FilterTabs, MyPostsHeader, ProfessionalAnsweredBadge } from "./components/header";
import { InfiniteMyPostsLoader } from "./components/infinite-loader";

import { ReplyItemCard } from "./components/reply-item-card";
import {
  type FilterTabCounts,
  flattenUserPostPages,
  focusedReplyHref,
  getInteractionCopy,
  PAGE_LIMIT,
  resolvePostsError,
} from "./modules/support";

export const MyPostsLogic = () => {
  const sessionUser = useAppSelector((state) => state.user);
  const [type, setType] = useState<UserPostsType>("posts");
  const [shareFeedback, setShareFeedback] = useState<"interaction" | "post" | null>(null);
  const query = useMemo(() => ({ limit: PAGE_LIMIT, type }), [type]);
  const postsCountQueryParams = useMemo(() => ({ limit: 1, page: 1, type: "posts" as const }), []);
  const repliesCountQueryParams = useMemo(
    () => ({ limit: 1, page: 1, type: "replies" as const }),
    [],
  );
  const postsQuery = useInfiniteMyPosts(query);
  const { shareDestinationDialog, shareLectumTarget } = useLectumShareDialog({
    onShared: (target) => {
      setShareFeedback(target.replyId ? "interaction" : "post");
      window.setTimeout(() => setShareFeedback(null), 2400);
    },
  });
  const { lectumDownloadDialog, openLectumDownloadDialog } = useLectumShareDownloadDialog();
  const { fetchNextPage } = postsQuery;
  const postsCountQuery = useMyPosts(postsCountQueryParams, type !== "posts");
  const repliesCountQuery = useMyPosts(repliesCountQueryParams, type !== "replies");
  const items = useMemo(
    () => flattenUserPostPages(postsQuery.data?.pages),
    [postsQuery.data?.pages],
  );
  const firstPage = postsQuery.data?.pages[0];
  const errorMessage = postsQuery.isError ? resolvePostsError(postsQuery.error) : null;
  const isPsychologist = sessionUser?.role === "psicologo";
  const currentPsychologistUserId = isPsychologist ? sessionUser?.id : null;
  const interactionCopy = getInteractionCopy(isPsychologist);
  const tabCounts = useMemo<FilterTabCounts>(
    () => ({
      posts:
        type === "posts"
          ? (firstPage?.count ?? postsCountQuery.data?.count)
          : postsCountQuery.data?.count,
      replies:
        type === "replies"
          ? (firstPage?.count ?? repliesCountQuery.data?.count)
          : repliesCountQuery.data?.count,
    }),
    [firstPage?.count, postsCountQuery.data?.count, repliesCountQuery.data?.count, type],
  );

  const sharePost = async (post: PostListPost, replyId?: string) => {
    if (typeof window === "undefined") return;

    const replyTarget = replyId
      ? items.find((item) => item.reply?.id === replyId && item.post.id === post.id)?.reply
      : null;
    const socialTarget = replyTarget
      ? createLectumShareVideoTarget(post, replyTarget, {
          parentContent: replyTarget.parent_content ?? null,
        })
      : createLectumSharePostMediaTarget(post);

    if (socialTarget) {
      await shareLectumTarget(socialTarget);
      return;
    }

    const relativeUrl = replyId
      ? focusedReplyHref(post, replyId)
      : `/comunidades/${post.community.slug}/publicacao/${post.id}`;
    await shareLectumTarget(
      createLectumShareLinkTarget(post, {
        relativeUrl,
        replyId: replyId ?? null,
        title: replyId ? `${interactionCopy.singularTitle} na Lectum` : post.title,
      }),
    );
  };

  const openSocialVideoPreview = useCallback(
    (post: PostListPost, replyId?: string | null) => {
      if (typeof window === "undefined") return;
      if (!currentPsychologistUserId) return;

      if (!replyId) {
        if (post.author.id !== currentPsychologistUserId) return;

        const socialTarget = createLectumSharePostVideoDownloadTarget(post);
        if (socialTarget) openLectumDownloadDialog(socialTarget);
        return;
      }

      const replyTarget = items.find(
        (item) => item.reply?.id === replyId && item.post.id === post.id,
      )?.reply;

      if (!replyTarget || replyTarget.author.id !== currentPsychologistUserId) return;

      const socialTarget = createLectumShareVideoDownloadTarget(post, replyTarget, {
        parentContent: replyTarget.parent_content ?? null,
      });

      if (!socialTarget) return;

      openLectumDownloadDialog(socialTarget);
    },
    [currentPsychologistUserId, items, openLectumDownloadDialog],
  );

  const handleFilterChange = (value: UserPostsType) => {
    setType(value);
  };

  const handlePostDeleted = () => {
    void postsQuery.refetch();
  };

  const handleReplyChanged = () => {
    void postsQuery.refetch();
  };

  const loadMoreItems = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  return (
    <PrivateTemplate
      contentClassName="bg-background px-0 py-0"
      desktopSidebarDefaultCollapsed
      showMobileNavigation={false}
    >
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-background px-5 py-5 sm:max-w-xl md:py-8 lg:max-w-3xl">
        <MyPostsHeader interactionCopy={interactionCopy} />

        <div className="grid gap-4 pt-4">
          <FilterTabs
            counts={tabCounts}
            disabled={postsQuery.isFetching}
            interactionCopy={interactionCopy}
            onChange={handleFilterChange}
            value={type}
          />

          {postsQuery.isLoading || postsQuery.isPending ? (
            <div className="grid min-h-[45vh] place-items-center rounded-[22px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
              <LoadingState
                label={type === "posts" ? "Carregando seus posts" : interactionCopy.loadingLabel}
              />
            </div>
          ) : null}

          {errorMessage ? (
            <InlineAlert title="Não foi possível carregar" variant="error">
              {errorMessage}
            </InlineAlert>
          ) : null}

          {shareFeedback ? (
            <InlineAlert title="Link preparado" variant="success">
              Link {shareFeedback === "interaction" ? interactionCopy.shareLinkSubject : "do post"}{" "}
              copiado ou enviado para compartilhamento.
            </InlineAlert>
          ) : null}

          {!postsQuery.isLoading && !postsQuery.isPending && !errorMessage && items.length === 0 ? (
            <EmptyState
              action={
                <Button asChild className="rounded-full px-5">
                  <Link href={DEFAULT_COMMUNITY_FEED_HREF}>
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    Explorar feed
                  </Link>
                </Button>
              }
              className="border-solid px-6 py-12 shadow-[var(--lectum-shadow-soft)]"
              description={
                type === "posts"
                  ? "Quando você publicar nas comunidades, seus posts aparecerão aqui."
                  : interactionCopy.emptyDescription
              }
              icon={FileText}
              title={type === "posts" ? "Nenhum post seu por enquanto" : interactionCopy.emptyTitle}
            />
          ) : null}

          {items.length > 0 ? (
            <div className="grid gap-4">
              {items.map((item) =>
                item.type === "reply" ? (
                  <ReplyItemCard
                    currentUserId={sessionUser?.id ?? null}
                    interactionCopy={interactionCopy}
                    item={item}
                    key={item.id}
                    onChanged={handleReplyChanged}
                    onDownloadVideo={openSocialVideoPreview}
                    onShare={sharePost}
                    showProfessionalAnsweredBadge={!isPsychologist}
                  />
                ) : (
                  <CommunityPostCard
                    actionBarShowUpvoteText={false}
                    actionBarVoteLabel="Marcar post como útil"
                    actionBarVotePresentation="inline"
                    communityContextTone="muted"
                    communityHeaderIncludesTime
                    desktopPlainLinks
                    headerExtra={
                      <div className="flex shrink-0 items-center gap-2">
                        {!isPsychologist && item.post.highlighted_professional_reply ? (
                          <ProfessionalAnsweredBadge className="hidden sm:inline-flex" />
                        ) : null}
                        <PostOwnerActionMenu
                          className="-mr-1"
                          onDeleted={handlePostDeleted}
                          post={item.post}
                        />
                      </div>
                    }
                    hoverTone="neutral"
                    interactiveActions
                    key={item.id}
                    onOpenSocialVideoPreview={openSocialVideoPreview}
                    onShare={sharePost}
                    openPostOnCardClick
                    post={item.post}
                    showAuthorHeader={false}
                    showHighlightedProfessionalReply={!isPsychologist}
                    showProfessionalEngagementCounters
                    showWhatsappCta={false}
                  />
                ),
              )}
            </div>
          ) : null}

          {postsQuery.isFetching && !postsQuery.isFetchingNextPage && !postsQuery.isLoading ? (
            <LoadingState
              label={type === "posts" ? "Atualizando seus posts" : interactionCopy.updatingLabel}
            />
          ) : null}

          <InfiniteMyPostsLoader
            hasNextPage={Boolean(postsQuery.hasNextPage)}
            isLoading={postsQuery.isFetchingNextPage}
            label={
              type === "posts"
                ? "Carregando mais posts"
                : `Carregando mais ${interactionCopy.plural.toLowerCase()}`
            }
            onLoadMore={loadMoreItems}
          />
        </div>
      </section>

      {shareDestinationDialog}
      {lectumDownloadDialog}
    </PrivateTemplate>
  );
};
