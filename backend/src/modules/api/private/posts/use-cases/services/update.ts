import prisma from "@/infra/database/prisma";
import { isVideoAssetPlaybackReference } from "@/infra/video-stream";
import { resolveReadyOwnedVideoAssetReference } from "@/modules/video-assets/service";
import type { IPostUpdateDTO, IPostUpdateReplyDTO } from "../../DTOs/IPostDTO";
import { PostRepository } from "../../repositories/PostRepository";

import {
  ensureCommunityActor,
  hasOwnBodyKey,
  invalidMedia,
  invalidPostMedia,
  isPublicPostMediaUrl,
  MAX_POST_CAROUSEL_IMAGES,
  mediaNotAllowed,
  normalizePostMediaItems,
  normalizePostMediaType,
  postMediaNotAllowed,
  resolveMutationResult,
  resolveOwnerPostMutationResult,
} from "./post-support";

export const updatePost = async (data: IPostUpdateDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const title = data.b.title.trim();
  const content = data.b.content.trim();
  const mediaItemsChangeRequested = hasOwnBodyKey(data.b, "mediaItems");
  const mediaChangeRequested =
    hasOwnBodyKey(data.b, "mediaUrl") ||
    hasOwnBodyKey(data.b, "mediaType") ||
    hasOwnBodyKey(data.b, "thumbnailUrl") ||
    mediaItemsChangeRequested;
  const body: IPostUpdateDTO["b"] = {
    content,
    title,
  };

  if (mediaChangeRequested) {
    const mediaItemsClearing = mediaItemsChangeRequested && data.b.mediaItems === null;
    const rawRequestedMediaItems = Array.isArray(data.b.mediaItems) ? data.b.mediaItems : [];
    if (rawRequestedMediaItems.length > MAX_POST_CAROUSEL_IMAGES) {
      return invalidPostMedia();
    }

    const requestedMediaItems = normalizePostMediaItems(rawRequestedMediaItems);
    const hasMediaItems = requestedMediaItems.length > 0;
    const mediaUrl = data.b.mediaUrl === null ? null : data.b.mediaUrl?.trim();
    const mediaType = data.b.mediaType === null ? null : normalizePostMediaType(data.b.mediaType);
    const thumbnailUrl = data.b.thumbnailUrl === null ? null : data.b.thumbnailUrl?.trim();
    const clearingMedia = mediaItemsClearing || (mediaUrl === null && mediaType === null);
    let replacingMedia =
      typeof mediaUrl === "string" &&
      Boolean(mediaUrl) &&
      Boolean(mediaType) &&
      isPublicPostMediaUrl(mediaUrl);
    let replacingWithStreamVideo = false;
    let streamVideoReference: string | null = null;

    if (
      typeof mediaUrl === "string" &&
      mediaType === "video" &&
      isVideoAssetPlaybackReference(mediaUrl)
    ) {
      const post = await prisma.community_post.findFirst({
        where: { author_id: data.auth.id!, deleted: false, id: data.p.id },
        select: { community: { select: { slug: true } } },
      });
      streamVideoReference = post
        ? await resolveReadyOwnedVideoAssetReference({
            contextId: post.community.slug,
            ownerId: data.auth.id!,
            purpose: "community_post",
            reference: mediaUrl,
          })
        : null;
      replacingWithStreamVideo = Boolean(streamVideoReference);
      replacingMedia = replacingWithStreamVideo;
    }

    if (hasMediaItems) {
      const invalidItems = requestedMediaItems.some(
        (item) =>
          item.mediaType !== "image" || !item.mediaUrl || !isPublicPostMediaUrl(item.mediaUrl),
      );

      if (invalidItems || requestedMediaItems.length > MAX_POST_CAROUSEL_IMAGES) {
        return invalidPostMedia();
      }

      if (mediaType && mediaType !== "image") {
        return invalidPostMedia();
      }

      replacingMedia = true;
      body.mediaUrl = requestedMediaItems[0]?.mediaUrl;
      body.mediaType = "image";
      body.thumbnailUrl = null;
      body.mediaItems = requestedMediaItems.map((item) => ({
        mediaType: "image",
        mediaUrl: item.mediaUrl,
        position: item.position,
      }));
    } else if (clearingMedia) {
      body.mediaUrl = null;
      body.mediaType = null;
      body.thumbnailUrl = null;
      body.mediaItems = [];
    } else if (replacingMedia) {
      if (thumbnailUrl && !isPublicPostMediaUrl(thumbnailUrl)) return invalidPostMedia();

      body.mediaUrl = streamVideoReference || (mediaUrl as string);
      body.mediaType = mediaType as "image" | "video";
      body.thumbnailUrl =
        mediaType === "video" && !replacingWithStreamVideo ? (thumbnailUrl ?? null) : null;
      body.mediaItems =
        mediaType === "image"
          ? [{ mediaType: "image", mediaUrl: mediaUrl as string, position: 0 }]
          : [];
    } else if (hasOwnBodyKey(data.b, "thumbnailUrl")) {
      if (thumbnailUrl && !isPublicPostMediaUrl(thumbnailUrl)) return invalidPostMedia();

      body.thumbnailUrl = thumbnailUrl;
    } else {
      return invalidPostMedia();
    }

    if (replacingMedia) {
      const canAttachMedia = await repository.canAttachReplyMedia(data.auth.id!);
      if (!canAttachMedia) return postMediaNotAllowed();
    }
  }

  const res = await repository.updatePost({
    ...data,
    b: body,
  });

  return resolveOwnerPostMutationResult(res, 200, "post_updated");
};

