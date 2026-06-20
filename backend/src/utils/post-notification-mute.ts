import prisma from "@/infra/database/prisma";

const uniqueStrings = (values: string[]) => [...new Set(values.filter(Boolean))];

export const getMutedPostIds = async (userId: string | undefined, postIds: string[]) => {
  const ids = uniqueStrings(postIds);
  if (!userId || ids.length === 0) return new Set<string>();

  const mutes = await prisma.post_notification_mute.findMany({
    where: {
      user_id: userId,
      deleted: false,
      post_id: {
        in: ids,
      },
    },
    select: {
      post_id: true,
    },
  });

  return new Set(mutes.map((mute) => mute.post_id));
};

export const getPostMutedUserIds = async (postId: string, userIds: string[]) => {
  const ids = uniqueStrings(userIds);
  if (!postId || ids.length === 0) return new Set<string>();

  const mutes = await prisma.post_notification_mute.findMany({
    where: {
      post_id: postId,
      deleted: false,
      user_id: {
        in: ids,
      },
    },
    select: {
      user_id: true,
    },
  });

  return new Set(mutes.map((mute) => mute.user_id));
};

export const filterPostMutedRecipients = async (postId: string, recipientIds: string[]) => {
  const mutedUserIds = await getPostMutedUserIds(postId, recipientIds);

  return recipientIds.filter((recipientId) => !mutedUserIds.has(recipientId));
};
