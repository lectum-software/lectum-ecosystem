import {
  buildDateLabels as buildLabels,
  endOfDate,
  parseDateOnly,
  startOfDate,
  toDateKey,
} from "@/utils/date-range";
import type {
  AdminTrafficBreakdownItem,
  AdminTrafficDateRange,
  AdminTrafficTimelinePoint,
} from "../../DTOs/IAdminTrafficSummaryDTO";
import type { TrafficPageViewRecord } from "../../repositories/interfaces/IAdminTrafficRepository";

import {
  entryPageViews,
  newVisitorIds,
  recurringVisitorIds,
  safePercentage,
  type TrafficPeriodResolution,
  type TrafficStats,
} from "./overview";

export const isInsideRange = (date: Date, range: AdminTrafficDateRange) =>
  date >= range.start && date <= range.end;

export const setFirstObservedDate = (
  map: Map<string, Date>,
  visitorId: string,
  date: Date,
  range: AdminTrafficDateRange,
) => {
  if (!isInsideRange(date, range)) return;

  const current = map.get(visitorId);
  if (!current || date < current) map.set(visitorId, date);
};

export const buildTimeline = (
  stats: TrafficStats,
  period: TrafficPeriodResolution,
): AdminTrafficTimelinePoint[] => {
  const labels = buildLabels(period.current.start, period.days);
  const firstObservedByVisitor = new Map<string, Date>();
  const newVisitors = new Set(newVisitorIds(stats));
  const recurringVisitors = new Set(recurringVisitorIds(stats));

  for (const session of stats.sessions) {
    setFirstObservedDate(
      firstObservedByVisitor,
      session.visitor_id,
      session.first_seen_at,
      period.current,
    );
  }

  for (const pageView of stats.pageViews) {
    setFirstObservedDate(
      firstObservedByVisitor,
      pageView.visitor_id,
      pageView.occurred_at,
      period.current,
    );
  }

  for (const action of stats.actions) {
    setFirstObservedDate(
      firstObservedByVisitor,
      action.visitor_id,
      action.occurred_at,
      period.current,
    );
  }

  return labels.map((date) => {
    const dayStart = parseDateOnly(date, "start") ?? startOfDate(new Date(date));
    const dayEnd = parseDateOnly(date, "end") ?? endOfDate(new Date(date));
    const visitorIds = new Set<string>();
    const sessions = stats.sessions.filter(
      (session) => session.first_seen_at <= dayEnd && session.last_seen_at >= dayStart,
    );

    for (const session of sessions) {
      visitorIds.add(session.visitor_id);
    }

    for (const pageView of stats.pageViews) {
      if (toDateKey(pageView.occurred_at) === date) visitorIds.add(pageView.visitor_id);
    }

    for (const action of stats.actions) {
      if (toDateKey(action.occurred_at) === date) visitorIds.add(action.visitor_id);
    }

    return {
      date,
      new_visitors: [...firstObservedByVisitor.entries()].filter(
        ([visitorId, firstObservedAt]) =>
          newVisitors.has(visitorId) && toDateKey(firstObservedAt) === date,
      ).length,
      recurring_visitors: [...visitorIds].filter((visitorId) => recurringVisitors.has(visitorId))
        .length,
      sessions: sessions.length,
      unique_visitors: visitorIds.size,
    };
  });
};

export type TrafficSourceChannel =
  | "direct"
  | "google_ads"
  | "google_organic"
  | "instagram_bio"
  | "instagram_organic"
  | "lectum_billing"
  | "lectum_community"
  | "lectum_internal"
  | "lectum_profile"
  | "meta_ads"
  | "other"
  | "tiktok"
  | "whatsapp";

export const TRAFFIC_SOURCE_LABELS: Record<TrafficSourceChannel, string> = {
  direct: "Direto",
  google_ads: "Google Ads",
  google_organic: "Google orgânico",
  instagram_bio: "Instagram (Link na bio)",
  instagram_organic: "Instagram orgânico",
  lectum_billing: "Lectum Billing",
  lectum_community: "Comunidades",
  lectum_internal: "Lectum interno",
  lectum_profile: "Perfis Lectum",
  meta_ads: "Meta Ads",
  other: "Outros",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
};

export const GOOGLE_SOURCES = new Set([
  "adwords",
  "gads",
  "google",
  "google_adwords",
  "google_ads",
  "google_com",
  "google_com_br",
]);

export const GOOGLE_AD_SOURCES = new Set(["adwords", "gads", "google_adwords", "google_ads"]);

export const INSTAGRAM_SOURCES = new Set(["ig", "instagram", "instagram_com", "l_instagram_com"]);

