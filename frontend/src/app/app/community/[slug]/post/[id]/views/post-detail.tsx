"use client";

import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ActionableCoachMark } from "@/components/onboarding/actionable-coach-mark";
import { LectumShareVideoModal } from "@/components/share/lectum-share-video-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import { navigateBackWithFallback } from "@/utils/navigation-history";
import { PostBody, PostHeader, PostVoteBar } from "../components/post-content";
import { RepliesList } from "../components/replies-list";
import { PostReportModal, ReplyComposer } from "../components/reply-composer";
import { PSYCHOLOGIST_COMMUNITY_REPLY_TIP_SELECTOR } from "../modules/reply-support";
import { toPostReportPayload } from "../use-form";
import { usePostDetailController } from "./post-detail-controller";

const FLOATING_HEADER_MIN_SCROLL_Y = 96;
const FLOATING_HEADER_SCROLL_DELTA = 6;

const PostDetailFloatingHeader = ({
  onBack,
  visible,
}: {
  onBack: () => void;
  visible: boolean;
}) => (
  <header
    aria-hidden={!visible}
    className={cn(
      "fixed inset-x-0 top-0 z-[90] border-border border-b bg-surface/95 text-foreground shadow-lectum-soft backdrop-blur-md transition-all duration-200 sm:hidden",
      visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0",
    )}
    style={{ paddingTop: "env(safe-area-inset-top)" }}
  >
    <div className="mx-auto flex h-14 max-w-[430px] items-center justify-between px-4">
      <Button
        aria-label="Voltar"
        className="h-10 w-10 rounded-full text-muted hover:bg-surface-muted hover:text-foreground"
        onClick={onBack}
        tabIndex={visible ? 0 : -1}
        type="button"
        variant="ghost"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </Button>
      <p className="text-center text-base font-extrabold">Post</p>
      <span className="h-10 w-10" aria-hidden="true" />
    </div>
  </header>
);

