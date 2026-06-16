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
  };
  save?: SaveAction;
  share?: ShareAction;
  upvotesCount: number;
  voteLabel?: string;
  onVote?: (value: 1 | -1) => void;
};

const actionBarClassName =
  "flex w-full min-w-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-2 sm:overflow-visible";

const voteClusterClassName =
  "inline-flex h-8 shrink-0 items-center overflow-visible rounded-full bg-[#F4F6F8] p-0.5 ring-1 ring-[#E7ECF2] dark:bg-surface-muted dark:ring-border";

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
  upvotesCount,
  voteLabel = "Marcar como útil",
}: CommunityActionBarProps) => {
  const canVote = Boolean(onVote);

  return (
    <div className={cn(actionBarClassName, className)}>
      <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
        <div className={voteClusterClassName}>
          {canVote && onVote ? (
            <VoteActionButton
              count={upvotesCount}
              currentVote={currentVote}
              disabled={disabled}
              icon={ArrowUp}
              label={voteLabel}
              onVote={onVote}
              size="sm"
              value={1}
            />
          ) : (
            <PostActionMetric count={upvotesCount} icon={ArrowUp} label={voteLabel} size="sm">
              Útil
            </PostActionMetric>
          )}
          <span className="h-4 w-px bg-[#DDE4EC] dark:bg-border" aria-hidden="true" />
          {canVote && onVote ? (
            <VoteActionButton
              currentVote={currentVote}
              disabled={disabled}
              icon={ArrowDown}
              label="Dar downvote"
              onVote={onVote}
              showPositiveDelta={false}
              size="sm"
              value={-1}
            />
          ) : (
            <PostActionMetric icon={ArrowDown} label="Dar downvote" size="sm" />
          )}
        </div>

        {comments ? (
          comments.href ? (
            <PostActionLink
              count={comments.count}
              href={comments.href}
              icon={MessageCircle}
              label={comments.label ?? "Comentar"}
              size="sm"
            />
          ) : comments.onClick ? (
            <PostActionButton
              count={comments.count}
              icon={MessageCircle}
              label={comments.label ?? "Comentar"}
              onClick={comments.onClick}
              size="sm"
            />
          ) : (
            <PostActionMetric
              count={comments.count}
              icon={MessageCircle}
              label={comments.label ?? "Comentários"}
              size="sm"
            />
          )
        ) : null}

        {reply ? (
          <PostActionButton
            icon={Reply}
            label={reply.label ?? "Responder"}
            onClick={reply.onClick}
            size="sm"
          >
            Responder
          </PostActionButton>
        ) : null}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {save ? (
          save.onClick ? (
            <PostActionButton
              active={save.active}
              count={save.count}
              disabled={save.disabled}
              icon={Bookmark}
              iconClassName={save.active ? "fill-current" : undefined}
              label={save.label ?? (save.active ? "Remover dos salvos" : "Salvar")}
              onClick={save.onClick}
              size="sm"
            />
          ) : (
            <PostActionMetric
              active={save.active}
              count={save.count}
              icon={Bookmark}
              iconClassName={save.active ? "fill-current" : undefined}
              label={save.label ?? "Salvar"}
              size="sm"
            />
          )
        ) : null}

        {share ? (
          share.onClick ? (
            <PostActionButton
              icon={Share2}
              label={share.label ?? "Compartilhar"}
              onClick={share.onClick}
              size="sm"
            />
          ) : (
            <PostActionMetric icon={Share2} label={share.label ?? "Compartilhar"} size="sm" />
          )
        ) : null}

        {endSlot}
      </div>
    </div>
  );
};
