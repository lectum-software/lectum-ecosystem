"use client";

import { ArrowDown, ArrowUp, Bookmark, MessageCircle, Reply, Share2 } from "lucide-react";
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
};

type SaveAction = {
  active?: boolean;
  count?: number;
  disabled?: boolean;
  label?: string;
  onClick?: ActionHandler;
};

type ShareAction = {
  label?: string;
  onClick?: ActionHandler;
};

export type CommunityActionBarProps = {
  className?: string;
  comments?: ActionWithCount;
  currentVote?: VoteValue;
  disabled?: boolean;
  endSlot?: ReactNode;
  reply?: {
    label?: string;
    onClick: ActionHandler;
    textOnly?: boolean;
  };
  save?: SaveAction;
  share?: ShareAction;
  size?: CommunityActionSize;
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
      : "gap-1.5 overflow-x-auto sm:gap-2 sm:overflow-visible",
  );

const voteClusterClassName = (size: CommunityActionSize, presentation: VotePresentation) => {
  if (presentation === "inline") {
    return cn(
      "inline-flex shrink-0 items-center gap-0.5 overflow-visible bg-transparent p-0 ring-0",
      size === "xs" ? "h-6" : size === "md" ? "h-9" : "h-8",
    );
  }

  return cn(
    "inline-flex shrink-0 items-center overflow-visible rounded-full bg-[#F4F6F8] p-0.5 ring-1 ring-[#E7ECF2] dark:bg-surface-muted dark:ring-border",
    size === "xs" ? "h-7" : size === "md" ? "h-9" : "h-8",
  );
};

const separatorClassName = (size: CommunityActionSize, presentation: VotePresentation) =>
  cn(
    "w-px bg-[#DDE4EC] dark:bg-border",
    presentation === "inline" && "hidden",
    size === "xs" ? "h-3.5" : "h-4",
  );

const textOnlyReplyClassName = (size: CommunityActionSize) =>
  cn(
    "inline-flex min-w-0 items-center justify-center rounded-md leading-none tracking-[-0.01em] text-muted transition-[color,transform] duration-200 hover:text-foreground active:scale-[0.97]",
    size === "xs" ? "h-6 max-w-[4.5rem] shrink px-1" : "h-8 shrink-0 px-2",
  );

const textOnlyReplyTextClassName = (size: CommunityActionSize) =>
  cn(
    "block min-w-0 truncate leading-none tracking-[-0.01em]",
    size === "xs" ? "text-[10px] font-semibold" : "text-[11px] font-medium",
  );

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
  endSlot,
  onVote,
  reply,
  save,
  share,
  showUpvoteText = true,
  size = "sm",
  upvotesCount,
  voteLabel = "Marcar como útil",
  votePresentation = "cluster",
}: CommunityActionBarProps) => {
  const canVote = Boolean(onVote);

  return (
    <div
      className={cn(actionBarClassName(size), className)}
      data-comment-collapse-ignore="true"
      data-community-action-bar={size}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-nowrap items-center",
          size === "xs" ? "gap-1" : "gap-1.5 sm:gap-2",
        )}
      >
        <div className={voteClusterClassName(size, votePresentation)}>
          {canVote && onVote ? (
            <VoteActionButton
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
            <PostActionMetric count={upvotesCount} icon={ArrowUp} label={voteLabel} size={size}>
              Útil
            </PostActionMetric>
          )}
          <span className={separatorClassName(size, votePresentation)} aria-hidden="true" />
          {canVote && onVote ? (
            <VoteActionButton
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
            <PostActionMetric icon={ArrowDown} label="Dar downvote" size={size} />
          )}
        </div>

        {comments ? (
          comments.href ? (
            <PostActionLink
              count={comments.count}
              href={comments.href}
              icon={MessageCircle}
              label={comments.label ?? "Comentar"}
              size={size}
            />
          ) : comments.onClick ? (
            <PostActionButton
              count={comments.count}
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
            onClick={stopActionPropagation(reply.onClick)}
            title={reply.label ?? "Responder"}
            type="button"
          >
            <span className={textOnlyReplyTextClassName(size)}>{reply.label ?? "Responder"}</span>
          </button>
        ) : reply ? (
          <PostActionButton
            icon={Reply}
            label={reply.label ?? "Responder"}
            onClick={stopActionPropagation(reply.onClick)}
            size={size}
          >
            Responder
          </PostActionButton>
        ) : null}
      </div>

      <div
        className={cn(
          "flex shrink-0 flex-nowrap items-center",
          size === "xs" ? "ml-auto gap-0.5 pl-1" : "ml-auto gap-1 pl-2",
        )}
      >
        {save ? (
          save.onClick ? (
            <PostActionButton
              active={save.active}
              count={save.count}
              disabled={save.disabled}
              icon={Bookmark}
              iconClassName={save.active ? "fill-current" : undefined}
              label={save.label ?? (save.active ? "Remover dos salvos" : "Salvar")}
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
          )
        ) : null}

        {share ? (
          share.onClick ? (
            <PostActionButton
              icon={Share2}
              label={share.label ?? "Compartilhar"}
              onClick={stopActionPropagation(share.onClick)}
              size={size}
            />
          ) : (
            <PostActionMetric icon={Share2} label={share.label ?? "Compartilhar"} size={size} />
          )
        ) : null}

        {endSlot}
      </div>
    </div>
  );
};
