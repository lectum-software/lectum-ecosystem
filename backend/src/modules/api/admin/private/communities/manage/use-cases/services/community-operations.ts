import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { endOfDate as endOfDay, startOfDate as startOfDay } from "@/utils/date-range";
import type {
  AdminCommunitiesListQuery,
  AdminCommunityDetailDTO,
  AdminCommunityStatisticsDTO,
  IAdminCommunitiesListDTO,
  IAdminCommunityAvatarDTO,
  IAdminCommunityCreateDTO,
  IAdminCommunityRuleDTO,
  IAdminCommunityShowDTO,
  IAdminCommunityStatisticsDTO,
  IAdminCommunityStatusDTO,
  IAdminCommunityUpdateDTO,
} from "../../DTOs/IAdminCommunityManageDTO";
import {
  AdminCommunityManageRepository,
  type AdminCommunityRecord,
  type AdminCommunityRuleRecord,
} from "../../repositories/AdminCommunityManageRepository";
import {
  invalidColor,
  normalizeCommunityCreate,
  normalizeCommunityStatus,
  normalizeCommunityUpdate,
  normalizeRuleBody,
  resolvePeriod,
} from "./activity-ranking";
import {
  buildCommunityCategoryFilters,
  COMMUNITY_LIST_SORTS,
  categoryMatches,
  communityListMatchesSearch,
  communitySummary,
  DEACTIVATE_COMMUNITY_CONFIRMATION,
  DETAIL_PERIOD_DAYS,
  mapCommunity,
  mapCommunityListItem,
  mapRule,
  metric,
  normalizeCommunityListSort,
  normalizeComparableText,
  normalizeLimit,
  normalizeNullableText,
  normalizePage,
  paginate,
  REACTIVATE_COMMUNITY_CONFIRMATION,
  sortCommunityListItems,
} from "./community-list";
import { mapContentAuthor, resolveStatisticsPeriod } from "./content";
import {
  buildCommunityHighlightCounters,
  buildCommunityTodaySummary,
  buildCommunityUrgentSummary,
  buildMentors,
  findCommunityOrNotFound,
  notFound,
  publicFileUrl,
} from "./detail-summary";
import { buildCommunityStatistics } from "./statistics";
import { buildPoints } from "./statistics-support";

export const listCommunities = async (data: IAdminCommunitiesListDTO): Promise<Resolve> => {
  const query: AdminCommunitiesListQuery = data.q ?? {};
  if (query.sort && !COMMUNITY_LIST_SORTS.has(query.sort)) {
    return {
      status: 400,
      ...error("invalid_structure", {}),
    };
  }

  const repository = new AdminCommunityManageRepository();
  const search = normalizeComparableText(query.q);
  const sort = normalizeCommunityListSort(query.sort);
  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);
  const category = normalizeNullableText(query.category);
  const normalizedCategory =
    category && normalizeComparableText(category) !== "all" ? category : null;

  const records = await repository.listCommunities();
  const allItems = records.map(mapCommunityListItem);
  const filteredItems = allItems.filter(
    (item) => communityListMatchesSearch(item, search) && categoryMatches(item, normalizedCategory),
  );
  const paginated = paginate(sortCommunityListItems(filteredItems, sort), page, limit);
  const activeFiltersCount = [search, normalizedCategory].filter(Boolean).length;

  return {
    status: 200,
    ...msg("index", {}),
    data: {
      active_filters_count: activeFiltersCount,
      count: paginated.count,
      data: paginated.data,
      filters: {
        categories: buildCommunityCategoryFilters(allItems),
      },
      page: paginated.page,
      pages: paginated.pages,
      per_page: paginated.per_page,
      sort,
      source: "community+community_member+community_post+post_reply+post_report",
    },
  };
};

export const showCommunity = async (data: IAdminCommunityShowDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const period = resolvePeriod();
  const today = new Date();
  const todayPeriod = {
    end: endOfDay(today),
    start: startOfDay(today),
  };
  const [
    rules,
    postsCount,
    commentsCount,
    popularPostsCount,
    currentPerformance,
    previousPerformance,
    topMentorReplies,
    popularPosts,
    statisticsDataset,
    reports,
  ] = await Promise.all([
    repository.listRules(community.id, true),
    repository.countPublishedPosts(community.id),
    repository.countComments(community.id),
    repository.countPopularPosts(community.id),
    repository.listPerformance(community.id, period.current.from, period.current.to),
    repository.listPerformance(community.id, period.previous.from, period.previous.to),
    repository.listTopMentors(community.id, period.current.from, period.current.to),
    repository.listPopularPosts(community.id),
    repository.listStatisticsDataset(community.id, community.slug, todayPeriod.end),
    repository.listReports(community.id),
  ]);

  const currentTotals = {
    comments: currentPerformance.comments.length,
    members: currentPerformance.members.length,
    posts: currentPerformance.posts.length,
    reports: currentPerformance.reports.length,
  };
  const previousTotals = {
    comments: previousPerformance.comments.length,
    members: previousPerformance.members.length,
    posts: previousPerformance.posts.length,
    reports: previousPerformance.reports.length,
  };

  const result: AdminCommunityDetailDTO = {
    community: mapCommunity(community),
    highlight_counters: buildCommunityHighlightCounters(statisticsDataset),
    performance: {
      days: DETAIL_PERIOD_DAYS,
      metrics: {
        comments: metric("Comentários", currentTotals.comments, previousTotals.comments),
        new_members: metric("Novos membros", currentTotals.members, previousTotals.members),
        new_posts: metric("Novos posts", currentTotals.posts, previousTotals.posts),
        reports: metric("Denúncias", currentTotals.reports, previousTotals.reports),
      },
      points: buildPoints(currentPerformance),
    },
    popular_posts: popularPosts.map((post) => {
      const anonymous = post.anonymous && post.author.role !== "psicologo";
      const author = mapContentAuthor(post.author, anonymous);

      return {
        author,
        author_name: author.name,
        author_role: author.role,
        comments_count: post.replies_count,
        created_at: post.createdAt,
        id: post.id,
        saves_count: post.saves_count,
        title: post.title,
        upvotes_count: post.upvotes_count,
      };
    }),
    rules: rules.map(mapRule),
    summary: {
      comments_count: commentsCount,
      members_count: community.members_count,
      popular_posts_count: popularPostsCount,
      posts_count: postsCount,
    },
    today_summary: buildCommunityTodaySummary(statisticsDataset, todayPeriod),
    top_mentors: buildMentors(topMentorReplies),
    urgent_summary: buildCommunityUrgentSummary(community, reports),
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: result,
  };
};

