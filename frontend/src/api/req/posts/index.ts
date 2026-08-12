import { getApiErrorStatus, isRetryableApiError } from "@/api/errors";
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

const REPLY_MEDIA_MULTIPART_FALLBACK_CHUNK_BYTES = 5 * 1024 * 1024;
const REPLY_MEDIA_MULTIPART_THRESHOLD_BYTES = REPLY_MEDIA_MULTIPART_FALLBACK_CHUNK_BYTES;
const REPLY_MEDIA_MULTIPART_PART_MAX_ATTEMPTS = 3;
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

const sleep = (ms: number) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));

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

const retryMultipartPartUpload = async <T>(upload: () => Promise<T>) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= REPLY_MEDIA_MULTIPART_PART_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await upload();
    } catch (error) {
      lastError = error;
      if (attempt >= REPLY_MEDIA_MULTIPART_PART_MAX_ATTEMPTS || !isRetryableApiError(error)) {
        throw error;
      }

      await sleep(600 * attempt);
    }
  }

  throw lastError;
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

const uploadPostReplyMediaSingle = async (id: string, file: File) => {
  const body = new FormData();
  const { file: uploadFile } = withReplyMediaFileType(file);
  body.append("media", uploadFile);

  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/media",
    method: "POST",
    params: { id },
    body,
    config: { timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS },
  });

  return handleReq<PostReplyMediaUploadResponse>({
    ...handle,
    hideError: true,
  });
};

const initiatePostReplyMediaMultipartUpload = async (
  id: string,
  body: PostReplyMediaMultipartInitiatePayload,
) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/media/multipart/initiate",
    method: "POST",
    params: { id },
    body,
    config: { timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS },
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
    config: { timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS },
  });

  return handleReq<PostReplyMediaMultipartPartResponse>({
    ...handle,
    hideError: true,
  });
};

const completePostReplyMediaMultipartUpload = async (
  id: string,
  body: PostReplyMediaMultipartCompletePayload,
) => {
  const handle = callEndpoint({
    route: "/api/private/posts/:id/replies/media/multipart/complete",
    method: "POST",
    params: { id },
    body,
    config: { timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS },
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
    config: { timeout: COMMUNITY_MEDIA_UPLOAD_TIMEOUT_MS },
  });

  return handleReq<{ aborted: boolean }>({
    ...handle,
    hideError: true,
  });
};

const uploadPostReplyMediaMultipart = async (id: string, file: File) => {
  let uploadSessionId: string | null = null;
  const { mimeType } = withReplyMediaFileType(file);

  try {
    const session = await initiatePostReplyMediaMultipartUpload(id, {
      fileName: file.name || "media",
      mimeType,
      size: file.size,
    });
    uploadSessionId = session.upload_session_id;

    const chunkSize =
      Number.isInteger(session.chunk_size) && session.chunk_size > 0
        ? session.chunk_size
        : REPLY_MEDIA_MULTIPART_FALLBACK_CHUNK_BYTES;
    const parts: PostReplyMediaMultipartCompletePayload["parts"] = [];
    let partNumber = 1;

    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size), mimeType);
      const currentPartNumber = partNumber;
      const uploadedPart = await retryMultipartPartUpload(() =>
        uploadPostReplyMediaMultipartPart(
          id,
          session.upload_session_id,
          currentPartNumber,
          chunk,
          file.name || "media",
        ),
      );
      const uploadedPartId = uploadedPart.part_id || uploadedPart.part_token;

      if (!uploadedPartId) {
        throw new Error("reply_media_part_missing");
      }

      parts.push({
        partNumber: uploadedPart.part_number,
        partId: uploadedPartId,
      });
      partNumber += 1;
    }

    return await completePostReplyMediaMultipartUpload(id, {
      parts,
      uploadSessionId: session.upload_session_id,
    });
  } catch (error) {
    if (uploadSessionId) {
      await abortPostReplyMediaMultipartUpload(id, uploadSessionId).catch(() => undefined);
    }

    throw error;
  }
};

export const uploadPostReplyMedia = async (id: string, file: File) => {
  if (shouldUseMultipartReplyUpload(file)) {
    try {
      return await uploadPostReplyMediaMultipart(id, file);
    } catch (error) {
      const status = getApiErrorStatus(error);

      if (status === 404 || status === 405) {
        return uploadPostReplyMediaSingle(id, file);
      }

      throw error;
    }
  }

  return uploadPostReplyMediaSingle(id, file);
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
