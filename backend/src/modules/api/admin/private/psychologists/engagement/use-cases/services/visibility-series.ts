import type { AdminOperatingSystemType } from "@/utils/admin-operating-system";
import {
  ADMIN_OPERATING_SYSTEM_LABELS,
  ADMIN_OPERATING_SYSTEM_TYPES,
  normalizeAdminOperatingSystem,
} from "@/utils/admin-operating-system";
import { toDateKey } from "@/utils/date-range";
import type {
  AdminPsychologistMetricComparison,
  AdminPsychologistStatisticsDTO,
  AdminPsychologistStatisticsPeriod,
  AdminPsychologistStatisticsSeriesPoint,
} from "../../DTOs/IAdminPsychologistEngagementDTO";
import type {
  AdminPsychologistEngagementPost,
  AdminPsychologistEngagementReply,
  AdminPsychologistPlatformSessionRecord,
} from "../../repositories/AdminPsychologistEngagementRepository";

import { buildPatientPostReplyCoverageEntries, roundPercent } from "./business-content";
import { groupDateCounts, normalizeSeconds, sum, valueFromMap } from "./statistics-utils";

export { groupDateCounts, normalizeSeconds, sum, valueFromMap } from "./statistics-utils";

export const PLATFORM_DEVICE_TYPES = ["desktop", "mobile", "tablet", "unknown"] as const;

export type PlatformDeviceType = (typeof PLATFORM_DEVICE_TYPES)[number];

export const PLATFORM_DEVICE_LABELS: Record<PlatformDeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  unknown: "Não identificado",
};

export const normalizePlatformDeviceType = (
  value: string | null | undefined,
): PlatformDeviceType => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "desktop" || normalized === "mobile" || normalized === "tablet") {
    return normalized;
  }

  return "unknown";
};

export const buildPlatformDeviceUsage = (sessions: AdminPsychologistPlatformSessionRecord[]) => {
  const counts: Record<PlatformDeviceType, number> = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
    unknown: 0,
  };
  const operatingSystemCounts = new Map<
    PlatformDeviceType,
    Record<AdminOperatingSystemType, number>
  >(
    PLATFORM_DEVICE_TYPES.map((deviceType) => [
      deviceType,
      Object.fromEntries(
        ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => [operatingSystem, 0]),
      ) as Record<AdminOperatingSystemType, number>,
    ]),
  );

  for (const session of sessions) {
    const deviceType = normalizePlatformDeviceType(session.device_type);
    const operatingSystem = normalizeAdminOperatingSystem(session.os, deviceType);
    counts[deviceType] += 1;
    const countsByOperatingSystem = operatingSystemCounts.get(deviceType);
    if (countsByOperatingSystem) countsByOperatingSystem[operatingSystem] += 1;
  }

  const totalSessions = sessions.length;

  return {
    items: PLATFORM_DEVICE_TYPES.map((deviceType) => {
      const deviceTotal = counts[deviceType];
      const countsByOperatingSystem = operatingSystemCounts.get(deviceType);

      return {
        count: deviceTotal,
        device_type: deviceType,
        id: deviceType,
        label: PLATFORM_DEVICE_LABELS[deviceType],
        operating_systems: ADMIN_OPERATING_SYSTEM_TYPES.map((operatingSystem) => ({
          count: countsByOperatingSystem?.[operatingSystem] ?? 0,
          id: operatingSystem,
          label: ADMIN_OPERATING_SYSTEM_LABELS[operatingSystem],
          operating_system: operatingSystem,
          percentage:
            deviceTotal > 0
              ? roundPercent(
                  ((countsByOperatingSystem?.[operatingSystem] ?? 0) / deviceTotal) * 100,
                )
              : 0,
        }))
          .filter((operatingSystem) => operatingSystem.count > 0)
          .sort((left, right) => {
            if (right.count !== left.count) return right.count - left.count;

            return left.label.localeCompare(right.label, "pt-BR");
          }),
        percentage: totalSessions > 0 ? roundPercent((deviceTotal / totalSessions) * 100) : 0,
      };
    }).sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    }),
    source: "visitor_session.device_type+visitor_session.os+user_id" as const,
    total_sessions: totalSessions,
    unavailable_reason:
      totalSessions === 0
        ? "Sem sessões autenticadas do psicólogo por dispositivo no período selecionado."
        : null,
  };
};

export const latestPlatformAccessAt = (params: {
  pageViews: Array<{ occurred_at: Date }>;
  sessions: Array<{ last_seen_at: Date }>;
}) => {
  const dates = [
    ...params.pageViews.map((view) => view.occurred_at),
    ...params.sessions.map((session) => session.last_seen_at),
  ];

  return dates.reduce<Date | null>(
    (latest, current) => (!latest || current > latest ? current : latest),
    null,
  );
};

export const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

