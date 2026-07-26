import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type TrafficSummaryQuery = {
  from?: string;
  to?: string;
};

export type TrafficTrend = "down" | "flat" | "unavailable" | "up";

export type TrafficMetricUnit = "count" | "decimal" | "percentage" | "seconds";

export type TrafficMetric = {
  change_percent: number | null;
  description: string;
  id: string;
  label: string;
  previous_value: number;
  source: string;
  trend: TrafficTrend;
  unit: TrafficMetricUnit;
  unavailable: boolean;
  unavailable_reason?: string;
  value: number;
};

export type TrafficBreakdownItem = {
  count: number;
  id: string;
  label: string;
  percentage: number;
};

export type TrafficDeviceItem = TrafficBreakdownItem & {
  device_type: "desktop" | "mobile" | "pwa" | "tablet" | "unknown";
};

export type TrafficUserTypeItem = TrafficBreakdownItem & {
  user_type: "anonymous" | "patients" | "psychologists";
};

export type TrafficLocationItem = {
  count: number;
  id: string;
  label: string;
  percentage: number;
};

export type TrafficEntryPage = {
  count: number;
  label: string;
  path: string;
  percentage: number;
};

export type TrafficRankingItem = {
  count: number;
  id: string;
  label: string;
  path: string | null;
  percentage: number;
  sessions: number;
};

export type TrafficUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type TrafficTimelinePoint = {
  date: string;
  new_visitors: number;
  recurring_visitors: number;
  sessions: number;
  unique_visitors: number;
};

export type TrafficPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type AdminTrafficSummary = {
  conversions: {
    items: TrafficMetric[];
    source: "domain_events";
  };
  devices: {
    items: TrafficDeviceItem[];
    source: "visitor_session.device_type+page_view_event.display_mode";
    total: number;
  };
  entry_pages: {
    items: TrafficEntryPage[];
    source: "page_view_event.is_entry";
    total: number;
  };
  locations: {
    cities: TrafficLocationItem[];
    countries: TrafficLocationItem[];
    source: "visitor_location";
    states: TrafficLocationItem[];
    total: number;
  };
  overview_cards: TrafficMetric[];
  period: TrafficPeriod;
  quality: {
    items: TrafficMetric[];
    source: "page_view_event+important_action_event+visitor_session";
  };
  top_communities: {
    items: TrafficRankingItem[];
    source: "page_view_event.target_type=community";
    total: number;
  };
  top_psychologists: {
    items: TrafficRankingItem[];
    source: "page_view_event.target_type=psychologist";
    total: number;
  };
  timeline: {
    points: TrafficTimelinePoint[];
    source: "visitor_session+page_view_event+important_action_event";
  };
  traffic_sources: {
    items: TrafficBreakdownItem[];
    source: "page_view_event.traffic_source+traffic_medium+utm_*";
    total: number;
  };
  unavailable: TrafficUnavailableMetric[];
  user_types: {
    items: TrafficUserTypeItem[];
    source: "visitor_session.user.role";
    total: number;
  };
};

const cleanParams = (input: TrafficSummaryQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.to ? { to: input.to } : {}),
});

const resolveFilename = (header?: string) => {
  if (!header) return null;

  const filenameMatch = header.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] ?? null;
};

export const getAdminTrafficSummary = async (input: TrafficSummaryQuery) => {
  const response = await adminApi.get<ApiResponse<AdminTrafficSummary>>(
    "/api/admin/private/traffic/summary",
    {
      params: cleanParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const exportAdminTrafficSummary = async (input: TrafficSummaryQuery) => {
  const response = await adminApi.get<Blob>("/api/admin/private/traffic/export", {
    params: cleanParams(input),
    responseType: "blob",
  });
  const filename =
    resolveFilename(response.headers["content-disposition"]) ||
    `lectum-admin-trafego-${input.from || "default"}-${input.to || "default"}.csv`;

  return {
    blob: response.data,
    filename,
  };
};
