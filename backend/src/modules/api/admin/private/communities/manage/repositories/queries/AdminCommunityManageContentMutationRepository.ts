import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import {
  type AdminCommunityContentPostRecord,
  type AdminCommunityContentReplyRecord,
  activeReportStatuses,
  adminCommunityMemberSelect,
} from "../support/manage-selects";

import type { AdminCommunityManageCoreRepository } from "./AdminCommunityManageCoreRepository";

export class AdminCommunityManageContentMutationRepository {
  constructor(protected readonly dependency: AdminCommunityManageCoreRepository) {}

  async removePostContent(input: {
    adminId: string;
    communityId: string;
    post: AdminCommunityContentPostRecord;
    reason: string;
    safeBefore: Prisma.InputJsonObject;
  }) {
    return prisma.$transaction(async (transaction) => {
      const now = new Date();
      const deletedReplies = await transaction.post_reply.updateMany({
        data: {
          deleted: true,
          deletedAt: now,
        },
        where: {
          deleted: false,
          post_id: input.post.id,
        },
      });

      await transaction.community_post.update({
        data: {
          deleted: true,
          deletedAt: now,
          replies_count: Math.max(0, input.post.replies_count - deletedReplies.count),
          status: "removido",
        },
        where: {
          id: input.post.id,
        },
      });

      const affectedReports = await transaction.post_report.updateMany({
        data: {
          status: "resolvida",
        },
        where: {
          deleted: false,
          OR: [{ post_id: input.post.id, reply_id: null }, { target_id: input.post.id }],
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
          content_id: input.post.id,
          content_type: "post",
          post_id: input.post.id,
        },
        reason: input.reason,
        safeAfter: {
          status: "removed",
        },
        safeBefore: input.safeBefore,
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
    reply: AdminCommunityContentReplyRecord;
    safeBefore: Prisma.InputJsonObject;
  }) {
    return prisma.$transaction(async (transaction) => {
      const now = new Date();
      const replyIds = await this.dependency.findReplyTreeIds(
        transaction,
        input.reply.post_id,
        input.reply.id,
      );
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
          post_id: input.reply.post_id,
        },
      });

      if (deletedReplies.count > 0) {
        const post = await transaction.community_post.findUnique({
          select: { replies_count: true },
          where: { id: input.reply.post_id },
        });
        await transaction.community_post.update({
          data: {
            replies_count: Math.max(0, (post?.replies_count ?? 0) - deletedReplies.count),
          },
          where: {
            id: input.reply.post_id,
          },
        });
      }

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
          content_id: input.reply.id,
          content_type: "comment",
          post_id: input.reply.post_id,
        },
        reason: input.reason,
        safeAfter: {
          status: "removed",
        },
        safeBefore: input.safeBefore,
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
