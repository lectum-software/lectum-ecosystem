import { getApiErrorCode, getApiErrorStatus, getSafeApiErrorMessage } from "@/api/errors";
import { resolvePublicMediaKind } from "@/utils/media-preparation/policy";
import {
  formatMediaUploadSize,
  getMediaUploadSourceSizeError,
  isMediaUploadApiSizeLimitError,
  isMediaUploadSizeError,
  type MediaUploadLimitKind,
} from "@/utils/media-upload-limits";

export const COMMUNITY_MEDIA_UPLOAD_LIMIT_MB = 200;
export const COMMUNITY_MEDIA_UPLOAD_LIMIT_BYTES = COMMUNITY_MEDIA_UPLOAD_LIMIT_MB * 1024 * 1024;
export const COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS = 600_000;
export const COMMUNITY_MEDIA_SIZE_ERROR_MESSAGE = `A mídia precisa ter até ${COMMUNITY_MEDIA_UPLOAD_LIMIT_MB}MB.`;

export const getCommunityMediaSelectionSizeError = (
  file: Pick<File, "size">,
  kind: MediaUploadLimitKind,
) => getMediaUploadSourceSizeError(file, kind, COMMUNITY_MEDIA_UPLOAD_LIMIT_BYTES);

export const getCommunityMediaFileSelectionSizeError = (
  file: Pick<File, "name" | "size" | "type">,
) => {
  const kind = resolvePublicMediaKind(file);

  return kind ? getCommunityMediaSelectionSizeError(file, kind) : null;
};

export const resolveMediaUploadSizeErrorMessage = (error: unknown) => {
  if (!isMediaUploadSizeError(error)) return null;

  const actualSize = formatMediaUploadSize(error.actualBytes);
  const limitSize = formatMediaUploadSize(error.limitBytes);

  if (error.stage === "final") {
    if (error.kind === "video") {
      return `O iPhone pode ter entregue uma cópia maior para o site. Mesmo após a preparação, o vídeo ficou com ${actualSize}; o limite é ${limitSize}. Tente “Escolher Arquivo” para usar o arquivo original.`;
    }

    return `Após a preparação, a imagem ficou com ${actualSize}. O limite de envio é ${limitSize}.`;
  }

  if (error.kind === "video") {
    return `O vídeo recebido do aparelho tem ${actualSize} e excede o limite de preparação de ${limitSize}. No iPhone, a Galeria pode criar uma cópia maior; tente “Escolher Arquivo” para usar o original.`;
  }

  return `A imagem selecionada tem ${actualSize}. O limite de envio é ${limitSize}.`;
};

export const resolveMediaUploadError = (error: unknown) => {
  const sizeErrorMessage = resolveMediaUploadSizeErrorMessage(error);
  if (sizeErrorMessage) return sizeErrorMessage;

  const message = getSafeApiErrorMessage(
    error,
    "Não foi possível anexar a mídia agora. Tente novamente.",
  );
  const normalized = message.toLowerCase();
  const status = getApiErrorStatus(error);
  const code = getApiErrorCode(error);

  if (isMediaUploadApiSizeLimitError({ code, message: normalized, status })) {
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
