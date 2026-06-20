import { createHash } from "node:crypto";
import prisma from "@/infra/database/prisma";
import { filterPostMutedRecipients } from "@/utils/post-notification-mute";
import { notify } from "./index";
import { shouldReceiveNewPostNotification } from "./preferences";

type MessageKey =
  | "nova_avaliacao"
  | "novo_favorito"
  | "visualizacao_perfil"
  | "clique_whatsapp"
  | "novo_post"
  | "nova_resposta"
  | "upvote"
  | "downvote"
  | "compartilhamento"
  | "salvamento";

type NotificationSourceType =
  | "professional_review"
  | "psychologist_favorite"
  | "contact_request"
  | "community_post"
  | "post_reply"
  | "post_vote"
  | "post_save"
  | "profile_view"
  | "post_share";

type DispatchEvent = {
  actorId?: string | null;
  messageKey: MessageKey;
  recipientIds: string[];
  redirect?: string;
  sourceId: string;
  sourceType: NotificationSourceType;
  props?: Record<string, unknown>;
};

const professionalProfileRedirect = (psychologistId: string) =>
  `/app/psychologist/${psychologistId}`;
const professionalReviewsRedirect = "/app/professional/reviews";
const professionalAnalyticsRedirect = "/app/professional/analytics";
const communityPostRedirect = (communitySlug: string, postId: string) =>
  `/app/community/${communitySlug}/post/${postId}`;

const opaqueSourceId = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 32);

const normalizeRecipients = (recipientIds: string[], actorId?: string | null) =>
  [...new Set(recipientIds)].filter((id) => Boolean(id) && id !== actorId);

