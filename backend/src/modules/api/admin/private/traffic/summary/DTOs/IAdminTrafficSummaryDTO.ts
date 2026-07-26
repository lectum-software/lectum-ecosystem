import type { Request } from "express";

export type AdminTrafficQuery = {
  from?: string;
  to?: string;
};

export type AdminTrafficDateRange = {
  end: Date;
  start: Date;
};

export type AdminTrafficPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type AdminTrafficTrend = "down" | "flat" | "unavailable" | "up";

export type AdminTrafficMetricUnit = "count" | "decimal" | "percentage" | "seconds";

export type AdminTrafficMetric = {
  change_percent: number | null;
  description: string;
  id: string;
  label: string;
  previous_value: number;
  source: string;
  trend: AdminTrafficTrend;
  unit: AdminTrafficMetricUnit;
  unavailable: boolean;
  unavailable_reason?: string;
  value: number;
};

export type AdminTrafficBreakdownItem = {
  count: number;
  id: string;
  label: string;
  percentage: number;
};

export type AdminTrafficDeviceType = "desktop" | "mobile" | "pwa" | "tablet" | "unknown";

export type AdminTrafficDeviceItem = AdminTrafficBreakdownItem & {
  device_type: AdminTrafficDeviceType;
};

export type AdminTrafficUserType = "anonymous" | "patients" | "psychologists";

export type AdminTrafficUserTypeItem = AdminTrafficBreakdownItem & {
  user_type: AdminTrafficUserType;
};

export type AdminTrafficLocationItem = {
  count: number;
  id: string;
  label: string;
  percentage: number;
};

export type AdminTrafficLocations = {
  cities: AdminTrafficLocationItem[];
  countries: AdminTrafficLocationItem[];
  source: "visitor_location";
  states: AdminTrafficLocationItem[];
  total: number;
};

export type AdminTrafficEntryPage = {
  count: number;
  label: string;
  path: string;
  percentage: number;
};

export type AdminTrafficConversion = AdminTrafficMetric;
export type AdminTrafficQualityMetric = AdminTrafficMetric;

export type AdminTrafficRankingItem = {
  count: number;
  id: string;
  label: string;
  path: string | null;
  percentage: number;
  sessions: number;
};

export type AdminTrafficUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type AdminTrafficTimelinePoint = {
  date: string;
  new_visitors: number;
  recurring_visitors: number;
  sessions: number;
  unique_visitors: number;
};

export type AdminTrafficSummary = {
  conversions: {
    items: AdminTrafficConversion[];
    source: "domain_events";
  };
  devices: {
    items: AdminTrafficDeviceItem[];
    source: "visitor_session.device_type+page_view_event.display_mode";
    total: number;
  };
  entry_pages: {
    items: AdminTrafficEntryPage[];
    source: "page_view_event.is_entry";
    total: number;
  };
  locations: AdminTrafficLocations;
  overview_cards: AdminTrafficMetric[];
  period: AdminTrafficPeriod;
  quality: {
    items: AdminTrafficQualityMetric[];
    source: "page_view_event+important_action_event+visitor_session";
  };
  top_communities: {
    items: AdminTrafficRankingItem[];
    source: "page_view_event.target_type=community";
    total: number;
  };
  top_psychologists: {
    items: AdminTrafficRankingItem[];
    source: "page_view_event.target_type=psychologist";
    total: number;
  };
  timeline: {
    points: AdminTrafficTimelinePoint[];
    source: "visitor_session+page_view_event+important_action_event";
  };
  traffic_sources: {
    items: AdminTrafficBreakdownItem[];
    source: "page_view_event.traffic_source+traffic_medium+utm_*";
    total: number;
  };
  unavailable: AdminTrafficUnavailableMetric[];
  user_types: {
    items: AdminTrafficUserTypeItem[];
    source: "visitor_session.user.role";
    total: number;
  };
};

export type IAdminTrafficSummaryDTO = Request & {
  q: AdminTrafficQuery;
};
