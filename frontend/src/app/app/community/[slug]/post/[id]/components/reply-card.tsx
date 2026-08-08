"use client";

import {
  BadgeCheck,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Flag,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { type MouseEventHandler, type RefObject, useEffect, useMemo, useState } from "react";
import { useSaveReply } from "@/api/callers/posts";
import type { PostReply } from "@/api/generator/types/posts";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { CommunityMediaBlock } from "@/components/community/community-media-frame";
import {
  CommunityWhatsAppCta,
  toCommunityWhatsAppIdentity,
} from "@/components/community/community-whatsapp-cta";
import { InlineExpandableText } from "@/components/community/inline-expandable-text";
import { MentorBadge } from "@/components/community/mentor-badge";
import { ReplyEditModal } from "@/components/community/reply-edit-modal";
import { useProgressiveConversion } from "@/components/conversion/progressive-conversion-provider";
import { cn } from "@/lib/utils";
import { getCommunityAuthorDisplayName } from "@/utils/community-display";
import {
  countReplyTreeDescendants,
  findReplyInTree,
  formatReplyAuthorMeta,
  MAX_REPLY_TREE_DEPTH,
  type ReplyMediaPermission,
  type ReplyTargetMap,
  stopReplyTreeCollapsePropagation,
} from "../modules/reply-support";
import type { ReplyComposerForm } from "../use-form";

import { AuthorAvatar } from "./post-content";

import { ReplyComposer } from "./reply-composer";

export type ReplyOverflowMenuProps = {
  deletePending?: boolean;
  isOwnReply: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onReport: () => void;
  onShare: () => void;
  onToggleSave: MouseEventHandler<HTMLButtonElement>;
  reply: PostReply;
  savePending?: boolean;
};

export const ReplyOverflowMenu = ({
  deletePending,
  isOwnReply,
  onDelete,
  onEdit,
  onReport,
  onShare,
  onToggleSave,
  reply,
  savePending,
}: ReplyOverflowMenuProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative shrink-0" data-comment-collapse-ignore="true">
      <button
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Mais ações da resposta"
        className="grid h-7 w-7 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground active:scale-[0.97] dark:text-muted dark:hover:text-foreground"
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((current) => !current);
        }}
        type="button"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      {menuOpen ? (
        <div
          className="absolute right-0 bottom-8 z-[120] w-56 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 text-sm shadow-lectum-soft dark:border-border dark:bg-surface"
          role="menu"
        >
          {isOwnReply ? (
            <button
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                onEdit();
              }}
              role="menuitem"
              type="button"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Editar
            </button>
          ) : null}

          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground"
            disabled={savePending}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen(false);
              onToggleSave(event);
            }}
            role="menuitem"
            type="button"
          >
            <Bookmark
              className={cn("h-4 w-4", reply.saved && "fill-current text-primary")}
              aria-hidden="true"
            />
            {reply.saved ? "Remover dos salvos" : "Salvar"}
          </button>

          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen(false);
              onShare();
            }}
            role="menuitem"
            type="button"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Compartilhar
          </button>

          {isOwnReply ? (
            <button
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-danger transition hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
              disabled={deletePending}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                onDelete();
              }}
              role="menuitem"
              type="button"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Excluir
            </button>
          ) : (
            <button
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
                onReport();
              }}
              role="menuitem"
              type="button"
            >
              <Flag className="h-4 w-4" aria-hidden="true" />
              Denunciar
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};

export const ReplyVoteBar = ({
  currentVote,
  deletePending,
  disabled,
  isOwnReply,
  onDelete,
  onEdit,
  onReply,
  onReport,
  onShare,
  onToggleSave,
  onVote,
  reply,
  savePending,
}: {
  currentVote: 1 | -1 | null;
  deletePending?: boolean;
  disabled?: boolean;
  isOwnReply: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onReply: () => void;
  onReport: () => void;
  onShare: () => void;
  onToggleSave: MouseEventHandler<HTMLButtonElement>;
  onVote: (value: 1 | -1) => void;
  reply: PostReply;
  savePending?: boolean;
}) => {
  const handleToggleSave: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();
    onToggleSave(event);
  };

  const handleShare = () => {
    onShare();
  };

  return (
    <CommunityActionBar
      className="mt-2 sm:mt-3"
      currentVote={currentVote}
      disabled={disabled}
      onVote={onVote}
      reply={{
        label: "Responder",
        onClick: onReply,
        textOnly: true,
      }}
      endSlot={
        <ReplyOverflowMenu
          deletePending={deletePending}
          isOwnReply={isOwnReply}
          onDelete={onDelete}
          onEdit={onEdit}
          onReport={onReport}
          onShare={handleShare}
          onToggleSave={handleToggleSave}
          reply={reply}
          savePending={savePending}
        />
      }
      endSlotAlignment="inline"
      showUpvoteText={false}
      size="xs"
      upvotesCount={reply.upvotes_count}
      voteLabel="Marcar resposta como útil"
      votePresentation="inline"
    />
  );
};