const notificationAlreadyExists = async (
  userId: string,
  messageKey: MessageKey,
  sourceId: string,
) => {
  const existing = await prisma.notification.findFirst({
    where: {
      user_id: userId,
      message_key: messageKey,
      deleted: false,
      message_props: {
        path: ["source_id"],
        equals: sourceId,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(existing);
};

const notifyOnce = async (event: DispatchEvent) => {
  const recipients = normalizeRecipients(event.recipientIds, event.actorId);
  if (recipients.length === 0) return;

  const eligibleRecipients: string[] = [];

  for (const recipientId of recipients) {
    if (await notificationAlreadyExists(recipientId, event.messageKey, event.sourceId)) continue;
    eligibleRecipients.push(recipientId);
  }

  if (eligibleRecipients.length === 0) return;

  await notify(eligibleRecipients, {
    message_key: event.messageKey,
    message_props: {
      ...(event.props ?? {}),
      source_id: event.sourceId,
      source_type: event.sourceType,
    },
    redirect: event.redirect,
  });
};

export const notifyNewProfessionalReview = async (params: {
  actorId: string;
  psychologistId: string;
  reviewId: string;
}) => {
  await notifyOnce({
    actorId: params.actorId,
    messageKey: "nova_avaliacao",
    recipientIds: [params.psychologistId],
    redirect: professionalReviewsRedirect,
    sourceId: params.reviewId,
    sourceType: "professional_review",
    props: {
      psychologist_id: params.psychologistId,
      review_id: params.reviewId,
    },
  });
};

export const notifyNewPsychologistFavorite = async (params: {
  actorId: string;
  favoriteId: string;
  psychologistId: string;
}) => {
  await notifyOnce({
    actorId: params.actorId,
    messageKey: "novo_favorito",
    recipientIds: [params.psychologistId],
    redirect: professionalProfileRedirect(params.psychologistId),
    sourceId: params.favoriteId,
    sourceType: "psychologist_favorite",
    props: {
      favorite_id: params.favoriteId,
      psychologist_id: params.psychologistId,
    },
  });
};

export const notifyWhatsappClick = async (params: {
  actorId?: string | null;
  contactRequestId: string;
  psychologistId: string;
}) => {
  await notifyOnce({
    actorId: params.actorId,
    messageKey: "clique_whatsapp",
    recipientIds: [params.psychologistId],
    redirect: professionalAnalyticsRedirect,
    sourceId: params.contactRequestId,
    sourceType: "contact_request",
    props: {
      actor_id: params.actorId ?? null,
      contact_request_id: params.contactRequestId,
      psychologist_id: params.psychologistId,
    },
  });
};

export const notifyNewCommunityPost = async (params: {
  actorId: string;
  communityId: string;
  communitySlug: string;
  postId: string;
}) => {
  const author = await prisma.user.findFirst({
    where: {
      id: params.actorId,
      deleted: false,
    },
    select: {
      role: true,
    },
  });

  const members = await prisma.community_member.findMany({
    where: {
      community_id: params.communityId,
      deleted: false,
      user_id: {
        not: params.actorId,
      },
    },
    select: {
      user_id: true,
      user: {
        select: {
          favorite_psychologists: {
            where: {
              deleted: false,
              psychologist_id: params.actorId,
            },
            select: {
              id: true,
            },
            take: 1,
          },
          role: true,
          notification_preference: {
            select: {
              prefs: true,
            },
          },
        },
      },
    },
  });

  const recipientIds = members
    .filter((member) =>
      shouldReceiveNewPostNotification({
        authorRole: author?.role,
        isFavoritePsychologistAuthor: member.user.favorite_psychologists.length > 0,
        prefs: member.user.notification_preference?.prefs,
        recipientRole: member.user.role,
      }),
    )
    .map((member) => member.user_id);

  await notifyOnce({
    actorId: params.actorId,
    messageKey: "novo_post",
    recipientIds,
    redirect: communityPostRedirect(params.communitySlug, params.postId),
    sourceId: params.postId,
    sourceType: "community_post",
    props: {
      community_id: params.communityId,
      community_slug: params.communitySlug,
      post_id: params.postId,
    },
  });
};

export const notifyNewPostReply = async (params: {
  actorId: string;
  parentReplyId?: string | null;
  postId: string;
  replyId: string;
}) => {
  const replyContext = params.parentReplyId
    ? await prisma.post_reply.findFirst({
        where: {
          id: params.parentReplyId,
          post_id: params.postId,
          deleted: false,
        },
        select: {
          author_id: true,
          post: {
            select: {
              community: {
                select: {
                  slug: true,
                },
              },
            },
          },
        },
      })
    : await prisma.community_post.findFirst({
        where: {
          id: params.postId,
          deleted: false,
        },
        select: {
          author_id: true,
          community: {
            select: {
              slug: true,
            },
          },
        },
      });

  if (!replyContext) return;

  const recipientId = replyContext.author_id;
  const communitySlug =
    "post" in replyContext ? replyContext.post.community.slug : replyContext.community.slug;

  const recipientIds = await filterPostMutedRecipients(params.postId, [recipientId]);

  await notifyOnce({
    actorId: params.actorId,
    messageKey: "nova_resposta",
    recipientIds,
    redirect: communityPostRedirect(communitySlug, params.postId),
    sourceId: params.replyId,
    sourceType: "post_reply",
    props: {
      parent_reply_id: params.parentReplyId ?? null,
      post_id: params.postId,
      reply_id: params.replyId,
    },
  });
};

export const notifyPostVote = async (params: {
  actorId: string;
  postId: string;
  replyId?: string | null;
  value: 1 | -1 | null;
}) => {
  if (params.value !== 1 && params.value !== -1) return;

  const target = params.replyId
    ? await prisma.post_reply.findFirst({
        where: {
          id: params.replyId,
          post_id: params.postId,
          deleted: false,
        },
        select: {
          author_id: true,
          post: {
            select: {
              community: {
                select: {
                  slug: true,
                },
              },
            },
          },
        },
      })
    : await prisma.community_post.findFirst({
        where: {
          id: params.postId,
          deleted: false,
        },
        select: {
          author_id: true,
          community: {
            select: {
              slug: true,
            },
          },
        },
      });

  if (!target) return;

  const communitySlug = "post" in target ? target.post.community.slug : target.community.slug;
  const sourceId = opaqueSourceId(
    `${params.postId}:${params.replyId ?? "post"}:${params.actorId}:${params.value}`,
  );

  const recipientIds = await filterPostMutedRecipients(params.postId, [target.author_id]);

  await notifyOnce({
    actorId: params.actorId,
    messageKey: params.value === 1 ? "upvote" : "downvote",
    recipientIds,
    redirect: communityPostRedirect(communitySlug, params.postId),
    sourceId,
    sourceType: "post_vote",
    props: {
      post_id: params.postId,
      reply_id: params.replyId ?? null,
      target_type: params.replyId ? "reply" : "post",
      value: params.value,
    },
  });
};

export const notifyPostSaved = async (params: {
  actorId: string;
  postId: string;
  saveId: string;
}) => {
  const post = await prisma.community_post.findFirst({
    where: {
      id: params.postId,
      deleted: false,
    },
    select: {
      author_id: true,
      community: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!post) return;

  const recipientIds = await filterPostMutedRecipients(params.postId, [post.author_id]);

  await notifyOnce({
    actorId: params.actorId,
    messageKey: "salvamento",
    recipientIds,
    redirect: communityPostRedirect(post.community.slug, params.postId),
    sourceId: params.saveId,
    sourceType: "post_save",
    props: {
      post_id: params.postId,
      save_id: params.saveId,
    },
  });
};
