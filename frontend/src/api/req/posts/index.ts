import api from "@/api";
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
  PostSharePayload,
  PostShareResponse,
  PostShareVideoArtifactRenderJobResponse,
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
import { isVideoAssetUploadProvisionError } from "@/utils/video-asset-upload";
import { shouldFallbackToLegacyVideoUploadAfterProvisionError } from "@/utils/video-stream";
import { withReplyMediaFileType } from "./reply-media-file";
import { uploadReplyVideoToStreamWhenEnabled } from "./reply-stream-upload";

const REPLY_MEDIA_MULTIPART_THRESHOLD_BYTES = MULTIPART_DEFAULT_CHUNK_BYTES;
const shouldUseMultipartReplyUpload = (file: File) =>
  file.size > REPLY_MEDIA_MULTIPART_THRESHOLD_BYTES;

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
  const { file: uploadFile, mimeType } = withReplyMediaFileType(file);
  try {
    const streamUpload = await uploadReplyVideoToStreamWhenEnabled({
      file: uploadFile,
      mimeType,
      onProgress,
      postId: id,
      signal,
    });
    if (streamUpload) return streamUpload;
  } catch (streamError) {
    throwIfMediaUploadCanceled(signal);
    if (
      !shouldFallbackToLegacyVideoUploadAfterProvisionError({
        isProvisionError: isVideoAssetUploadProvisionError(streamError),
        status: getApiErrorStatus(streamError),
      })
    ) {
      throw streamError;
    }
  }

  if (shouldUseMultipartReplyUpload(uploadFile)) {
    try {
      return await uploadPostReplyMediaMultipart(id, uploadFile, onProgress, signal);
    } catch (error) {
      throwIfMediaUploadCanceled(signal);
      const status = getApiErrorStatus(error);

      if (status === 404 || status === 405) {
        return uploadPostReplyMediaSingle(id, uploadFile, onProgress, signal);
      }

      throw error;
    }
  }

  return uploadPostReplyMediaSingle(id, uploadFile, onProgress, signal);
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

type PostShareVideoArtifactRenderJobRequest = {
  jobId?: string;
  postId: string;
  replyId?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
};

const normalizePostShareVideoArtifactRenderJob = (
  data: Omit<PostShareVideoArtifactRenderJobResponse, "ready" | "retry_after_ms"> &
    Partial<Pick<PostShareVideoArtifactRenderJobResponse, "ready" | "retry_after_ms">>,
): PostShareVideoArtifactRenderJobResponse => ({
  ...data,
  ready: data.ready ?? data.status === "completed",
  retry_after_ms:
    typeof data.retry_after_ms === "number" && Number.isFinite(data.retry_after_ms)
      ? data.retry_after_ms
      : data.status === "queued"
        ? 2_000
        : 3_500,
});

const renderJobRoute = (replyId?: string | null) =>
  replyId
    ? "/api/private/posts/:id/replies/:replyId/share-artifact/render-jobs"
    : "/api/private/posts/:id/share-artifact/render-jobs";

const renderJobStatusRoute = (replyId?: string | null) =>
  replyId
    ? "/api/private/posts/:id/replies/:replyId/share-artifact/render-jobs/:jobId"
    : "/api/private/posts/:id/share-artifact/render-jobs/:jobId";

const renderJobFileRoute = (replyId?: string | null) =>
  replyId
    ? "/api/private/posts/:id/replies/:replyId/share-artifact/render-jobs/:jobId/file"
    : "/api/private/posts/:id/share-artifact/render-jobs/:jobId/file";

export const startPostShareVideoArtifactRenderJob = async ({
  postId,
  replyId,
  signal,
  timeoutMs,
}: PostShareVideoArtifactRenderJobRequest) => {
  const handle = callEndpoint({
    route: renderJobRoute(replyId),
    method: "POST",
    params: { id: postId, replyId: replyId ?? undefined },
    config: { signal, timeout: timeoutMs },
  });

  const data = await handleReq<
    Omit<PostShareVideoArtifactRenderJobResponse, "ready" | "retry_after_ms"> &
      Partial<Pick<PostShareVideoArtifactRenderJobResponse, "ready" | "retry_after_ms">>
  >({
    ...handle,
    hideError: true,
  });

  return normalizePostShareVideoArtifactRenderJob(data);
};

export const getPostShareVideoArtifactRenderJob = async ({
  jobId,
  postId,
  replyId,
  signal,
  timeoutMs,
}: PostShareVideoArtifactRenderJobRequest & { jobId: string }) => {
  const handle = callEndpoint({
    route: renderJobStatusRoute(replyId),
    params: { id: postId, jobId, replyId: replyId ?? undefined },
    config: { signal, timeout: timeoutMs },
  });

  const data = await handleReq<
    Omit<PostShareVideoArtifactRenderJobResponse, "ready" | "retry_after_ms"> &
      Partial<Pick<PostShareVideoArtifactRenderJobResponse, "ready" | "retry_after_ms">>
  >({
    ...handle,
    hideError: true,
  });

  return normalizePostShareVideoArtifactRenderJob(data);
};

export const downloadPostShareVideoArtifactRenderJobFile = async ({
  fileName,
  jobId,
  postId,
  replyId,
  signal,
  timeoutMs,
}: PostShareVideoArtifactRenderJobRequest & { fileName: string; jobId: string }) => {
  const handle = callEndpoint({
    route: renderJobFileRoute(replyId),
    params: { id: postId, jobId, replyId: replyId ?? undefined },
  });
  const response = await api.request<Blob>({
    responseType: "blob",
    signal,
    timeout: timeoutMs ?? 120_000,
    url: handle.url,
  });
  const headerContentType = response.headers["content-type"];
  const contentType = typeof headerContentType === "string" ? headerContentType : "video/mp4";
  const blob = response.data;

  if (!blob || blob.size <= 0) {
    throw new Error("Vídeo indisponível para download.");
  }

  return new File([blob], fileName, { type: contentType });
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