export const ReplyCard = ({
  activeInlineReplyFormRef,
  currentUserId,
  deleteReplyPending,
  depth = 0,
  inlineReplyTargets,
  mediaPermission,
  onCancelInlineReplyTarget,
  onInlineReplyDraftChange,
  onDeleteReply,
  onReply,
  onReportReply,
  onShare,
  onSubmitReply,
  onVote,
  focusReplyId,
  maxInlineDepth = MAX_REPLY_TREE_DEPTH,
  postId,
  postSourceText,
  professionalThread,
  reply,
  replyApiError,
  replyDisabled,
  threadHrefBase,
  votePending,
}: {
  activeInlineReplyFormRef?: RefObject<HTMLFormElement | null>;
  currentUserId?: string | null;
  deleteReplyPending?: boolean;
  depth?: number;
  inlineReplyTargets: ReplyTargetMap;
  mediaPermission: ReplyMediaPermission;
  onCancelInlineReplyTarget: (replyId: string) => void;
  onInlineReplyDraftChange?: (hasDraft: boolean) => void;
  onDeleteReply: (reply: PostReply) => void;
  onReply: (reply: PostReply) => void;
  onReportReply: (reply: PostReply) => void;
  onShare: (reply: PostReply) => void;
  onSubmitReply: (
    values: ReplyComposerForm,
    parentReplyId: string,
    mediaFile?: File | null,
  ) => Promise<void> | void;
  focusReplyId?: string | null;
  maxInlineDepth?: number;
  onVote: (replyId: string, value: 1 | -1) => void;
  postId: string;
  postSourceText: string;
  professionalThread?: boolean;
  reply: PostReply;
  replyApiError?: string | null;
  replyDisabled?: boolean;
  threadHrefBase?: string;
  votePending?: boolean;
}) => {
  const isProfessional = reply.author.role === "psicologo";
  const isVerifiedProfessional = isProfessional && reply.author.verified;
  const authorDisplayName = getCommunityAuthorDisplayName(reply.author);
  const isOwnReply = Boolean(currentUserId && reply.author.id === currentUserId);
  const highlightedProfessionalThread = professionalThread ?? isVerifiedProfessional;
  const saveReplyMutation = useSaveReply(postId, reply.id);
  const conversion = useProgressiveConversion();
  const psychologistProfileHref = isProfessional ? `/psicologos/${reply.author.id}` : null;
  const inlineReplyTarget = inlineReplyTargets[reply.id] ?? null;
  const isReplyComposerOpen = Boolean(inlineReplyTarget);
  const [contentExpanded, setContentExpanded] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const visualMaxDepth =
    maxInlineDepth < 0 ? MAX_REPLY_TREE_DEPTH : Math.min(maxInlineDepth, MAX_REPLY_TREE_DEPTH);
  const totalRepliesCount = reply.replies_count ?? reply.replies.length;
  const hasFocusedDescendant = Boolean(
    focusReplyId && focusReplyId !== reply.id && findReplyInTree(reply.replies, focusReplyId),
  );
  const canRenderChildren = depth < visualMaxDepth || hasFocusedDescendant;
  const visibleChildren = canRenderChildren ? reply.replies : [];
  const hiddenRepliesCount = Math.max(0, totalRepliesCount - visibleChildren.length);
  const collapsedRepliesCount = useMemo(() => countReplyTreeDescendants(reply), [reply]);
  const canCollapseRootTree = depth === 0 && collapsedRepliesCount > 0;
  const canToggleRootTree = canCollapseRootTree && !hasFocusedDescendant;
  const threadHref = threadHrefBase ? `${threadHrefBase}/${reply.id}` : null;
  const childrenHiddenByCollapse = canCollapseRootTree && treeCollapsed && !hasFocusedDescendant;

  const hasTreeContinuation =
    !childrenHiddenByCollapse && (visibleChildren.length > 0 || hiddenRepliesCount > 0);
  const avatarSize = isProfessional ? "reply" : "sm";
  const hasReplyMedia = Boolean(reply.media_url);

  const toggleRootTreeCollapse = () => {
    setTreeCollapsed((current) => !current);
  };

  const toggleSaveReply: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();

    if (!conversion.isAuthenticated) {
      event.preventDefault();
      conversion.requestConversion("trigger_salvar", {
        intent: {
          payload: {
            postId,
            replyId: reply.id,
          },
          type: "save_reply",
        },
      });
      return;
    }

    saveReplyMutation.mutate(reply.saved);
  };

  useEffect(() => {
    if (!conversion.isAuthenticated || reply.saved) return;

    const intent = conversion.consumePendingIntent(
      (candidate) =>
        candidate.type === "save_reply" &&
        String(candidate.payload?.postId ?? "") === postId &&
        String(candidate.payload?.replyId ?? "") === reply.id,
    );

    if (!intent) return;

    saveReplyMutation.mutate(reply.saved);
  }, [conversion, postId, reply.id, reply.saved, saveReplyMutation]);

  const replyWhatsappCta =
    isProfessional && reply.author.whatsapp_url ? (
      <CommunityWhatsAppCta
        attached={hasReplyMedia}
        psychologist={toCommunityWhatsAppIdentity(reply.author)}
        stopPropagation
        trackingContext={{
          pageKind: "community_post",
          targetId: reply.id,
          targetType: "post_reply",
        }}
      />
    ) : null;

  return (
    <article
      className="relative rounded-[20px] py-0.5 text-foreground transition-[background-color,box-shadow] duration-500 dark:text-foreground"
      id={`reply-${reply.id}`}
    >
      {hasTreeContinuation ? (
        <span
          className="pointer-events-none absolute top-10 bottom-0 left-4 z-0 w-[1.5px] -translate-x-1/2 rounded-full bg-border-strong sm:left-[1.125rem]"
          aria-hidden="true"
        />
      ) : null}

      <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2.5 rounded-[20px] transition-colors sm:grid-cols-[2.25rem_minmax(0,1fr)]">
        <div className="relative flex justify-center">
          <AuthorAvatar
            anonymous={Boolean(reply.author.anonymous)}
            author={reply.author}
            href={psychologistProfileHref ?? undefined}
            onProfileClick={psychologistProfileHref ? stopReplyTreeCollapsePropagation : undefined}
            size={avatarSize}
          />
        </div>

        <div className="min-w-0 rounded-[18px] px-0.5 py-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="grid min-w-0 gap-1">
              <div className="flex min-w-0 items-center gap-x-2">
                <div className="flex min-w-0 items-center gap-[5px]">
                  {isProfessional ? (
                    <Link
                      className="truncate text-sm font-black text-inherit no-underline hover:text-inherit hover:no-underline"
                      href={`/psicologos/${reply.author.id}`}
                      onClick={stopReplyTreeCollapsePropagation}
                    >
                      {authorDisplayName}
                    </Link>
                  ) : (
                    <h3 className="truncate text-sm font-black">{authorDisplayName}</h3>
                  )}
                  {reply.author.verified ? (
                    <BadgeCheck
                      className="h-4 w-4 shrink-0 fill-primary text-primary-foreground"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
                <MentorBadge
                  badge={reply.author.featured_badge}
                  href={psychologistProfileHref ?? undefined}
                  onClick={psychologistProfileHref ? stopReplyTreeCollapsePropagation : undefined}
                />
              </div>
              {psychologistProfileHref ? (
                <Link
                  className="w-fit cursor-pointer text-[11px] font-semibold text-muted no-underline hover:text-muted hover:no-underline"
                  href={psychologistProfileHref}
                  onClick={stopReplyTreeCollapsePropagation}
                >
                  {formatReplyAuthorMeta(
                    reply.author,
                    reply.created_at,
                    reply.edited_at,
                    reply.is_post_author,
                  )}
                </Link>
              ) : (
                <p className="text-[11px] font-semibold text-muted">
                  {formatReplyAuthorMeta(
                    reply.author,
                    reply.created_at,
                    reply.edited_at,
                    reply.is_post_author,
                  )}
                </p>
              )}
            </div>
          </div>

          <div>
            <InlineExpandableText
              className="mt-2 text-sm leading-6 text-muted dark:text-muted"
              expanded={contentExpanded}
              maxLines={4}
              onToggle={() => setContentExpanded((current) => !current)}
              text={reply.content}
            />
          </div>
          <div data-comment-collapse-ignore="true">
            <CommunityMediaBlock
              alt="Mídia da resposta"
              analyticsTarget={
                reply.media_type === "video"
                  ? { targetId: reply.id, targetType: "reply" }
                  : undefined
              }
              className="mt-3"
              footer={hasReplyMedia ? replyWhatsappCta : undefined}
              mediaType={reply.media_type}
              mediaUrl={reply.media_url}
              roundedClassName="rounded-[18px]"
              variant="reply"
            />
          </div>

          {replyWhatsappCta && !hasReplyMedia ? (
            <div className="mt-2" data-comment-collapse-ignore="true">
              {replyWhatsappCta}
            </div>
          ) : null}

          <div data-comment-collapse-ignore="true">
            <ReplyVoteBar
              currentVote={reply.current_user_vote}
              deletePending={deleteReplyPending}
              disabled={votePending}
              isOwnReply={isOwnReply}
              onDelete={() => onDeleteReply(reply)}
              onEdit={() => setEditModalOpen(true)}
              onReply={() => onReply(reply)}
              onReport={() => onReportReply(reply)}
              onShare={() => onShare(reply)}
              onToggleSave={toggleSaveReply}
              onVote={(value) => onVote(reply.id, value)}
              reply={reply}
              savePending={saveReplyMutation.isPending}
            />
          </div>

          {canToggleRootTree ? (
            <div className="mt-1" data-comment-collapse-ignore="true">
              <button
                aria-controls={hasTreeContinuation ? `reply-children-${reply.id}` : undefined}
                aria-expanded={!childrenHiddenByCollapse}
                aria-label={
                  childrenHiddenByCollapse
                    ? `Ver ${collapsedRepliesCount} ${
                        collapsedRepliesCount === 1 ? "resposta" : "respostas"
                      } desta conversa`
                    : "Ocultar respostas desta conversa"
                }
                className="inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-muted transition hover:bg-surface-muted hover:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 active:scale-[0.98] dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleRootTreeCollapse();
                }}
                type="button"
              >
                {childrenHiddenByCollapse ? (
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <ChevronUp className="h-3 w-3" aria-hidden="true" />
                )}
                <span className="whitespace-nowrap text-[12px] font-semibold leading-none tracking-[-0.01em]">
                  {childrenHiddenByCollapse
                    ? `Ver respostas (${collapsedRepliesCount})`
                    : "Ocultar respostas"}
                </span>
              </button>
            </div>
          ) : null}

          {isOwnReply && editModalOpen ? (
            <ReplyEditModal
              onClose={() => setEditModalOpen(false)}
              open={editModalOpen}
              postId={postId}
              reply={reply}
              sourceText={postSourceText}
            />
          ) : null}

          {isReplyComposerOpen ? (
            <div data-comment-collapse-ignore="true">
              <ReplyComposer
                apiError={replyApiError}
                disabled={replyDisabled}
                formRef={activeInlineReplyFormRef}
                mediaPermission={mediaPermission}
                onCancelContext={() => onCancelInlineReplyTarget(reply.id)}
                onDraftStateChange={onInlineReplyDraftChange}
                onSubmit={(values, mediaFile) => onSubmitReply(values, reply.id, mediaFile)}
                replyTarget={inlineReplyTarget}
                variant="inline"
                autoFocus
              />
            </div>
          ) : null}
        </div>
      </div>

      {hasTreeContinuation ? (
        <div
          className="relative z-10 mt-2 ml-4 grid gap-3 pl-[18px] sm:ml-[18px] sm:pl-[22px]"
          id={`reply-children-${reply.id}`}
        >
          {visibleChildren.map((child) => (
            <div className="relative" key={child.id}>
              <svg
                className="pointer-events-none absolute top-0 -left-[18px] z-0 h-5 w-[18px] overflow-visible text-border-strong sm:-left-[22px] sm:w-[22px]"
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 22 20"
              >
                <path
                  d="M0 0 V10 C0 14.4 3.6 18 8 18 H22"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <ReplyCard
                activeInlineReplyFormRef={activeInlineReplyFormRef}
                currentUserId={currentUserId}
                deleteReplyPending={deleteReplyPending}
                depth={depth + 1}
                inlineReplyTargets={inlineReplyTargets}
                focusReplyId={focusReplyId}
                maxInlineDepth={maxInlineDepth}
                mediaPermission={mediaPermission}
                onCancelInlineReplyTarget={onCancelInlineReplyTarget}
                onInlineReplyDraftChange={onInlineReplyDraftChange}
                onDeleteReply={onDeleteReply}
                onReply={onReply}
                onReportReply={onReportReply}
                onShare={onShare}
                onSubmitReply={onSubmitReply}
                onVote={onVote}
                postId={postId}
                postSourceText={postSourceText}
                professionalThread={highlightedProfessionalThread}
                reply={child}
                replyApiError={replyApiError}
                replyDisabled={replyDisabled}
                threadHrefBase={threadHrefBase}
                votePending={votePending}
              />
            </div>
          ))}
          {hiddenRepliesCount > 0 && threadHref ? (
            <Link
              className="group inline-flex w-fit items-center gap-2 rounded-full py-1 pr-2 text-[11px] font-black text-primary no-underline transition hover:text-primary hover:no-underline"
              data-comment-collapse-ignore="true"
              href={threadHref}
              onClick={stopReplyTreeCollapsePropagation}
            >
              <span
                className="h-px w-5 rounded-full bg-surface-muted transition group-hover:bg-primary/45 dark:bg-border"
                aria-hidden="true"
              />
              <span>
                Ver mais {hiddenRepliesCount} {hiddenRepliesCount === 1 ? "resposta" : "respostas"}
              </span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};
