import { getApiErrorStatus } from "@/api/errors";
import { callEndpoint } from "@/api/generator";
import type {
  FreeProfessionalProfile,
  FreeProfessionalProfileAvatarRemoval,
  FreeProfessionalProfileAvatarUpload,
  FreeProfessionalProfileCoverImageRemoval,
  FreeProfessionalProfileCoverImageUpload,
  FreeProfessionalProfilePayload,
  FreeProfessionalProfileVideoCoverUpload,
  FreeProfessionalProfileVideoMultipartCompletePayload,
  FreeProfessionalProfileVideoMultipartInitiatePayload,
  FreeProfessionalProfileVideoMultipartInitiateResponse,
  FreeProfessionalProfileVideoMultipartPartResponse,
  FreeProfessionalProfileVideoRemoval,
  FreeProfessionalProfileVideoUpload,
} from "@/api/generator/types/free-profile";
import { handleReq } from "@/api/handle";
import { COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS } from "@/utils/media-upload-error";
import { uploadFileMultipart } from "@/utils/multipart-upload";
import {
  PROFILE_VIDEO_MULTIPART_THRESHOLD_BYTES,
  PROFILE_VIDEO_SIMPLE_LIMIT_MB,
  withProfileVideoFileType,
} from "@/utils/profile-video-upload";

const route = "/api/private/psychologist/free-profile";

export const getPsychologistFreeProfile = async () => {
  const handle = callEndpoint({ route });
  return handleReq<FreeProfessionalProfile>(handle);
};

export const updatePsychologistFreeProfile = async (body: FreeProfessionalProfilePayload) => {
  const handle = callEndpoint({ route, method: "PUT", body });
  return handleReq<FreeProfessionalProfile>({ ...handle, hideError: true });
};

export const uploadPsychologistFreeProfileAvatar = async (file: File) => {
  const body = new FormData();
  body.append("avatar", file);

  const handle = callEndpoint({ route: `${route}/avatar`, method: "POST", body });
  return handleReq<FreeProfessionalProfileAvatarUpload>({ ...handle, hideError: true });
};

export const deletePsychologistFreeProfileAvatar = async () => {
  const handle = callEndpoint({ route: `${route}/avatar`, method: "DELETE" });
  return handleReq<FreeProfessionalProfileAvatarRemoval>({ ...handle, hideError: true });
};

export const uploadPsychologistFreeProfileCoverImage = async (file: File) => {
  const body = new FormData();
  body.append("cover-image", file);

  const handle = callEndpoint({ route: `${route}/cover-image`, method: "POST", body });
  return handleReq<FreeProfessionalProfileCoverImageUpload>({ ...handle, hideError: true });
};

export const deletePsychologistFreeProfileCoverImage = async () => {
  const handle = callEndpoint({ route: `${route}/cover-image`, method: "DELETE" });
  return handleReq<FreeProfessionalProfileCoverImageRemoval>({ ...handle, hideError: true });
};

const uploadPsychologistFreeProfileVideoSingle = async (
  file: File,
  onProgress?: (percentage: number) => void,
) => {
  const body = new FormData();
  const { file: uploadFile } = withProfileVideoFileType(file);
  body.append("video", uploadFile);

  const handle = callEndpoint({
    route: `${route}/video`,
    method: "POST",
    body,
    config: {
      onUploadProgress: (progressEvent) => {
        if (!progressEvent.total) return;
        onProgress?.(Math.round((progressEvent.loaded / progressEvent.total) * 100));
      },
      timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS,
    },
  });
  return handleReq<FreeProfessionalProfileVideoUpload>({ ...handle, hideError: true });
};

const initiateProfileVideoMultipartUpload = (
  body: FreeProfessionalProfileVideoMultipartInitiatePayload,
) => {
  const handle = callEndpoint({
    route: `${route}/video/multipart/initiate`,
    method: "POST",
    body,
    config: { timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS },
  });
  return handleReq<FreeProfessionalProfileVideoMultipartInitiateResponse>({
    ...handle,
    hideError: true,
  });
};

