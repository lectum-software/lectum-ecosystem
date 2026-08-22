import { getSafeApiErrorMessage } from "@/api/errors";
import { COMMUNITY_FEED_SLUG, DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import type { CreateCommunityPostForm } from "../use-form";

export type ApiErrorData = {
  code?: string;
  error?: string;
  message?: string;
  status?: number;
};

export type ApiError = Error & {
  data?: ApiErrorData;
};

export type CreatePostErrorResolution = {
  field?: keyof CreateCommunityPostForm;
  message: string;
};

export type UseCreateCommunityPostControllerOptions = {
  onCloseComplete?: () => void;
};

export const moveContenteditableCaretToEnd = (element: HTMLElement) => {
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

export const MODERATION_BLOCKED_MESSAGE =
  "Não foi possível publicar este conteúdo. Remova links, convites externos ou trechos que violem as diretrizes da comunidade.";

export const MODERATION_SAFETY_MESSAGE =
  "Seu conteúdo não foi publicado por segurança. Se você estiver em risco imediato, procure uma pessoa de confiança ou um serviço de emergência local. A Lectum não realiza atendimento de emergência.";

export const normalizeParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0];

  return value;
};

export const resolveCreatePostCloseFallbackHref = ({
  communitySlugFromQuery,
  routeSlug,
}: {
  communitySlugFromQuery?: string | null;
  routeSlug?: string | null;
}) => {
  if (routeSlug && routeSlug !== COMMUNITY_FEED_SLUG) return `/comunidades/${routeSlug}`;

  if (communitySlugFromQuery) {
    return `${DEFAULT_COMMUNITY_FEED_HREF}?community=${encodeURIComponent(communitySlugFromQuery)}`;
  }

  return DEFAULT_COMMUNITY_FEED_HREF;
};

export const resolveCreatePostDefaultSlug = ({
  communitySlugFromQuery,
  routeSlug,
}: {
  communitySlugFromQuery?: string | null;
  routeSlug?: string | null;
}) => (routeSlug && routeSlug !== COMMUNITY_FEED_SLUG ? routeSlug : communitySlugFromQuery);

export const resolveCreatePostError = (error: unknown): CreatePostErrorResolution => {
  const apiError = error as ApiError;
  const rawMessage = getSafeApiErrorMessage(error, "");
  const code = apiError?.data?.code;
  const normalized = rawMessage.toLowerCase();

  if (code === "content_moderation_safety_hold") {
    return {
      field: "content",
      message: rawMessage || MODERATION_SAFETY_MESSAGE,
    };
  }

  if (code === "content_moderation_blocked") {
    return {
      field: "content",
      message: rawMessage || MODERATION_BLOCKED_MESSAGE,
    };
  }

  if (normalized.includes("comunidade") || normalized.includes("community")) {
    return {
      field: "community_slug",
      message: "Escolha uma comunidade para postar",
    };
  }

  if (normalized.includes("título") || normalized.includes("titulo")) {
    return {
      field: "title",
      message: "Escreva um título com pelo menos 3 caracteres",
    };
  }

  if (
    normalized.includes("conteúdo") ||
    normalized.includes("conteudo") ||
    normalized.includes("descri")
  ) {
    return {
      field: "content",
      message: "Escreva uma descrição com pelo menos 10 caracteres",
    };
  }

  if (normalized.includes("sess") || normalized.includes("token")) {
    return { message: "Sua sessão precisa estar ativa para criar um post." };
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return { message: "Não foi possível conectar ao serviço agora. Tente novamente em instantes." };
  }

  return {
    message: rawMessage || "Não foi possível publicar agora. Tente novamente em instantes.",
  };
};

export const guidanceText =
  "Lembre-se de ser respeitoso com os outros membros. Conteúdos ofensivos ou que violem as diretrizes serão removidos pela moderação.";

export const anonymousTipText =
  "Publicar com seu nome ajuda a tornar as conversas mais pessoais e acolhedoras.\n\nPara preservar sua privacidade, você também pode utilizar no perfil apenas seu primeiro nome ou um apelido.";

export const COMMUNITY_SELECTOR_ICON_SRC = "/svg/public_24dp_64748B_FILL0_wght400_GRAD0_opsz24.svg";

export const communityNameCollator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
});

export const resolveCommunityOptions = (communities: Array<{ name: string; slug: string }>) =>
  communities
    .map((community) => ({ label: community.name, value: community.slug }))
    .sort((a, b) => communityNameCollator.compare(a.label, b.label));

export const SHEET_CLOSE_DELAY_MS = 360;
export const SHEET_ENTER_ANIMATION_MS = 340;
export const CREATE_POST_TOUCH_AUTOFOCUS_DELAY_MS = SHEET_ENTER_ANIMATION_MS + 120;

export const EDITOR_FIELD_IDS = new Set(["create-post-title", "create-post-content"]);

export const LAST_CREATED_POST_HREF_KEY = "lectum:last-created-post-href";

export const COMMUNITY_POST_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime";

export const MAX_POST_CAROUSEL_IMAGES = 10;

export type SelectedPostMedia = {
  file: File;
  id: string;
  orientation?: "landscape" | "portrait";
  previewUrl: string;
  type: "image" | "video";
};

export const createSelectedMediaId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const resolveKeyboardViewportOffset = () => {
  if (typeof window === "undefined" || !window.visualViewport) return 0;

  const viewport = window.visualViewport;
  const overlap = window.innerHeight - viewport.height - viewport.offsetTop;

  return Math.max(0, Math.round(overlap));
};

const shouldDeferInitialEditorFocus = () => {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(pointer: coarse)").matches || /Android/i.test(navigator.userAgent);
};

export const getCreatePostInitialEditorFocusDelays = () =>
  shouldDeferInitialEditorFocus()
    ? [CREATE_POST_TOUCH_AUTOFOCUS_DELAY_MS, CREATE_POST_TOUCH_AUTOFOCUS_DELAY_MS + 180]
    : [0, 90, 280, 420];

export type CreateCommunityPostLogicProps = {
  asModalSlot?: boolean;
  onCloseComplete?: () => void;
};
