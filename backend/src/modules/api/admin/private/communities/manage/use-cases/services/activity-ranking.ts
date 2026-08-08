import { deriveCommunityVisualColorFields, isCommunityHexColor } from "@/utils/community-visual";
import {
  addDays,
  toDateKey as dateKey,
  daysBetweenInclusive,
  endOfDate as endOfDay,
  parseDateOnly,
  startOfDate as startOfDay,
} from "@/utils/date-range";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import type {
  AdminCommunityActivitiesDTO,
  AdminCommunityActivitiesFilterOptionDTO,
  AdminCommunityActivityItemDTO,
  AdminCommunityCreateBody,
  AdminCommunityRuleBody,
  AdminCommunityStatusBody,
  AdminCommunityUpdateBody,
} from "../../DTOs/IAdminCommunityManageDTO";
import {
  type AdminCommunityActivityRecord,
  type AdminCommunityMemberRecord,
  type AdminCommunityMentorMetrics,
  adminCommunityMentorScore,
} from "../../repositories/AdminCommunityManageRepository";

import {
  DETAIL_PERIOD_DAYS,
  MAX_ACTIVITY_PERIOD_DAYS,
  normalizeComparableText,
  normalizeNullableText,
} from "./community-list";

export const activitySummary = (activity: AdminCommunityActivityRecord) => {
  if (activity.action === "community_report_dismissed") {
    return "Denúncia marcada como improcedente";
  }
  if (activity.action === "community_report_upheld") {
    return "Denúncia marcada como procedente";
  }
  if (activity.action === "community_report_decision_reviewed") {
    return "Decisão da denúncia revisada";
  }
  if (activity.action === "community_content_removed") return "Conteúdo removido";
  if (activity.action === "community_deactivated") return "Comunidade desativada";
  if (activity.action === "community_reactivated") return "Comunidade reativada";
  if (activity.action.includes("rule")) return "Regra da comunidade alterada";
  if (activity.action.includes("avatar")) return "Avatar da comunidade alterado";
  if (activity.action.includes("update")) return "Dados da comunidade alterados";

  return activity.action.replace(/_/g, " ");
};

export const mapActivity = (
  activity: AdminCommunityActivityRecord,
): AdminCommunityActivityItemDTO => ({
  action: activity.action,
  actor: activity.admin.name || activity.admin.email,
  area: activity.area || "Comunidade",
  created_at: activity.createdAt,
  id: activity.id,
  reason: activity.reason,
  source: activity.source,
  summary: activitySummary(activity),
});

export type ActivityPeriodResult =
  | {
      current: { end: Date | null; start: Date | null };
      period: AdminCommunityActivitiesDTO["period"];
      success: true;
    }
  | { code: string; success: false };

export const resolveActivityPeriod = (
  query: { from?: string; to?: string } = {},
): ActivityPeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);

  if (!hasCustomFrom && !hasCustomTo) {
    return {
      current: { end: null, start: null },
      period: {
        from: null,
        label: "Todo histórico registrado",
        max_days: null,
        timezone: "server-local",
        to: null,
      },
      success: true,
    };
  }

  if (!hasCustomFrom || !hasCustomTo) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const start = parseDateOnly(query.from, "start");
  const end = parseDateOnly(query.to, "end");

  if (!start || !end || start > end) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_ACTIVITY_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  return {
    current: { end, start },
    period: {
      from: dateKey(start),
      label: "Período filtrado",
      max_days: MAX_ACTIVITY_PERIOD_DAYS,
      timezone: "server-local",
      to: dateKey(end),
    },
    success: true,
  };
};

export const activityAreaId = (area: string) =>
  normalizeComparableText(area)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "sem_area";

export const activityMatchesPeriod = (
  item: AdminCommunityActivityItemDTO,
  period: { end: Date | null; start: Date | null },
) => {
  if (!period.start || !period.end) return true;

  return item.created_at >= period.start && item.created_at <= period.end;
};