const uploadProfileVideoMultipartPart = (
  sessionId: string,
  partNumber: number,
  chunk: Blob,
  fileName: string,
  onProgress: (loadedBytes: number) => void,
) => {
  const body = new FormData();
  body.append("uploadSessionId", sessionId);
  body.append("partNumber", String(partNumber));
  body.append("chunk", chunk, fileName);

  const handle = callEndpoint({
    route: `${route}/video/multipart/part`,
    method: "POST",
    body,
    config: {
      onUploadProgress: (progressEvent) => onProgress(progressEvent.loaded),
      timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS,
    },
  });
  return handleReq<FreeProfessionalProfileVideoMultipartPartResponse>({
    ...handle,
    hideError: true,
  });
};

const completeProfileVideoMultipartUpload = (
  body: FreeProfessionalProfileVideoMultipartCompletePayload,
) => {
  const handle = callEndpoint({
    route: `${route}/video/multipart/complete`,
    method: "POST",
    body,
    config: { timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS },
  });
  return handleReq<FreeProfessionalProfileVideoUpload>({ ...handle, hideError: true });
};

const abortProfileVideoMultipartUpload = (sessionId: string) => {
  const handle = callEndpoint({
    route: `${route}/video/multipart`,
    method: "DELETE",
    body: { uploadSessionId: sessionId },
    config: { timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS },
  });
  return handleReq<{ aborted: boolean }>({ ...handle, hideError: true });
};

const uploadPsychologistFreeProfileVideoMultipart = async (
  file: File,
  onProgress?: (percentage: number) => void,
) => {
  const { mimeType } = withProfileVideoFileType(file);

  return uploadFileMultipart({
    abort: abortProfileVideoMultipartUpload,
    complete: ({ parts, sessionId }) =>
      completeProfileVideoMultipartUpload({
        parts,
        uploadSessionId: sessionId,
      }),
    file,
    initiate: () =>
      initiateProfileVideoMultipartUpload({
        fileName: file.name || "video",
        mimeType,
        size: file.size,
      }),
    mimeType,
    onProgress,
    uploadPart: ({ chunk, fileName, onProgress: onChunkProgress, partNumber, sessionId }) =>
      uploadProfileVideoMultipartPart(sessionId, partNumber, chunk, fileName, onChunkProgress),
  });
};

export const uploadPsychologistFreeProfileVideo = async (
  file: File,
  onProgress?: (percentage: number) => void,
) => {
  if (file.size <= PROFILE_VIDEO_MULTIPART_THRESHOLD_BYTES) {
    return uploadPsychologistFreeProfileVideoSingle(file, onProgress);
  }

  try {
    return await uploadPsychologistFreeProfileVideoMultipart(file, onProgress);
  } catch (uploadError) {
    const status = getApiErrorStatus(uploadError);
    const legacyLimitBytes = PROFILE_VIDEO_SIMPLE_LIMIT_MB * 1024 * 1024;
    if ((status === 404 || status === 405) && file.size <= legacyLimitBytes) {
      return uploadPsychologistFreeProfileVideoSingle(file, onProgress);
    }
    if (status === 404 || status === 405) {
      throw new Error("O envio deste vídeo está sendo atualizado. Tente novamente em instantes.");
    }

    throw uploadError;
  }
};

export const uploadPsychologistFreeProfileVideoCover = async (file: File) => {
  const body = new FormData();
  body.append("video-cover", file);

  const handle = callEndpoint({ route: `${route}/video/cover`, method: "POST", body });
  return handleReq<FreeProfessionalProfileVideoCoverUpload>({ ...handle, hideError: true });
};

export const deletePsychologistFreeProfileVideo = async () => {
  const handle = callEndpoint({ route: `${route}/video`, method: "DELETE" });
  return handleReq<FreeProfessionalProfileVideoRemoval>({ ...handle, hideError: true });
};
