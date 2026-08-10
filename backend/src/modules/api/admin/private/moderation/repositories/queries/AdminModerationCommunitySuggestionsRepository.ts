import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { activeProfessionalCourtesyEntitlementWhere } from "@/utils/subscription-entitlement";

const adminCommunitySuggestionUserSelect = {
  id: true,
  name: true,
  role: true,
  psychologist_profile: {
    select: {
      cfp_verified_at: true,
      crp_status: true,
      gender: true,
      professional_first_name: true,
      professional_last_name: true,
      subscriptions: {
        select: {
          id: true,
          source: true,
        },
        where: activeProfessionalCourtesyEntitlementWhere(),
      },
    },
  },
} satisfies Prisma.userSelect;

export const adminCommunitySuggestionBlockSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  title: true,
  description: true,
  status: true,
  community: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.community_suggestion_blockSelect;

export const adminCommunitySuggestionSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  block_id: true,
  theme: true,
  status: true,
  user: {
    select: adminCommunitySuggestionUserSelect,
  },
  block: {
    select: adminCommunitySuggestionBlockSelect,
  },
} satisfies Prisma.community_suggestionSelect;

export type AdminCommunitySuggestionRecord = Prisma.community_suggestionGetPayload<{
  select: typeof adminCommunitySuggestionSelect;
}>;

export type AdminCommunitySuggestionBlockRecord = Prisma.community_suggestion_blockGetPayload<{
  select: typeof adminCommunitySuggestionBlockSelect;
}>;

export type AdminCommunitySuggestionListWhere = Prisma.community_suggestionWhereInput;

export type AdminCommunitySuggestionBlockStats = {
  blockId: string;
  latestSuggestionAt: Date | null;
  suggestionsCount: number;
};

type AuditInput = {
  action: string;
  adminId: string;
  changedFields: string[];
  metadata?: Prisma.InputJsonValue;
  safeAfter?: Prisma.InputJsonValue;
  safeBefore?: Prisma.InputJsonValue;
  targetId: string;
  targetType: "community_suggestion" | "community_suggestion_block";
};

export class AdminModerationCommunitySuggestionsRepository {
  countSuggestions(where: AdminCommunitySuggestionListWhere) {
    return prisma.community_suggestion.count({ where });
  }

  findSuggestion(id: string) {
    return prisma.community_suggestion.findFirst({
      select: adminCommunitySuggestionSelect,
      where: {
        deleted: false,
        id,
      },
    });
  }

  findBlock(id: string) {
    return prisma.community_suggestion_block.findFirst({
      select: adminCommunitySuggestionBlockSelect,
      where: {
        deleted: false,
        id,
      },
    });
  }

