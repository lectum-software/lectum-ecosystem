import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

const psychologistSelect = {
  id: true,
  user_id: true,
  user: {
    select: {
      active: true,
      id: true,
      name: true,
      role: true,
    },
  },
} satisfies Prisma.psychologist_profileSelect;

const reviewSelect = {
  author: {
    select: {
      avatar: true,
      id: true,
      name: true,
      role: true,
    },
  },
  comment: true,
  createdAt: true,
  id: true,
  rating: true,
  response: true,
  responded_at: true,
  status: true,
} satisfies Prisma.professional_reviewSelect;

const communitySelect = {
  deleted: true,
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.communitySelect;

const reportAuthorSelect = {
  avatar: true,
  id: true,
  name: true,
  psychologist_profile: {
    select: {
      gender: true,
      professional_first_name: true,
      professional_last_name: true,
    },
  },
  role: true,
} satisfies Prisma.userSelect;

const reportSelect = {
  createdAt: true,
  deleted: true,
  deletedAt: true,
  description: true,
  id: true,
  post_id: true,
  reason: true,
  reply_id: true,
  status: true,
  target_id: true,
  target_type: true,
  post: {
    select: {
      author: {
        select: reportAuthorSelect,
      },
      author_id: true,
      content: true,
      createdAt: true,
      deleted: true,
      deletedAt: true,
      id: true,
      media_items: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          media_type: true,
          media_url: true,
          position: true,
        },
        where: {
          deleted: false,
        },
      },
      media_type: true,
      media_url: true,
      replies_count: true,
      status: true,
      title: true,
      community: {
        select: communitySelect,
      },
    },
  },
  reply: {
    select: {
      author: {
        select: reportAuthorSelect,
      },
      author_id: true,
      content: true,
      createdAt: true,
      deleted: true,
      deletedAt: true,
      id: true,
      media_type: true,
      media_url: true,
      parent_reply_id: true,
      post_id: true,
      title: true,
      post: {
        select: {
          deleted: true,
          deletedAt: true,
          id: true,
          replies_count: true,
          status: true,
          title: true,
          community: {
            select: communitySelect,
          },
        },
      },
    },
  },
  reporter: {
    select: {
      name: true,
      role: true,
    },
  },
} satisfies Prisma.post_reportSelect;

export type AdminPsychologistFeedbackProfile = Prisma.psychologist_profileGetPayload<{
  select: typeof psychologistSelect;
}>;

export type AdminPsychologistReviewRecord = Prisma.professional_reviewGetPayload<{
  select: typeof reviewSelect;
}>;

export type AdminPsychologistReportRecord = Prisma.post_reportGetPayload<{
  select: typeof reportSelect;
}>;

export type AdminPsychologistReportAudit = {
  action:
    | "psychologist_report_content_removed"
    | "psychologist_report_decision_reviewed"
    | "psychologist_report_dismissed"
    | "psychologist_report_upheld";
  adminId: string;
  changedFields: string[];
  metadata?: Prisma.InputJsonObject;
  reason: string;
  safeAfter?: Prisma.InputJsonObject;
  safeBefore?: Prisma.InputJsonObject;
  targetId: string;
};

export type AdminPsychologistReportMutationResult = {
  affectedReportsCount: number;
  contentAlreadyUnavailable: boolean;
  contentRemoved: boolean;
  report: AdminPsychologistReportRecord;
};

type TransactionClient = Prisma.TransactionClient;

type ResolveUpheldInput = {
  audit: AdminPsychologistReportAudit;
  measure: "none" | "remove_content";
  report: AdminPsychologistReportRecord;
};

const activeReportStatuses = ["pendente", "em_analise"];

const psychologistReportTargetWhere = (psychologistId: string) => ({
  OR: [
    {
      reply_id: null,
      target_type: "post",
      post: {
        author_id: psychologistId,
      },
    },
    {
      reply_id: {
        not: null,
      },
      reply: {
        author_id: psychologistId,
      },
    },
  ],
});

const reportTargetWhere = (report: AdminPsychologistReportRecord) => ({
  deleted: false,
  target_id: report.target_id,
  target_type: report.target_type,
});

const reportContentIsAvailable = (report: AdminPsychologistReportRecord) => {
  if (report.reply) {
    return (
      !report.reply.deleted &&
      !report.reply.post.deleted &&
      report.reply.post.status === "publicado" &&
      !report.reply.post.community.deleted
    );
  }

  return (
    !report.post.deleted && report.post.status === "publicado" && !report.post.community.deleted
  );
};

