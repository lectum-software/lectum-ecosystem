import type { AdminPublicSource } from "@/api/public-response";
import type { PatientsDashboardOperatingSystem, PatientsDashboardTrend } from "./dashboard";

export type PatientsDetailMetric = {
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
  trend: PatientsDashboardTrend;
  unit: "count";
  value: number;
};

export type PatientsDetailIntentMetric = {
  change_percent: number | null;
  description: string;
  id: "favorites" | "profile_views" | "repeated_profile_views" | "whatsapp_clicks";
  label: string;
  previous_value: number;
  score_contribution: number;
  score_weight: number;
  source: string;
  trend: PatientsDashboardTrend;
  unit: "count";
  value: number;
};

export type PatientsDetailPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "America/Sao_Paulo";
  to: string;
};

export type PatientsDetailSeriesPoint = {
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

export type PatientsDetailActivity = {
  description: string;
  detail_url: string | null;
  id: string;
  occurred_at: string;
  source: AdminPublicSource<
    | "community_member"
    | "community_post"
    | "post_reply"
    | "post_reply_save"
    | "post_save"
    | "post_vote"
    | "professional_review"
  >;
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

export type PatientsDetailCommunity = {
  avatar_url: string | null;
  comments: number;
  color: string | null;
  downvotes?: number;
  engagement_diagnosis?: PatientCommunityEngagementDiagnosis;
  id: string;
  interactions: number;
  is_member: boolean;
  member_since: string | null;
  name: string;
  posts: number;
  saves: number;
  slug: string;
  upvotes?: number;
  votes: number;
};

export type PatientCommunityEngagementDiagnosis = {
  id: "ativo" | "muito_ativo" | "pouco_ativo" | "sem_base";
  label: "Ativo" | "Muito ativo" | "Pouco ativo" | "Sem base";
  source: string;
};

export type PatientsDetailPublicationMetric = {
  available: boolean;
  id: "comments" | "downvotes" | "reports" | "saves" | "shares" | "upvotes" | "views";
  label: string;
  source: string;
  unit: "count";
  unavailable_reason: string | null;
  value: number;
};

export type PatientsDetailPublication = {
  admin_statistics_url: string;
  community: {
    avatar_url: string | null;
    color: string | null;
    id: string;
    name: string;
    slug: string;
  };
  content: string;
  created_at: string;
  excerpt: string;
  id: string;
  metrics: {
    comments: PatientsDetailPublicationMetric;
    downvotes: PatientsDetailPublicationMetric;
    reports: PatientsDetailPublicationMetric;
    saves: PatientsDetailPublicationMetric;
    shares: PatientsDetailPublicationMetric;
    upvotes: PatientsDetailPublicationMetric;
    views: PatientsDetailPublicationMetric;
  };
  public_url: string;
  source: AdminPublicSource<"community_post">;
  title: string;
  type: "post";
  type_label: "Post";
};

export type PatientsDetailHeatmapCell = {
  count: number;
  day: string;
  day_index: number;
  hour: number;
  hour_label: string;
};

export type PatientPlatformUsageHourlyActivityPoint = {
  accesses: number;
  count: number;
  engagement: number;
  hour: number;
  label: string;
  percentage: number;
  posts: number;
  replies: number;
  reviews: number;
  total: number;
};

export type PatientsDetailUnavailable = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type AdminPatientDetail = {
  activities: {
    coverage_note: string;
    items: PatientsDetailActivity[];
    source: AdminPublicSource<"community_activity+professional_review">;
  };
  communities: {
    engagement_diagnosis: PatientCommunityEngagementDiagnosis;
    items: PatientsDetailCommunity[];
    source: AdminPublicSource<"community_member+community_post+post_reply+post_vote+post_save+post_reply_save">;
  };
  coverage_notes: string[];
  header: {
    active: boolean;
    avatar: string | null;
    created_at: string;
    email: string;
    gender: string | null;
    id: string;
    last_access_at: string | null;
    location: {
      captured_at: string;
      city: string | null;
      country: string | null;
      source: string;
      state: string | null;
    } | null;
    name: string;
    onboarding_completed_at: string | null;
    provider: string;
    provider_label: string;
    status: "active" | "inactive";
    status_label: "Ativo" | "Inativo";
  };
  heatmap: {
    available: boolean;
    cells: PatientsDetailHeatmapCell[];
    max_count: number;
    source: AdminPublicSource<"community_post+post_reply+post_vote+post_save+post_reply_save">;
    timezone: "America/Sao_Paulo";
    total_events: number;
    unavailable_reason: string | null;
  };
  intent_analysis: {
    coverage_note: string;
    last_signal_at: string | null;
    level: {
      id: "high" | "low" | "medium" | "no_signals";
      label: "Curioso" | "Frio" | "Interessado" | "Qualificado";
      tone: "cool" | "hot" | "neutral" | "warm";
    };
    max_score: 100;
    metrics: PatientsDetailIntentMetric[];
    privacy_note: string;
    score: number;
    source: AdminPublicSource<"profile_view_event+psychologist_favorite+contact_request">;
    summary: string;
    total_signals: number;
    unique_psychologists_contacted: number;
    unique_psychologists_favorited: number;
    unique_psychologists_viewed: number;
  };
  metrics: PatientsDetailMetric[];
  period: PatientsDetailPeriod;
  platform_usage: {
    access_days_count: number;
    average_duration_seconds: number | null;
    device_usage: {
      items: {
        count: number;
        device_type: "desktop" | "mobile" | "tablet" | "unknown";
        id: "desktop" | "mobile" | "tablet" | "unknown";
        label: string;
        operating_systems: {
          count: number;
          id: PatientsDashboardOperatingSystem;
          label: string;
          operating_system: PatientsDashboardOperatingSystem;
          percentage: number;
        }[];
        percentage: number;
      }[];
      source: AdminPublicSource<"visitor_session.device_type+visitor_session.os+user_id">;
      total_sessions: number;
      unavailable_reason: string | null;
    };
    duration_unavailable_reason: string | null;
    hourly_activity: PatientPlatformUsageHourlyActivityPoint[];
    hourly_activity_by_weekday: {
      day: number;
      hours: PatientPlatformUsageHourlyActivityPoint[];
      label: string;
    }[];
    last_access_at: string | null;
    peak_activity_hours: {
      count: number;
      hour: number;
      label: string;
      percentage: number;
    }[];
    period_from: string;
    period_to: string;
    pwa_installation_recorded: boolean;
    pwa_installed_at: string | null;
    sessions_count: number;
    source: AdminPublicSource<"page_view_event+visitor_session+important_action_event+community_post+post_reply+post_vote+post_save+post_reply_save+community_member+professional_review">;
    top_pages: {
      count: number;
      label: string;
      percentage: number;
    }[];
    unavailable_reason: string | null;
  };
  publications: {
    coverage_note: string;
    items: PatientsDetailPublication[];
    source: AdminPublicSource<"community_post+post_reply+post_vote+post_save+post_share+page_view_event+post_report">;
  };
  privacy: {
    omitted_fields: string[];
    visible_fields: string[];
  };
  series: {
    points: PatientsDetailSeriesPoint[];
    source: AdminPublicSource<"community_post+post_reply+post_vote+post_save+post_reply_save+post_share+post_report+verified_responses">;
  };
  source: AdminPublicSource<"user+patient_profile+community_activity+professional_review">;
  unavailable: PatientsDetailUnavailable[];
};
