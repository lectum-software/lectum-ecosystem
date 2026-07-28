import type { Request } from "express";
import type { AdminCommunityEngagementDiagnosis } from "@/utils/admin-community-engagement-diagnosis";

export type AdminPatientDetailQuery = {
  from?: string;
  period?: "7d" | "30d" | "90d" | "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type AdminPatientDetailDateRange = {
  end: Date;
  start: Date;
};

export type AdminPatientDetailPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "America/Sao_Paulo";
  to: string;
};

export type AdminPatientDetailTrend = "down" | "flat" | "unavailable" | "up";

export type AdminPatientDetailMetric = {
  change_percent: number | null;
  description: string;
  id:
    | "comments_created"
    | "downvotes_received"
    | "posts_created"
    | "reports_received"
    | "saves_received"
    | "shares_received"
    | "verified_psychologist_responses"
    | "upvotes_received";
  label: string;
  previous_value: number;
  source: string;
  trend: AdminPatientDetailTrend;
  unit: "count";
  value: number;
};

export type AdminPatientIntentMetric = {
  change_percent: number | null;
  description: string;
  id: "favorites" | "profile_views" | "repeated_profile_views" | "whatsapp_clicks";
  label: string;
  previous_value: number;
  score_contribution: number;
  score_weight: number;
  source: string;
  trend: AdminPatientDetailTrend;
  unit: "count";
  value: number;
};

export type AdminPatientIntentAnalysis = {
  coverage_note: string;
  last_signal_at: Date | null;
  level: {
    id: "high" | "low" | "medium" | "no_signals";
    label: "Curioso" | "Frio" | "Interessado" | "Qualificado";
    tone: "cool" | "hot" | "neutral" | "warm";
  };
  max_score: 100;
  metrics: AdminPatientIntentMetric[];
  privacy_note: string;
  score: number;
  source: "profile_view_event+psychologist_favorite+contact_request";
  summary: string;
  total_signals: number;
  unique_psychologists_contacted: number;
  unique_psychologists_favorited: number;
  unique_psychologists_viewed: number;
};

export type AdminPatientDetailSeriesPoint = {
  comments_created: number;
  date: string;
  downvotes_received: number;
  posts_created: number;
  reports_received: number;
  saves_received: number;
  shares_received: number;
  verified_psychologist_responses: number;
  upvotes_received: number;
};

export type AdminPatientDetailActivityItem = {
  description: string;
  detail_url: string | null;
  id: string;
  occurred_at: Date;
  source:
    | "community_member"
    | "community_post"
    | "post_reply"
    | "post_reply_save"
    | "post_save"
    | "post_vote"
    | "professional_review";
  title: string;
  type:
    | "community_joined"
    | "post_created"
    | "post_reply_created"
    | "post_reply_saved"
    | "post_saved"
    | "post_vote"
    | "professional_review_created";
};

export type AdminPatientDetailCommunity = {
  avatar_url: string | null;
  comments: number;
  color: string | null;
  downvotes: number;
  engagement_diagnosis: AdminCommunityEngagementDiagnosis;
  id: string;
  interactions: number;
  is_member: boolean;
  member_since: Date | null;
  name: string;
  posts: number;
  saves: number;
  slug: string;
  upvotes: number;
  votes: number;
};

export type AdminPatientDetailPublicationMetric = {
  available: boolean;
  id: "comments" | "downvotes" | "reports" | "saves" | "shares" | "upvotes" | "views";
  label: string;
  source: string;
  unit: "count";
  unavailable_reason: string | null;
  value: number;
};

export type AdminPatientDetailPublicationItem = {
  admin_statistics_url: string;
  community: {
    avatar_url: string | null;
    color: string | null;
    id: string;
    name: string;
    slug: string;
  };
  content: string;
  created_at: Date;
  excerpt: string;
  id: string;
  metrics: {
    comments: AdminPatientDetailPublicationMetric;
    downvotes: AdminPatientDetailPublicationMetric;
    reports: AdminPatientDetailPublicationMetric;
    saves: AdminPatientDetailPublicationMetric;
    shares: AdminPatientDetailPublicationMetric;
    upvotes: AdminPatientDetailPublicationMetric;
    views: AdminPatientDetailPublicationMetric;
  };
  public_url: string;
  source: "community_post";
  title: string;
  type: "post";
  type_label: "Post";
};

export type AdminPatientDetailHeatmapCell = {
  count: number;
  day: string;
  day_index: number;
  hour: number;
  hour_label: string;
};

export type AdminPatientPlatformUsageTopPage = {
  count: number;
  label: string;
  percentage: number;
};

