import type { AdminPostReportRecord } from "../interfaces/IAdminModerationRepository";
import type { AdminModerationReportAudit, TransactionClient } from "../support/moderation-query";

export class AdminModerationMutationSupportRepository {
  async findReplyTreeIds(transaction: TransactionClient, postId: string, rootReplyId: string) {
    const replies = await transaction.post_reply.findMany({
      select: {
        id: true,
        parent_reply_id: true,
      },
      where: {
        deleted: false,
        post_id: postId,
      },
    });

    const childrenByParent = new Map<string, string[]>();
    for (const reply of replies) {
      if (!reply.parent_reply_id) continue;
      const children = childrenByParent.get(reply.parent_reply_id) ?? [];
      children.push(reply.id);
      childrenByParent.set(reply.parent_reply_id, children);
    }

    const ids = new Set<string>();
    const stack = [rootReplyId];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || ids.has(current)) continue;
      ids.add(current);
      for (const childId of childrenByParent.get(current) ?? []) stack.push(childId);
    }

    return [...ids];
  }

  async createReportAuditLog(transaction: TransactionClient, audit: AdminModerationReportAudit) {
    await transaction.admin_activity_log.create({
      data: {
        action: audit.action,
        admin_id: audit.adminId,
        area: "denuncias",
        changed_fields: audit.changedFields,
        domain: "moderation",
        metadata: audit.metadata ?? {},
        reason: audit.reason,
        safe_after: audit.safeAfter ?? {},
        safe_before: audit.safeBefore ?? {},
        source: "admin_panel",
        target_id: audit.targetId,
        target_type: "post_report",
      },
    });
  }

  async softDeleteReportTargetContent(
    transaction: TransactionClient,
    report: AdminPostReportRecord,
  ) {
    const now = new Date();

    if (report.reply) {
      const replyIds = await this.findReplyTreeIds(
        transaction,
        report.reply.post_id,
        report.reply.id,
      );
      if (replyIds.length === 0) return false;

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
          post_id: report.reply.post_id,
        },
      });

      if (deletedReplies.count > 0) {
        await transaction.community_post.update({
          data: {
            replies_count: Math.max(0, report.reply.post.replies_count - deletedReplies.count),
          },
          where: {
            id: report.reply.post_id,
          },
        });
      }

      return deletedReplies.count > 0;
    }

    const deletedReplies = await transaction.post_reply.updateMany({
      data: {
        deleted: true,
        deletedAt: now,
      },
      where: {
        deleted: false,
        post_id: report.post.id,
      },
    });

    await transaction.community_post.update({
      data: {
        deleted: true,
        deletedAt: now,
        replies_count: Math.max(0, report.post.replies_count - deletedReplies.count),
        status: "removido",
      },
      where: {
        id: report.post.id,
      },
    });

    return true;
  }
}
