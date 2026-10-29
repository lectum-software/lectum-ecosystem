"use client";

import { MessageCircle } from "lucide-react";
import { type RefObject, useMemo } from "react";
import type { PostReply } from "@/api/generator/types/posts";
import { ContentVideoPost } from "@/components/community/content-video-context";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import type { CommunityVideoUploadOperation } from "@/hooks/use-community-video-upload";
import { useReplyTreeLayout } from "@/hooks/use-reply-tree-layout";
import { useReplyTreeReturn, useReplyTreeReturnSnapshot } from "@/hooks/use-reply-tree-return";
import {
  isVerifiedProfessionalReply,
  MAX_REPLY_TREE_DEPTH,
  orderRepliesForProfessionalPriority,
  type ReplyMediaPermission,
  type ReplyTargetMap,
} from "../modules/reply-support";
import type { ReplyComposerForm } from "../use-form";

import { ReplyCard } from "./reply-card";

export const RepliesList = ({
  activeInlineReplyFormRef,
  currentUserId,
  deleteReplyPending,
  embedded = false,
  errorMessage,
  inlineReplyTargets,
  loading,
  loadedPageCount = 1,
  restorePending = false,
  maxInlineDepth = MAX_REPLY_TREE_DEPTH,
  mediaPermission,
  onCancelInlineReplyTarget,
  onInlineReplyDraftChange,
  onDeleteReply,
  onOpenThread,
  onReply,
  onReportReply,
  onShare,
  onSubmitReply,
  onVote,
  focusReplyId,
  postId,
  postSourceText,
  replies,
  replyApiError,
  replyComposerTargetId,
  replyDisabled,
  showSectionTitle = true,
  threadHrefBase,
  votePending,
}: {
  activeInlineReplyFormRef?: RefObject<HTMLElement | null>;
  currentUserId?: string | null;
  deleteReplyPending?: boolean;
  embedded?: boolean;
  errorMessage?: string | null;
  inlineReplyTargets: ReplyTargetMap;
  loading?: boolean;
  loadedPageCount?: number;
  restorePending?: boolean;
  maxInlineDepth?: number;
  mediaPermission: ReplyMediaPermission;
  onCancelInlineReplyTarget: (replyId: string) => void;
  onInlineReplyDraftChange?: (hasDraft: boolean) => void;
  onDeleteReply: (reply: PostReply) => void;
  onOpenThread?: (replyId: string) => void;
  onReply: (reply: PostReply) => void;
  onReportReply: (reply: PostReply, trigger: HTMLButtonElement | null) => void;
  onShare: (reply: PostReply) => void;
  onSubmitReply: (
    values: ReplyComposerForm,
    parentReplyId: string,
    mediaFile?: File | null,
    videoUploadOperation?: CommunityVideoUploadOperation,
  ) => Promise<void> | void;
  onVote: (replyId: string, value: 1 | -1) => void;
  focusReplyId?: string | null;
  postId: string;
  postSourceText: string;
  replies: PostReply[];
  replyApiError?: string | null;
  replyComposerTargetId?: string | null;
  replyDisabled?: boolean;
  showSectionTitle?: boolean;
  threadHrefBase?: string;
  votePending?: boolean;
}) => {
  const { scope, snapshot: routeSnapshot } = useReplyTreeReturnSnapshot(currentUserId);
  const snapshot = embedded ? null : routeSnapshot;
  const orderedReplies = useMemo(() => orderRepliesForProfessionalPriority(replies), [replies]);
  const { ref: listRef, depth: responsiveDepth } = useReplyTreeLayout(
    replies,
    maxInlineDepth,
    focusReplyId,
    threadHrefBase,
    onOpenThread,
  );
  const rememberContinuation = useReplyTreeReturn({
    listRef,
    pageCount: loadedPageCount,
    ready: !loading && !restorePending && !errorMessage,
    snapshot,
    scope,
    threadHrefBase,
  });

  return (
    <ContentVideoPost postId={postId} disabled={embedded}>
      <section
        className="grid gap-4"
        id="discussao"
        ref={listRef}
        onClickCapture={embedded ? undefined : rememberContinuation}
      >
        {showSectionTitle ? (
          <div className="px-0.5">
            <h2 className="text-sm font-black tracking-[0.08em] text-muted uppercase">Discussão</h2>
          </div>
        ) : null}

        {loading ? (
          <div className="grid min-h-[220px] place-items-center rounded-[22px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)] dark:bg-surface">
            <LoadingState label="Carregando respostas" />
          </div>
        ) : null}

        {errorMessage ? (
          <InlineAlert title="Respostas indisponíveis" variant="error">
            {errorMessage}
          </InlineAlert>
        ) : null}

        {!loading && !errorMessage && replies.length === 0 ? (
          <EmptyState
            description="Ainda não há respostas neste post. Seja a primeira pessoa a participar da conversa."
            icon={MessageCircle}
            title="Sem respostas por enquanto"
          />
        ) : null}

        {orderedReplies.length > 0 ? (
          <div className="grid gap-3" key={`${scope}:${snapshot?.createdAt ?? "fresh"}`}>
            {orderedReplies.map((reply) => {
              const professionalTree = isVerifiedProfessionalReply(reply);

              return (
                <div
                  className="rounded-[22px] border border-border bg-surface p-3 shadow-lectum-soft dark:border-border dark:bg-surface"
                  key={reply.id}
                >
                  <ReplyCard
                    activeInlineReplyFormRef={activeInlineReplyFormRef}
                    currentUserId={currentUserId}
                    deleteReplyPending={deleteReplyPending}
                    enableCommunityAutoplay={!embedded}
                    focusReplyId={focusReplyId}
                    inlineReplyTargets={inlineReplyTargets}
                    maxInlineDepth={responsiveDepth}
                    mediaPermission={mediaPermission}
                    onCancelInlineReplyTarget={onCancelInlineReplyTarget}
                    onInlineReplyDraftChange={onInlineReplyDraftChange}
                    onDeleteReply={onDeleteReply}
                    onOpenThread={onOpenThread}
                    onReply={onReply}
                    onReportReply={onReportReply}
                    onShare={onShare}
                    onSubmitReply={onSubmitReply}
                    onVote={onVote}
                    postId={postId}
                    postSourceText={postSourceText}
                    professionalThread={professionalTree}
                    reply={reply}
                    replyApiError={replyApiError}
                    replyComposerTargetId={replyComposerTargetId}
                    replyDisabled={replyDisabled}
                    restoredBranches={snapshot?.branches}
                    threadHrefBase={threadHrefBase}
                    votePending={votePending}
                  />
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </ContentVideoPost>
  );
};
