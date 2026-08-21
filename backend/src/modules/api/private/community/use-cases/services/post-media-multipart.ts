import { createId } from "@paralleldrive/cuid2";
import { UPLOAD_LIMITS } from "@/config/multer/limits";
import { logMultipartUpload } from "@/config/multer/multipart-logging";
import {
  abortPublicMultipartUpload,
  completePublicMultipartUpload,
  createPublicMultipartUpload,
  PublicMultipartInfrastructureError,
  PublicMultipartValidationError,
  uploadPublicMultipartPart,
} from "@/config/multer/public-multipart";
import { error, msg } from "@/helpers/translate";
import { publicFileUrl } from "@/utils/public-origin";
import type {
  ICommunityAbortPostMediaMultipartDTO,
  ICommunityCompletePostMediaMultipartDTO,
  ICommunityInitiatePostMediaMultipartDTO,
  ICommunityUploadPostMediaDTO,
  ICommunityUploadPostMediaMultipartPartDTO,
} from "../../DTOs/ICommunityDTO";
import { authorizePostMediaUpload } from "../services";

export const COMMUNITY_POST_MEDIA_MULTIPART_LIMIT_MB =
  UPLOAD_LIMITS.community.postMediaMultipartTotalMb;
export const COMMUNITY_POST_MEDIA_MULTIPART_LIMIT_BYTES =
  COMMUNITY_POST_MEDIA_MULTIPART_LIMIT_MB * 1024 * 1024;

const COMMUNITY_POST_MEDIA_MULTIPART_SCOPE = "community_post_media";
const COMMUNITY_POST_MEDIA_MULTIPART_TTL_SECONDS = 2 * 60 * 60;
const COMMUNITY_POST_MEDIA_TYPE_BY_MIME = new Map<string, "image" | "video">([
  ["image/jpeg", "image"],
  ["image/png", "image"],
  ["image/webp", "image"],
  ["video/mp4", "video"],
  ["video/quicktime", "video"],
  ["video/webm", "video"],
]);
const COMMUNITY_POST_MEDIA_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

type PostMediaAccessInput = Pick<ICommunityUploadPostMediaDTO, "auth" | "p">;

const invalidUpload = () => ({
  status: 400,
  ...error("upload_error", {}),
});

const invalidUploadSession = () => ({
  status: 400,
  ...error("upload_media_session_invalid", {}),
});

const invalidUploadChunk = () => ({
  status: 400,
  ...error("upload_media_chunk_invalid", {}),
});

const invalidMediaContent = () => ({
  status: 400,
  ...error("upload_media_content_invalid", {}),
});

const uploadUnavailable = () => ({
  status: 503,
  success: false as const,
  code: "upload_unavailable",
  error: "Não foi possível enviar a mídia agora. Tente novamente.",
});

const fileLimitExceeded = () => ({
  status: 400,
  ...error("exceeded_file_limit", { limit: COMMUNITY_POST_MEDIA_MULTIPART_LIMIT_MB }),
});

const unexpectedType = (mimeType: string) => ({
  status: 400,
  ...error("unexpected_type_file", { type: mimeType.split("/")[1]?.toUpperCase() || "" }),
});

const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const normalizeMimeType = (value: unknown) => normalizeText(value).toLowerCase().split(";", 1)[0];

const multipartContext = (data: PostMediaAccessInput) => ({
  resourceId: data.p.slug,
  scope: COMMUNITY_POST_MEDIA_MULTIPART_SCOPE,
  userId: data.auth.id!,
});

const uploadLogContext = { scope: COMMUNITY_POST_MEDIA_MULTIPART_SCOPE } as const;

const knownMultipartFailure = (uploadError: unknown) => {
  if (uploadError instanceof PublicMultipartValidationError) {
    if (uploadError.reason === "session") return invalidUploadSession();
    if (uploadError.reason === "part_size") return invalidUploadChunk();
    if (uploadError.reason === "file_signature") return invalidMediaContent();
    return invalidUpload();
  }
  if (uploadError instanceof PublicMultipartInfrastructureError) return uploadUnavailable();
  return null;
};

const ensurePostMediaUploadAllowed = async (data: PostMediaAccessInput) => {
  const response = await authorizePostMediaUpload(data);

  return response.status >= 400 ? response : null;
};

const ensureMultipartActor = (data: PostMediaAccessInput) => {
  if (data.auth.id && data.auth.role === "psicologo") return null;

  return { status: 403, ...error("role_not_authorized", {}) };
};