export type AdminPatientPlatformDeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export type AdminPatientPlatformOperatingSystem =
  | "android"
  | "ios"
  | "ipados"
  | "macos"
  | "other"
  | "unknown"
  | "windows";

export type AdminPatientPlatformUsageOperatingSystemItem = {
  count: number;
  id: AdminPatientPlatformOperatingSystem;
  label: string;
  operating_system: AdminPatientPlatformOperatingSystem;
  percentage: number;
};

export type AdminPatientPlatformUsageDeviceItem = {
  count: number;
  device_type: AdminPatientPlatformDeviceType;
  id: AdminPatientPlatformDeviceType;
  label: string;
  operating_systems: AdminPatientPlatformUsageOperatingSystemItem[];
  percentage: number;
};

export type AdminPatientPlatformUsageDeviceUsage = {
  items: AdminPatientPlatformUsageDeviceItem[];
  source: "visitor_session.device_type+visitor_session.os+user_id";
  total_sessions: number;
  unavailable_reason: string | null;
};

export type AdminPatientPlatformUsagePeakActivityHour = {
  count: number;
  hour: number;
  label: string;
  percentage: number;
};

export type AdminPatientPlatformUsageHourlyActivityPoint =
  AdminPatientPlatformUsagePeakActivityHour & {
    accesses: number;
    engagement: number;
    posts: number;
    replies: number;
    reviews: number;
    total: number;
  };

export type AdminPatientPlatformUsageWeekdayHourlyActivity = {
  day: number;
  hours: AdminPatientPlatformUsageHourlyActivityPoint[];
  label: string;
};

export type AdminPatientPlatformUsage = {
  access_days_count: number;
  average_duration_seconds: number | null;
  device_usage: AdminPatientPlatformUsageDeviceUsage;
  duration_unavailable_reason: string | null;
  hourly_activity: AdminPatientPlatformUsageHourlyActivityPoint[];
  hourly_activity_by_weekday: AdminPatientPlatformUsageWeekdayHourlyActivity[];
  last_access_at: Date | null;
  peak_activity_hours: AdminPatientPlatformUsagePeakActivityHour[];
  period_from: string;
  period_to: string;
  pwa_installation_recorded: boolean;
  pwa_installed_at: Date | null;
  sessions_count: number;
  source: "page_view_event+visitor_session+important_action_event+community_post+post_reply+post_vote+post_save+post_reply_save+community_member+professional_review";
  top_pages: AdminPatientPlatformUsageTopPage[];
  unavailable_reason: string | null;
};

export type AdminPatientDetailUnavailable = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type AdminPatientDetailDTO = {
  activities: {
    coverage_note: string;
    items: AdminPatientDetailActivityItem[];
    source: "community_activity+professional_review";
  };
  communities: {
    engagement_diagnosis: AdminCommunityEngagementDiagnosis;
    items: AdminPatientDetailCommunity[];
    source: "community_member+community_post+post_reply+post_vote+post_save+post_reply_save";
  };
  coverage_notes: string[];
  header: {
    active: boolean;
    avatar: string | null;
    created_at: Date;
    email: string;
    gender: string | null;
    id: string;
    last_access_at: Date | null;
    location: {
      captured_at: Date;
      city: string | null;
      country: string | null;
      source: string;
      state: string | null;
    } | null;
    name: string;
    onboarding_completed_at: Date | null;
    provider: string;
    provider_label: string;
    status: "active" | "inactive";
    status_label: "Ativo" | "Inativo";
  };
  heatmap: {
    available: boolean;
    cells: AdminPatientDetailHeatmapCell[];
    max_count: number;
    source: "community_post+post_reply+post_vote+post_save+post_reply_save";
    timezone: "America/Sao_Paulo";
    total_events: number;
    unavailable_reason: string | null;
  };
  intent_analysis: AdminPatientIntentAnalysis;
  metrics: AdminPatientDetailMetric[];
  period: AdminPatientDetailPeriod;
  platform_usage: AdminPatientPlatformUsage;
  publications: {
    coverage_note: string;
    items: AdminPatientDetailPublicationItem[];
    source: "community_post+post_reply+post_vote+post_save+post_share+page_view_event+post_report";
  };
  privacy: {
    omitted_fields: string[];
    visible_fields: string[];
  };
  series: {
    points: AdminPatientDetailSeriesPoint[];
    source: "community_post+post_reply+post_vote+post_save+post_reply_save+post_share+post_report+verified_responses";
  };
  source: "user+patient_profile+visitor_location+community_activity+professional_review";
  unavailable: AdminPatientDetailUnavailable[];
};

export type IAdminPatientDetailDTO = Request & {
  p: {
    id: string;
  };
  q: AdminPatientDetailQuery;
};
