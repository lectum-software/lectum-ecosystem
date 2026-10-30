"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";

type VisibilityActor = { id?: string; role?: string | null };

export const canManageReplyProfileVisibility = ({
  allowProfileVisibility = false,
  author,
  currentUser,
}: {
  allowProfileVisibility?: boolean;
  author: VisibilityActor;
  currentUser?: VisibilityActor | null;
}) =>
  Boolean(
    allowProfileVisibility &&
      currentUser?.id &&
      currentUser.id === author.id &&
      currentUser.role === "psicologo" &&
      author.role === "psicologo",
  );

export const ReplyProfileVisibilityAction = ({
  disabled,
  hidden,
  onToggle,
  pending,
}: {
  disabled: boolean;
  hidden: boolean;
  onToggle: (hidden: boolean) => void;
  pending: boolean;
}) => {
  const Icon = pending ? Loader2 : hidden ? Eye : EyeOff;
  return (
    <button
      aria-busy={pending}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled || pending}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled && !pending) onToggle(!hidden);
      }}
      role="menuitem"
      type="button"
    >
      <Icon className={`h-4 w-4 shrink-0${pending ? " animate-spin" : ""}`} aria-hidden="true" />
      {hidden ? "Exibir no perfil público" : "Ocultar do perfil público"}
    </button>
  );
};
