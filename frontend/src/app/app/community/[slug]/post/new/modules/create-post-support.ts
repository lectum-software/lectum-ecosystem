import type { UseFormReturn } from "react-hook-form";
import { getSafeApiErrorMessage } from "@/api/errors";
import type { CommunityPostMediaUploadResponse } from "@/api/generator/types/community";
import type { FieldOption } from "@/hooks/form";
import {
  COMMUNITY_CREATE_POST_HREF,
  COMMUNITY_FEED_SLUG,
  DEFAULT_COMMUNITY_FEED_HREF,
} from "@/utils/community";
import { isVideoAssetReference } from "@/utils/video-stream";
import { createVideoPosterObjectUrl } from "@/utils/video-thumbnail";
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

export const classifyUploadedCommunityMedia = (
  uploadedMedia: CommunityPostMediaUploadResponse[],
) => {
  const video = uploadedMedia.find((media) => media.media_type === "video");
  const streamVideoReference = isVideoAssetReference(video?.media_url)
    ? video?.media_url || null
    : null;
  const imageItems = uploadedMedia
    .filter((media) => media.media_type === "image")
    .map((media, position) => ({
      mediaType: "image" as const,
      mediaUrl: media.media_url,
      position,
    }));

  return { imageItems, streamVideoReference };
};