export const buildComparison = (
  current: number,
  previous: number,
  period: AdminPsychologistStatisticsPeriod,
): AdminPsychologistMetricComparison => {
  const change = percentageChange(current, previous);

  return {
    change_percent: change,
    previous_from: period.previous_from,
    previous_to: period.previous_to,
    previous_value: previous,
    trend: change === null ? "unavailable" : change > 0 ? "up" : change < 0 ? "down" : "flat",
  };
};

export const buildPositionComparison = (
  current: number,
  previous: number | null,
  period: AdminPsychologistStatisticsPeriod,
): AdminPsychologistMetricComparison => {
  if (previous === null) {
    return {
      change_percent: null,
      previous_from: period.previous_from,
      previous_to: period.previous_to,
      previous_value: 0,
      trend: "unavailable",
    };
  }

  const change = percentageChange(current, previous);

  return {
    change_percent: change,
    previous_from: period.previous_from,
    previous_to: period.previous_to,
    previous_value: previous,
    trend: current < previous ? "up" : current > previous ? "down" : "flat",
  };
};

export const groupDateSums = <T extends { createdAt: Date }>(
  items: T[],
  labels: string[],
  getValue: (item: T) => number | null | undefined,
) => {
  const counts = new Map(labels.map((label) => [label, 0]));

  for (const item of items) {
    const label = toDateKey(item.createdAt);
    if (!counts.has(label)) continue;
    counts.set(label, (counts.get(label) ?? 0) + normalizeSeconds(getValue(item)));
  }

  return counts;
};

export const buildVisibilitySecondsByDate = (input: {
  communityContentAttentionSessions: { attention_seconds: number; createdAt: Date }[];
  labels: string[];
  profileAttentionSessions: { attention_seconds: number; createdAt: Date }[];
  videoSessions: { createdAt: Date; watched_seconds: number }[];
}) => {
  const profileAttentionSeconds = groupDateSums(
    input.profileAttentionSessions,
    input.labels,
    (item) => item.attention_seconds,
  );
  const videoAttentionSeconds = groupDateSums(input.videoSessions, input.labels, (item) => {
    return item.watched_seconds;
  });
  const communityAttentionSeconds = groupDateSums(
    input.communityContentAttentionSessions,
    input.labels,
    (item) => item.attention_seconds,
  );

  return new Map(
    input.labels.map((label) => {
      const profileSurfaceSeconds = Math.max(
        valueFromMap(profileAttentionSeconds, label),
        valueFromMap(videoAttentionSeconds, label),
      );
      const communitySeconds = valueFromMap(communityAttentionSeconds, label);

      return [label, profileSurfaceSeconds + communitySeconds];
    }),
  );
};

export type VisibilityBreakdownMapsByDate = {
  communityContentSeconds: Map<string, number>;
  presentationVideoSeconds: Map<string, number>;
  profileSeconds: Map<string, number>;
};

export const buildVisibilityBreakdownMapsByDate = (input: {
  communityContentAttentionSessions: { attention_seconds: number; createdAt: Date }[];
  labels: string[];
  profileAttentionSessions: { attention_seconds: number; createdAt: Date }[];
  videoSessions: { createdAt: Date; watched_seconds: number }[];
}): VisibilityBreakdownMapsByDate => ({
  communityContentSeconds: groupDateSums(
    input.communityContentAttentionSessions,
    input.labels,
    (item) => item.attention_seconds,
  ),
  presentationVideoSeconds: groupDateSums(input.videoSessions, input.labels, (item) => {
    return item.watched_seconds;
  }),
  profileSeconds: groupDateSums(input.profileAttentionSessions, input.labels, (item) => {
    return item.attention_seconds;
  }),
});

export const buildVisibilityBreakdownSeries = (
  labels: string[],
  maps: VisibilityBreakdownMapsByDate,
): AdminPsychologistStatisticsDTO["business"]["visibility"]["series"] =>
  labels.map((date) => {
    const profileSeconds = valueFromMap(maps.profileSeconds, date);
    const presentationVideoSeconds = valueFromMap(maps.presentationVideoSeconds, date);
    const communityContentSeconds = valueFromMap(maps.communityContentSeconds, date);

    return {
      community_content_seconds: communityContentSeconds,
      date,
      presentation_video_seconds: presentationVideoSeconds,
      profile_seconds: profileSeconds,
      total_seconds: profileSeconds + presentationVideoSeconds + communityContentSeconds,
    };
  });

export const sumMapValues = (map: Map<string, number>) => sum([...map.values()]);

export const sumVisibilitySecondsByDate = (visibilitySecondsByDate: Map<string, number>) =>
  sum([...visibilitySecondsByDate.values()]);

export const RETENTION_BUCKETS = Array.from({ length: 20 }, (_, index) => (index + 1) * 5);

export const normalizeString = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const excerpt = (value: string, max = 120) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;

  return `${normalized.slice(0, max - 1).trim()}…`;
};

