"use client";

import { ArrowDown, ArrowUp, Bookmark, MessageCircle, Share2 } from "lucide-react";
import type { MouseEventHandler, ReactNode } from "react";
import {
  PostActionButton,
  PostActionLink,
  PostActionMetric,
} from "@/components/community/post-action-button";
import { VoteActionButton, type VoteValue } from "@/components/community/vote-action-button";
import { cn } from "@/lib/utils";

type ActionHandler = MouseEventHandler<HTMLButtonElement>;
type CommunityActionSize = "xs" | "sm" | "md";
type VotePresentation = "cluster" | "inline";

type ActionWithCount = {
  count?: number;
  href?: string;
  label?: string;
  onClick?: ActionHandler;
  tipTarget?: string;
};

type SaveAction = {
  active?: boolean;
  count?: number;
  disabled?: boolean;
  label?: string;
  onClick?: ActionHandler;
  textLabel?: string;
  textOnly?: boolean;
};

type ShareAction = {
  count?: number;
  label?: string;
  onClick?: ActionHandler;
  textLabel?: string;
  textOnly?: boolean;
};

export type CommunityActionBarProps = {
  className?: string;
  comments?: ActionWithCount;
  currentVote?: VoteValue;
  disabled?: boolean;
  endSlotAlignment?: "trailing" | "inline";
  endSlot?: ReactNode;
  reply?: {
    iconOnly?: boolean;
    label?: string;
    onClick: ActionHandler;
    textOnly?: boolean;
    tipTarget?: string;
  };
  save?: SaveAction;
  secondaryActionsPlacement?: "trailing" | "inline";
  share?: ShareAction;
  size?: CommunityActionSize;
  downvotesCount?: number;
  upvotesCount: number;
  voteLabel?: string;
  votePresentation?: VotePresentation;
  showUpvoteText?: boolean;
  onVote?: (value: 1 | -1) => void;
};

const actionBarClassName = (size: CommunityActionSize) =>
  cn(
    "flex w-full min-w-0 flex-nowrap items-center whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
    size === "xs"
      ? "gap-1 overflow-visible"
      : "gap-1.5 overflow-x-auto sm:gap-1.5 sm:overflow-visible",
  );

const voteClusterClassName = (size: CommunityActionSize, presentation: VotePresentation) => {
  if (presentation === "inline") {
    return cn(
      "inline-flex shrink-0 items-center gap-0.5 overflow-visible bg-transparent p-0 ring-0",
      size === "xs" ? "h-7" : size === "md" ? "h-10" : "h-9",
    );
  }

  return cn(
    "inline-flex shrink-0 items-center overflow-visible rounded-full border border-border bg-surface-muted p-px dark:border-border dark:bg-surface-muted",
    size === "xs" ? "min-h-8" : size === "md" ? "min-h-10" : "min-h-9",
  );
};

const clusteredVoteControlClassName = (
  size: CommunityActionSize,
  presentation: VotePresentation,
) => {
  if (presentation !== "cluster" || size === "xs") return undefined;

  return size === "md" ? "h-9" : "h-8";
};

const separatorClassName = (size: CommunityActionSize, presentation: VotePresentation) =>
  cn(
    "w-px bg-surface-muted dark:bg-border",
    presentation === "inline" && "hidden",
    size === "xs" ? "h-4" : "h-5",
  );

const textOnlyReplyClassName = (size: CommunityActionSize) =>
  cn(
    "inline-flex min-w-0 items-center justify-center rounded-md leading-none tracking-[-0.01em] text-muted transition-[color,transform] duration-200 hover:text-foreground active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-60",
    size === "xs"
      ? "h-7 shrink px-1"
      : size === "md"
        ? "h-10 shrink-0 px-3"
        : "h-9 shrink-0 px-2.5",
  );

const textOnlyReplyTextClassName =
  "block min-w-0 truncate whitespace-nowrap text-[12px] font-semibold leading-none tracking-[-0.01em]";

