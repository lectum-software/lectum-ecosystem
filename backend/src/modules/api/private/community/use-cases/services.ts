import { error, msg } from "@/helpers/translate";
import { notifyNewCommunityPost } from "@/main/notification/domain-events";
import { canAttachCommunityMedia } from "@/utils/community-media-entitlement";
import { type ModerationResult, moderatePatientText } from "@/utils/content-moderation";
import {
  findModerationCommunityBySlug,
  recordContentModerationEvent,
} from "@/utils/content-moderation-events";
import { publicFileUrl } from "@/utils/public-origin";
import type {
  ICommunityCreatePostDTO,
  ICommunityFeedDTO,
  ICommunityIndexDTO,
  ICommunityMembershipDTO,
  ICommunityPostsDTO,
  ICommunityShowDTO,
  ICommunitySuggestionDTO,
  ICommunityTopMentorsDTO,
  ICommunityUploadPostMediaDTO,
} from "../DTOs/ICommunityDTO";
import { CommunityRepository } from "../repositories/CommunityRepository";

export const index = async (data: ICommunityIndexDTO) => {
  const repository = new CommunityRepository();
  const res = await repository.index(data);

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const suggest = async (data: ICommunitySuggestionDTO) => {
  const repository = new CommunityRepository();
  const res = await repository.suggest({
    ...data,
    b: {
      theme: data.b.theme.trim(),
    },
  });

  return {
    status: 201,
    ...msg("community_suggestion_created", {}),
    data: res,
  };
};

export const show = async (data: ICommunityShowDTO) => {
  const repository = new CommunityRepository();
  const res = await repository.show(data);

  if (!res) {
    return {
      status: 404,
      ...error("not_found", {
        model: "community",
      }),
    };
  }

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const feed = async (data: ICommunityFeedDTO) => {
  const repository = new CommunityRepository();
  const res = await repository.feed(data);

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const topMentors = async (data: ICommunityTopMentorsDTO) => {
  const repository = new CommunityRepository();
  const res = await repository.topMentors(data);

  if (!res) {
    return {
      status: 404,
      ...error("not_found", {
        model: "community",
      }),
    };
  }

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

const ensureCommunityMemberAuth = (data: ICommunityMembershipDTO) => {
  const isAllowedRole = data.auth.role === "paciente" || data.auth.role === "psicologo";

  if (data.auth.id && isAllowedRole) return null;

  return {
    status: 403,
    ...error("role_not_authorized", {}),
  };
};

const mediaTypeFromMime = (mimetype?: string | null): "image" | "video" | null => {
  if (mimetype?.startsWith("image/")) return "image";
  if (mimetype?.startsWith("video/")) return "video";

  return null;
};

const normalizePostMediaType = (value?: string | null): "image" | "video" | null => {
  if (value === "image" || value === "video") return value;

  return null;
};

const isPublicPostMediaUrl = (value?: string | null) => {
  if (!value) return false;

  try {
    return new URL(value).pathname.startsWith("/public/files/posts/media/");
  } catch (_err) {
    return value.startsWith("/public/files/posts/media/");
  }
};

const invalidPostMedia = () => ({
  status: 422,
  ...error("community_post_media_invalid", {}),
});

const postMediaNotAllowed = () => ({
  status: 403,
  ...error("community_post_media_professional_plan", {}),
});

const moderationError = (result: ModerationResult) => ({
  status: 422,
  ...error(
    result.decision === "safety_hold"
      ? "content_moderation_safety_hold"
      : "content_moderation_blocked",
    {},
  ),
});

const MAX_POST_CAROUSEL_IMAGES = 10;

type PostMediaItemInput = {
  mediaType?: string | null;
  mediaUrl?: string | null;
  position?: number | null;
};

const normalizePostMediaItems = (items?: PostMediaItemInput[] | null) =>
  (items ?? []).slice(0, MAX_POST_CAROUSEL_IMAGES).map((item, index) => ({
    mediaType: item.mediaType,
    mediaUrl: item.mediaUrl?.trim() || "",
    position: typeof item.position === "number" ? item.position : index,
  }));

export const follow = async (data: ICommunityMembershipDTO) => {
  const unauthorized = ensureCommunityMemberAuth(data);
  if (unauthorized) return unauthorized;

  const repository = new CommunityRepository();
  const res = await repository.follow(data);

  if (!res) {
    return {
      status: 404,
      ...error("not_found", {
        model: "community",
      }),
    };
  }

  return {
    status: 200,
    ...msg("community_follow_success", {}),
    data: res,
  };
};

export const unfollow = async (data: ICommunityMembershipDTO) => {
  const unauthorized = ensureCommunityMemberAuth(data);
  if (unauthorized) return unauthorized;

  const repository = new CommunityRepository();
  const res = await repository.unfollow(data);

  if (!res) {
    return {
      status: 404,
      ...error("not_found", {
        model: "community",
      }),
    };
  }

  return {
    status: 200,
    ...msg("community_unfollow_success", {}),
    data: res,
  };
};

export const posts = async (data: ICommunityPostsDTO) => {
  const repository = new CommunityRepository();
  const res = await repository.posts(data);

  if (!res) {
    return {
      status: 404,
      ...error("not_found", {
        model: "community",
      }),
    };
  }

  return {
    status: 200,
    ...msg("index", {}),
    data: res,
  };
};

export const createPost = async (data: ICommunityCreatePostDTO) => {
  const isAllowedRole = data.auth.role === "paciente" || data.auth.role === "psicologo";

  if (!data.auth.id || !isAllowedRole) {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new CommunityRepository();
  const trimmedTitle = data.b.title.trim();
  const trimmedContent = data.b.content.trim();
  let moderation: ModerationResult | null = null;
  let moderationCommunity: Awaited<ReturnType<typeof findModerationCommunityBySlug>> | null = null;

  if (data.auth.role === "paciente") {
    moderationCommunity = await findModerationCommunityBySlug(data.p.slug);
    if (!moderationCommunity) {
      return {
        status: 404,
        ...error("not_found", {
          model: "community",
        }),
      };
    }

    moderation = moderatePatientText({
      authorRole: data.auth.role,
      content: trimmedContent,
      targetType: "post",
      title: trimmedTitle,
    });

    if (moderation.decision === "block" || moderation.decision === "safety_hold") {
      const blockedPost = await repository.createPost(
        {
          ...data,
          b: {
            title: trimmedTitle,
            content: trimmedContent,
            mediaType: undefined,
            mediaUrl: undefined,
            thumbnailUrl: undefined,
            mediaItems: [],
            anonymous: data.b.anonymous === true,
          },
        },
        { status: "bloqueado" },
      );

      if (!blockedPost) {
        return {
          status: 404,
          ...error("not_found", {
            model: "community",
          }),
        };
      }

      await recordContentModerationEvent({
        authorId: data.auth.id,
        communityId: blockedPost.community.id,
        content: trimmedContent,
        result: moderation,
        targetId: blockedPost.id,
        targetType: "community_post",
        title: trimmedTitle,
      });

      return moderationError(moderation);
    }
  }

  const mediaUrl = data.b.mediaUrl?.trim() || undefined;
  const mediaType = normalizePostMediaType(data.b.mediaType);
  const thumbnailUrl = data.b.thumbnailUrl?.trim() || undefined;
  const rawRequestedMediaItems = data.b.mediaItems ?? [];
  if (rawRequestedMediaItems.length > MAX_POST_CAROUSEL_IMAGES) {
    return invalidPostMedia();
  }

  const requestedMediaItems = normalizePostMediaItems(rawRequestedMediaItems);
  const hasMediaItems = requestedMediaItems.length > 0;
  const hasLegacyMedia = Boolean(mediaUrl || data.b.mediaType);
  const hasMedia = hasLegacyMedia || hasMediaItems;
  let normalizedMediaItems: { mediaType: "image"; mediaUrl: string; position: number }[] = [];
  let nextMediaUrl = mediaUrl;
  let nextMediaType = mediaType;
  let nextThumbnailUrl = thumbnailUrl;

  if (hasMediaItems) {
    const invalidItems = requestedMediaItems.some(
      (item) =>
        item.mediaType !== "image" || !item.mediaUrl || !isPublicPostMediaUrl(item.mediaUrl),
    );

    if (invalidItems || requestedMediaItems.length > MAX_POST_CAROUSEL_IMAGES) {
      return invalidPostMedia();
    }

    if (hasLegacyMedia && mediaType && mediaType !== "image") {
      return invalidPostMedia();
    }

    normalizedMediaItems = requestedMediaItems.map((item) => ({
      mediaType: "image",
      mediaUrl: item.mediaUrl,
      position: item.position,
    }));
    nextMediaUrl = requestedMediaItems[0]?.mediaUrl;
    nextMediaType = "image";
    nextThumbnailUrl = undefined;
  } else if (hasLegacyMedia) {
    if (!mediaUrl || !mediaType || !isPublicPostMediaUrl(mediaUrl)) {
      return invalidPostMedia();
    }

    if (thumbnailUrl && !isPublicPostMediaUrl(thumbnailUrl)) {
      return invalidPostMedia();
    }

    normalizedMediaItems =
      mediaType === "image" ? [{ mediaType: "image", mediaUrl, position: 0 }] : [];
    nextThumbnailUrl = mediaType === "video" ? thumbnailUrl : undefined;
  } else if (thumbnailUrl) {
    return invalidPostMedia();
  }

  if (hasMedia) {
    const canAttachMedia = await canAttachCommunityMedia(data.auth.id!);
    if (!canAttachMedia) return postMediaNotAllowed();
  }

  const res = await repository.createPost({
    ...data,
    b: {
      title: trimmedTitle,
      content: trimmedContent,
      mediaType: nextMediaType ?? undefined,
      mediaUrl: nextMediaUrl,
      thumbnailUrl: nextThumbnailUrl,
      mediaItems: normalizedMediaItems,
      anonymous: data.auth.role === "paciente" ? data.b.anonymous === true : false,
    },
  });

  if (!res) {
    return {
      status: 404,
      ...error("not_found", {
        model: "community",
      }),
    };
  }

  if (moderation?.decision === "allow_sensitive") {
    await recordContentModerationEvent({
      authorId: data.auth.id,
      communityId: res.community.id,
      content: trimmedContent,
      result: moderation,
      targetId: res.id,
      targetType: "community_post",
      title: trimmedTitle,
    });
  }

  await notifyNewCommunityPost({
    actorId: data.auth.id!,
    communityId: res.community.id,
    communitySlug: res.community.slug,
    postId: res.id,
  });

  return {
    status: 201,
    ...msg("community_post_created", {}),
    data: res,
  };
};

export const authorizePostMediaUpload = async (data: ICommunityUploadPostMediaDTO) => {
  const unauthorized = ensureCommunityMemberAuth(data);
  if (unauthorized) return unauthorized;

  const repository = new CommunityRepository();
  const [communityExists, canAttach] = await Promise.all([
    repository.existsBySlug(data.p.slug),
    canAttachCommunityMedia(data.auth.id!),
  ]);

  if (!communityExists) {
    return {
      status: 404,
      ...error("not_found", {
        model: "community",
      }),
    };
  }

  if (!canAttach) return postMediaNotAllowed();

  return {
    status: 200,
    success: true,
  };
};

export const uploadPostMedia = async (data: ICommunityUploadPostMediaDTO) => {
  const unauthorized = ensureCommunityMemberAuth(data);
  if (unauthorized) return unauthorized;

  const repository = new CommunityRepository();
  const [communityExists, canAttach] = await Promise.all([
    repository.existsBySlug(data.p.slug),
    canAttachCommunityMedia(data.auth.id!),
  ]);

  if (!communityExists) {
    return {
      status: 404,
      ...error("not_found", {
        model: "community",
      }),
    };
  }

  if (!canAttach) return postMediaNotAllowed();

  const key = data.file?.path || data.file?.key;
  const mediaType = mediaTypeFromMime(data.file?.mimetype);

  if (!key?.startsWith("posts/media/") || !mediaType) {
    return {
      status: 400,
      ...error("upload_error", {}),
    };
  }

  return {
    status: 200,
    ...msg("community_post_media_uploaded", {}),
    data: {
      media_type: mediaType,
      media_url: publicFileUrl(key),
    },
  };
};

export default index;