export const mediaFromPost = (post: AdminPsychologistEngagementPost) => {
  const first = post.media_items[0];
  const url = first?.media_url ?? post.media_url;
  const type = first?.media_type ?? post.media_type;

  return url ? { type: type ?? null, url } : null;
};

export const mediaFromReply = (reply: AdminPsychologistEngagementReply) =>
  reply.media_url ? { type: reply.media_type ?? null, url: reply.media_url } : null;

export const toCountMap = <T extends Record<string, unknown>>(items: T[], key: keyof T) => {
  const map = new Map<string, number>();

  for (const item of items) {
    const rawKey = item[key];
    if (typeof rawKey !== "string") continue;
    map.set(rawKey, (map.get(rawKey) ?? 0) + 1);
  }

  return map;
};

export const groupCountMap = <T extends { _count: { _all: number } }>(
  items: T[],
  getKey: (item: T) => string | null,
) => {
  const map = new Map<string, number>();

  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    map.set(key, item._count._all);
  }

  return map;
};

export const buildSeries = (input: {
  commentsReceived: { createdAt: Date }[];
  coverageRatePercentByDate?: Map<string, number>;
  favorites: { createdAt: Date }[];
  labels: string[];
  postShares: { createdAt: Date }[];
  postSaves: { createdAt: Date }[];
  postVotes: { createdAt: Date; value: number }[];
  posts: { createdAt: Date }[];
  profileViews: { createdAt: Date }[];
  replies: AdminPsychologistEngagementReply[];
  reviews: { createdAt: Date }[];
  replyShares: { createdAt: Date }[];
  replySaves: { createdAt: Date }[];
  replyVotes: { createdAt: Date; value: number }[];
  searchResults: { createdAt: Date }[];
  visibilitySecondsByDate?: Map<string, number>;
  whatsappClicks: { createdAt: Date }[];
}): AdminPsychologistStatisticsSeriesPoint[] => {
  const profileViews = groupDateCounts(input.profileViews, input.labels);
  const whatsappClicks = groupDateCounts(input.whatsappClicks, input.labels);
  const favorites = groupDateCounts(input.favorites, input.labels);
  const reviews = groupDateCounts(input.reviews, input.labels);
  const searchResults = groupDateCounts(input.searchResults, input.labels);
  const posts = groupDateCounts(input.posts, input.labels);
  const replies = groupDateCounts(input.replies, input.labels);
  const patientPostReplyCoverageEntries = buildPatientPostReplyCoverageEntries(input.replies);
  const patientPostTextReplyCoverage = groupDateCounts(
    patientPostReplyCoverageEntries.filter((entry) => entry.kind === "text"),
    input.labels,
  );
  const patientPostVideoReplyCoverage = groupDateCounts(
    patientPostReplyCoverageEntries.filter((entry) => entry.kind === "video"),
    input.labels,
  );
  const commentsReceived = groupDateCounts(input.commentsReceived, input.labels);
  const saves = groupDateCounts([...input.postSaves, ...input.replySaves], input.labels);
  const upvotes = groupDateCounts(
    [...input.postVotes, ...input.replyVotes].filter((vote) => vote.value === 1),
    input.labels,
  );
  const downvotes = groupDateCounts(
    [...input.postVotes, ...input.replyVotes].filter((vote) => vote.value === -1),
    input.labels,
  );
  const shares = groupDateCounts([...input.postShares, ...input.replyShares], input.labels);
  const coverageRatePercentByDate = input.coverageRatePercentByDate ?? new Map<string, number>();
  const visibilitySecondsByDate = input.visibilitySecondsByDate ?? new Map<string, number>();

  return input.labels.map((date) => ({
    comments_received: valueFromMap(commentsReceived, date),
    coverage_rate_percent: valueFromMap(coverageRatePercentByDate, date),
    date,
    downvotes: valueFromMap(downvotes, date),
    favorites: valueFromMap(favorites, date),
    patient_post_reply_coverage:
      valueFromMap(patientPostTextReplyCoverage, date) +
      valueFromMap(patientPostVideoReplyCoverage, date),
    patient_post_text_reply_coverage: valueFromMap(patientPostTextReplyCoverage, date),
    patient_post_video_reply_coverage: valueFromMap(patientPostVideoReplyCoverage, date),
    profile_views: valueFromMap(profileViews, date),
    replies: valueFromMap(replies, date),
    reviews: valueFromMap(reviews, date),
    saves: valueFromMap(saves, date),
    search_results: valueFromMap(searchResults, date),
    shares: valueFromMap(shares, date),
    visibility_seconds: valueFromMap(visibilitySecondsByDate, date),
    whatsapp_clicks: valueFromMap(whatsappClicks, date),
    upvotes: valueFromMap(upvotes, date),
    posts: valueFromMap(posts, date),
  }));
};
