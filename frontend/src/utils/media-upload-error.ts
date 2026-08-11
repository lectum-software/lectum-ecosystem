import { getSafeApiErrorMessage } from "@/api/errors";

export const COMMUNITY_MEDIA_UPLOAD_LIMIT_MB = 200;
export const COMMUNITY_MEDIA_UPLOAD_LIMIT_BYTES = COMMUNITY_MEDIA_UPLOAD_LIMIT_MB * 1024 * 1024;
export const COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS = 600_000;
export const COMMUNITY_MEDIA_SIZE_ERROR_MESSAGE = `A mídia precisa ter até ${COMMUNITY_MEDIA_UPLOAD_LIMIT_MB}MB.`;

export const isCommunityMediaFileTooLarge = (file: File) =>
  file.size > COMMUNITY_MEDIA_UPLOAD_LIMIT_BYTES;

export const resolveMediaUploadError = (error: unknown) => {
  const message = getSafeApiErrorMessage(
    error,
    "Não foi possível anexar a mídia agora. Tente novamente.",
  );
  const normalized = message.toLowerCase();

  if (normalized.includes("50mb") || normalized.includes("50 mb")) {
    return COMMUNITY_MEDIA_SIZE_ERROR_MESSAGE;
  }

  if (
    normalized.includes("tamanho") ||
    normalized.includes("limite") ||
    normalized.includes(`${COMMUNITY_MEDIA_UPLOAD_LIMIT_MB}`)
  ) {
    return COMMUNITY_MEDIA_SIZE_ERROR_MESSAGE;
  }

  if (normalized.includes("tipo") || normalized.includes("permit")) {
    return "Envie uma imagem ou vídeo em formato permitido.";
  }

  if (normalized.includes("upload") || normalized.includes("arquivo agora")) {
    return "Não foi possível anexar a mídia agora. Tente novamente.";
  }

  if (normalized.includes("plano") || normalized.includes("verific")) {
    return "Mídia disponível apenas para psicólogos verificados.";
  }

  return message;
};
