import { getApiErrorStatus } from "@/api/errors";
import { callEndpoint } from "@/api/generator";
import type {
  CommunityDetailResponse,
  CommunityFeedQuery,
  CommunityFeedResponse,
  CommunityListQuery,
  CommunityListResponse,
  CommunityMembershipResponse,
  CommunityPost,
  CommunityPostMediaMultipartCompletePayload,
  CommunityPostMediaMultipartInitiatePayload,
  CommunityPostMediaMultipartInitiateResponse,
  CommunityPostMediaMultipartPartResponse,
  CommunityPostMediaUploadResponse,
  CommunityPostsQuery,
  CommunityPostsResponse,
  CommunitySuggestion,
  CommunityTopMentorsQuery,
  CommunityTopMentorsResponse,
  CreateCommunityPostPayload,
  SuggestCommunityPayload,
} from "@/api/generator/types/community";
import { handleReq } from "@/api/handle";
import {
  COMMUNITY_MEDIA_SIZE_ERROR_MESSAGE,
  COMMUNITY_MEDIA_UPLOAD_LIMIT_BYTES,
  COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS,
} from "@/utils/media-upload-error";
import { MULTIPART_DEFAULT_CHUNK_BYTES, uploadFileMultipart } from "@/utils/multipart-upload";
import {
  MEDIA_UPLOAD_CLEANUP_TIMEOUT_MS,
  throwIfMediaUploadCanceled,
} from "@/utils/upload-lifecycle";

const COMMUNITY_POST_MEDIA_MULTIPART_THRESHOLD_BYTES = MULTIPART_DEFAULT_CHUNK_BYTES;
const COMMUNITY_POST_MEDIA_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);
const COMMUNITY_POST_MEDIA_MIME_BY_EXTENSION: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  mov: "video/quicktime",
  mp4: "video/mp4",
  png: "image/png",
  webm: "video/webm",
  webp: "image/webp",
};

const resolveCommunityPostMediaMimeType = (file: File) => {
  const declaredMimeType = file.type.trim().toLowerCase().split(";", 1)[0] ?? "";
  if (COMMUNITY_POST_MEDIA_ALLOWED_MIME_TYPES.has(declaredMimeType)) return declaredMimeType;

  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const inferredMimeType = COMMUNITY_POST_MEDIA_MIME_BY_EXTENSION[extension];
  if (inferredMimeType) return inferredMimeType;

  return declaredMimeType;
};

const withCommunityPostMediaFileType = (file: File) => {
  const mimeType = resolveCommunityPostMediaMimeType(file);
  if (!mimeType || file.type.trim().toLowerCase() === mimeType) {
    return { file, mimeType };
  }

  return {
    file: new File([file], file.name || "media", {
      lastModified: file.lastModified,
      type: mimeType,
    }),
    mimeType,
  };
};

export const getCommunities = async (query: CommunityListQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/community",
    query,
  });

  return handleReq<CommunityListResponse>(handle);
};

export const getCommunityFeedPosts = async (query: CommunityFeedQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/community/feed/posts",
    query,
  });

  return handleReq<CommunityFeedResponse>(handle);
};

export const getCommunityTopMentors = async (query: CommunityTopMentorsQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/community/top-mentors",
    query,
  });

  return handleReq<CommunityTopMentorsResponse>(handle);
};

export const getCommunityDetail = async (slug: string) => {
  const handle = callEndpoint({
    route: "/api/private/community/:slug",
    params: { slug },
  });

  return handleReq<CommunityDetailResponse>(handle);
};

export const followCommunity = async (slug: string) => {
  const handle = callEndpoint({
    route: "/api/private/community/:slug/members",
    method: "POST",
    params: { slug },
  });

  return handleReq<CommunityMembershipResponse>(handle);
};

export const unfollowCommunity = async (slug: string) => {
  const handle = callEndpoint({
    route: "/api/private/community/:slug/members",
    method: "DELETE",
    params: { slug },
  });

  return handleReq<CommunityMembershipResponse>(handle);
};

export const suggestCommunity = async (body: SuggestCommunityPayload) => {
  const handle = callEndpoint({
    route: "/api/private/community/suggestions",
    method: "POST",
    body,
  });

  return handleReq<CommunitySuggestion>({
    ...handle,
    hideError: true,
    showSuccess: true,
  });
};

export const getCommunityPosts = async (slug: string, query: CommunityPostsQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/community/:slug/posts",
    params: { slug },
    query,
  });

  return handleReq<CommunityPostsResponse>(handle);
};

export const createCommunityPost = async (slug: string, body: CreateCommunityPostPayload) => {
  const handle = callEndpoint({
    route: "/api/private/community/:slug/posts",
    method: "POST",
    params: { slug },
    body,
  });

  return handleReq<CommunityPost>({ ...handle, hideError: true });
};

