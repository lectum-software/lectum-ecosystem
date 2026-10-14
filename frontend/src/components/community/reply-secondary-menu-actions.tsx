"use client";

import { Bookmark, Share2 } from "lucide-react";
import type { MouseEventHandler } from "react";
import { cn } from "@/lib/utils";

export type ReplySecondaryActions = {
  saved: boolean;
  savePending?: boolean;
  onToggleSave: MouseEventHandler<HTMLButtonElement>;
  onShare: () => void;
};

export const ReplySecondaryMenuActions = ({
  saved,
  savePending,
  onToggleSave,
  onShare,
  onClose,
}: ReplySecondaryActions & { onClose: () => void }) => (
  <>
    <button
      aria-checked={saved}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold disabled:opacity-60",
        saved
          ? "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary"
          : "text-muted hover:bg-surface-muted",
      )}
      disabled={savePending}
      onClick={(event) => {
        event.stopPropagation();
        onClose();
        onToggleSave(event);
      }}
      role="menuitemcheckbox"
      type="button"
    >
      <Bookmark
        aria-hidden="true"
        className="h-4 w-4 shrink-0"
        fill={saved ? "currentColor" : "none"}
      />
      {saved ? "Remover dos salvos" : "Salvar"}
    </button>
    <button
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-muted hover:bg-surface-muted"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
        onShare();
      }}
      role="menuitem"
      type="button"
    >
      <Share2 aria-hidden="true" className="h-4 w-4 shrink-0" />
      Compartilhar
    </button>
  </>
);