export const META_SOURCES = new Set([
  "facebook",
  "facebook_com",
  "fb",
  "instagram",
  "instagram_com",
  "meta",
  "m_facebook_com",
  "l_facebook_com",
]);

export const META_AD_SOURCES = new Set([
  "facebook_ads",
  "fb_ads",
  "ig_ads",
  "instagram_ads",
  "meta_ads",
]);

export const PAID_MEDIUMS = new Set([
  "ad",
  "ads",
  "cpc",
  "display",
  "paid",
  "paid_search",
  "paid_social",
  "paidsocial",
  "ppc",
  "remarketing",
  "retargeting",
  "sem",
  "social_paid",
  "sponsored",
]);

export const INSTAGRAM_BIO_HINTS = new Set([
  "bio",
  "bio_link",
  "instagram_bio",
  "link_bio",
  "link_in_bio",
  "linkinbio",
]);

export const TIKTOK_SOURCES = new Set(["tik_tok", "tiktok", "tiktok_ads", "tiktok_com", "tt"]);

export const normalizeSourceValue = (value: string | null | undefined) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.\-\s/]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const hasAnyExact = (values: string[], options: Set<string>) =>
  values.some((value) => options.has(value));

export const hasAnyHint = (values: string[], options: Set<string>) =>
  values.some((value) => {
    if (!value) return false;
    if (options.has(value)) return true;

    return [...options].some((option) => value.includes(option));
  });

export const classifyTrafficSource = (entry: TrafficPageViewRecord): TrafficSourceChannel => {
  const sourceValues = [
    normalizeSourceValue(entry.traffic_source),
    normalizeSourceValue(entry.utm_source),
    normalizeSourceValue(entry.referrer_host),
  ].filter(Boolean);
  const mediumValues = [
    normalizeSourceValue(entry.traffic_medium),
    normalizeSourceValue(entry.utm_medium),
  ].filter(Boolean);
  const campaignValues = [
    normalizeSourceValue(entry.utm_campaign),
    normalizeSourceValue(entry.utm_content),
    normalizeSourceValue(entry.utm_term),
    ...mediumValues,
  ].filter(Boolean);
  const primarySource = sourceValues[0] || "direct";
  const hasPaidSignal = hasAnyExact(mediumValues, PAID_MEDIUMS);

  if (primarySource === "direct" && sourceValues.length === 1) return "direct";

  if (hasAnyExact(sourceValues, GOOGLE_AD_SOURCES)) return "google_ads";
  if (hasAnyExact(sourceValues, GOOGLE_SOURCES)) {
    return hasPaidSignal ? "google_ads" : "google_organic";
  }

  if (hasAnyExact(sourceValues, META_AD_SOURCES)) return "meta_ads";
  if (hasAnyExact(sourceValues, META_SOURCES) && hasPaidSignal) return "meta_ads";

  if (hasAnyExact(sourceValues, INSTAGRAM_SOURCES)) {
    return hasAnyHint(campaignValues, INSTAGRAM_BIO_HINTS) ? "instagram_bio" : "instagram_organic";
  }

  if (hasAnyExact(sourceValues, TIKTOK_SOURCES)) return "tiktok";
  if (primarySource === "whatsapp") return "whatsapp";
  if (primarySource === "lectum_billing") return "lectum_billing";
  if (primarySource === "lectum_community") return "lectum_community";
  if (primarySource === "lectum_internal") return "lectum_internal";
  if (primarySource === "lectum_profile") return "lectum_profile";

  return "other";
};

export const buildBreakdown = (items: Array<{ id: string; label: string }>, total: number) => {
  const counts = new Map<string, { count: number; label: string }>();

  for (const item of items) {
    const current = counts.get(item.id) ?? { count: 0, label: item.label };
    counts.set(item.id, { ...current, count: current.count + 1 });
  }

  return [...counts.entries()]
    .map<AdminTrafficBreakdownItem>(([id, item]) => ({
      count: item.count,
      id,
      label: item.label,
      percentage: safePercentage(item.count, total),
    }))
    .sort((left, right) => right.count - left.count);
};

export const buildTrafficSources = (stats: TrafficStats) => {
  const entries = entryPageViews(stats);
  const total = entries.length;
  const items = buildBreakdown(
    entries.map((entry) => {
      const channel = classifyTrafficSource(entry);

      return {
        id: channel,
        label: TRAFFIC_SOURCE_LABELS[channel],
      };
    }),
    total,
  ).slice(0, 8);

  return {
    items,
    source: "page_view_event.traffic_source+traffic_medium+utm_*" as const,
    total,
  };
};
