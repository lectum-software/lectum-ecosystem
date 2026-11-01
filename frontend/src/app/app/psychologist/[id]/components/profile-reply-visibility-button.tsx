"use client";

import { EyeOff, Loader2 } from "lucide-react";
import { useReplyProfileVisibility } from "@/api/callers/posts/reply-profile-visibility";
import type { DirectoryPsychologistProfilePost } from "@/api/generator/types/directory";
import { canManageReplyProfileVisibility } from "@/components/community/reply-profile-visibility-action";
import { useAppSelector } from "@/hooks/redux";

export const ProfileReplyVisibilityButton = ({
  post,
}: {
  post: DirectoryPsychologistProfilePost;
}) => {
  const currentUser = useAppSelector((state) => state.user);
  const mutation = useReplyProfileVisibility();
  const reply = post.highlighted_professional_reply;
  if (
    post.contribution_type !== "reply" ||
    !reply ||
    !canManageReplyProfileVisibility({
      allowProfileVisibility: true,
      author: reply.author,
      currentUser,
    })
  )
    return null;
  const Icon = mutation.isPending ? Loader2 : EyeOff;
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Ocultar do perfil público"
        title="Ocultar do perfil público"
        aria-busy={mutation.isPending}
        disabled={mutation.isPending}
        className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-60"
        onClick={(event) => {
          event.stopPropagation();
          if (!mutation.isPending)
            mutation.mutate({ postId: post.id, replyId: reply.id, hidden: true });
        }}
      >
        <Icon
          aria-hidden="true"
          className={`h-4 w-4${mutation.isPending ? " animate-spin" : ""}`}
        />
      </button>
      {mutation.isError ? (
        <p
          role="alert"
          className="absolute right-0 z-20 w-48 rounded-lg border border-danger-border bg-surface p-3 text-xs text-danger"
        >
          Não foi possível ocultar. Tente novamente.
        </p>
      ) : null}
    </div>
  );
};
