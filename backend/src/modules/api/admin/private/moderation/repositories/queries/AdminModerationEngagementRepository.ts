import prisma from "@/infra/database/prisma";
import {
  type AdminPatientCommunityEngagementTarget,
  adminPatientCommunityPostEngagementSelect,
  adminPatientCommunityPostSaveEngagementSelect,
  adminPatientCommunityReplyEngagementSelect,
  adminPatientCommunityReplySaveEngagementSelect,
  adminPatientCommunityShareEngagementSelect,
  adminPatientCommunityVoteEngagementSelect,
} from "../interfaces/IAdminModerationRepository";

export class AdminModerationEngagementRepository {
  async listPatientCommunityEngagementSignals(targets: AdminPatientCommunityEngagementTarget[]) {
    const targetKeys = new Set(
      targets
        .map((target) => `${target.userId}:${target.communityId}`)
        .filter((value) => value.length > 1),
    );

    if (targetKeys.size === 0) {
      return {
        postSaves: [],
        posts: [],
        replies: [],
        replySaves: [],
        shares: [],
        votes: [],
      };
    }

    const patientIds = [...new Set(targets.map((target) => target.userId))];
    const communityIds = [...new Set(targets.map((target) => target.communityId))];
    const matchesTarget = (userId: string | null, communityId?: string | null) =>
      Boolean(userId && communityId && targetKeys.has(`${userId}:${communityId}`));

    const [posts, replies, votes, postSaves, replySaves, shares] = await Promise.all([
      prisma.community_post.findMany({
        select: adminPatientCommunityPostEngagementSelect,
        where: {
          author: {
            deleted: false,
            role: "paciente",
          },
          author_id: {
            in: patientIds,
          },
          community: {
            deleted: false,
          },
          community_id: {
            in: communityIds,
          },
          deleted: false,
          status: "publicado",
        },
      }),
      prisma.post_reply.findMany({
        select: adminPatientCommunityReplyEngagementSelect,
        where: {
          author: {
            deleted: false,
            role: "paciente",
          },
          author_id: {
            in: patientIds,
          },
          deleted: false,
          post: {
            community: {
              deleted: false,
            },
            community_id: {
              in: communityIds,
            },
            deleted: false,
            status: "publicado",
          },
        },
      }),
      prisma.post_vote.findMany({
        select: adminPatientCommunityVoteEngagementSelect,
        where: {
          deleted: false,
          OR: [
            {
              post: {
                community: {
                  deleted: false,
                },
                community_id: {
                  in: communityIds,
                },
                deleted: false,
                status: "publicado",
              },
            },
            {
              reply: {
                deleted: false,
                post: {
                  community: {
                    deleted: false,
                  },
                  community_id: {
                    in: communityIds,
                  },
                  deleted: false,
                  status: "publicado",
                },
              },
            },
          ],
          user: {
            deleted: false,
            role: "paciente",
          },
          user_id: {
            in: patientIds,
          },
        },
      }),
      prisma.post_save.findMany({
        select: adminPatientCommunityPostSaveEngagementSelect,
        where: {
          deleted: false,
          post: {
            community: {
              deleted: false,
            },
            community_id: {
              in: communityIds,
            },
            deleted: false,
            status: "publicado",
          },
          user: {
            deleted: false,
            role: "paciente",
          },
          user_id: {
            in: patientIds,
          },
        },
      }),
      prisma.post_reply_save.findMany({
        select: adminPatientCommunityReplySaveEngagementSelect,
        where: {
          deleted: false,
          reply: {
            deleted: false,
            post: {
              community: {
                deleted: false,
              },
              community_id: {
                in: communityIds,
              },
              deleted: false,
              status: "publicado",
            },
          },
          user: {
            deleted: false,
            role: "paciente",
          },
          user_id: {
            in: patientIds,
          },
        },
      }),
      prisma.post_share.findMany({
        select: adminPatientCommunityShareEngagementSelect,
        where: {
          deleted: false,
          post: {
            community: {
              deleted: false,
            },
            community_id: {
              in: communityIds,
            },
            deleted: false,
            status: "publicado",
          },
          user: {
            deleted: false,
            role: "paciente",
          },
          user_id: {
            in: patientIds,
          },
        },
      }),
    ]);

    return {
      postSaves: postSaves.filter((save) => matchesTarget(save.user_id, save.post.community_id)),
      posts: posts.filter((post) => matchesTarget(post.author_id, post.community_id)),
      replies: replies.filter((reply) => matchesTarget(reply.author_id, reply.post.community_id)),
      replySaves: replySaves.filter((save) =>
        matchesTarget(save.user_id, save.reply.post.community_id),
      ),
      shares: shares.filter((share) => matchesTarget(share.user_id, share.post.community_id)),
      votes: votes.filter((vote) =>
        matchesTarget(
          vote.user_id,
          vote.post?.community_id ?? vote.reply?.post.community_id ?? null,
        ),
      ),
    };
  }
}
