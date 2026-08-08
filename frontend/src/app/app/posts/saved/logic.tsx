"use client";

import { Bookmark } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  useSavedPosts,
  useSharePost,
  useShareReply,
  useUnsavePostFromList,
  useUnsaveReplyFromList,
} from "@/api/callers/posts";
import type { PostListPost } from "@/api/generator/types/posts";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { LectumShareVideoModal } from "@/components/share/lectum-share-video-modal";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import {
  createLectumShareLinkTarget,
  createLectumSharePostMediaTarget,
  createLectumShareVideoTarget,
  type LectumShareChannel,
  type LectumShareVideoTarget,
} from "@/utils/lectum-share-target";
import { Pagination } from "./components/pagination";

import { SavedReplyCard } from "./components/saved-reply-card";
import { PAGE_LIMIT, resolvePostsError, savedReplyHref } from "./modules/support";

export const SavedPostsLogic = () => {
  const [page, setPage] = useState(1);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [shareVideoTarget, setShareVideoTarget] = useState<LectumShareVideoTarget | null>(null);
  const [removedFeedback, setRemovedFeedback] = useState<string | null>(null);
  const query = useMemo(() => ({ page, limit: PAGE_LIMIT }), [page]);
  const postsQuery = useSavedPosts(query);
  const sharePostMutation = useSharePost();
  const shareReplyMutation = useShareReply();
  const unsavePostMutation = useUnsavePostFromList({
    onSuccess: () => {
      setRemovedFeedback("Post removido dos salvos.");
      window.setTimeout(() => setRemovedFeedback(null), 2400);
    },
  });
  const unsaveReplyMutation = useUnsaveReplyFromList({
    onSuccess: () => {
      setRemovedFeedback("Resposta removida dos salvos.");
      window.setTimeout(() => setRemovedFeedback(null), 2400);
    },
  });
  const items = postsQuery.data?.data ?? [];
  const errorMessage = postsQuery.isError ? resolvePostsError(postsQuery.error) : null;

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
      setShareVideoTarget(socialTarget);
      return;
    }

    const relativeUrl = replyId
      ? savedReplyHref(post, replyId)
      : `/comunidades/${post.community.slug}/publicacao/${post.id}`;
    setShareVideoTarget(
      createLectumShareLinkTarget(post, {
        relativeUrl,
        replyId: replyId ?? null,
        title: replyId ? "Resposta salva na Lectum" : post.title,
      }),
    );
  };

  const handleShareVideoShared = (channel: LectumShareChannel) => {
    if (!shareVideoTarget) return;

    if (shareVideoTarget.replyId) {
      shareReplyMutation.mutate({
        postId: shareVideoTarget.postId,
        replyId: shareVideoTarget.replyId,
        body: { channel },
      });
    } else {
      sharePostMutation.mutate({ id: shareVideoTarget.postId, body: { channel } });
    }
    setShareFeedback(shareVideoTarget.postId);
    window.setTimeout(() => setShareFeedback(null), 2400);
  };

  return (
    <PrivateTemplate
      contentClassName="bg-background px-0 py-0"
      navigationTheme="solidWhite"
      showHeader
    >
      <section className="mx-auto min-h-screen w-full max-w-[430px] px-5 py-5 sm:max-w-2xl md:py-8 lg:max-w-3xl">
        <AppPageHeader
          backHref="/app/perfil"
          backLabel="Voltar para perfil"
          className="mb-4"
          title="Salvos"
        />

        <div className="grid gap-4">
          {postsQuery.isLoading || postsQuery.isPending ? (
            <div className="grid min-h-[45vh] place-items-center rounded-[22px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
              <LoadingState label="Carregando itens salvos" />
            </div>
          ) : null}

          {errorMessage ? (
            <InlineAlert title="Não foi possível carregar" variant="error">
              {errorMessage}
            </InlineAlert>
          ) : null}

          {shareFeedback ? (
            <InlineAlert title="Link preparado" variant="success">
              Link do post copiado ou enviado para compartilhamento.
            </InlineAlert>
          ) : null}

          {removedFeedback ? (
            <InlineAlert title="Salvos atualizados" variant="success">
              {removedFeedback}
            </InlineAlert>
          ) : null}

          {unsavePostMutation.isError || unsaveReplyMutation.isError ? (
            <InlineAlert title="Não foi possível remover" variant="error">
              O item continua salvo. Tente novamente em alguns instantes.
            </InlineAlert>
          ) : null}

          {!postsQuery.isLoading && !postsQuery.isPending && !errorMessage && items.length === 0 ? (
            <EmptyState
              action={
                <Button asChild>
                  <Link href={DEFAULT_COMMUNITY_FEED_HREF}>
                    <Bookmark className="h-4 w-4" aria-hidden="true" />
                    Explorar posts
                  </Link>
                </Button>
              }
              description="Quando você salvar posts ou respostas nas comunidades, eles aparecerão aqui."
              icon={Bookmark}
              title="Nenhum item salvo"
            />
          ) : null}

          {items.length > 0 ? (
            <div className="grid gap-4">
              {items.map((item) =>
                item.type === "reply" ? (
                  <SavedReplyCard
                    item={item}
                    key={item.id}
                    onRemove={(postId, replyId) => unsaveReplyMutation.mutate({ postId, replyId })}
                    onShare={sharePost}
                    removePending={unsaveReplyMutation.isPending}
                  />
                ) : (
                  <CommunityPostCard
                    key={item.id}
                    interactiveActions
                    onShare={sharePost}
                    openPostOnCardClick
                    post={item.post}
                    presentation="feed"
                    saveActionOverride={{
                      active: true,
                      count: item.post.saves_count,
                      disabled: unsavePostMutation.isPending,
                      label: "Remover dos salvos",
                      onClick: () => unsavePostMutation.mutate(item.post.id),
                    }}
                  />
                ),
              )}
            </div>
          ) : null}

          {postsQuery.isFetching && !postsQuery.isLoading ? (
            <LoadingState label="Atualizando salvos" />
          ) : null}

          <Pagination
            currentPage={page}
            disabled={postsQuery.isFetching}
            onPageChange={setPage}
            pages={postsQuery.data?.pages ?? 0}
          />
        </div>
      </section>
      <LectumShareVideoModal
        onClose={() => setShareVideoTarget(null)}
        onShared={handleShareVideoShared}
        target={shareVideoTarget}
      />
    </PrivateTemplate>
  );
};