export const updateReply = async (data: IPostUpdateReplyDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const repository = new PostRepository();
  const mediaChangeRequested =
    hasOwnBodyKey(data.b, "mediaUrl") ||
    hasOwnBodyKey(data.b, "mediaType") ||
    hasOwnBodyKey(data.b, "thumbnailUrl");
  const contentChangeRequested = hasOwnBodyKey(data.b, "content");
  const body: IPostUpdateReplyDTO["b"] = {};

  if (contentChangeRequested) {
    body.content = String(data.b.content ?? "").trim();
  }

  if (mediaChangeRequested) {
    const mediaUrl = data.b.mediaUrl === null ? null : data.b.mediaUrl?.trim();
    const mediaType = data.b.mediaType === null ? null : normalizePostMediaType(data.b.mediaType);
    const thumbnailUrl = data.b.thumbnailUrl === null ? null : data.b.thumbnailUrl?.trim();
    const clearingMedia = mediaUrl === null && mediaType === null;
    let replacingMedia =
      typeof mediaUrl === "string" &&
      Boolean(mediaUrl) &&
      Boolean(mediaType) &&
      isPublicPostMediaUrl(mediaUrl);
    let replacingWithStreamVideo = false;
    let streamVideoReference: string | null = null;

    if (
      typeof mediaUrl === "string" &&
      mediaType === "video" &&
      isVideoAssetPlaybackReference(mediaUrl)
    ) {
      streamVideoReference = await resolveReadyOwnedVideoAssetReference({
        contextId: data.p.id,
        ownerId: data.auth.id!,
        purpose: "community_reply",
        reference: mediaUrl,
      });
      replacingWithStreamVideo = Boolean(streamVideoReference);
      replacingMedia = replacingWithStreamVideo;
    }

    if (thumbnailUrl && !isPublicPostMediaUrl(thumbnailUrl)) return invalidMedia();
    if (!clearingMedia && !replacingMedia && !hasOwnBodyKey(data.b, "thumbnailUrl")) {
      return invalidMedia();
    }

    if (replacingMedia) {
      const canAttachMedia = await repository.canAttachReplyMedia(data.auth.id!);
      if (!canAttachMedia) return mediaNotAllowed();
    }

    if (clearingMedia) {
      body.mediaUrl = null;
      body.mediaType = null;
      body.thumbnailUrl = null;
    } else {
      if (replacingMedia) {
        body.mediaUrl = streamVideoReference || (mediaUrl as string);
        body.mediaType = mediaType as "image" | "video";
      }
      body.thumbnailUrl = replacingMedia
        ? mediaType === "video"
          ? replacingWithStreamVideo
            ? null
            : (thumbnailUrl ?? null)
          : null
        : thumbnailUrl;
    }
  }

  const res = await repository.updateReply({
    ...data,
    b: body,
  });

  return resolveMutationResult(res, 200, "post_reply_updated");
};
