import prisma from "@/infra/database/prisma";
import { canAttachCommunityMedia } from "@/utils/community-media-entitlement";
import { getPostIdsWithPsychologistReplies } from "@/utils/community-post-replies";
import { getMutedPostIds } from "@/utils/post-notification-mute";
import type { IPostShowDTO, PostDetailResponse } from "../../DTOs/IPostDTO";
import { normalizeVoteValue, postSelect, toPostResponse } from "../support/post-response";
import { findPublishedPost } from "../support/reply-tree";

import { PostRepositoryContext } from "./PostRepositoryContext";

export class PostCoreRepository extends PostRepositoryContext {
  async exists(id: string): Promise<boolean> {
    const post = await findPublishedPost(id);

    return Boolean(post);
  }

  async canAttachReplyMedia(userId: string): Promise<boolean> {
    return canAttachCommunityMedia(userId);
  }

  async show(data: IPostShowDTO): Promise<PostDetailResponse | null> {
    const post = await this.repository.findFirst({
      where: {
        id: data.p.id,
        deleted: false,
        status: "publicado",
        community: {
          active: true,
          deleted: false,
        },
      },
      select: postSelect,
    });

    if (!post) return null;

    const userId = data.auth?.id;
    const [vote, save, membership, mutedPostIds, postsWithPsychologistReplies] = await Promise.all([
      userId
        ? prisma.post_vote.findUnique({
            where: {
              user_id_post_id: {
                user_id: userId,
                post_id: post.id,
              },
            },
            select: {
              deleted: true,
              value: true,
            },
          })
        : Promise.resolve(null),
      userId
        ? prisma.post_save.findUnique({
            where: {
              user_id_post_id: {
                user_id: userId,
                post_id: post.id,
              },
            },
            select: {
              deleted: true,
            },
          })
        : Promise.resolve(null),
      userId
        ? prisma.community_member.findUnique({
            where: {
              community_id_user_id: {
                community_id: post.community.id,
                user_id: userId,
              },
            },
            select: {
              deleted: true,
            },
          })
        : Promise.resolve(null),
      getMutedPostIds(userId ?? undefined, [post.id]),
      getPostIdsWithPsychologistReplies([post.id]),
    ]);

    return {
      post: toPostResponse(
        post,
        vote && !vote.deleted ? normalizeVoteValue(vote.value) : null,
        Boolean(save && !save.deleted),
        Boolean(membership && !membership.deleted),
        mutedPostIds.has(post.id),
        postsWithPsychologistReplies.has(post.id),
      ),
    };
  }
}
