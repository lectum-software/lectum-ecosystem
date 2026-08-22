import { getApiErrorStatus } from "@/api/errors";
import { callEndpoint } from "@/api/generator";
import type {
  CreatePostReplyPayload,
  PostDeleteResponse,
  PostDetailResponse,
  PostMuteResponse,
  PostRepliesQuery,
  PostRepliesResponse,
  PostReply,
  PostReplyDeleteResponse,
  PostReplyMediaMultipartCompletePayload,
  PostReplyMediaMultipartInitiatePayload,
  PostReplyMediaMultipartInitiateResponse,
  PostReplyMediaMultipartPartResponse,
  PostReplyMediaUploadResponse,
  PostReplyThreadResponse,
  PostReplyUpdateResponse,
  PostReportPayload,
  PostReportResponse,
  PostSaveResponse,
  PostShareArtifactResponse,
  PostSharePayload,
  PostShareResponse,
  PostUpdateResponse,
  PostVotePayload,
  PostVoteResponse,
  UpdatePostPayload,
  UpdatePostReplyPayload,
  UserPostsQuery,
  UserPostsResponse,
} from "@/api/generator/types/posts";
import { handleReq } from "@/api/handle";
import { COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS } from "@/utils/media-upload-error";
import { MULTIPART_DEFAULT_CHUNK_BYTES, uploadFileMultipart } from "@/utils/multipart-upload";
import {
  MEDIA_UPLOAD_CLEANUP_TIMEOUT_MS,
  throwIfMediaUploadCanceled,
} from "@/utils/upload-lifecycle";

const REPLY_MEDIA_MULTIPART_THRESHOLD_BYTES = MULTIPART_DEFAULT_CHUNK_BYTES;
const REPLY_MEDIA_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);
const REPLY_MEDIA_MIME_BY_EXTENSION: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  mov: "video/quicktime",
  mp4: "video/mp4",
  png: "image/png",
  webm: "video/webm",
  webp: "image/webp",
};

const shouldUseMultipartReplyUpload = (file: File) =>
  file.size > REPLY_MEDIA_MULTIPART_THRESHOLD_BYTES;

const resolveReplyMediaMimeType = (file: File) => {
  const declaredMimeType = file.type.trim().toLowerCase().split(";", 1)[0] ?? "";
  if (REPLY_MEDIA_ALLOWED_MIME_TYPES.has(declaredMimeType)) return declaredMimeType;

  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const inferredMimeType = REPLY_MEDIA_MIME_BY_EXTENSION[extension];
  if (inferredMimeType) return inferredMimeType;

  return declaredMimeType;
};

const withReplyMediaFileType = (file: File) => {
  const mimeType = resolveReplyMediaMimeType(file);
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

export const getMyPosts = async (query: UserPostsQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/posts/mine",
    query,
  });

  return handleReq<UserPostsResponse>(handle);
};

export const getSavedPosts = async (query: UserPostsQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/posts/saved",
    query,
  });

  return handleReq<UserPostsResponse>(handle);
};

export const getPostDetail = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id",
    params: { id },
  });

  return handleReq<PostDetailResponse>(handle);
};

export const getPostReplies = async (id: string, query: PostRepliesQuery = {}) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies",
    params: { id },
    query,
  });

  return handleReq<PostRepliesResponse>(handle);
};

export const getPostReplyThread = async (id: string, replyId: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/:replyId/thread",
    params: { id, replyId },
  });

  const reply = await handleReq<PostReply>(handle);

  return { reply } satisfies PostReplyThreadResponse;
};

export const createPostReply = async (id: string, body: CreatePostReplyPayload) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies",
    method: "POST",
    params: { id },
    body,
  });

  return handleReq<PostReply>({
    ...handle,
    hideError: true,
    showSuccess: true,
  });
};

export const updatePost = async (id: string, body: UpdatePostPayload) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id",
    method: "PUT",
    params: { id },
    body,
  });

  return handleReq<PostUpdateResponse>({
    ...handle,
    hideError: true,
    showSuccess: true,
  });
};

export const updatePostReply = async (
  id: string,
  replyId: string,
  body: UpdatePostReplyPayload,
) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/:replyId",
    method: "PUT",
    params: { id, replyId },
    body,
  });

  return handleReq<PostReplyUpdateResponse>({
    ...handle,
    hideError: true,
    showSuccess: true,
  });
};

