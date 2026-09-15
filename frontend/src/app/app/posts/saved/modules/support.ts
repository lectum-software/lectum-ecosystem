import { getSafeApiErrorMessage } from "@/api/errors";
import type { CommunityAuthor } from "@/api/generator/types/community";
import type { PostListPost } from "@/api/generator/types/posts";
import { formatCommunityRelativeTime as formatRelativeTime } from "@/utils/community-display";

export const PAGE_LIMIT = 10;

export const resolvePostsError = (error: unknown) => {
  const rawMessage = getSafeApiErrorMessage(error, "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar itens salvos.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar ao serviço agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar seus itens salvos agora.";
};

export const formatAuthorMeta = (author: CommunityAuthor, createdAt: string) => {
  const relativeTime = formatRelativeTime(createdAt);

  if (author.role !== "psicologo" || !author.type_label) return relativeTime;

  return `${author.type_label} • ${relativeTime}`;
};

export const savedReplyHref = (post: PostListPost, replyId: string) =>
  `/comunidades/${post.community.slug}/publicacao/${post.id}?focusReplyId=${encodeURIComponent(replyId)}#reply-${replyId}`;

export const isSavedCardInteractiveTarget = (target: EventTarget | null) => {
  const targetElement =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;

  if (!targetElement) return false;

  return Boolean(
    targetElement.closest(
      [
        "a",
        "button",
        "input",
        "textarea",
        "select",
        "video",
        "audio",
        "[role='button']",
        "[role='menu']",
        "[role='menuitem']",
        "[role='dialog']",
        "[aria-modal='true']",
        "[data-comment-collapse-ignore='true']",
        "[data-community-action-bar]",
        "[data-post-card-ignore-click]",
        "[data-post-card-menu]",
        "[data-reply-open-trigger]",
      ].join(","),
    ),
  );
};