export const showStatistics = async (data: IAdminCommunityStatisticsDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const period = resolveStatisticsPeriod(data.q ?? {}, community.createdAt);
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const dataset = await repository.listStatisticsDataset(
    community.id,
    community.slug,
    period.current.end,
  );
  const statistics = buildCommunityStatistics(dataset, period.current);
  const payload: AdminCommunityStatisticsDTO = {
    ...statistics,
    community: communitySummary(community),
    period: period.period,
    source:
      "community_member+community_post+post_reply+post_report+post_vote+post_save+post_reply_save+page_view_event+important_action_event",
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: payload,
  };
};

export const createCommunity = async (data: IAdminCommunityCreateDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const body = normalizeCommunityCreate(data.b);

  if (!body.slug) {
    return {
      status: 400,
      ...error("invalid_structure", {}),
    };
  }

  if (invalidColor(body)) {
    return {
      status: 422,
      ...error("invalid", { model: "community" }),
    };
  }

  const existing = await repository.findCommunity(body.slug);
  if (existing) {
    return {
      status: 409,
      ...error("unique", { property: "slug" }),
    };
  }

  const created = await repository.createCommunity(body);

  return {
    status: 201,
    ...msg("created", { model: "community" }),
    data: mapCommunity(created as AdminCommunityRecord),
  };
};

export const updateCommunity = async (data: IAdminCommunityUpdateDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const body = normalizeCommunityUpdate(data.b);
  if (invalidColor(body)) {
    return {
      status: 422,
      ...error("invalid", { model: "community" }),
    };
  }

  const updated = await repository.updateCommunity(community.id, body);

  return {
    status: 200,
    ...msg("updated", { model: "community" }),
    data: mapCommunity(updated),
  };
};

export const updateCommunityStatus = async (data: IAdminCommunityStatusDTO): Promise<Resolve> => {
  const admin = data.admin ?? data.auth;
  if (!admin?.id) {
    return {
      status: 401,
      ...error("token_not_authorized", {}),
    };
  }

  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const body = normalizeCommunityStatus(data.b);
  const expectedConfirmation = body.active
    ? REACTIVATE_COMMUNITY_CONFIRMATION
    : DEACTIVATE_COMMUNITY_CONFIRMATION;

  if (body.confirmation !== expectedConfirmation) {
    return {
      status: 400,
      ...error("invalid_structure", {}),
    };
  }

  if (community.active === body.active) {
    return {
      status: 200,
      ...msg("updated", { model: "community" }),
      data: mapCommunity(community),
    };
  }

  const updated = await repository.updateCommunityStatus(community, {
    ...body,
    adminId: admin.id,
  });

  return {
    status: 200,
    ...msg("updated", { model: "community" }),
    data: mapCommunity(updated),
  };
};

export const uploadCommunityAvatar = async (data: IAdminCommunityAvatarDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const key = data.file?.path || data.file?.key;
  if (!key?.startsWith("community/avatar/")) {
    return {
      status: 400,
      ...error("upload_error", {}),
    };
  }

  const avatar_url = publicFileUrl(key);
  const updated = await repository.updateCommunity(community.id, { avatar_url });

  return {
    status: 200,
    ...msg("updated", { model: "community" }),
    data: {
      avatar_url,
      community: mapCommunity(updated),
    },
  };
};

export const listRules = async (data: IAdminCommunityShowDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const rules = await repository.listRules(community.id, true);

  return {
    status: 200,
    ...msg("index", {}),
    data: {
      community: {
        id: community.id,
        name: community.name,
        slug: community.slug,
      },
      rules: rules.map(mapRule),
    },
  };
};

export const createRule = async (data: IAdminCommunityRuleDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const rule = await repository.addRule(community.id, normalizeRuleBody(data.b));

  return {
    status: 201,
    ...msg("created", { model: "community_rule" }),
    data: mapRule(rule as AdminCommunityRuleRecord),
  };
};

export const updateRule = async (data: IAdminCommunityRuleDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community || !data.p.ruleId) return notFound();

  const body = normalizeRuleBody(data.b);
  const rule = await repository.updateRule(community.id, data.p.ruleId, body);
  if (!rule) return notFound();

  return {
    status: 200,
    ...msg("updated", { model: "community_rule" }),
    data: mapRule(rule as AdminCommunityRuleRecord),
  };
};

export const deleteRule = async (data: IAdminCommunityShowDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community || !data.p.ruleId) return notFound();

  const rule = await repository.softDeleteRule(community.id, data.p.ruleId);
  if (!rule) return notFound();

  return {
    status: 200,
    ...msg("deleted", { model: "community_rule" }),
    data: mapRule(rule as AdminCommunityRuleRecord),
  };
};