export const scheduleCorrectedCreatePostErrorClear = ({
  clearErrors,
  communityValues,
  getValues,
}: {
  clearErrors: UseFormReturn<CreateCommunityPostForm>["clearErrors"];
  communityValues: readonly string[];
  getValues: UseFormReturn<CreateCommunityPostForm>["getValues"];
}) => {
  window.setTimeout(() => {
    const values = getValues();
    const validCommunity = communityValues.includes(values.community_slug);
    const validTitle = String(values.title ?? "").trim().length >= 3;
    const validContent = String(values.content ?? "").trim().length >= 10;

    if (validCommunity) clearErrors("community_slug");
    if (validTitle) clearErrors("title");
    if (validContent) clearErrors("content");
    if (validCommunity && validTitle && validContent) clearErrors();
  }, 0);
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

export const isCreatePostHref = (href: string) => {
  const pathname = href.split(/[?#]/, 1)[0];
  return /\/(?:post\/new|publicacao\/nova)$/.test(pathname);
};

export const resolveCreatePostProfileReturnHref = ({
  communitySlugFromQuery,
  currentHref,
  routeSlug,
}: {
  communitySlugFromQuery?: string | null;
  currentHref: string;
  routeSlug?: string | null;
}) => {
  if (isCreatePostHref(currentHref)) return currentHref;

  if (routeSlug && routeSlug !== COMMUNITY_FEED_SLUG) {
    return `/app/comunidades/${encodeURIComponent(routeSlug)}/publicacao/nova`;
  }

  return communitySlugFromQuery
    ? `${COMMUNITY_CREATE_POST_HREF}?community=${encodeURIComponent(communitySlugFromQuery)}`
    : COMMUNITY_CREATE_POST_HREF;
};

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
  "Publicar com seu nome ajuda a tornar as conversas mais pessoais e acolhedoras.\nPara preservar sua privacidade, você pode utilizar apenas seu primeiro nome ou um apelido.";

export const COMMUNITY_SELECTOR_ICON_SRC = "/svg/public_24dp_64748B_FILL0_wght400_GRAD0_opsz24.svg";

export const communityNameCollator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
});

export const resolveCommunityOptions = (communities: Array<{ name: string; slug: string }>) =>
  communities
    .map((community): FieldOption & { value: string } => ({
      label: community.name,
      value: community.slug,
      ...(community.slug === "saude-mental-em-geral"
        ? {
            description: "Não sabe onde postar? Publique aqui.",
            separatorBefore: true,
          }
        : {}),
    }))
    .sort(
      (a, b) =>
        Number(a.value === "saude-mental-em-geral") - Number(b.value === "saude-mental-em-geral") ||
        communityNameCollator.compare(a.label, b.label),
    );

export const SHEET_CLOSE_DELAY_MS = 360;
export const SHEET_ENTER_ANIMATION_MS = 340;
export const CREATE_POST_TOUCH_AUTOFOCUS_DELAY_MS = SHEET_ENTER_ANIMATION_MS + 120;

export const EDITOR_FIELD_IDS = new Set(["create-post-title", "create-post-content"]);

export const LAST_CREATED_POST_HREF_KEY = "lectum:last-created-post-href";

export const CREATE_POST_PROFILE_DRAFT_KEY = "lectum:create-post-profile-draft";
export const CREATE_POST_PROFILE_UPDATED_KEY = "lectum:create-post-profile-updated";
export const CREATE_POST_PROFILE_DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type CreatePostProfileDraft = {
  returnHref: string;
  savedAt: number;
  userId: string;
  values: Pick<CreateCommunityPostForm, "community_slug" | "content" | "title">;
};

type CreatePostProfileDraftStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

type CreatePostProfileUpdated = {
  displayName: string;
  returnHref: string;
  savedAt: number;
  userId: string;
};

export const saveCreatePostProfileDraft = ({
  returnHref,
  storage,
  userId,
  values,
}: {
  returnHref: string;
  storage: CreatePostProfileDraftStorage;
  userId: string;
  values: CreateCommunityPostForm;
}) => {
  const draft: CreatePostProfileDraft = {
    returnHref,
    savedAt: Date.now(),
    userId,
    values: {
      community_slug: values.community_slug,
      content: values.content,
      title: values.title,
    },
  };

  try {
    storage.setItem(CREATE_POST_PROFILE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // A navegacao continua funcionando quando o storage do navegador esta indisponivel.
  }
};

export const readCreatePostProfileDraft = ({
  now = Date.now(),
  returnHref,
  storage,
  userId,
}: {
  now?: number;
  returnHref: string;
  storage: CreatePostProfileDraftStorage;
  userId: string;
}) => {
  try {
    const rawDraft = storage.getItem(CREATE_POST_PROFILE_DRAFT_KEY);
    if (!rawDraft) return null;

    const draft = JSON.parse(rawDraft) as Partial<CreatePostProfileDraft>;
    const values = draft.values;
    const isValid =
      draft.userId === userId &&
      draft.returnHref === returnHref &&
      typeof draft.savedAt === "number" &&
      now - draft.savedAt <= CREATE_POST_PROFILE_DRAFT_MAX_AGE_MS &&
      typeof values?.community_slug === "string" &&
      typeof values?.title === "string" &&
      typeof values?.content === "string";

    if (!isValid || !values) {
      storage.removeItem(CREATE_POST_PROFILE_DRAFT_KEY);
      return null;
    }

    return {
      anonymous: false,
      community_slug: values.community_slug,
      content: values.content,
      title: values.title,
    } satisfies CreateCommunityPostForm;
  } catch {
    try {
      storage.removeItem(CREATE_POST_PROFILE_DRAFT_KEY);
    } catch {
      // Nada a limpar quando o storage esta indisponivel.
    }
    return null;
  }
};

export const clearCreatePostProfileDraft = (storage: CreatePostProfileDraftStorage) => {
  try {
    storage.removeItem(CREATE_POST_PROFILE_DRAFT_KEY);
  } catch {
    // O descarte local nao deve bloquear o fechamento ou a publicacao.
  }
};

export const saveCreatePostProfileUpdated = ({
  displayName,
  returnHref,
  storage,
  userId,
}: {
  displayName: string;
  returnHref: string;
  storage: CreatePostProfileDraftStorage;
  userId: string;
}) => {
  const normalizedName = displayName.trim();
  if (!normalizedName || !isCreatePostHref(returnHref)) return false;

  const confirmation: CreatePostProfileUpdated = {
    displayName: normalizedName,
    returnHref,
    savedAt: Date.now(),
    userId,
  };

  try {
    storage.setItem(CREATE_POST_PROFILE_UPDATED_KEY, JSON.stringify(confirmation));
    return true;
  } catch {
    return false;
  }
};

export const consumeCreatePostProfileUpdated = ({
  now = Date.now(),
  returnHref,
  storage,
  userId,
}: {
  now?: number;
  returnHref: string;
  storage: CreatePostProfileDraftStorage;
  userId: string;
}): string | null => {
  try {
    const rawConfirmation = storage.getItem(CREATE_POST_PROFILE_UPDATED_KEY);
    if (!rawConfirmation) return null;

    storage.removeItem(CREATE_POST_PROFILE_UPDATED_KEY);
    const confirmation = JSON.parse(rawConfirmation) as Partial<CreatePostProfileUpdated>;
    const displayName = confirmation.displayName?.trim();
    const isValid =
      confirmation.userId === userId &&
      confirmation.returnHref === returnHref &&
      typeof confirmation.savedAt === "number" &&
      now - confirmation.savedAt <= CREATE_POST_PROFILE_DRAFT_MAX_AGE_MS &&
      Boolean(displayName);

    return isValid && displayName ? displayName : null;
  } catch {
    try {
      storage.removeItem(CREATE_POST_PROFILE_UPDATED_KEY);
    } catch {
      // O marcador e descartavel e nao pode bloquear o retorno ao compositor.
    }
    return null;
  }
};

export const COMMUNITY_POST_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime";

export const MAX_POST_CAROUSEL_IMAGES = 10;

export type SelectedPostMedia = {
  file: File;
  id: string;
  isPreparingPreview?: boolean;
  orientation?: "landscape" | "portrait";
  previewUrl: string;
  thumbnailUrl?: string | null;
  type: "image" | "video";
};

type SelectedVideoPreviewPreparationOptions = {
  getCurrentPreviewGeneration: () => number;
  mediaItem: SelectedPostMedia;
  previewGeneration: number;
  rememberPreviewUrl: (previewUrl: string) => void;
  setSelectedMediaItems: (
    updater: (currentItems: SelectedPostMedia[]) => SelectedPostMedia[],
  ) => void;
};

export const prepareSelectedVideoPreview = ({
  getCurrentPreviewGeneration,
  mediaItem,
  previewGeneration,
  rememberPreviewUrl,
  setSelectedMediaItems,
}: SelectedVideoPreviewPreparationOptions) => {
  void createVideoPosterObjectUrl(mediaItem.previewUrl)
    .then((thumbnailUrl) => {
      if (getCurrentPreviewGeneration() !== previewGeneration) {
        if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
        return;
      }

      if (thumbnailUrl) {
        rememberPreviewUrl(thumbnailUrl);
      }

      setSelectedMediaItems((currentItems) =>
        currentItems.map((item) =>
          item.id === mediaItem.id && item.previewUrl === mediaItem.previewUrl
            ? { ...item, isPreparingPreview: false, thumbnailUrl }
            : item,
        ),
      );
    })
    .catch(() => {
      if (getCurrentPreviewGeneration() !== previewGeneration) return;

      setSelectedMediaItems((currentItems) =>
        currentItems.map((item) =>
          item.id === mediaItem.id && item.previewUrl === mediaItem.previewUrl
            ? { ...item, isPreparingPreview: false, thumbnailUrl: null }
            : item,
        ),
      );
    });
};

export const createSelectedMediaId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

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