  listSuggestions({
    limit,
    page,
    where,
  }: {
    limit: number;
    page: number;
    where: AdminCommunitySuggestionListWhere;
  }) {
    return prisma.community_suggestion.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: adminCommunitySuggestionSelect,
      skip: (page - 1) * limit,
      take: limit,
      where,
    });
  }

  listBlocks() {
    return prisma.community_suggestion_block.findMany({
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }, { id: "desc" }],
      select: adminCommunitySuggestionBlockSelect,
      where: {
        deleted: false,
      },
    });
  }

  async getSummary() {
    const baseWhere = { deleted: false } satisfies Prisma.community_suggestionWhereInput;
    const [
      totalSuggestions,
      groupedTotal,
      ungroupedTotal,
      archivedTotal,
      totalBlocks,
      monitoringBlocks,
      candidateBlocks,
      latestSuggestion,
    ] = await Promise.all([
      prisma.community_suggestion.count({ where: baseWhere }),
      prisma.community_suggestion.count({
        where: {
          ...baseWhere,
          block_id: {
            not: null,
          },
          status: {
            not: "arquivada",
          },
        },
      }),
      prisma.community_suggestion.count({
        where: {
          ...baseWhere,
          block_id: null,
          status: {
            not: "arquivada",
          },
        },
      }),
      prisma.community_suggestion.count({
        where: {
          ...baseWhere,
          status: "arquivada",
        },
      }),
      prisma.community_suggestion_block.count({ where: { deleted: false } }),
      prisma.community_suggestion_block.count({ where: { deleted: false, status: "monitorando" } }),
      prisma.community_suggestion_block.count({ where: { deleted: false, status: "candidata" } }),
      prisma.community_suggestion.aggregate({
        _max: {
          createdAt: true,
        },
        where: baseWhere,
      }),
    ]);

    return {
      archivedTotal,
      candidateBlocks,
      groupedTotal,
      latestSuggestionAt: latestSuggestion._max.createdAt,
      monitoringBlocks,
      totalBlocks,
      totalSuggestions,
      ungroupedTotal,
    };
  }

  async getBlockStats(blockIds: string[]): Promise<AdminCommunitySuggestionBlockStats[]> {
    if (blockIds.length === 0) return [];

    const grouped = await prisma.community_suggestion.groupBy({
      _count: {
        _all: true,
      },
      _max: {
        createdAt: true,
      },
      by: ["block_id"],
      where: {
        block_id: {
          in: blockIds,
        },
        deleted: false,
        status: {
          not: "arquivada",
        },
      },
    });

    const stats: AdminCommunitySuggestionBlockStats[] = [];
    for (const item of grouped) {
      if (!item.block_id) continue;
      stats.push({
        blockId: item.block_id,
        latestSuggestionAt: item._max.createdAt,
        suggestionsCount: item._count._all,
      });
    }

    return stats;
  }

  createBlock({
    adminId,
    description,
    title,
  }: {
    adminId: string;
    description: string | null;
    title: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const block = await tx.community_suggestion_block.create({
        data: {
          created_by_admin_id: adminId,
          description,
          title,
        },
        select: adminCommunitySuggestionBlockSelect,
      });

      await this.createAuditLog(tx, {
        action: "community_suggestion_block_created",
        adminId,
        changedFields: ["Bloco de demanda"],
        metadata: {
          status: block.status,
        },
        safeAfter: {
          status: block.status,
          title: block.title,
        },
        targetId: block.id,
        targetType: "community_suggestion_block",
      });

      return block;
    });
  }

  updateBlock({
    adminId,
    block,
    data,
  }: {
    adminId: string;
    block: AdminCommunitySuggestionBlockRecord;
    data: Prisma.community_suggestion_blockUpdateInput;
  }) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.community_suggestion_block.update({
        data,
        select: adminCommunitySuggestionBlockSelect,
        where: {
          id: block.id,
        },
      });
      const changedFields = Object.keys(data).map((field) =>
        field === "description" ? "Descricao" : field === "status" ? "Status" : "Titulo",
      );

      await this.createAuditLog(tx, {
        action: "community_suggestion_block_updated",
        adminId,
        changedFields,
        safeAfter: {
          description: updated.description,
          status: updated.status,
          title: updated.title,
        },
        safeBefore: {
          description: block.description,
          status: block.status,
          title: block.title,
        },
        targetId: block.id,
        targetType: "community_suggestion_block",
      });

      return updated;
    });
  }

  moveSuggestion({
    adminId,
    blockId,
    suggestion,
  }: {
    adminId: string;
    blockId: string | null;
    suggestion: AdminCommunitySuggestionRecord;
  }) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.community_suggestion.update({
        data: {
          block_id: blockId,
          status: blockId ? "agrupada" : "pendente",
        },
        select: adminCommunitySuggestionSelect,
        where: {
          id: suggestion.id,
        },
      });

      await this.createAuditLog(tx, {
        action: blockId ? "community_suggestion_grouped" : "community_suggestion_ungrouped",
        adminId,
        changedFields: ["Bloco", "Status"],
        metadata: {
          block_id: blockId,
        },
        safeAfter: {
          block_id: updated.block_id,
          status: updated.status,
        },
        safeBefore: {
          block_id: suggestion.block_id,
          status: suggestion.status,
        },
        targetId: suggestion.id,
        targetType: "community_suggestion",
      });

      return updated;
    });
  }

  archiveSuggestion({
    adminId,
    suggestion,
  }: {
    adminId: string;
    suggestion: AdminCommunitySuggestionRecord;
  }) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.community_suggestion.update({
        data: {
          block_id: null,
          status: "arquivada",
        },
        select: adminCommunitySuggestionSelect,
        where: {
          id: suggestion.id,
        },
      });

      await this.createAuditLog(tx, {
        action: "community_suggestion_archived",
        adminId,
        changedFields: ["Status"],
        safeAfter: {
          block_id: updated.block_id,
          status: updated.status,
        },
        safeBefore: {
          block_id: suggestion.block_id,
          status: suggestion.status,
        },
        targetId: suggestion.id,
        targetType: "community_suggestion",
      });

      return updated;
    });
  }

  private createAuditLog(client: Prisma.TransactionClient, input: AuditInput) {
    return client.admin_activity_log.create({
      data: {
        action: input.action,
        admin_id: input.adminId,
        area: "moderacao",
        changed_fields: input.changedFields,
        domain: "community_suggestions",
        metadata: input.metadata,
        safe_after: input.safeAfter,
        safe_before: input.safeBefore,
        target_id: input.targetId,
        target_type: input.targetType,
      },
    });
  }
}
