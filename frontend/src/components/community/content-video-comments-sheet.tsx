"use client";

import { ArrowLeft, X } from "lucide-react";
import { type RefObject, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePostReplyThread } from "@/api/callers/posts";
import { RepliesList } from "@/app/app/community/[slug]/post/[id]/components/replies-list";
import {
  PostReportModal,
  ReplyComposer,
} from "@/app/app/community/[slug]/post/[id]/components/reply-composer";
import {
  confirmDiscardReplyDraft,
  findReplyInTree,
  resolvePostError,
} from "@/app/app/community/[slug]/post/[id]/modules/reply-support";
import { toPostReportPayload } from "@/app/app/community/[slug]/post/[id]/use-form";
import { usePostDetailController } from "@/app/app/community/[slug]/post/[id]/views/post-detail-controller";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/registry/new-york-v4/ui/button";
import { getCommunityAuthorDisplayName } from "@/utils/community-display";

export type ContentVideoCommentsSheetProps = {
  postId: string;
  communitySlug: string;
  /** Focus this reply in the discussion, including deeper continuation branches. */
  replyId?: string;
  open: boolean;
  onClose: () => void;
};

type DiscussionController = ReturnType<typeof usePostDetailController>;

const DiscussionBranch = ({
  active,
  controller,
  dismissedFocusReplyId,
  onOpenThread,
  reportReturnFocusRef,
  threadId,
  threadHrefBase,
}: {
  active: boolean;
  controller: DiscussionController;
  dismissedFocusReplyId: string | null;
  onOpenThread: (replyId: string) => void;
  reportReturnFocusRef: RefObject<HTMLButtonElement | null>;
  threadId: string;
  threadHrefBase: string;
}) => {
  const { post } = controller;
  const threadQuery = usePostReplyThread(post?.id ?? "", threadId, Boolean(threadId));
  const listContainerRef = useRef<HTMLDivElement>(null);
  const lastFocusedReply = useRef<string | null>(null);
  const replies = useMemo(
    () =>
      threadId ? (threadQuery.data?.reply ? [threadQuery.data.reply] : []) : controller.replies,
    [controller.replies, threadId, threadQuery.data],
  );
  const pending = threadId ? threadQuery.isFetching : controller.isRepliesFetching;
  const error = threadId
    ? threadQuery.isError
      ? resolvePostError(threadQuery.error)
      : null
    : controller.repliesError;
  const focusReplyId =
    active && controller.activeFocusReplyId !== dismissedFocusReplyId
      ? controller.activeFocusReplyId
      : null;

  useEffect(() => {
    if (!focusReplyId || pending || lastFocusedReply.current === focusReplyId) return;
    if (!findReplyInTree(replies, focusReplyId)) return;
    const scroller = listContainerRef.current;
    if (!scroller) return;
    const frame = requestAnimationFrame(() => {
      const target = scroller.querySelector<HTMLElement>(
        `[id="reply-focus-${CSS.escape(focusReplyId)}"]`,
      );
      if (!target) return;
      lastFocusedReply.current = focusReplyId;
      // Never scroll/focus the duplicate reply behind the viewer in the original post.
      scroller.scrollTop +=
        target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 16;
    });
    return () => cancelAnimationFrame(frame);
  }, [focusReplyId, pending, replies]);

  if (!post) return null;
  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
      hidden={!active}
      ref={listContainerRef}
      data-content-video-comment-branch={threadId || "post"}
    >
      <RepliesList
        embedded
        currentUserId={controller.currentUserId}
        deleteReplyPending={controller.deleteReplyMutation.isPending}
        errorMessage={error}
        focusReplyId={focusReplyId}
        inlineReplyTargets={controller.visibleInlineReplyTargets}
        loading={threadId ? threadQuery.isLoading : controller.isInitialRepliesLoading}
        loadedPageCount={controller.highestLoadedReplyPage}
        restorePending={pending}
        mediaPermission={controller.mediaPermission}
        onCancelInlineReplyTarget={controller.closeDesktopReplyTarget}
        onDeleteReply={(reply) =>
          controller.deleteReplyMutation.mutate({ postId: post.id, replyId: reply.id })
        }
        onOpenThread={active ? onOpenThread : undefined}
        onReply={controller.handleReplyTarget}
        onReportReply={(reply, trigger) => {
          reportReturnFocusRef.current = trigger;
          controller.setReportError(null);
          controller.setReportTarget({ reply, type: "reply" });
        }}
        onShare={controller.shareReply}
        onSubmitReply={controller.submitReply}
        onVote={controller.handleVoteReply}
        postId={post.id}
        postSourceText={post.title}
        replies={replies}
        replyApiError={controller.replyError}
        replyComposerTargetId={controller.activeMobileReplyTarget?.id}
        replyDisabled={
          controller.createReplyMutation.isPending || controller.uploadReplyMediaMutation.isPending
        }
        showSectionTitle={false}
        threadHrefBase={threadHrefBase}
        votePending={controller.voteMutation.isPending}
      />
      {error ? (
        <Button
          className="mt-3"
          onClick={() => {
            if (threadId) void threadQuery.refetch();
            else controller.retryReplies();
          }}
          type="button"
          variant="outline"
        >
          Tentar novamente
        </Button>
      ) : null}
      {!threadId && (controller.hasMoreReplies || controller.isLoadingMoreReplies) ? (
        <div
          className="flex justify-center py-3"
          ref={active ? controller.loadMoreRepliesRef : undefined}
        >
          <Button
            disabled={controller.isRepliesFetching}
            onClick={controller.requestNextRepliesPage}
            type="button"
            variant="ghost"
          >
            {controller.isLoadingMoreReplies ? "Carregando respostas" : "Ver mais respostas"}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

const OpenContentVideoCommentsSheet = ({
  postId,
  communitySlug,
  replyId,
  onClose,
}: Omit<ContentVideoCommentsSheetProps, "open">) => {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const reportReturnFocusRef = useRef<HTMLButtonElement | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [threads, setThreads] = useState<string[]>([""]);
  const [dismissedFocusReplyId, setDismissedFocusReplyId] = useState<string | null>(null);
  const openThread = useCallback((id: string) => {
    setThreads((current) => (current.includes(id) ? current : [...current, id]));
  }, []);
  const [viewport, setViewport] = useState<{ bottom: number; height: number } | null>(null);
  const controller = usePostDetailController({
    postId,
    initialFocusReplyId: replyId,
    embedded: true,
    onOpenThread: openThread,
  });
  const { post } = controller;
  const submitting =
    controller.createReplyMutation.isPending || controller.uploadReplyMediaMutation.isPending;
  const currentThread = threads[threads.length - 1];

  useEffect(() => {
    const update = () => {
      const visual = window.visualViewport;
      setViewport({
        bottom: visual ? Math.max(0, window.innerHeight - visual.height - visual.offsetTop) : 0,
        height: Math.max(0, (visual?.height ?? window.innerHeight) - 16),
      });
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  const requestClose = () => {
    if (submitting || (hasDraft && !confirmDiscardReplyDraft())) return;
    onClose();
  };

  return (
    <Modal
      className="z-[1200] overflow-hidden p-0 backdrop:bg-media-background/35 backdrop:backdrop-blur-none"
      dismissible={!hasDraft && !submitting}
      initialFocusRef={closeRef}
      labelledBy={titleId}
      onClose={requestClose}
      open
      returnFocusRef={returnFocusRef}
    >
      <section
        className="fixed inset-x-0 bottom-0 mx-auto flex h-[82dvh] max-h-[calc(100dvh-1rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[24px] bg-surface text-foreground shadow-lectum-soft"
        style={viewport ? { bottom: viewport.bottom, maxHeight: viewport.height } : undefined}
        data-content-video-comments-sheet="true"
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong"
        />
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
          {currentThread ? (
            <Button
              aria-label="Voltar na discussão"
              className="h-9 w-9 shrink-0 p-0"
              onClick={() => {
                setDismissedFocusReplyId(controller.activeFocusReplyId);
                setThreads((current) => current.slice(0, -1));
              }}
              variant="ghost"
              type="button"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
          ) : null}
          <h2 className="min-w-0 flex-1 text-sm font-bold" id={titleId}>
            {post
              ? `${post.replies_count} ${post.replies_count === 1 ? "comentário" : "comentários"}`
              : "Comentários"}
          </h2>
          <button
            aria-label="Fechar comentários"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0 text-foreground hover:bg-surface-muted disabled:opacity-50"
            disabled={submitting}
            onClick={requestClose}
            ref={closeRef}
            type="button"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {controller.postQuery.isPending ? (
          <div className="grid flex-1 place-items-center">
            <LoadingState label="Carregando comentários" />
          </div>
        ) : null}
        {controller.postError ? (
          <div className="grid gap-3 p-4">
            <InlineAlert title="Comentários indisponíveis" variant="error">
              {controller.postError}
            </InlineAlert>
            <Button
              onClick={() => void controller.postQuery.refetch()}
              type="button"
              variant="outline"
            >
              Tentar novamente
            </Button>
          </div>
        ) : null}
        {controller.deleteReplyError || controller.voteMutation.isError ? (
          <InlineAlert title="Interação não atualizada" variant="error">
            {controller.deleteReplyError || "A ação foi desfeita localmente. Tente novamente."}
          </InlineAlert>
        ) : null}
        {controller.shareFeedback ? (
          <InlineAlert title="Link preparado" variant="success">
            Link copiado ou enviado para compartilhamento.
          </InlineAlert>
        ) : null}

        {post ? (
          <>
            {threads.map((threadId) => (
              <DiscussionBranch
                active={threadId === currentThread}
                controller={controller}
                dismissedFocusReplyId={dismissedFocusReplyId}
                key={threadId || "post"}
                onOpenThread={openThread}
                reportReturnFocusRef={reportReturnFocusRef}
                threadId={threadId}
                threadHrefBase={`/comunidades/${post.community.slug || communitySlug}/publicacao/${post.id}/resposta`}
              />
            ))}
            <ReplyComposer
              apiError={controller.replyError}
              autoFocus={Boolean(controller.activeMobileReplyTarget)}
              disabled={submitting}
              formRef={controller.composerRef}
              mediaPermission={controller.mediaPermission}
              onCancelContext={() => {
                controller.setReplyError(null);
                controller.setMobileReplyTarget(null);
              }}
              onDraftStateChange={setHasDraft}
              onSubmit={(values, mediaFile, operation) =>
                controller.submitReply(
                  values,
                  controller.activeMobileReplyTarget?.id ?? null,
                  mediaFile,
                  operation,
                )
              }
              replyToName={getCommunityAuthorDisplayName(post.author)}
              replyTarget={controller.activeMobileReplyTarget}
              variant="embedded"
            />
            <PostReportModal
              apiError={controller.reportError}
              disabled={controller.reportReplyMutation.isPending}
              onClose={() => controller.setReportTarget(null)}
              onSubmit={async (values) => {
                if (controller.reportTarget?.type !== "reply") return;
                await controller.reportReplyMutation.mutateAsync({
                  body: toPostReportPayload(values),
                  id: post.id,
                  replyId: controller.reportTarget.reply.id,
                });
              }}
              open={controller.reportTarget?.type === "reply"}
              returnFocusRef={reportReturnFocusRef}
              subject={
                controller.reportTarget?.type === "reply"
                  ? controller.reportTarget.reply.content
                  : ""
              }
              title="Denunciar comentário"
            />
          </>
        ) : null}
      </section>
    </Modal>
  );
};

/** Mount only while open so drafts and focus cannot leak between different videos. */
export const ContentVideoCommentsSheet = ({ open, ...props }: ContentVideoCommentsSheetProps) =>
  open ? (
    <OpenContentVideoCommentsSheet key={`${props.postId}:${props.replyId ?? "post"}`} {...props} />
  ) : null;