export const initiatePostMediaMultipartUpload = async (
  data: ICommunityInitiatePostMediaMultipartDTO,
) => {
  const unauthorized = await ensurePostMediaUploadAllowed(data);
  if (unauthorized) {
    logMultipartUpload("INITIATE_REJECTED", { ...uploadLogContext, reason: "access" });
    return unauthorized;
  }

  const mimeType = normalizeMimeType(data.b.mimeType);
  const size = Number(data.b.size);
  if (!Number.isSafeInteger(size) || size <= 0) {
    logMultipartUpload("INITIATE_REJECTED", {
      ...uploadLogContext,
      reason: "request",
      sizeBytes: size,
    });
    return invalidUpload();
  }
  if (size > COMMUNITY_POST_MEDIA_MULTIPART_LIMIT_BYTES) {
    logMultipartUpload("INITIATE_REJECTED", {
      ...uploadLogContext,
      reason: "file_size",
      sizeBytes: size,
    });
    return fileLimitExceeded();
  }

  const mediaType = COMMUNITY_POST_MEDIA_TYPE_BY_MIME.get(mimeType);
  const extension = COMMUNITY_POST_MEDIA_EXTENSION_BY_MIME[mimeType];
  if (!mediaType || !extension) {
    logMultipartUpload("INITIATE_REJECTED", {
      ...uploadLogContext,
      mimeType,
      reason: "file_type",
      sizeBytes: size,
    });
    return unexpectedType(mimeType);
  }

  try {
    const session = await createPublicMultipartUpload({
      ...multipartContext(data),
      key: `posts/media/${createId()}.${extension}`,
      mimeType,
      size,
      ttlSeconds: COMMUNITY_POST_MEDIA_MULTIPART_TTL_SECONDS,
    });

    return {
      allowAuthTokens: true,
      status: 200,
      ...msg("community_post_media_uploaded", {}),
      data: {
        chunk_size: session.chunkSize,
        max_file_size: COMMUNITY_POST_MEDIA_MULTIPART_LIMIT_BYTES,
        upload_session_id: session.sessionId,
      },
    };
  } catch (uploadError) {
    const response = knownMultipartFailure(uploadError);
    if (response) return response;
    throw uploadError;
  }
};

export const uploadPostMediaMultipartPart = async (
  data: ICommunityUploadPostMediaMultipartPartDTO,
) => {
  const unauthorized = ensureMultipartActor(data);
  if (unauthorized) {
    logMultipartUpload("PART_REJECTED", { ...uploadLogContext, reason: "access" });
    return unauthorized;
  }

  const chunk = data.file?.buffer;
  if (!chunk?.length) {
    logMultipartUpload("PART_REJECTED", {
      ...uploadLogContext,
      partNumber: Number(data.b.partNumber),
      reason: "missing_chunk",
    });
    return invalidUpload();
  }

  try {
    const uploaded = await uploadPublicMultipartPart({
      ...multipartContext(data),
      chunk,
      partNumber: Number(data.b.partNumber),
      sessionId: normalizeText(data.b.uploadSessionId),
      validateFirstPartSignature: true,
    });

    return {
      allowAuthTokens: true,
      status: 200,
      ...msg("community_post_media_uploaded", {}),
      data: {
        part_id: uploaded.partId,
        part_number: uploaded.partNumber,
      },
    };
  } catch (uploadError) {
    const response = knownMultipartFailure(uploadError);
    if (response) return response;
    throw uploadError;
  }
};

export const completePostMediaMultipartUpload = async (
  data: ICommunityCompletePostMediaMultipartDTO,
) => {
  const unauthorized = await ensurePostMediaUploadAllowed(data);
  if (unauthorized) {
    logMultipartUpload("COMPLETE_REJECTED", { ...uploadLogContext, reason: "access" });
    return unauthorized;
  }

  try {
    const completed = await completePublicMultipartUpload({
      ...multipartContext(data),
      parts: data.b.parts,
      sessionId: normalizeText(data.b.uploadSessionId),
    });
    const mediaType = COMMUNITY_POST_MEDIA_TYPE_BY_MIME.get(completed.mimeType);
    if (!mediaType || !completed.key.startsWith("posts/media/")) return invalidUpload();

    return {
      status: 200,
      ...msg("community_post_media_uploaded", {}),
      data: {
        media_type: mediaType,
        media_url: publicFileUrl(completed.key),
      },
    };
  } catch (uploadError) {
    const response = knownMultipartFailure(uploadError);
    if (response) return response;
    throw uploadError;
  }
};

export const abortPostMediaMultipartUpload = async (data: ICommunityAbortPostMediaMultipartDTO) => {
  const unauthorized = ensureMultipartActor(data);
  if (unauthorized) {
    logMultipartUpload("ABORT_REJECTED", { ...uploadLogContext, reason: "access" });
    return unauthorized;
  }

  try {
    await abortPublicMultipartUpload({
      ...multipartContext(data),
      sessionId: normalizeText(data.b.uploadSessionId),
    });
  } catch (uploadError) {
    if (uploadError instanceof PublicMultipartValidationError) return invalidUploadSession();
    if (!(uploadError instanceof PublicMultipartInfrastructureError)) throw uploadError;
  }

  return {
    status: 200,
    ...msg("community_post_media_uploaded", {}),
    data: { aborted: true },
  };
};