const uploadPostReplyMediaSingle = async (
  id: string,
  file: File,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal,
) => {
  throwIfMediaUploadCanceled(signal);
  const body = new FormData();
  const { file: uploadFile } = withReplyMediaFileType(file);
  body.append("media", uploadFile);

  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/media",
    method: "POST",
    params: { id },
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
    return await handleReq<PostReplyMediaUploadResponse>({
      ...handle,
      hideError: true,
    });
  } catch (uploadError) {
    throwIfMediaUploadCanceled(signal);
    throw uploadError;
  }
};

const initiatePostReplyMediaMultipartUpload = async (
  id: string,
  body: PostReplyMediaMultipartInitiatePayload,
  signal?: AbortSignal,
) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/media/multipart/initiate",
    method: "POST",
    params: { id },
    body,
    config: { signal, timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS },
  });

  return handleReq<PostReplyMediaMultipartInitiateResponse>({
    ...handle,
    hideError: true,
  });
};

const uploadPostReplyMediaMultipartPart = async (
  id: string,
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
    route: "/api/private/posts/:id/replies/media/multipart/part",
    method: "POST",
    params: { id },
    body,
    config: {
      onUploadProgress: (progressEvent) => onProgress(progressEvent.loaded),
      signal,
      timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS,
    },
  });

  return handleReq<PostReplyMediaMultipartPartResponse>({
    ...handle,
    hideError: true,
  });
};

const completePostReplyMediaMultipartUpload = async (
  id: string,
  body: PostReplyMediaMultipartCompletePayload,
  signal?: AbortSignal,
) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/media/multipart/complete",
    method: "POST",
    params: { id },
    body,
    config: { signal, timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS },
  });

  return handleReq<PostReplyMediaUploadResponse>({
    ...handle,
    hideError: true,
  });
};

const abortPostReplyMediaMultipartUpload = async (id: string, uploadSessionId: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/media/multipart",
    method: "DELETE",
    params: { id },
    body: { uploadSessionId },
    config: { timeout: MEDIA_UPLOAD_CLEANUP_TIMEOUT_MS },
  });

  return handleReq<{ aborted: boolean }>({
    ...handle,
    hideError: true,
  });
};

const uploadPostReplyMediaMultipart = async (
  id: string,
  file: File,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal,
) => {
  const { file: uploadFile, mimeType } = withReplyMediaFileType(file);

  return uploadFileMultipart({
    abort: (sessionId) => abortPostReplyMediaMultipartUpload(id, sessionId),
    complete: ({ parts, sessionId }) =>
      completePostReplyMediaMultipartUpload(
        id,
        {
          parts,
          uploadSessionId: sessionId,
        } satisfies PostReplyMediaMultipartCompletePayload,
        signal,
      ),
    file: uploadFile,
    initiate: () =>
      initiatePostReplyMediaMultipartUpload(
        id,
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
      uploadPostReplyMediaMultipartPart(
        id,
        sessionId,
        partNumber,
        chunk,
        fileName,
        onChunkProgress,
        signal,
      ),
  });
};

export const uploadPostReplyMedia = async (
  id: string,
  file: File,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal,
) => {
  if (shouldUseMultipartReplyUpload(file)) {
    try {
      return await uploadPostReplyMediaMultipart(id, file, onProgress, signal);
    } catch (error) {
      throwIfMediaUploadCanceled(signal);
      const status = getApiErrorStatus(error);

      if (status === 404 || status === 405) {
        return uploadPostReplyMediaSingle(id, file, onProgress, signal);
      }

      throw error;
    }
  }

  return uploadPostReplyMediaSingle(id, file, onProgress, signal);
};

export const reportPost = async (id: string, body: PostReportPayload) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/report",
    method: "POST",
    params: { id },
    body,
  });

  return handleReq<PostReportResponse>({
    ...handle,
    hideError: true,
    showSuccess: true,
  });
};

export const reportReply = async (id: string, replyId: string, body: PostReportPayload) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/:replyId/report",
    method: "POST",
    params: { id, replyId },
    body,
  });

  return handleReq<PostReportResponse>({
    ...handle,
    hideError: true,
    showSuccess: true,
  });
};

export const sharePost = async (id: string, body: PostSharePayload = {}) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/share",
    method: "POST",
    params: { id },
    body,
  });

  return handleReq<PostShareResponse>({
    ...handle,
    hideError: true,
  });
};

