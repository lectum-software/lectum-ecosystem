import type {
  CreatePostReplyPayload,
  PostReply,
  PostReplyMediaUploadResponse,
} from "@/api/generator/types/posts";
import {
  createVideoThumbnailFile,
  type LectumVideoThumbnailFrameOptions,
} from "@/utils/video-thumbnail";
import { type ReplyComposerForm, toCreatePostReplyPayload } from "../use-form";

import { resolveReplyMediaUploadError, resolveReplyPublishError } from "./reply-support";

type ReplyMediaUploadInput = {
  file: File;
  id: string;
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
  thumbnailFrame?: LectumVideoThumbnailFrameOptions | null;
  uploadReplyMedia: (input: ReplyMediaUploadInput) => Promise<PostReplyMediaUploadResponse>;
  values: ReplyComposerForm;
};

const uploadRequiredReplyMedia = async ({
  mediaFile,
  postId,
  setReplyError,
  uploadReplyMedia,
}: Pick<
  SubmitReplyWithOptionalMediaInput,
  "mediaFile" | "postId" | "setReplyError" | "uploadReplyMedia"
>) => {
  if (!mediaFile) return null;

  try {
    return await uploadReplyMedia({ file: mediaFile, id: postId });
  } catch (error) {
    setReplyError(resolveReplyMediaUploadError(error));
    throw error;
  }
};

const uploadBestEffortVideoThumbnail = async ({
  media,
  mediaFile,
  postId,
  thumbnailFrame,
  uploadReplyMedia,
}: Pick<
  SubmitReplyWithOptionalMediaInput,
  "mediaFile" | "postId" | "thumbnailFrame" | "uploadReplyMedia"
> & {
  media: PostReplyMediaUploadResponse | null;
}) => {
  if (!mediaFile || media?.media_type !== "video") return null;

  let thumbnailFile: File | null = null;

  try {
    thumbnailFile = await createVideoThumbnailFile(mediaFile, {
      lectumShareFrame: thumbnailFrame ?? null,
    });
  } catch {
    thumbnailFile = null;
  }

  if (!thumbnailFile) return null;

  try {
    return await uploadReplyMedia({ file: thumbnailFile, id: postId });
  } catch {
    return null;
  }
};

export const submitReplyWithOptionalMedia = async ({
  createReply,
  mediaFile,
  parentReplyId,
  postId,
  setReplyError,
  thumbnailFrame,
  uploadReplyMedia,
  values,
}: SubmitReplyWithOptionalMediaInput) => {
  setReplyError(null);

  const media = await uploadRequiredReplyMedia({
    mediaFile,
    postId,
    setReplyError,
    uploadReplyMedia,
  });
  const thumbnail = await uploadBestEffortVideoThumbnail({
    media,
    mediaFile,
    postId,
    thumbnailFrame,
    uploadReplyMedia,
  });

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