export const PostDetailLogic = () => {
  const [floatingHeaderVisible, setFloatingHeaderVisible] = useState(false);
  const lastScrollYRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const {
    activeFocusReplyId,
    activeMobileReplyTarget,
    closeDesktopReplyTarget,
    composerRef,
    createReplyMutation,
    currentUserId,
    deleteReplyError,
    deleteReplyMutation,
    focusMainComposer,
    handleReplyTarget,
    handleShareVideoShared,
    handleTogglePostSave,
    handleVotePost,
    handleVoteReply,
    hasDesktopReplyTargets,
    hasMoreReplies,
    inlineReplyFormRef,
    isInitialRepliesLoading,
    isLoadingMoreReplies,
    isMobile,
    loadMoreRepliesRef,
    mediaPermission,
    post,
    postError,
    postQuery,
    replies,
    repliesError,
    replyError,
    reportError,
    reportMutation,
    reportReplyMutation,
    reportTarget,
    router,
    saveMutation,
    setInlineReplyDraftState,
    setMobileReplyTarget,
    setReportError,
    setReportTarget,
    setReplyError,
    setShareVideoTarget,
    setShowPsychologistReplyTip,
    shareFeedback,
    sharePost,
    shareReply,
    shareVideoTarget,
    shouldExposePsychologistReplyTipTarget,
    showPsychologistReplyTip,
    submitReply,
    uploadReplyMediaMutation,
    visibleInlineReplyTargets,
    voteMutation,
  } = usePostDetailController();

  useEffect(() => {
    const updateFloatingHeader = () => {
      if (scrollFrameRef.current !== null) return;

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        const nextScrollY = window.scrollY;
        const delta = nextScrollY - lastScrollYRef.current;

        if (nextScrollY <= FLOATING_HEADER_MIN_SCROLL_Y) {
          setFloatingHeaderVisible(false);
        } else if (delta < -FLOATING_HEADER_SCROLL_DELTA) {
          setFloatingHeaderVisible(true);
        } else if (delta > FLOATING_HEADER_SCROLL_DELTA) {
          setFloatingHeaderVisible(false);
        }

        lastScrollYRef.current = nextScrollY;
        scrollFrameRef.current = null;
      });
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", updateFloatingHeader, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateFloatingHeader);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  const handlePostBack = () => {
    if (!post) return;

    navigateBackWithFallback(router, `/comunidades/${post.community.slug}`);
  };

  return (
    <PrivateTemplate
      allowAnonymous
      contentClassName="bg-background px-0 py-0"
      navigationTheme="solidWhite"
      showHeader
    >
      {showPsychologistReplyTip ? (
        <ActionableCoachMark
          onDismiss={() => setShowPsychologistReplyTip(false)}
          placement="bottom"
          targetSelector={PSYCHOLOGIST_COMMUNITY_REPLY_TIP_SELECTOR}
          title="Responda dúvidas da comunidade"
        >
          <p>
            Responder pacientes é o principal foco dos psicólogos na Lectum. Cada resposta mostra
            sua forma de cuidado, cria confiança e aumenta a chance de um contato qualificado.
          </p>
        </ActionableCoachMark>
      ) : null}

      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-background pb-6 text-foreground dark:text-foreground sm:max-w-2xl lg:max-w-3xl">
        {postQuery.isLoading || postQuery.isPending ? (
          <div className="grid min-h-[70vh] place-items-center px-5">
            <LoadingState label="Carregando post" />
          </div>
        ) : null}

        {postError ? (
          <div className="px-5 pt-6">
            <EmptyState
              action={
                <Button asChild variant="outline">
                  <Link href={DEFAULT_COMMUNITY_FEED_HREF}>Voltar ao feed</Link>
                </Button>
              }
              description={postError}
              icon={MessageCircle}
              title="Post indisponível"
            />
          </div>
        ) : null}

        {post ? (
          <>
            <PostDetailFloatingHeader onBack={handlePostBack} visible={floatingHeaderVisible} />
            <article className="overflow-hidden bg-surface shadow-lectum-soft dark:bg-surface sm:mt-4 sm:rounded-[26px] sm:border sm:border-border">
              <PostHeader
                onBack={handlePostBack}
                onDeleted={() => router.replace(`/comunidades/${post.community.slug}`)}
                onReport={() => {
                  setReportError(null);
                  setReportTarget({ type: "post" });
                }}
                post={post}
              />
              <PostBody post={post} />
              <PostVoteBar
                currentVote={post.current_user_vote}
                disabled={voteMutation.isPending || saveMutation.isPending}
                onFocusCommentComposer={focusMainComposer}
                replyTipTarget={
                  shouldExposePsychologistReplyTipTarget ? "community-reply" : undefined
                }
                onShare={sharePost}
                onToggleSave={handleTogglePostSave}
                onVote={handleVotePost}
                post={post}
              />
            </article>

            <div className="grid gap-4 px-5 pt-4 pb-36 sm:px-0 sm:pb-6">
              {shareFeedback ? (
                <InlineAlert title="Link preparado" variant="success">
                  Link copiado ou enviado para compartilhamento.
                </InlineAlert>
              ) : null}

              {voteMutation.isError || saveMutation.isError ? (
                <InlineAlert title="Interação não atualizada" variant="error">
                  A ação foi desfeita localmente. Tente novamente em alguns instantes.
                </InlineAlert>
              ) : null}

              {deleteReplyError ? (
                <InlineAlert title="Comentário não excluído" variant="error">
                  {deleteReplyError}
                </InlineAlert>
              ) : null}

              <ReplyComposer
                apiError={!isMobile && hasDesktopReplyTargets ? null : replyError}
                autoFocus={Boolean(activeMobileReplyTarget)}
                disabled={createReplyMutation.isPending || uploadReplyMediaMutation.isPending}
                formRef={composerRef}
                mediaPermission={mediaPermission}
                onCancelContext={() => {
                  setReplyError(null);
                  setMobileReplyTarget(null);
                }}
                onSubmit={(values, mediaFile) =>
                  submitReply(values, activeMobileReplyTarget?.id ?? null, mediaFile)
                }
                replyTarget={activeMobileReplyTarget}
              />

              <RepliesList
                activeInlineReplyFormRef={inlineReplyFormRef}
                currentUserId={currentUserId}
                deleteReplyPending={deleteReplyMutation.isPending}
                errorMessage={repliesError}
                focusReplyId={activeFocusReplyId}
                inlineReplyTargets={visibleInlineReplyTargets}
                loading={isInitialRepliesLoading}
                mediaPermission={mediaPermission}
                onCancelInlineReplyTarget={closeDesktopReplyTarget}
                onInlineReplyDraftChange={setInlineReplyDraftState}
                onDeleteReply={(reply) =>
                  deleteReplyMutation.mutate({ postId: post.id, replyId: reply.id })
                }
                onReply={handleReplyTarget}
                onReportReply={(reply) => {
                  setReportError(null);
                  setReportTarget({ reply, type: "reply" });
                }}
                onShare={shareReply}
                onSubmitReply={(values, parentReplyId, mediaFile) =>
                  submitReply(values, parentReplyId, mediaFile)
                }
                onVote={handleVoteReply}
                postId={post.id}
                postSourceText={post.title}
                replies={replies}
                replyApiError={replyError}
                replyDisabled={createReplyMutation.isPending || uploadReplyMediaMutation.isPending}
                threadHrefBase={`/comunidades/${post.community.slug}/publicacao/${post.id}/resposta`}
                votePending={voteMutation.isPending}
              />

              {hasMoreReplies || isLoadingMoreReplies ? (
                <div
                  aria-live="polite"
                  className="grid min-h-10 place-items-center px-4 py-2 text-xs font-semibold text-muted"
                  ref={loadMoreRepliesRef}
                >
                  {isLoadingMoreReplies ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Carregando mais respostas
                    </span>
                  ) : (
                    <span className="sr-only">Continue rolando para carregar mais respostas.</span>
                  )}
                </div>
              ) : null}
            </div>

            <PostReportModal
              apiError={reportError}
              disabled={reportMutation.isPending || reportReplyMutation.isPending}
              onClose={() => setReportTarget(null)}
              onSubmit={async (values) => {
                if (!post) return;

                setReportError(null);
                if (reportTarget?.type === "reply") {
                  await reportReplyMutation.mutateAsync({
                    body: toPostReportPayload(values),
                    id: post.id,
                    replyId: reportTarget.reply.id,
                  });
                  return;
                }

                await reportMutation.mutateAsync({
                  body: toPostReportPayload(values),
                  id: post.id,
                });
              }}
              open={Boolean(reportTarget)}
              subject={reportTarget?.type === "reply" ? reportTarget.reply.content : post.title}
              title={reportTarget?.type === "reply" ? "Denunciar comentário" : "Denunciar post"}
            />
          </>
        ) : null}
      </section>
      <LectumShareVideoModal
        onClose={() => setShareVideoTarget(null)}
        onShared={handleShareVideoShared}
        target={shareVideoTarget}
      />
    </PrivateTemplate>
  );
};
