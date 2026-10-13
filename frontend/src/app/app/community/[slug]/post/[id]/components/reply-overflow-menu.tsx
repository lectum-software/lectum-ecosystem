"use client";

import { Flag, MoreHorizontal } from "lucide-react";
import { useRef, useState } from "react";
import { usePostDetail } from "@/api/callers/posts";
import type { PostReply } from "@/api/generator/types/posts";
import { ReplyMenuSurface } from "@/components/community/reply-menu-surface";
import { ReplyOwnerActionMenu } from "@/components/community/reply-owner-action-menu";
import {
  type ReplySecondaryActions,
  ReplySecondaryMenuActions,
} from "@/components/community/reply-secondary-menu-actions";

export type ReplyOverflowMenuProps = {
  deletePending?: boolean;
  isOwnReply: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onReport: (trigger: HTMLButtonElement | null) => void;
  postId: string;
  reply: PostReply;
  secondaryActions?: ReplySecondaryActions;
};

export const ReplyOverflowMenu = ({
  isOwnReply,
  onEdit,
  onReport,
  postId,
  reply,
  secondaryActions,
}: ReplyOverflowMenuProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const detail = usePostDetail(postId, isOwnReply);
  if (isOwnReply) {
    if (!detail.data)
      return (
        <span className="h-8 w-8" role="status">
          {" "}
          <span className="sr-only">Carregando ações</span>
        </span>
      );
    return (
      <div data-comment-collapse-ignore="true">
        <ReplyOwnerActionMenu
          onEdit={onEdit}
          secondaryActions={secondaryActions}
          post={detail.data.post}
          reply={{
            ...reply,
            parent_content: null,
            replies_received_count: reply.replies_count,
          }}
        />
      </div>
    );
  }
  const replyKind = reply.parent_reply_id ? "da resposta" : "do comentário";
  return (
    <div className="relative shrink-0" data-comment-collapse-ignore="true">
      <button
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={`Mais ações ${replyKind}`}
        className="grid h-7 w-7 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground"
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((open) => !open);
        }}
        ref={trigger}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" className="h-[18px] w-[18px]" />
      </button>
      {menuOpen ? (
        <ReplyMenuSurface triggerRef={trigger} onClose={() => setMenuOpen(false)} width={224}>
          {secondaryActions ? (
            <ReplySecondaryMenuActions {...secondaryActions} onClose={() => setMenuOpen(false)} />
          ) : null}
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-muted hover:bg-surface-muted"
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen(false);
              onReport(trigger.current);
            }}
            role="menuitem"
            type="button"
          >
            <Flag aria-hidden="true" className="h-4 w-4" />
            Denunciar
          </button>
        </ReplyMenuSurface>
      ) : null}
    </div>
  );
};