const stopActionPropagation =
  (handler?: ActionHandler): ActionHandler =>
  (event) => {
    event.stopPropagation();
    handler?.(event);
  };

export const CommunityActionBar = ({
  className,
  comments,
  currentVote = null,
  disabled,
  endSlotAlignment = "trailing",
  endSlot,
  onVote,
  reply,
  save,
  secondaryActionsPlacement = "trailing",
  share,
  showUpvoteText = true,
  size = "sm",
  downvotesCount,
  upvotesCount,
  voteLabel = "Marcar como útil",
  votePresentation = "cluster",
}: CommunityActionBarProps) => {
  const canVote = Boolean(onVote);
  const inlineEndSlot = endSlotAlignment === "inline";
  const shouldRenderSecondaryActionsInline = secondaryActionsPlacement === "inline";

  const renderSaveAction = () => {
    if (!save) return null;

    const saveLabel = save.label ?? (save.active ? "Remover dos salvos" : "Salvar");
    const saveTextLabel = save.textLabel ?? (save.active ? "Salvo" : "Salvar");

    if (save.textOnly) {
      const className = cn(
        textOnlyReplyClassName(size),
        save.active && "text-primary hover:text-primary",
      );

      return save.onClick ? (
        <button
          aria-label={saveLabel}
          aria-pressed={save.active}
          className={className}
          disabled={save.disabled}
          onClick={stopActionPropagation(save.onClick)}
          title={saveLabel}
          type="button"
        >
          <span className={textOnlyReplyTextClassName}>{saveTextLabel}</span>
        </button>
      ) : (
        <span className={className} title={saveLabel}>
          <span className={textOnlyReplyTextClassName}>{saveTextLabel}</span>
        </span>
      );
    }

    return save.onClick ? (
      <PostActionButton
        active={save.active}
        count={save.count}
        disabled={save.disabled}
        icon={Bookmark}
        iconClassName={save.active ? "fill-current" : undefined}
        label={saveLabel}
        onClick={stopActionPropagation(save.onClick)}
        size={size}
      />
    ) : (
      <PostActionMetric
        active={save.active}
        count={save.count}
        icon={Bookmark}
        iconClassName={save.active ? "fill-current" : undefined}
        label={save.label ?? "Salvar"}
        size={size}
      />
    );
  };

  const renderShareAction = () => {
    if (!share) return null;

    const shareLabel = share.label ?? "Compartilhar";
    const shareTextLabel = share.textLabel ?? "Compartilhar";

    if (share.textOnly) {
      const className = textOnlyReplyClassName(size);

      return share.onClick ? (
        <button
          aria-label={shareLabel}
          className={className}
          onClick={stopActionPropagation(share.onClick)}
          title={shareLabel}
          type="button"
        >
          <span className={textOnlyReplyTextClassName}>{shareTextLabel}</span>
        </button>
      ) : (
        <span className={className} title={shareLabel}>
          <span className={textOnlyReplyTextClassName}>{shareTextLabel}</span>
        </span>
      );
    }

    return share.onClick ? (
      <PostActionButton
        count={share.count}
        icon={Share2}
        label={shareLabel}
        onClick={stopActionPropagation(share.onClick)}
        size={size}
      />
    ) : (
      <PostActionMetric count={share.count} icon={Share2} label={shareLabel} size={size} />
    );
  };

  return (
    <div
      className={cn(actionBarClassName(size), className)}
      data-comment-collapse-ignore="true"
      data-community-action-bar={size}
    >
      <div
        className={cn(
          "flex min-w-0 flex-nowrap items-center sm:flex-none",
          inlineEndSlot ? "flex-1 overflow-hidden sm:flex-none sm:overflow-visible" : "flex-1",
          size === "xs" ? "gap-1 sm:gap-1.5" : "gap-1.5",
        )}
      >
        <div className={voteClusterClassName(size, votePresentation)}>
          {canVote && onVote ? (
            <VoteActionButton
              className={clusteredVoteControlClassName(size, votePresentation)}
              count={upvotesCount}
              currentVote={currentVote}
              disabled={disabled}
              icon={ArrowUp}
              label={voteLabel}
              onVote={onVote}
              showUpvoteText={showUpvoteText}
              size={size}
              value={1}
              variant={votePresentation === "inline" ? "ghost" : "default"}
            />
          ) : (
            <PostActionMetric
              className={clusteredVoteControlClassName(size, votePresentation)}
              count={upvotesCount}
              icon={ArrowUp}
              label={voteLabel}
              size={size}
            >
              Útil
            </PostActionMetric>
          )}
          <span className={separatorClassName(size, votePresentation)} aria-hidden="true" />
          {canVote && onVote ? (
            <VoteActionButton
              className={clusteredVoteControlClassName(size, votePresentation)}
              count={downvotesCount}
              currentVote={currentVote}
              disabled={disabled}
              icon={ArrowDown}
              label="Dar downvote"
              onVote={onVote}
              showPositiveDelta={false}
              size={size}
              value={-1}
              variant={votePresentation === "inline" ? "ghost" : "default"}
            />
          ) : (
            <PostActionMetric
              className={clusteredVoteControlClassName(size, votePresentation)}
              count={downvotesCount}
              icon={ArrowDown}
              label="Dar downvote"
              size={size}
            />
          )}
        </div>

        {comments ? (
          comments.href ? (
            <PostActionLink
              count={comments.count}
              data-psychologist-tip-target={comments.tipTarget}
              href={comments.href}
              icon={MessageCircle}
              label={comments.label ?? "Comentar"}
              size={size}
            />
          ) : comments.onClick ? (
            <PostActionButton
              count={comments.count}
              data-psychologist-tip-target={comments.tipTarget}
              icon={MessageCircle}
              label={comments.label ?? "Comentar"}
              onClick={stopActionPropagation(comments.onClick)}
              size={size}
            />
          ) : (
            <PostActionMetric
              count={comments.count}
              icon={MessageCircle}
              label={comments.label ?? "Comentários"}
              size={size}
            />
          )
        ) : null}

        {reply?.textOnly ? (
          <button
            aria-label={reply.label ?? "Responder"}
            className={textOnlyReplyClassName(size)}
            data-psychologist-tip-target={reply.tipTarget}
            data-reply-open-trigger="true"
            onClick={stopActionPropagation(reply.onClick)}
            title={reply.label ?? "Responder"}
            type="button"
          >
            <span className={textOnlyReplyTextClassName}>{reply.label ?? "Responder"}</span>
          </button>
        ) : reply ? (
          <PostActionButton
            data-psychologist-tip-target={reply.tipTarget}
            icon={MessageCircle}
            label={reply.label ?? "Responder"}
            onClick={stopActionPropagation(reply.onClick)}
            size={size}
          >
            {reply.iconOnly ? null : "Responder"}
          </PostActionButton>
        ) : null}

        {shouldRenderSecondaryActionsInline ? (
          <>
            {renderSaveAction()}
            {renderShareAction()}
          </>
        ) : null}
      </div>

      <div
        className={cn(
          "flex shrink-0 flex-nowrap items-center",
          inlineEndSlot
            ? size === "xs"
              ? "gap-0.5 pl-0.5"
              : "gap-1 pl-1"
            : size === "xs"
              ? "ml-auto gap-0.5 pl-1 sm:ml-0 sm:gap-1 sm:pl-1"
              : "ml-auto gap-1 pl-2 sm:ml-0 sm:gap-1 sm:pl-1",
        )}
      >
        {shouldRenderSecondaryActionsInline ? null : renderSaveAction()}

        {shouldRenderSecondaryActionsInline ? null : renderShareAction()}

        {endSlot}
      </div>
    </div>
  );
};