export const shareReply = async (
  id: string,
  replyId: string,
  body: Omit<PostSharePayload, "replyId"> = {},
) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/:replyId/share",
    method: "POST",
    params: { id, replyId },
    body,
  });

  return handleReq<PostShareResponse>({
    ...handle,
    hideError: true,
  });
};

const SHARE_ARTIFACT_UPLOAD_TIMEOUT_MS = 300_000;
const SHARE_ARTIFACT_MIME_BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
};

const withShareArtifactFileType = (file: File) => {
  const declaredMimeType = file.type.trim().toLowerCase().split(";", 1)[0] ?? "";
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const supportedDeclaredMimeType =
    declaredMimeType === "video/mp4" || declaredMimeType === "video/webm" ? declaredMimeType : null;
  const mimeType =
    supportedDeclaredMimeType || SHARE_ARTIFACT_MIME_BY_EXTENSION[extension] || "video/mp4";

  if (file.type.trim().toLowerCase() === mimeType) return file;

  return new File([file], file.name || "video-lectum.mp4", {
    lastModified: file.lastModified,
    type: mimeType,
  });
};

export const getPostShareArtifact = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/share-artifact",
    params: { id },
  });

  return handleReq<PostShareArtifactResponse>({
    ...handle,
    hideError: true,
  });
};

export const getReplyShareArtifact = async (id: string, replyId: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/:replyId/share-artifact",
    params: { id, replyId },
  });

  return handleReq<PostShareArtifactResponse>({
    ...handle,
    hideError: true,
  });
};

export const uploadPostShareArtifact = async (id: string, file: File) => {
  const body = new FormData();
  body.append("share-artifacts", withShareArtifactFileType(file));

  const handle = callEndpoint({
    route: "/api/private/posts/:id/share-artifact",
    method: "POST",
    params: { id },
    body,
    config: { timeout: SHARE_ARTIFACT_UPLOAD_TIMEOUT_MS },
  });

  return handleReq<PostShareArtifactResponse>({
    ...handle,
    hideError: true,
    signOutOnUnauthorized: false,
  });
};

export const uploadReplyShareArtifact = async (id: string, replyId: string, file: File) => {
  const body = new FormData();
  body.append("share-artifacts", withShareArtifactFileType(file));

  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/:replyId/share-artifact",
    method: "POST",
    params: { id, replyId },
    body,
    config: { timeout: SHARE_ARTIFACT_UPLOAD_TIMEOUT_MS },
  });

  return handleReq<PostShareArtifactResponse>({
    ...handle,
    hideError: true,
    signOutOnUnauthorized: false,
  });
};

export const votePost = async (id: string, body: PostVotePayload) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/vote",
    method: "POST",
    params: { id },
    body,
  });

  return handleReq<PostVoteResponse>({
    ...handle,
    hideError: true,
  });
};

export const savePost = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/save",
    method: "POST",
    params: { id },
  });

  return handleReq<PostSaveResponse>({
    ...handle,
    hideError: true,
  });
};

export const unsavePost = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/save",
    method: "DELETE",
    params: { id },
  });

  return handleReq<PostSaveResponse>({
    ...handle,
    hideError: true,
  });
};

export const mutePost = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/mute",
    method: "POST",
    params: { id },
  });

  return handleReq<PostMuteResponse>({
    ...handle,
    showSuccess: true,
  });
};

export const unmutePost = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/mute",
    method: "DELETE",
    params: { id },
  });

  return handleReq<PostMuteResponse>({
    ...handle,
    showSuccess: true,
  });
};

export const deletePost = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id",
    method: "DELETE",
    params: { id },
  });

  return handleReq<PostDeleteResponse>({
    ...handle,
    hideError: true,
    showSuccess: true,
  });
};

export const saveReply = async (id: string, replyId: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/:replyId/save",
    method: "POST",
    params: { id, replyId },
  });

  return handleReq<PostSaveResponse>({
    ...handle,
    hideError: true,
  });
};

export const unsaveReply = async (id: string, replyId: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/:replyId/save",
    method: "DELETE",
    params: { id, replyId },
  });

  return handleReq<PostSaveResponse>({
    ...handle,
    hideError: true,
  });
};

export const deleteReply = async (id: string, replyId: string) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/:replyId",
    method: "DELETE",
    params: { id, replyId },
  });

  return handleReq<PostReplyDeleteResponse>({
    ...handle,
    hideError: true,
    showSuccess: true,
  });
};
