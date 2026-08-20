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
import type {
  IFreeProfessionalProfileAbortVideoMultipartDTO,
  IFreeProfessionalProfileCompleteVideoMultipartDTO,
  IFreeProfessionalProfileInitiateVideoMultipartDTO,
  IFreeProfessionalProfileUploadVideoMultipartPartDTO,
} from "../../DTOs/IFreeProfileDTO";
import { deletePublicProfileMedia } from "../../repositories/support/profile-response";
import { publicFileUrl } from "./profile-validation";
import { resolveProfileVideoAccess } from "./profile-video-policy";

export const PROFILE_VIDEO_MULTIPART_LIMIT_MB = UPLOAD_LIMITS.psychologist.videoMultipartTotalMb;
export const PROFILE_VIDEO_MULTIPART_LIMIT_BYTES = PROFILE_VIDEO_MULTIPART_LIMIT_MB * 1024 * 1024;

const PROFILE_VIDEO_MULTIPART_SCOPE = "psychologist_profile_video";
const PROFILE_VIDEO_MULTIPART_TTL_SECONDS = 2 * 60 * 60;
const PROFILE_VIDEO_ALLOWED_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const PROFILE_VIDEO_EXTENSION_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const invalidUpload = () => ({
  status: 400,
  ...error("upload_error", {}),
});

const invalidUploadSession = () => ({
  status: 400,
  ...error("upload_session_invalid", {}),
});

const invalidUploadChunk = () => ({
  status: 400,
  ...error("upload_chunk_invalid", {}),
});

const invalidVideoContent = () => ({
  status: 400,
  ...error("upload_file_content_invalid", {}),
});

const uploadUnavailable = () => ({
  status: 503,
  success: false as const,
  code: "upload_unavailable",
  error: "Não foi possível enviar o vídeo agora. Tente novamente.",
});

const fileLimitExceeded = () => ({
  status: 400,
  ...error("exceeded_file_limit", { limit: PROFILE_VIDEO_MULTIPART_LIMIT_MB }),
});

const unexpectedType = (mimeType: string) => ({
  status: 400,
  ...error("unexpected_type_file", { type: mimeType.split("/")[1]?.toUpperCase() || "" }),
});

const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const normalizeMimeType = (value: unknown) => normalizeText(value).toLowerCase().split(";", 1)[0];

const multipartContext = (userId: string) => ({
  resourceId: userId,
  scope: PROFILE_VIDEO_MULTIPART_SCOPE,
  userId,
});

const uploadLogContext = { scope: PROFILE_VIDEO_MULTIPART_SCOPE } as const;

const knownMultipartFailure = (uploadError: unknown) => {
  if (uploadError instanceof PublicMultipartValidationError) {
    if (uploadError.reason === "session") return invalidUploadSession();
    if (uploadError.reason === "part_size") return invalidUploadChunk();
    if (uploadError.reason === "file_signature") return invalidVideoContent();
    return invalidUpload();
  }
  if (uploadError instanceof PublicMultipartInfrastructureError) return uploadUnavailable();
  return null;
};

