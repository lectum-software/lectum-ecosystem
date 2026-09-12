import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import {
  type AdminCommunityContentPostRecord,
  type AdminCommunityContentReplyRecord,
  type AdminCommunityRecord,
  activeReportStatuses,
  adminCommunityContentPostSelect,
  adminCommunityContentReplySelect,
  adminCommunityMemberSelect,
  adminCommunitySelect,
} from "../support/manage-selects";

import type { AdminCommunityManageCoreRepository } from "./AdminCommunityManageCoreRepository";

export class AdminCommunityManageContentMutationRepository {
  constructor(protected readonly dependency: AdminCommunityManageCoreRepository) {}

  async removePostContent(input: {
    adminId: string;
    communityId: string;
    postId: string;
    reason: string;
    buildSafeBefore: (
      currentPost: AdminCommunityContentPostRecord,
      currentCommunity: AdminCommunityRecord,
    ) => Prisma.InputJsonObject;
  }) {
    return withSerializableTransaction(async (transaction) => {
      const community = await transaction.community.findFirst({
        select: adminCommunitySelect,
        where: { id: input.communityId, deleted: false },
      });
      if (!community) return null;
      const post = await transaction.community_post.findFirst({
        select: adminCommunityContentPostSelect,
        where: {
          id: input.postId,
          community_id: community.id,
          deleted: false,
          status: { notIn: ["removido", "bloqueado"] },
        },
      });
      if (!post) return null;
      const safeBefore = input.buildSafeBefore(post, community);
      const now = new Date();
      const deletedPost = await transaction.community_post.updateMany({
        data: { deleted: true, deletedAt: now, status: "removido" },
        where: { id: post.id, community_id: community.id, deleted: false, status: post.status },
      });
      if (deletedPost.count === 0) return null;
      const deletedReplies = await transaction.post_reply.updateMany({
        data: {
          deleted: true,
          deletedAt: now,
        },
        where: {
          deleted: false,
          post_id: post.id,
        },
      });

      await transaction.community_post.update({
        data: {
          replies_count: Math.max(0, post.replies_count - deletedReplies.count),
        },
        where: {
          id: post.id,
        },
      });

      const affectedReports = await transaction.post_report.updateMany({
        data: {
          status: "resolvida",
        },
        where: {
          deleted: false,
          OR: [{ post_id: post.id, reply_id: null }, { target_id: post.id }],
          status: {
            in: activeReportStatuses,
          },
        },
      });

      await this.dependency.createContentActivityLog(transaction, {
        action: "community_content_removed",
        adminId: input.adminId,
        area: "conteudo",
        changedFields: ["community_post.deleted", "community_post.status", "post_reply.deleted"],
        communityId: input.communityId,
        metadata: {
          affected_replies_count: deletedReplies.count,
          affected_reports_count: affectedReports.count,
          content_id: post.id,
          content_type: "post",
          post_id: post.id,
        },
        reason: input.reason,
        safeAfter: {
          status: "removed",
        },
        safeBefore,
      });

      return {
        affectedReportsCount: affectedReports.count,
        affectedRepliesCount: deletedReplies.count,
      };
    });
  }

  async removeReplyContent(input: {
    adminId: string;
    communityId: string;
    reason: string;
    replyId: string;
    buildSafeBefore: (
      currentReply: AdminCommunityContentReplyRecord,
      currentCommunity: AdminCommunityRecord,
    ) => Prisma.InputJsonObject;
  }) {
    return withSerializableTransaction(async (transaction) => {
      const community = await transaction.community.findFirst({
        select: adminCommunitySelect,
        where: { id: input.communityId, deleted: false },
      });
      if (!community) return null;
      const reply = await transaction.post_reply.findFirst({
        select: adminCommunityContentReplySelect,
        where: {
          id: input.replyId,
          deleted: false,
          post: {
            community_id: community.id,
            deleted: false,
            status: { notIn: ["removido", "bloqueado"] },
          },
        },
      });
      if (!reply) return null;
      const post = await transaction.community_post.findFirst({
        select: { id: true, replies_count: true },
        where: { id: reply.post_id, community_id: community.id, deleted: false },
      });
      if (!post) return null;
      const safeBefore = input.buildSafeBefore(reply, community);
      const now = new Date();
      const replyIds = await this.dependency.findReplyTreeIds(transaction, post.id, reply.id);
      const deletedReplies = await transaction.post_reply.updateMany({
        data: {
          deleted: true,
          deletedAt: now,
        },
        where: {
          deleted: false,
          id: {
            in: replyIds,
          },
          post_id: post.id,
        },
      });

      if (deletedReplies.count === 0) return null;
      await transaction.community_post.update({
        data: { replies_count: Math.max(0, post.replies_count - deletedReplies.count) },
        where: { id: post.id },
      });

      const affectedReports = await transaction.post_report.updateMany({
        data: {
          status: "resolvida",
        },
        where: {
          deleted: false,
          OR: [{ reply_id: { in: replyIds } }, { target_id: { in: replyIds } }],
          status: {
            in: activeReportStatuses,
          },
        },
      });

      await this.dependency.createContentActivityLog(transaction, {
        action: "community_content_removed",
        adminId: input.adminId,
        area: "conteudo",
        changedFields: ["post_reply.deleted", "community_post.replies_count"],
        communityId: input.communityId,
        metadata: {
          affected_replies_count: deletedReplies.count,
          affected_reports_count: affectedReports.count,
          content_id: reply.id,
          content_type: "comment",
          post_id: post.id,
        },
        reason: input.reason,
        safeAfter: {
          status: "removed",
        },
        safeBefore,
      });

      return {
        affectedReportsCount: affectedReports.count,
        affectedRepliesCount: deletedReplies.count,
      };
    });
  }

  async listPsychologistMembers(communityId: string) {
    return prisma.community_member.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: adminCommunityMemberSelect,
      where: {
        community_id: communityId,
        deleted: false,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }
}
