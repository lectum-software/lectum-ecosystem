import { getApiErrorCode, getApiErrorStatus, getSafeApiErrorMessage } from "@/api/errors";
import { resolvePublicMediaKind } from "@/utils/media-preparation/policy";
import {
  formatMediaUploadSize,
  getMediaUploadSourceSizeError,
  isMediaUploadSizeError,
  type MediaUploadLimitKind,
  resolveMediaUploadApiSizeLimitMessage,
} from "@/utils/media-upload-limits";

export const COMMUNITY_IMAGE_SELECTION_LIMIT_MB = 200;
export const COMMUNITY_IMAGE_SELECTION_LIMIT_BYTES =
  COMMUNITY_IMAGE_SELECTION_LIMIT_MB * 1024 * 1024;
export const COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS = 600_000;

export const getCommunityMediaSelectionSizeError = (
  file: Pick<File, "size">,
  kind: MediaUploadLimitKind,
) => getMediaUploadSourceSizeError(file, kind, COMMUNITY_IMAGE_SELECTION_LIMIT_BYTES);

export const getCommunityMediaFileSelectionSizeError = (
  file: Pick<File, "name" | "size" | "type">,
) => {
  const kind = resolvePublicMediaKind(file);

  return kind ? getCommunityMediaSelectionSizeError(file, kind) : null;
};

export const resolveMediaUploadSizeErrorMessage = (error: unknown) => {
  if (!isMediaUploadSizeError(error) || error.kind === "video") return null;

  const actualSize = formatMediaUploadSize(error.actualBytes);
  const limitSize = formatMediaUploadSize(error.limitBytes);

  if (error.stage === "final") {
    return `Após a preparação, a imagem ficou com ${actualSize}. O limite de envio é ${limitSize}.`;
  }

  return `A imagem selecionada tem ${actualSize}. O limite de envio é ${limitSize}.`;
};

export const resolveMediaUploadError = (error: unknown) => {
  const sizeErrorMessage = resolveMediaUploadSizeErrorMessage(error);
  if (sizeErrorMessage) return sizeErrorMessage;

  const safeApiMessage = getSafeApiErrorMessage(error, "");
  const status = getApiErrorStatus(error);
  const code = getApiErrorCode(error);
  const apiSizeLimitMessage = resolveMediaUploadApiSizeLimitMessage({
    code,
    message: safeApiMessage,
    status,
  });

  if (apiSizeLimitMessage) return apiSizeLimitMessage;

  const message = safeApiMessage || "Não foi possível anexar a mídia agora. Tente novamente.";
  const normalized = message.toLowerCase();

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
