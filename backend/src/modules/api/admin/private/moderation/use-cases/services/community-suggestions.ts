import type { Prisma } from "@/external/generated/prisma/client";
import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { parseDateOnly } from "@/utils/date-range";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import { hasProfessionalRegistryApproval } from "@/utils/subscription-entitlement";
import type {
  AdminCommunitySuggestionBlockStatus,
  AdminCommunitySuggestionBlockSummaryDTO,
  AdminCommunitySuggestionItemDTO,
  AdminCommunitySuggestionsDTO,
  AdminCommunitySuggestionsQuery,
  IAdminCommunitySuggestionArchiveDTO,
  IAdminCommunitySuggestionBlockCreateDTO,
  IAdminCommunitySuggestionBlockUpdateDTO,
  IAdminCommunitySuggestionMoveDTO,
  IAdminCommunitySuggestionsDTO,
} from "../../DTOs/IAdminModerationDTO";
import {
  type AdminCommunitySuggestionBlockRecord,
  type AdminCommunitySuggestionBlockStats,
  type AdminCommunitySuggestionListWhere,
  type AdminCommunitySuggestionRecord,
  AdminModerationCommunitySuggestionsRepository,
} from "../../repositories/queries/AdminModerationCommunitySuggestionsRepository";
import { MAX_LIMIT, normalizeLimit, normalizePage } from "./events";

const VALID_BLOCK_STATUSES = new Set<AdminCommunitySuggestionBlockStatus>([
  "arquivada",
  "candidata",
  "convertida",
  "monitorando",
]);

const normalizeStatus = (value?: string | null) => {
  const normalized = String(value ?? "all")
    .trim()
    .toLowerCase();

  return normalized === "pendente" || normalized === "agrupada" || normalized === "arquivada"
    ? normalized
    : "all";
};

const normalizeBlockId = (value?: string | null) => {
  const normalized = String(value ?? "all").trim();

  return normalized || "all";
};

const normalizeUserRole = (value?: string | null) => {
  const normalized = String(value ?? "all")
    .trim()
    .toLowerCase();

  return normalized === "paciente" || normalized === "psicologo" ? normalized : "all";
};

const normalizeCommunitySuggestionsQuery = (
  query: AdminCommunitySuggestionsQuery = {},
): AdminCommunitySuggestionsQuery => ({
  ...query,
  blockId: normalizeBlockId(query.blockId),
  limit: Math.min(MAX_LIMIT, normalizeLimit(query.limit)),
  page: normalizePage(query.page),
  q: query.q?.trim() || "",
  status: normalizeStatus(query.status),
  userRole: normalizeUserRole(query.userRole),
});

