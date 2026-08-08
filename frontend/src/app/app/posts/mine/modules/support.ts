import { getSafeApiErrorMessage } from "@/api/errors";
import type { PostListPost, UserPostListItem, UserPostsType } from "@/api/generator/types/posts";

export const PAGE_LIMIT = 10;

export type FilterTabValue = Extract<UserPostsType, "posts" | "replies">;

export type FilterTabCounts = Partial<Record<FilterTabValue, number>>;

export const focusedReplyHref = (post: PostListPost, replyId: string) =>
  `/comunidades/${post.community.slug}/publicacao/${post.id}?focusReplyId=${encodeURIComponent(replyId)}#reply-${replyId}`;

export const isReplyCardInteractiveTarget = (target: EventTarget | null) => {
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

export type InteractionCopy = {
  contextLabel: string;
  emptyDescription: string;
  emptyTitle: string;
  filterAriaLabel: string;
  loadingLabel: string;
  plural: string;
  screenTitle: string;
  shareLinkSubject: string;
  singular: string;
  singularTitle: string;
  updatingLabel: string;
};

export const getInteractionCopy = (isPsychologist: boolean): InteractionCopy =>
  isPsychologist
    ? {
        contextLabel: "Respondido em",
        emptyDescription:
          "Quando você responder em conversas da comunidade, suas respostas aparecerão aqui.",
        emptyTitle: "Nenhuma resposta sua por enquanto",
        filterAriaLabel: "Filtrar meus posts e respostas",
        loadingLabel: "Carregando seus posts e respostas",
        plural: "Respostas",
        screenTitle: "Meus posts e respostas",
        shareLinkSubject: "da resposta",
        singular: "resposta",
        singularTitle: "Resposta",
        updatingLabel: "Atualizando suas respostas",
      }
    : {
        contextLabel: "Comentado em",
        emptyDescription:
          "Quando você comentar em conversas da comunidade, seus comentários aparecerão aqui.",
        emptyTitle: "Nenhum comentário seu por enquanto",
        filterAriaLabel: "Filtrar meus posts e comentários",
        loadingLabel: "Carregando seus posts e comentários",
        plural: "Comentários",
        screenTitle: "Meus posts e comentários",
        shareLinkSubject: "do comentário",
        singular: "comentário",
        singularTitle: "Comentário",
        updatingLabel: "Atualizando seus comentários",
      };

export const resolvePostsError = (error: unknown) => {
  const rawMessage = getSafeApiErrorMessage(error, "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar seus posts.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar ao serviço agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar seus posts agora.";
};

export const flattenUserPostPages = (pages?: Array<{ data: UserPostListItem[] }>) => {
  const seen = new Set<string>();
  const items: UserPostListItem[] = [];

  for (const page of pages ?? []) {
    for (const item of page.data) {
      if (seen.has(item.id)) continue;

      seen.add(item.id);
      items.push(item);
    }
  }

  return items;
};
