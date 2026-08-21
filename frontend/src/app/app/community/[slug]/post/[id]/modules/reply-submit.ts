import type {
  CreatePostReplyPayload,
  PostReply,
  PostReplyMediaUploadResponse,
} from "@/api/generator/types/posts";
import type { CommunityVideoUploadOperation } from "@/hooks/use-community-video-upload";
import { isUploadPreparationCanceled, type MediaUploadProgress } from "@/utils/media-preparation";
import { throwIfMediaUploadCanceled } from "@/utils/upload-lifecycle";
import { createVideoThumbnailFile } from "@/utils/video-thumbnail";
import { type ReplyComposerForm, toCreatePostReplyPayload } from "../use-form";

import { resolveReplyMediaUploadError, resolveReplyPublishError } from "./reply-support";

type ReplyMediaUploadInput = {
  file: File;
  id: string;
  onProgress?: (progress: MediaUploadProgress) => void;
  purpose?: "generated-video-thumbnail" | "post-reply-image" | "post-reply-video";
  signal?: AbortSignal;
};

type ReplyCreateInput = {
  body: CreatePostReplyPayload;
  id: string;
};

export type SubmitReplyWithOptionalMediaInput = {
  createReply: (input: ReplyCreateInput) => Promise<PostReply>;
  mediaFile?: File | null;
  parentReplyId?: string | null;
  postId: string;
  setReplyError: (message: string | null) => void;
  uploadReplyMedia: (input: ReplyMediaUploadInput) => Promise<PostReplyMediaUploadResponse>;
  values: ReplyComposerForm;
  videoUploadOperation?: CommunityVideoUploadOperation;
};

const uploadRequiredReplyMedia = async ({
  mediaFile,
  postId,
  setReplyError,
  uploadReplyMedia,
  videoUploadOperation,
}: Pick<
  SubmitReplyWithOptionalMediaInput,
  "mediaFile" | "postId" | "setReplyError" | "uploadReplyMedia" | "videoUploadOperation"
>) => {
  if (!mediaFile) return null;

  try {
    return await uploadReplyMedia({
      file: mediaFile,
      id: postId,
      onProgress: videoUploadOperation?.onProgress,
      signal: videoUploadOperation?.signal,
    });
  } catch (error) {
    if (!isUploadPreparationCanceled(error)) {
      setReplyError(resolveReplyMediaUploadError(error));
    }
    throw error;
  }
};

const uploadBestEffortVideoThumbnail = async ({
  media,
  mediaFile,
  postId,
  uploadReplyMedia,
  videoUploadOperation,
}: Pick<
  SubmitReplyWithOptionalMediaInput,
  "mediaFile" | "postId" | "uploadReplyMedia" | "videoUploadOperation"
> & {
  media: PostReplyMediaUploadResponse | null;
}) => {
  if (!mediaFile || media?.media_type !== "video") return null;

  let thumbnailFile: File | null = null;

  try {
    thumbnailFile = await createVideoThumbnailFile(mediaFile, {
      signal: videoUploadOperation?.signal,
    });
  } catch (error) {
    if (isUploadPreparationCanceled(error)) throw error;
    thumbnailFile = null;
  }

  throwIfMediaUploadCanceled(videoUploadOperation?.signal);
  if (!thumbnailFile) return null;

  try {
    const uploadedThumbnail = await uploadReplyMedia({
      file: thumbnailFile,
      id: postId,
      purpose: "generated-video-thumbnail",
      signal: videoUploadOperation?.signal,
    });
    throwIfMediaUploadCanceled(videoUploadOperation?.signal);
    return uploadedThumbnail;
  } catch (error) {
    if (isUploadPreparationCanceled(error)) throw error;
    return null;
  }
};

export const submitReplyWithOptionalMedia = async ({
  createReply,
  mediaFile,
  parentReplyId,
  postId,
  setReplyError,
  uploadReplyMedia,
  values,
  videoUploadOperation,
}: SubmitReplyWithOptionalMediaInput) => {
  setReplyError(null);

  const { media, thumbnail } = await (async () => {
    try {
      const media = await uploadRequiredReplyMedia({
        mediaFile,
        postId,
        setReplyError,
        uploadReplyMedia,
        videoUploadOperation,
      });
      throwIfMediaUploadCanceled(videoUploadOperation?.signal);
      const thumbnail = await uploadBestEffortVideoThumbnail({
        media,
        mediaFile,
        postId,
        uploadReplyMedia,
        videoUploadOperation,
      });

      return { media, thumbnail };
    } finally {
      videoUploadOperation?.complete();
    }
  })();
  throwIfMediaUploadCanceled(videoUploadOperation?.signal);

  try {
    return await createReply({
      id: postId,
      body: toCreatePostReplyPayload(
        values,
        parentReplyId,
        media
          ? {
              mediaType: media.media_type,
              mediaUrl: media.media_url,
              ...(media.media_type === "video" && thumbnail
                ? { thumbnailUrl: thumbnail.media_url }
                : {}),
            }
          : null,
      ),
    });
  } catch (error) {
    setReplyError(resolveReplyPublishError(error));
    throw error;
  }
};