const buildSuggestionWhere = (
  query: AdminCommunitySuggestionsQuery,
): AdminCommunitySuggestionListWhere => {
  const where: AdminCommunitySuggestionListWhere = {
    deleted: false,
  };

  if (query.status === "agrupada") {
    where.block_id = {
      not: null,
    };
    where.status = {
      not: "arquivada",
    };
  } else if (query.status && query.status !== "all") {
    where.status = query.status;
  }

  if (query.blockId === "unassigned") {
    where.block_id = null;
  } else if (query.blockId && query.blockId !== "all") {
    where.block_id = query.blockId;
  }

  if (query.userRole && query.userRole !== "all") {
    where.user = {
      role: query.userRole,
    };
  }

  const from = parseDateOnly(query.from, "start");
  const to = parseDateOnly(query.to, "end");
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const search = query.q?.trim();
  if (search) {
    where.OR = [
      {
        theme: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        user: {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        block: {
          is: {
            title: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  return where;
};

const blockStatsMap = (stats: AdminCommunitySuggestionBlockStats[]) => {
  const map = new Map<string, AdminCommunitySuggestionBlockStats>();
  for (const item of stats) map.set(item.blockId, item);

  return map;
};

const mapCommunity = (community: AdminCommunitySuggestionBlockRecord["community"]) =>
  community
    ? {
        id: community.id,
        name: community.name,
        slug: community.slug,
      }
    : null;

const mapBlock = (
  block: AdminCommunitySuggestionBlockRecord,
  stats: Map<string, AdminCommunitySuggestionBlockStats>,
): AdminCommunitySuggestionBlockSummaryDTO => {
  const blockStats = stats.get(block.id);

  return {
    community: mapCommunity(block.community),
    created_at: block.createdAt,
    description: block.description,
    id: block.id,
    latest_suggestion_at: blockStats?.latestSuggestionAt ?? null,
    status: block.status as AdminCommunitySuggestionBlockStatus,
    suggestions_count: blockStats?.suggestionsCount ?? 0,
    title: block.title,
    updated_at: block.updatedAt,
  };
};

const suggestionRoleLabel = (suggestion: AdminCommunitySuggestionRecord) => {
  if (suggestion.user.role === "paciente") return "Paciente";

  if (suggestion.user.role === "psicologo") {
    const gender = suggestion.user.psychologist_profile?.gender?.trim().toLowerCase();

    return gender === "feminino" || gender === "mulher" ? "Psicóloga" : "Psicólogo";
  }

  return "Usuário";
};

const suggestionUserName = (suggestion: AdminCommunitySuggestionRecord) => {
  if (suggestion.user.role !== "psicologo") return suggestion.user.name.trim() || "Usuário";

  return buildProfessionalFullDisplayName({
    fallbackName: suggestion.user.name,
    firstName: suggestion.user.psychologist_profile?.professional_first_name,
    lastName: suggestion.user.psychologist_profile?.professional_last_name,
  });
};

const mapSuggestion = (
  suggestion: AdminCommunitySuggestionRecord,
  stats: Map<string, AdminCommunitySuggestionBlockStats>,
): AdminCommunitySuggestionItemDTO => ({
  block: suggestion.block ? mapBlock(suggestion.block, stats) : null,
  created_at: suggestion.createdAt,
  id: suggestion.id,
  status: suggestion.status as AdminCommunitySuggestionItemDTO["status"],
  theme: suggestion.theme,
  updated_at: suggestion.updatedAt,
  user: {
    id: suggestion.user.id,
    name: suggestionUserName(suggestion),
    role: suggestion.user.role,
    role_label: suggestionRoleLabel(suggestion),
    show_verified_badge:
      suggestion.user.role === "psicologo" &&
      hasProfessionalRegistryApproval(suggestion.user.psychologist_profile),
  },
});

const cleanDescription = (value?: string | null) => {
  const normalized = String(value ?? "").trim();

  return normalized || null;
};

const requireAdminId = (data: { admin?: { id?: string | null }; auth?: { id?: string | null } }) =>
  data.admin?.id ?? data.auth?.id ?? null;

export const listCommunitySuggestions = async (
  data: IAdminCommunitySuggestionsDTO,
): Promise<Resolve> => {
  const repository = new AdminModerationCommunitySuggestionsRepository();
  const query = normalizeCommunitySuggestionsQuery(data.q ?? {});
  const limit = normalizeLimit(query.limit);
  const page = normalizePage(query.page);
  const where = buildSuggestionWhere(query);
  const count = await repository.countSuggestions(where);
  const pages = Math.max(1, Math.ceil(count / limit));
  const safePage = Math.min(page, pages);
  const [suggestions, blocks, summary] = await Promise.all([
    repository.listSuggestions({ limit, page: safePage, where }),
    repository.listBlocks(),
    repository.getSummary(),
  ]);
  const stats = blockStatsMap(await repository.getBlockStats(blocks.map((block) => block.id)));
  const payload: AdminCommunitySuggestionsDTO = {
    blocks: blocks.map((block) => mapBlock(block, stats)),
    count,
    page: safePage,
    pages,
    per_page: limit,
    source: "community_suggestion+community_suggestion_block",
    suggestions: suggestions.map((suggestion) => mapSuggestion(suggestion, stats)),
    summary: {
      archived_total: summary.archivedTotal,
      candidate_blocks: summary.candidateBlocks,
      grouped_total: summary.groupedTotal,
      latest_suggestion_at: summary.latestSuggestionAt,
      monitoring_blocks: summary.monitoringBlocks,
      total_blocks: summary.totalBlocks,
      total_suggestions: summary.totalSuggestions,
      ungrouped_total: summary.ungroupedTotal,
    },
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: payload,
  };
};

export const createCommunitySuggestionBlock = async (
  data: IAdminCommunitySuggestionBlockCreateDTO,
): Promise<Resolve> => {
  const adminId = requireAdminId(data);
  if (!adminId) return { status: 401, ...error("token_not_authorized", {}) };

  const title = data.b.title?.trim();
  if (!title) {
    return { status: 422, ...error("admin_community_suggestion_block_title_required", {}) };
  }

  const repository = new AdminModerationCommunitySuggestionsRepository();
  const block = await repository.createBlock({
    adminId,
    description: cleanDescription(data.b.description),
    title,
  });
  const stats = blockStatsMap(await repository.getBlockStats([block.id]));

  return {
    status: 201,
    ...msg("admin_community_suggestion_block_created", {}),
    data: mapBlock(block, stats),
  };
};

export const updateCommunitySuggestionBlock = async (
  data: IAdminCommunitySuggestionBlockUpdateDTO,
): Promise<Resolve> => {
  const adminId = requireAdminId(data);
  if (!adminId) return { status: 401, ...error("token_not_authorized", {}) };

  const repository = new AdminModerationCommunitySuggestionsRepository();
  const block = await repository.findBlock(data.p.blockId);
  if (!block) {
    return { status: 404, ...error("admin_community_suggestion_block_not_found", {}) };
  }

  const updateData: Prisma.community_suggestion_blockUpdateInput = {};
  if (typeof data.b.title === "string") {
    const title = data.b.title.trim();
    if (!title) {
      return { status: 422, ...error("admin_community_suggestion_block_title_required", {}) };
    }
    updateData.title = title;
  }
  if (typeof data.b.description !== "undefined") {
    updateData.description = cleanDescription(data.b.description);
  }
  if (typeof data.b.status === "string") {
    const status = data.b.status.trim().toLowerCase();
    if (!VALID_BLOCK_STATUSES.has(status as AdminCommunitySuggestionBlockStatus)) {
      return { status: 422, ...error("admin_community_suggestion_block_status_invalid", {}) };
    }
    updateData.status = status;
  }

  const updated =
    Object.keys(updateData).length === 0
      ? block
      : await repository.updateBlock({ adminId, block, data: updateData });
  const stats = blockStatsMap(await repository.getBlockStats([updated.id]));

  return {
    status: 200,
    ...msg("admin_community_suggestion_block_updated", {}),
    data: mapBlock(updated, stats),
  };
};

export const moveCommunitySuggestion = async (
  data: IAdminCommunitySuggestionMoveDTO,
): Promise<Resolve> => {
  const adminId = requireAdminId(data);
  if (!adminId) return { status: 401, ...error("token_not_authorized", {}) };

  const repository = new AdminModerationCommunitySuggestionsRepository();
  const suggestion = await repository.findSuggestion(data.p.suggestionId);
  if (!suggestion) {
    return { status: 404, ...error("admin_community_suggestion_not_found", {}) };
  }

  const blockId = data.b.blockId?.trim() || null;
  if (blockId) {
    const block = await repository.findBlock(blockId);
    if (!block) {
      return { status: 404, ...error("admin_community_suggestion_block_not_found", {}) };
    }
    if (block.status === "arquivada") {
      return { status: 422, ...error("admin_community_suggestion_block_archived", {}) };
    }
  }

  const updated = await repository.moveSuggestion({ adminId, blockId, suggestion });
  const stats = blockStatsMap(
    await repository.getBlockStats([
      ...(updated.block ? [updated.block.id] : []),
      ...(suggestion.block ? [suggestion.block.id] : []),
    ]),
  );

  return {
    status: 200,
    ...msg("admin_community_suggestion_moved", {}),
    data: mapSuggestion(updated, stats),
  };
};

export const archiveCommunitySuggestion = async (
  data: IAdminCommunitySuggestionArchiveDTO,
): Promise<Resolve> => {
  const adminId = requireAdminId(data);
  if (!adminId) return { status: 401, ...error("token_not_authorized", {}) };

  const repository = new AdminModerationCommunitySuggestionsRepository();
  const suggestion = await repository.findSuggestion(data.p.suggestionId);
  if (!suggestion) {
    return { status: 404, ...error("admin_community_suggestion_not_found", {}) };
  }

  const updated = await repository.archiveSuggestion({ adminId, suggestion });

  return {
    status: 200,
    ...msg("admin_community_suggestion_archived", {}),
    data: mapSuggestion(updated, new Map()),
  };
};
