"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { type ReplyBranchAction, replyBranchActionLabel } from "@/utils/reply-branch-disclosure";
import { stopReplyTreeCollapsePropagation } from "../modules/reply-support";

export const ReplyBranchFooter = ({
  action,
  canCollapseTree,
  canRevealLoadedChildren,
  descendantsCount,
  depth,
  onCollapse,
  onExpand,
  replyId,
  threadHref,
  visibleCount,
}: {
  action: ReplyBranchAction | null;
  canCollapseTree: boolean;
  canRevealLoadedChildren: boolean;
  descendantsCount?: number;
  depth: number;
  onCollapse: () => void;
  onExpand: () => void;
  replyId: string;
  threadHref: string | null;
  visibleCount: number;
}) => {
  const reveal = action?.kind !== "collapse" ? action : null;
  const label = replyBranchActionLabel(reveal, descendantsCount);
  const collapse = depth === 0 && canCollapseTree;
  const showReveal = label && (canRevealLoadedChildren || threadHref);
  if (!showReveal && !collapse) return null;

  return (
    <div
      className={cn(
        "relative z-10 mt-2 grid justify-items-start gap-2",
        depth > 0 ? "ml-3 pl-[10px]" : "ml-4 pl-[10px] sm:ml-[18px]",
      )}
      data-comment-collapse-ignore="true"
    >
      {showReveal ? (
        <div className="flex h-5 items-center">
          {!canRevealLoadedChildren && threadHref ? (
            <Link
              aria-label={`${label} desta conversa`}
              className="inline-flex w-fit items-center gap-0.5 rounded-full px-0.5 py-0.5 text-[10px] font-bold leading-none text-muted no-underline transition hover:bg-surface-muted hover:text-foreground hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              href={threadHref}
              onClick={stopReplyTreeCollapsePropagation}
            >
              <span>{label}</span>
              <ChevronDown className="h-2.5 w-2.5" aria-hidden="true" />
            </Link>
          ) : (
            <button
              aria-controls={visibleCount > 0 ? `reply-children-${replyId}` : undefined}
              aria-expanded={visibleCount > 0}
              aria-label={`${label} desta conversa`}
              className="inline-flex w-fit items-center gap-0.5 rounded-full px-0.5 py-0.5 !text-[10px] !font-bold !leading-none text-muted transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 active:scale-[0.98]"
              onClick={(event) => {
                event.stopPropagation();
                onExpand();
              }}
              type="button"
            >
              <span>{label}</span>
              <ChevronDown className="h-2.5 w-2.5" aria-hidden="true" />
            </button>
          )}
        </div>
      ) : null}
      {collapse ? (
        <div className="flex h-5 items-center">
          <button
            aria-controls={`reply-children-${replyId}`}
            aria-expanded="true"
            aria-label="Ocultar todas as respostas desta conversa"
            className="inline-flex w-fit items-center gap-0.5 rounded-full px-0.5 py-0.5 !text-[10px] !font-bold !leading-none text-muted transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 active:scale-[0.98]"
            onClick={(event) => {
              event.stopPropagation();
              onCollapse();
            }}
            type="button"
          >
            <span>Ocultar respostas</span>
            <ChevronUp className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
};