export const initiateProfileVideoMultipartUpload = async (
  data: IFreeProfessionalProfileInitiateVideoMultipartDTO,
) => {
  const access = await resolveProfileVideoAccess(data.auth);
  if (!access.allowed) {
    logMultipartUpload("INITIATE_REJECTED", {
      ...uploadLogContext,
      reason: "access",
    });
    return access.response;
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
  if (size > PROFILE_VIDEO_MULTIPART_LIMIT_BYTES) {
    logMultipartUpload("INITIATE_REJECTED", {
      ...uploadLogContext,
      reason: "file_size",
      sizeBytes: size,
    });
    return fileLimitExceeded();
  }
  if (!PROFILE_VIDEO_ALLOWED_MIME_TYPES.has(mimeType)) {
    logMultipartUpload("INITIATE_REJECTED", {
      ...uploadLogContext,
      mimeType,
      reason: "file_type",
      sizeBytes: size,
    });
    return unexpectedType(mimeType);
  }

  const extension = PROFILE_VIDEO_EXTENSION_BY_MIME[mimeType];
  if (!extension) {
    logMultipartUpload("INITIATE_REJECTED", {
      ...uploadLogContext,
      mimeType,
      reason: "file_type",
      sizeBytes: size,
    });
    return invalidUpload();
  }

  try {
    const session = await createPublicMultipartUpload({
      ...multipartContext(data.auth.id!),
      key: `psychologist/video/${createId()}.${extension}`,
      mimeType,
      size,
      ttlSeconds: PROFILE_VIDEO_MULTIPART_TTL_SECONDS,
    });

    return {
      status: 200,
      ...msg("professional_profile_video_uploaded", {}),
      data: {
        chunk_size: session.chunkSize,
        max_file_size: PROFILE_VIDEO_MULTIPART_LIMIT_BYTES,
        upload_session_id: session.sessionId,
      },
    };
  } catch (uploadError) {
    const response = knownMultipartFailure(uploadError);
    if (response) return response;
    throw uploadError;
  }
};

export const uploadProfileVideoMultipartPart = async (
  data: IFreeProfessionalProfileUploadVideoMultipartPartDTO,
) => {
  if (data.auth.role !== "psicologo") {
    logMultipartUpload("PART_REJECTED", {
      ...uploadLogContext,
      reason: "access",
    });
    return { status: 403, ...error("role_not_authorized", {}) };
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
      ...multipartContext(data.auth.id!),
      chunk,
      partNumber: Number(data.b.partNumber),
      sessionId: normalizeText(data.b.uploadSessionId),
      validateFirstPartSignature: true,
    });

    return {
      status: 200,
      ...msg("professional_profile_video_uploaded", {}),
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

export const completeProfileVideoMultipartUpload = async (
  data: IFreeProfessionalProfileCompleteVideoMultipartDTO,
) => {
  const access = await resolveProfileVideoAccess(data.auth);
  if (!access.allowed) {
    logMultipartUpload("COMPLETE_REJECTED", {
      ...uploadLogContext,
      reason: "access",
    });
    return access.response;
  }

  let completed: Awaited<ReturnType<typeof completePublicMultipartUpload>>;
  try {
    completed = await completePublicMultipartUpload({
      ...multipartContext(data.auth.id!),
      parts: data.b.parts,
      sessionId: normalizeText(data.b.uploadSessionId),
    });
  } catch (uploadError) {
    const response = knownMultipartFailure(uploadError);
    if (response) return response;
    throw uploadError;
  }

  const videoUrl = publicFileUrl(completed.key);
  const persistenceStartedAt = Date.now();
  logMultipartUpload("PERSIST_START", {
    ...uploadLogContext,
    sizeBytes: completed.size,
    traceId: completed.traceId,
  });
  try {
    const updated = await access.repository.updateVideo(data.auth.id!, videoUrl);
    if (!updated) {
      logMultipartUpload("PERSIST_REJECTED", {
        ...uploadLogContext,
        elapsedMs: Date.now() - persistenceStartedAt,
        reason: "persistence",
        traceId: completed.traceId,
      });
      await deletePublicProfileMedia(videoUrl);
      return invalidUpload();
    }

    logMultipartUpload("PERSIST_SUCCESS", {
      ...uploadLogContext,
      elapsedMs: Date.now() - persistenceStartedAt,
      traceId: completed.traceId,
    });

    return {
      status: 200,
      ...msg("professional_profile_video_uploaded", {}),
      data: {
        profile: updated,
        video_url: videoUrl,
      },
    };
  } catch (persistenceError) {
    logMultipartUpload("PERSIST_FAILED", {
      ...uploadLogContext,
      elapsedMs: Date.now() - persistenceStartedAt,
      reason: "persistence",
      traceId: completed.traceId,
    });
    await deletePublicProfileMedia(videoUrl);
    throw persistenceError;
  }
};

export const abortProfileVideoMultipartUpload = async (
  data: IFreeProfessionalProfileAbortVideoMultipartDTO,
) => {
  if (data.auth.role !== "psicologo") {
    logMultipartUpload("ABORT_REJECTED", {
      ...uploadLogContext,
      reason: "access",
    });
    return { status: 403, ...error("role_not_authorized", {}) };
  }

  try {
    await abortPublicMultipartUpload({
      ...multipartContext(data.auth.id!),
      sessionId: normalizeText(data.b.uploadSessionId),
    });
  } catch (uploadError) {
    if (uploadError instanceof PublicMultipartValidationError) return invalidUpload();
    if (!(uploadError instanceof PublicMultipartInfrastructureError)) throw uploadError;
  }

  return {
    status: 200,
    ...msg("professional_profile_video_uploaded", {}),
    data: { aborted: true },
  };
};