const uploadCommunityPostMediaSingle = async (
  slug: string,
  file: File,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal,
) => {
  throwIfMediaUploadCanceled(signal);
  const body = new FormData();
  const { file: uploadFile } = withCommunityPostMediaFileType(file);
  body.append("media", uploadFile);

  const handle = callEndpoint({
    route: "/api/private/community/:slug/posts/media",
    method: "POST",
    params: { slug },
    body,
    config: {
      onUploadProgress: (progressEvent) => {
        if (!progressEvent.total) return;
        onProgress?.(Math.round((progressEvent.loaded / progressEvent.total) * 100));
      },
      signal,
      timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS,
    },
  });

  try {
    return await handleReq<CommunityPostMediaUploadResponse>({
      ...handle,
      hideError: true,
    });
  } catch (uploadError) {
    throwIfMediaUploadCanceled(signal);
    throw uploadError;
  }
};

const initiateCommunityPostMediaMultipartUpload = (
  slug: string,
  body: CommunityPostMediaMultipartInitiatePayload,
  signal?: AbortSignal,
) => {
  const handle = callEndpoint({
    route: "/api/private/community/:slug/posts/media/multipart/initiate",
    method: "POST",
    params: { slug },
    body,
    config: { signal, timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS },
  });

  return handleReq<CommunityPostMediaMultipartInitiateResponse>({
    ...handle,
    hideError: true,
  });
};

const uploadCommunityPostMediaMultipartPart = (
  slug: string,
  uploadSessionId: string,
  partNumber: number,
  chunk: Blob,
  fileName: string,
  onProgress: (loadedBytes: number) => void,
  signal?: AbortSignal,
) => {
  const body = new FormData();
  body.append("uploadSessionId", uploadSessionId);
  body.append("partNumber", String(partNumber));
  body.append("chunk", chunk, fileName);

  const handle = callEndpoint({
    route: "/api/private/community/:slug/posts/media/multipart/part",
    method: "POST",
    params: { slug },
    body,
    config: {
      onUploadProgress: (progressEvent) => onProgress(progressEvent.loaded),
      signal,
      timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS,
    },
  });

  return handleReq<CommunityPostMediaMultipartPartResponse>({
    ...handle,
    hideError: true,
  });
};

const completeCommunityPostMediaMultipartUpload = (
  slug: string,
  body: CommunityPostMediaMultipartCompletePayload,
  signal?: AbortSignal,
) => {
  const handle = callEndpoint({
    route: "/api/private/community/:slug/posts/media/multipart/complete",
    method: "POST",
    params: { slug },
    body,
    config: { signal, timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS },
  });

  return handleReq<CommunityPostMediaUploadResponse>({
    ...handle,
    hideError: true,
  });
};

const abortCommunityPostMediaMultipartUpload = (slug: string, uploadSessionId: string) => {
  const handle = callEndpoint({
    route: "/api/private/community/:slug/posts/media/multipart",
    method: "DELETE",
    params: { slug },
    body: { uploadSessionId },
    config: { timeout: MEDIA_UPLOAD_CLEANUP_TIMEOUT_MS },
  });

  return handleReq<{ aborted: boolean }>({
    ...handle,
    hideError: true,
  });
};

const uploadCommunityPostMediaMultipart = async (
  slug: string,
  file: File,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal,
) => {
  const { file: uploadFile, mimeType } = withCommunityPostMediaFileType(file);

  return uploadFileMultipart({
    abort: (sessionId) => abortCommunityPostMediaMultipartUpload(slug, sessionId),
    complete: ({ parts, sessionId }) =>
      completeCommunityPostMediaMultipartUpload(
        slug,
        {
          parts,
          uploadSessionId: sessionId,
        },
        signal,
      ),
    file: uploadFile,
    initiate: () =>
      initiateCommunityPostMediaMultipartUpload(
        slug,
        {
          fileName: uploadFile.name || "media",
          mimeType,
          size: uploadFile.size,
        },
        signal,
      ),
    mimeType,
    onProgress,
    signal,
    uploadPart: ({ chunk, fileName, onProgress: onChunkProgress, partNumber, sessionId }) =>
      uploadCommunityPostMediaMultipartPart(
        slug,
        sessionId,
        partNumber,
        chunk,
        fileName,
        onChunkProgress,
        signal,
      ),
  });
};

export const uploadCommunityPostMedia = async (
  slug: string,
  file: File,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal,
) => {
  if (file.size <= COMMUNITY_POST_MEDIA_MULTIPART_THRESHOLD_BYTES) {
    return uploadCommunityPostMediaSingle(slug, file, onProgress, signal);
  }

  try {
    return await uploadCommunityPostMediaMultipart(slug, file, onProgress, signal);
  } catch (uploadError) {
    throwIfMediaUploadCanceled(signal);
    const status = getApiErrorStatus(uploadError);

    if ((status === 404 || status === 405) && file.size <= COMMUNITY_MEDIA_UPLOAD_LIMIT_BYTES) {
      return uploadCommunityPostMediaSingle(slug, file, onProgress, signal);
    }
    if (status === 404 || status === 405) {
      throw new Error(COMMUNITY_MEDIA_SIZE_ERROR_MESSAGE);
    }

    throw uploadError;
  }
};
