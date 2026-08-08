import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type {
  AdminCommunityCreateBody,
  AdminCommunityRuleBody,
  AdminCommunityStatusBody,
  AdminCommunityUpdateBody,
} from "../../DTOs/IAdminCommunityManageDTO";
import {
  type AdminCommunityRecord,
  adminCommunityListSelect,
  adminCommunityRuleSelect,
  adminCommunitySelect,
  type TransactionClient,
} from "../support/manage-selects";

export class AdminCommunityManageCoreRepository {
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

  async createContentActivityLog(
    transaction: TransactionClient,
    input: {
      action: string;
      adminId: string;
      area: string;
      changedFields: string[];
      communityId: string;
      metadata: Prisma.InputJsonObject;
      reason: string;
      safeAfter: Prisma.InputJsonObject;
      safeBefore: Prisma.InputJsonObject;
    },
  ) {
    await transaction.admin_activity_log.create({
      data: {
        action: input.action,
        admin_id: input.adminId,
        area: input.area,
        changed_fields: input.changedFields,
        domain: "communities",
        metadata: input.metadata,
        reason: input.reason,
        safe_after: input.safeAfter,
        safe_before: input.safeBefore,
        source: "admin_panel",
        target_id: input.communityId,
        target_type: "community",
      },
    });
  }

  async findCommunity(idOrSlug: string) {
    return prisma.community.findFirst({
      where: {
        deleted: false,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: adminCommunitySelect,
    });
  }

  async listCommunities() {
    return prisma.community.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: adminCommunityListSelect,
      where: {
        deleted: false,
      },
    });
  }

  async createCommunity(data: AdminCommunityCreateBody & { slug: string }) {
    return prisma.community.create({
      data: {
        category: data.category,
        description: data.description,
        name: data.name,
        slug: data.slug,
        visual_gradient_color: data.visual_gradient_color,
        visual_primary_color: data.visual_primary_color,
        visual_primary_dark_color: data.visual_primary_dark_color,
        visual_soft_color: data.visual_soft_color,
        visual_text_color: data.visual_text_color,
      },
      select: adminCommunitySelect,
    });
  }

  async updateCommunity(communityId: string, data: AdminCommunityUpdateBody) {
    return prisma.community.update({
      where: { id: communityId },
      data,
      select: adminCommunitySelect,
    });
  }

  async updateCommunityStatus(
    community: Pick<AdminCommunityRecord, "active" | "deactivatedAt" | "id" | "name" | "slug">,
    data: AdminCommunityStatusBody & { adminId: string },
  ) {
    return prisma.$transaction(async (transaction) => {
      const updated = await transaction.community.update({
        where: { id: community.id },
        data: {
          active: data.active,
          deactivatedAt: data.active ? null : new Date(),
        },
        select: adminCommunitySelect,
      });

      await this.createContentActivityLog(transaction, {
        action: data.active ? "community_reactivated" : "community_deactivated",
        adminId: data.adminId,
        area: "dados",
        changedFields: ["community.active", "community.deactivated_at"],
        communityId: community.id,
        metadata: {
          community_name: community.name,
          community_slug: community.slug,
          next_active: updated.active,
          previous_active: community.active,
        },
        reason: data.reason,
        safeAfter: {
          active: updated.active,
          deactivated_at: updated.deactivatedAt?.toISOString() ?? null,
        },
        safeBefore: {
          active: community.active,
          deactivated_at: community.deactivatedAt?.toISOString() ?? null,
        },
      });

      return updated;
    });
  }

  async listRules(communityId: string, includeInactive = true) {
    return prisma.community_rule.findMany({
      where: {
        community_id: communityId,
        deleted: false,
        ...(includeInactive ? {} : { active: true }),
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: adminCommunityRuleSelect,
    });
  }

  async addRule(communityId: string, data: Required<AdminCommunityRuleBody>) {
    return prisma.community_rule.create({
      data: {
        active: data.active,
        community_id: communityId,
        description: data.description,
        position: data.position,
        title: data.title,
      },
      select: adminCommunityRuleSelect,
    });
  }

  async updateRule(
    communityId: string,
    ruleId: string,
    data: Partial<Required<AdminCommunityRuleBody>>,
  ) {
    const existing = await prisma.community_rule.findFirst({
      where: {
        community_id: communityId,
        deleted: false,
        id: ruleId,
      },
      select: { id: true },
    });

    if (!existing) return null;

    return prisma.community_rule.update({
      where: { id: ruleId },
      data,
      select: adminCommunityRuleSelect,
    });
  }

  async softDeleteRule(communityId: string, ruleId: string) {
    const existing = await prisma.community_rule.findFirst({
      where: {
        community_id: communityId,
        deleted: false,
        id: ruleId,
      },
      select: { id: true },
    });

    if (!existing) return null;

    return prisma.community_rule.update({
      where: { id: ruleId },
      data: {
        active: false,
        deleted: true,
        deletedAt: new Date(),
      },
      select: adminCommunityRuleSelect,
    });
  }
}
