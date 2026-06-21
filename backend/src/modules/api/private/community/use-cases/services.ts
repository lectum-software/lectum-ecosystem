import { error, msg } from "@/helpers/translate";
import { notifyNewCommunityPost } from "@/main/notification/domain-events";
import { canAttachCommunityMedia } from "@/utils/community-media-entitlement";
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

const publicFileUrl = (key: string) => {
  const rawBase = String(process.env.BASE || "").trim();
  let base = rawBase.replace(/\/$/, "");

  try {
    base = rawBase ? new URL(rawBase).origin : "";
  } catch (_err) {
    base = rawBase.replace(/\/$/, "");
  }

  const publicPath = `/public/files/${key}`;

  return base ? `${base}${publicPath}` : publicPath;
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

  const mediaUrl = data.b.mediaUrl?.trim() || undefined;
  const mediaType = normalizePostMediaType(data.b.mediaType);
  const hasMedia = Boolean(mediaUrl || data.b.mediaType);

  if (hasMedia) {
    if (!mediaUrl || !mediaType || !isPublicPostMediaUrl(mediaUrl)) {
      return invalidPostMedia();
    }

    const canAttachMedia = await canAttachCommunityMedia(data.auth.id!);
    if (!canAttachMedia) return postMediaNotAllowed();
  }

  const repository = new CommunityRepository();
  const res = await repository.createPost({
    ...data,
    b: {
      title: data.b.title.trim(),
      content: data.b.content.trim(),
      mediaType: mediaType ?? undefined,
      mediaUrl,
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