export class AdminPsychologistFeedbackRepository {
  async findPsychologist(id: string): Promise<AdminPsychologistFeedbackProfile | null> {
    return prisma.psychologist_profile.findFirst({
      where: {
        deleted: false,
        OR: [{ id }, { user_id: id }],
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
      select: psychologistSelect,
    });
  }

  async listReviews(psychologistId: string): Promise<AdminPsychologistReviewRecord[]> {
    return prisma.professional_review.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: reviewSelect,
      where: {
        author: {
          active: true,
          deleted: false,
        },
        deleted: false,
        psychologist_id: psychologistId,
      },
    });
  }

  async listReports(
    psychologistId: string,
    from: Date,
    to: Date,
  ): Promise<AdminPsychologistReportRecord[]> {
    return prisma.post_report.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: reportSelect,
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
        deleted: false,
        ...psychologistReportTargetWhere(psychologistId),
      },
    });
  }

  async findReportForPsychologist(
    psychologistId: string,
    reportId: string,
  ): Promise<AdminPsychologistReportRecord | null> {
    return prisma.post_report.findFirst({
      select: reportSelect,
      where: {
        id: reportId,
        deleted: false,
        ...psychologistReportTargetWhere(psychologistId),
      },
    });
  }

  async resolveDismissed(input: {
    audit: AdminPsychologistReportAudit;
    report: AdminPsychologistReportRecord;
  }): Promise<AdminPsychologistReportMutationResult> {
    return prisma.$transaction(async (transaction) => {
      const report = await transaction.post_report.update({
        data: {
          status: "rejeitada",
        },
        select: reportSelect,
        where: {
          id: input.report.id,
        },
      });

      await this.createAuditLog(transaction, input.audit);

      return {
        affectedReportsCount: 1,
        contentAlreadyUnavailable: !reportContentIsAvailable(input.report),
        contentRemoved: false,
        report,
      };
    });
  }

  async reviseResolution(input: {
    audit: AdminPsychologistReportAudit;
    report: AdminPsychologistReportRecord;
    status: "pendente" | "rejeitada" | "resolvida";
  }): Promise<AdminPsychologistReportMutationResult> {
    return prisma.$transaction(async (transaction) => {
      const report = await transaction.post_report.update({
        data: {
          status: input.status,
        },
        select: reportSelect,
        where: {
          id: input.report.id,
        },
      });

      await this.createAuditLog(transaction, input.audit);

      return {
        affectedReportsCount: 1,
        contentAlreadyUnavailable: !reportContentIsAvailable(input.report),
        contentRemoved: false,
        report,
      };
    });
  }

  async resolveUpheld(input: ResolveUpheldInput): Promise<AdminPsychologistReportMutationResult> {
    return prisma.$transaction(async (transaction) => {
      const wasAvailable = reportContentIsAvailable(input.report);
      const contentRemoved =
        input.measure === "remove_content" && wasAvailable
          ? await this.softDeleteTargetContent(transaction, input.report)
          : false;

      const affectedReports = await transaction.post_report.updateMany({
        data: {
          status: "resolvida",
        },
        where: {
          ...reportTargetWhere(input.report),
          status: {
            in: activeReportStatuses,
          },
        },
      });

      const report = await transaction.post_report.findUniqueOrThrow({
        select: reportSelect,
        where: {
          id: input.report.id,
        },
      });

      await this.createAuditLog(transaction, {
        ...input.audit,
        metadata: {
          ...(input.audit.metadata ?? {}),
          affected_reports_count: affectedReports.count,
          content_already_unavailable: !wasAvailable,
          content_removed: contentRemoved,
        },
      });

      return {
        affectedReportsCount: affectedReports.count,
        contentAlreadyUnavailable: !wasAvailable,
        contentRemoved,
        report,
      };
    });
  }

  private async softDeleteTargetContent(
    transaction: TransactionClient,
    report: AdminPsychologistReportRecord,
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
        const nextRepliesCount = Math.max(
          0,
          report.reply.post.replies_count - deletedReplies.count,
        );
        await transaction.community_post.update({
          data: {
            replies_count: nextRepliesCount,
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

  private async findReplyTreeIds(
    transaction: TransactionClient,
    postId: string,
    rootReplyId: string,
  ) {
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

  private async createAuditLog(
    transaction: TransactionClient,
    audit: AdminPsychologistReportAudit,
  ) {
    await transaction.admin_activity_log.create({
      data: {
        action: audit.action,
        admin_id: audit.adminId,
        area: "denuncias",
        changed_fields: audit.changedFields,
        domain: "psychologists",
        metadata: audit.metadata ?? {},
        reason: audit.reason,
        safe_after: audit.safeAfter ?? {},
        safe_before: audit.safeBefore ?? {},
        source: "admin_panel",
        target_id: audit.targetId,
        target_type: "psychologist",
      },
    });
  }
}