export const activityMatchesQuery = (
  item: AdminCommunityActivityItemDTO,
  query: { area: string; q: string; type: string },
) => {
  if (query.area !== "all" && activityAreaId(item.area) !== query.area) return false;
  if (query.type !== "all" && item.action !== query.type) return false;
  if (!query.q) return true;

  return [item.action, item.summary, item.reason, item.actor, item.area]
    .filter(Boolean)
    .some((value) => normalizeComparableText(value).includes(normalizeComparableText(query.q)));
};

export const activityFiltersFromActivities = (
  activities: AdminCommunityActivityItemDTO[],
): AdminCommunityActivitiesDTO["filters"] => {
  const areaCounts = new Map<string, { count: number; label: string }>();
  const typeCounts = new Map<string, { count: number; label: string }>();

  for (const item of activities) {
    const areaId = activityAreaId(item.area);
    const currentArea = areaCounts.get(areaId) ?? { count: 0, label: item.area };
    currentArea.count += 1;
    areaCounts.set(areaId, currentArea);

    const currentType = typeCounts.get(item.action) ?? { count: 0, label: item.summary };
    currentType.count += 1;
    typeCounts.set(item.action, currentType);
  }

  const areas: AdminCommunityActivitiesFilterOptionDTO[] = [...areaCounts.entries()]
    .map(([id, option]) => ({ count: option.count, id, label: option.label }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
  const types: AdminCommunityActivitiesFilterOptionDTO[] = [...typeCounts.entries()]
    .map(([id, option]) => ({ count: option.count, id, label: option.label }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));

  return {
    areas: [{ count: activities.length, id: "all", label: "Todas as áreas" }, ...areas],
    types: [{ count: activities.length, id: "all", label: "Todos os tipos" }, ...types],
  };
};

export const mentorDisplayName = (member: AdminCommunityMemberRecord) =>
  buildProfessionalFullDisplayName({
    fallbackName: member.user.name,
    firstName: member.user.psychologist_profile?.professional_first_name,
    lastName: member.user.psychologist_profile?.professional_last_name,
  });

export const verifiedMentor = (member: AdminCommunityMemberRecord) => {
  const profile = member.user.psychologist_profile;

  return Boolean(
    profile?.crp_status === "aprovado" || profile?.cfp_verified_at || profile?.subscriptions.length,
  );
};

export const compareRanking = (
  left: {
    member: AdminCommunityMemberRecord;
    metrics: AdminCommunityMentorMetrics;
    score: number;
  },
  right: {
    member: AdminCommunityMemberRecord;
    metrics: AdminCommunityMentorMetrics;
    score: number;
  },
) => {
  const scoreDiff = right.score - left.score;
  if (scoreDiff !== 0) return scoreDiff;

  const commentDiff = right.metrics.comments_received - left.metrics.comments_received;
  if (commentDiff !== 0) return commentDiff;

  const shareDiff = right.metrics.shares_received - left.metrics.shares_received;
  if (shareDiff !== 0) return shareDiff;

  const whatsappDiff =
    right.metrics.community_whatsapp_clicks - left.metrics.community_whatsapp_clicks;
  if (whatsappDiff !== 0) return whatsappDiff;

  const coverageDiff = right.metrics.reply_coverage_count - left.metrics.reply_coverage_count;
  if (coverageDiff !== 0) return coverageDiff;

  const saveDiff = right.metrics.saves_received - left.metrics.saves_received;
  if (saveDiff !== 0) return saveDiff;

  const upvoteDiff = right.metrics.upvotes_received - left.metrics.upvotes_received;
  if (upvoteDiff !== 0) return upvoteDiff;

  const activeDayDiff = right.metrics.active_days - left.metrics.active_days;
  if (activeDayDiff !== 0) return activeDayDiff;

  const replyDiff = right.metrics.replies_published - left.metrics.replies_published;
  if (replyDiff !== 0) return replyDiff;

  const postDiff = right.metrics.posts_published - left.metrics.posts_published;
  if (postDiff !== 0) return postDiff;

  const downvoteDiff = left.metrics.downvotes_received - right.metrics.downvotes_received;
  if (downvoteDiff !== 0) return downvoteDiff;

  const removedPostDiff = left.metrics.removed_posts - right.metrics.removed_posts;
  if (removedPostDiff !== 0) return removedPostDiff;

  const nameDiff = mentorDisplayName(left.member).localeCompare(
    mentorDisplayName(right.member),
    "pt-BR",
  );
  if (nameDiff !== 0) return nameDiff;

  return left.member.user.id.localeCompare(right.member.user.id);
};

export const rankMembers = (
  members: AdminCommunityMemberRecord[],
  metricsByMentorId: Map<string, AdminCommunityMentorMetrics>,
) =>
  members
    .map((member) => {
      const metrics = metricsByMentorId.get(member.user.id) ?? {
        active_days: 0,
        comments_received: 0,
        community_whatsapp_clicks: 0,
        downvotes_received: 0,
        posts_published: 0,
        reply_coverage_count: 0,
        removed_posts: 0,
        removed_posts_penalty: 0,
        replies_published: 0,
        saves_received: 0,
        shares_received: 0,
        upvotes_received: 0,
      };

      return {
        member,
        metrics,
        score: adminCommunityMentorScore(metrics),
      };
    })
    .sort(compareRanking)
    .map((item, index) => ({
      ...item,
      position: index + 1,
    }));

export const buildRankingPeriod = () => {
  const today = endOfDay(new Date());
  const currentStart = startOfDay(addDays(today, -(DETAIL_PERIOD_DAYS - 1)));
  const previousEnd = endOfDay(addDays(currentStart, -1));
  const previousStart = startOfDay(addDays(currentStart, -DETAIL_PERIOD_DAYS));

  return {
    current_from: currentStart,
    current_to: today,
    days: DETAIL_PERIOD_DAYS as 30,
    label: "Últimos 30 dias" as const,
    previous_from: previousStart,
    previous_to: previousEnd,
  };
};

export const normalizeCommunitySlug = (value?: string | null) =>
  normalizeComparableText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/^-+|-+$/g, "");

export const normalizeCommunityCreate = (
  body: AdminCommunityCreateBody,
): AdminCommunityCreateBody & { slug: string } => ({
  category: normalizeNullableText(body.category),
  description: normalizeNullableText(body.description),
  name: body.name.trim(),
  slug: normalizeCommunitySlug(body.slug || body.name),
  ...deriveCommunityVisualColorFields(body.visual_primary_color),
});

export const hasOwn = <T extends object>(object: T, key: keyof T) => Object.hasOwn(object, key);

export const normalizeCommunityUpdate = (
  body: AdminCommunityUpdateBody,
): AdminCommunityUpdateBody => {
  const normalized: AdminCommunityUpdateBody = {
    description: normalizeNullableText(body.description),
    name: body.name?.trim(),
  };

  if (hasOwn(body, "visual_primary_color")) {
    Object.assign(normalized, deriveCommunityVisualColorFields(body.visual_primary_color));
  }

  return normalized;
};

export const invalidColor = (body: AdminCommunityUpdateBody) =>
  hasOwn(body, "visual_primary_color") && !isCommunityHexColor(body.visual_primary_color);

export const normalizeRuleBody = (
  body: AdminCommunityRuleBody,
): Required<AdminCommunityRuleBody> => ({
  active: body.active ?? true,
  description: body.description.trim(),
  position: typeof body.position === "number" ? body.position : 0,
  title: body.title.trim(),
});

export const normalizeCommunityStatus = (
  body: AdminCommunityStatusBody,
): AdminCommunityStatusBody => ({
  active: body.active,
  confirmation: body.confirmation.trim().toUpperCase(),
  reason: body.reason.trim(),
});

export const resolvePeriod = () => {
  const today = endOfDay(new Date());
  const currentStart = startOfDay(addDays(today, -(DETAIL_PERIOD_DAYS - 1)));
  const previousEnd = endOfDay(addDays(currentStart, -1));
  const previousStart = startOfDay(addDays(currentStart, -DETAIL_PERIOD_DAYS));

  return {
    current: { from: currentStart, to: today },
    previous: { from: previousStart, to: previousEnd },
  };
};
