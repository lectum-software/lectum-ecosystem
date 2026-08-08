import { getSafeApiErrorMessage } from "@/api/errors";
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

export const MODERATION_BLOCKED_MESSAGE =
  "Não foi possível publicar este conteúdo. Remova links, convites externos ou trechos que violem as diretrizes da comunidade.";

export const MODERATION_SAFETY_MESSAGE =
  "Seu conteúdo não foi publicado por segurança. Se você estiver em risco imediato, procure uma pessoa de confiança ou um serviço de emergência local. A Lectum não realiza atendimento de emergência.";

export const normalizeParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0];

  return value;
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
  "Publicar com seu nome ajuda a tornar as conversas mais pessoais e acolhedoras.\n\nPara preservar sua privacidade, você também pode utilizar no perfil apenas seu primeiro nome ou um apelido.";

export const COMMUNITY_SELECTOR_ICON_SRC = "/svg/public_24dp_64748B_FILL0_wght400_GRAD0_opsz24.svg";

export const communityNameCollator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
});

export const SHEET_CLOSE_DELAY_MS = 220;

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

export type CreateCommunityPostLogicProps = {
  asModalSlot?: boolean;
};
