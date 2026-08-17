import type { AdminPublicSource } from "@/api/public-response";
import type {
  PsychologistsDashboardConversion,
  PsychologistsDashboardConversionBySignupMethodItem,
  PsychologistsDashboardDailyPoint,
  PsychologistsDashboardDeviceUsage,
  PsychologistsDashboardDirectoryFilters,
  PsychologistsDashboardFilterSearches,
  PsychologistsDashboardMetric,
  PsychologistsDashboardOperatingSystemUsage,
  PsychologistsDashboardPeriod,
  PsychologistsDashboardPlatformUsage,
  PsychologistsDashboardPreSignupConversion,
  PsychologistsDashboardPsychologist,
  PsychologistsDashboardRankingItem,
  PsychologistsDashboardSignupMethod,
  PsychologistsDashboardStatistics,
  PsychologistsDashboardTrafficSources,
  PsychologistsDashboardUnavailableMetric,
} from "./dashboard-core";
import type {
  PsychologistsDashboardPlanSegment,
  PsychologistsDashboardPlanSegmentSummary,
  PsychologistsDashboardProfileConversionActivityMatrixResults,
  PsychologistsDashboardProfileConversionBehaviorResults,
  PsychologistsDashboardProfileConversionEngagementFavoritesMatrixResults,
  PsychologistsDashboardProfileConversionEngagementResults,
  PsychologistsDashboardProfileConversionVisibilityMatrixResults,
  PsychologistsDashboardProfileCrossMatrixResults,
} from "./dashboard-matrices";
import type {
  PsychologistsDashboardProfileActivityResults,
  PsychologistsDashboardProfileConversionGoalResults,
  PsychologistsDashboardProfileConversionResults,
  PsychologistsDashboardProfileCoverageResults,
  PsychologistsDashboardProfileEngagementFavoritesResults,
  PsychologistsDashboardProfileExposureResults,
} from "./dashboard-profile";
import type { AdminPsychologistEngagementMetric, AdminPsychologistStatistics } from "./statistics";

export type AdminPsychologistStatisticsPeriodFilter =
  | "7d"
  | "30d"
  | "90d"
  | "all"
  | "custom"
  | "month"
  | "today"
  | "week"
  | "year";

export type AdminPsychologistStatisticsQuery = {
  community?: string;
  from?: string;
  period?: AdminPsychologistStatisticsPeriodFilter;
  to?: string;
};

export type AdminPsychologistStatisticsPoint = {
  comments_received: number;
  coverage_rate_percent: number;
  date: string;
  downvotes: number;
  favorites: number;
  patient_post_reply_coverage?: number;
  patient_post_text_reply_coverage?: number;
  patient_post_video_reply_coverage?: number;
  profile_views: number;
  replies: number;
  reviews: number;
  saves: number;
  search_results: number;
  shares: number;
  visibility_seconds: number;
  whatsapp_clicks: number;
  upvotes: number;
  posts: number;
};

export type AdminPsychologistVisibilityPoint = {
  community_content_seconds: number;
  date: string;
  presentation_video_seconds: number;
  profile_seconds: number;
  total_seconds: number;
};

export type AdminPsychologistVisibilityCounter = {
  id:
    | "content_views"
    | "presentation_video_explore_views"
    | "profile_opens"
    | "search_result_views";
  label: string;
  source: string;
  value: number;
};

export type AdminPsychologistPublicationMetric = AdminPsychologistEngagementMetric;

export type AdminPsychologistPublicationItem = {
  community: {
    avatar_url: string | null;
    color: string | null;
    id: string;
    name: string;
    slug: string;
  };
  created_at: string;
  excerpt: string;
  id: string;
  media: {
    type: string | null;
    url: string | null;
  } | null;
  metrics: {
    comments: AdminPsychologistPublicationMetric;
    downvotes: AdminPsychologistPublicationMetric;
    reports: AdminPsychologistPublicationMetric;
    saves: AdminPsychologistPublicationMetric;
    shares: AdminPsychologistPublicationMetric;
    upvotes: AdminPsychologistPublicationMetric;
    views: AdminPsychologistPublicationMetric;
    whatsapp_clicks: AdminPsychologistPublicationMetric;
  };
  public_url: string;
  source: AdminPublicSource<"community_post" | "post_reply">;
  title: string;
  type: "post" | "reply";
};

export type AdminPsychologistPublicationsQuery = {
  community?: string;
  from?: string;
  limit?: number;
  page?: number;
  period?: AdminPsychologistStatisticsPeriodFilter;
  q?: string;
  sort?: "engagement" | "oldest" | "recent";
  to?: string;
  type?: "all" | "post" | "reply";
};

export type AdminPsychologistPublications = {
  active_filters_count: number;
  count: number;
  data: AdminPsychologistPublicationItem[];
  filters: {
    communities: { id: string; label: string; slug: string }[];
    types: { id: "all" | "post" | "reply"; label: string }[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: AdminPsychologistStatistics["period"];
  source: AdminPublicSource<"community_post+post_reply+post_vote+post_save+post_reply_save+post_share+page_view_event+important_action_event+post_report">;
  totals: {
    cards: AdminPsychologistEngagementMetric[];
  };
  unavailable: AdminPsychologistEngagementMetric[];
};

export type AdminPsychologistReviewsQuery = {
  limit?: number;
  page?: number;
  rating?: number;
  status?: string;
};

export type AdminPsychologistReviewItem = {
  author: {
    avatar: string | null;
    id: string;
    name: string;
    role: string;
  };
  comment: string | null;
  created_at: string;
  id: string;
  rating: number;
  response: string | null;
  responded_at: string | null;
  status: string;
  status_label: string;
};

export type AdminPsychologistReviews = {
  access: {
    mode: "read_only";
    restrictions: string[];
  };
  active_filters_count: number;
  count: number;
  data: AdminPsychologistReviewItem[];
  filters: {
    ratings: { count: number; id: string; label: string }[];
    statuses: { count: number; id: string; label: string }[];
  };
  page: number;
  pages: number;
  per_page: number;
  source: AdminPublicSource<"professional_review">;
  summary: {
    distribution: { count: number; percentage: number; rating: 1 | 2 | 3 | 4 | 5 }[];
    rating_avg: number;
    rating_count: number;
    statuses: { count: number; id: string; label: string }[];
  };
};

export type AdminPsychologistReportsStatusGroup = "dismissed" | "pending" | "upheld";

export type AdminPsychologistReportsQuery = {
  from?: string;
  limit?: number;
  page?: number;
  status?: "all" | AdminPsychologistReportsStatusGroup;
  to?: string;
  type?: "all" | "post" | "reply";
};

export type AdminPsychologistReportItem = {
  content: {
    author: {
      avatar: string | null;
      id: string;
      name: string;
      role: string;
      role_label: string;
    };
    available: boolean;
    body: string;
    community: {
      id: string;
      name: string;
      slug: string;
    };
    created_at: string;
    excerpt: string;
    id: string;
    media: {
      media_type: string;
      media_url: string;
    } | null;
    public_url: string | null;
    title: string;
    type: "post" | "reply";
    unavailable_reason: string | null;
  };
  capabilities: {
    can_review_resolution: boolean;
    can_remove_content: boolean;
    can_resolve_dismissed: boolean;
    can_resolve_upheld: boolean;
  };
  created_at: string;
  description: string | null;
  id: string;
  moderation: {
    status: string;
    status_label: string;
  };
  reason: string;
  reason_label: string;
  reported_by: {
    label: string;
    name: string;
    role: string;
  };
  status: string;
  status_group: AdminPsychologistReportsStatusGroup;
  status_label: string;
};

export type AdminPsychologistReports = {
  access: {
    mode: "moderation";
    restrictions: string[];
  };
  active_filters_count: number;
  cards: {
    id: "dismissed" | "pending" | "total" | "upheld";
    label: string;
    source: AdminPublicSource<"post_report">;
    value: number;
  }[];
  count: number;
  data: AdminPsychologistReportItem[];
  filters: {
    statuses: {
      count: number;
      id: "all" | AdminPsychologistReportsStatusGroup;
      label: string;
    }[];
    types: { count: number; id: "all" | "post" | "reply"; label: string }[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: AdminPsychologistStatistics["period"];
  source: AdminPublicSource<"post_report+community_post+post_reply">;
  unavailable: { description: string; id: string; label: string; source: string }[];
};

export type AdminPsychologistReportResolveInput = {
  confirmation: string;
  measure?: "none" | "remove_content";
  reason: string;
  resolution: "dismissed" | "pending" | "upheld";
};

export type AdminPsychologistReportActionResponse = {
  affected_reports_count: number;
  content_already_unavailable: boolean;
  content_removed: boolean;
  report: AdminPsychologistReportItem;
  source: AdminPublicSource<"post_report+admin_activity_log">;
};

export type AdminPsychologistActivitiesQuery = {
  area?: string;
  from?: string;
  limit?: number;
  page?: number;
  q?: string;
  to?: string;
  type?: string;
};

export type AdminPsychologistActivityItem = {
  actor: {
    id: string;
    name: string;
    role: string;
  } | null;
  area: {
    id: string;
    label: string;
  };
  description: string;
  detail_url: string | null;
  id: string;
  occurred_at: string;
  source: string;
  type: {
    id: string;
    label: string;
  };
};

export type AdminPsychologistActivities = {
  active_filters_count: number;
  count: number;
  coverage_note: string;
  data: AdminPsychologistActivityItem[];
  export: {
    available: false;
    reason: string;
  };
  filters: {
    areas: { count: number; id: string; label: string }[];
    types: { count: number; id: string; label: string }[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: {
    from: string | null;
    label: string;
    max_days: number | null;
    timezone: "server-local";
    to: string | null;
  };
  source: AdminPublicSource<"user+psychologist_profile+professional_subscription+community_post+post_reply+post_save+post_reply_save+contact_request+professional_review+post_report+admin_activity_log">;
  unavailable: { description: string; id: string; label: string; source: string }[];
};

export type AdminPsychologistsDashboard = {
  cards: {
    churn: PsychologistsDashboardMetric;
    courtesy_psychologists: PsychologistsDashboardMetric;
    deleted_accounts: PsychologistsDashboardMetric;
    free_psychologists: PsychologistsDashboardMetric;
    new_signups: PsychologistsDashboardMetric;
    subscriber_psychologists: PsychologistsDashboardMetric;
    total_psychologists: PsychologistsDashboardMetric;
  };
  conversion: PsychologistsDashboardConversion;
  conversion_by_signup_method: PsychologistsDashboardConversionBySignupMethodItem[];
  device_usage: PsychologistsDashboardDeviceUsage;
  filters_searches: PsychologistsDashboardFilterSearches;
  pre_signup_conversion: PsychologistsDashboardPreSignupConversion;
  directory_filters: PsychologistsDashboardDirectoryFilters;
  operating_system_usage: PsychologistsDashboardOperatingSystemUsage;
  plan_segments: Record<
    PsychologistsDashboardPlanSegment,
    PsychologistsDashboardPlanSegmentSummary
  >;
  period: PsychologistsDashboardPeriod;
  platform_usage: PsychologistsDashboardPlatformUsage;
  psychologists: {
    items: PsychologistsDashboardPsychologist[];
    source: AdminPublicSource<"user+psychologist_profile+professional_subscription">;
    total: number;
  };
  ranking: {
    formula: "public_directory_psychologist_ranking";
    items: PsychologistsDashboardRankingItem[];
    source: AdminPublicSource<"shared_psychologist_public_ranking_helper">;
    total: number;
  };
  signup_method: PsychologistsDashboardSignupMethod;
  statistics: PsychologistsDashboardStatistics;
  timeline: {
    points: PsychologistsDashboardDailyPoint[];
    source: AdminPublicSource<"user+professional_subscription+user.deletedAt">;
  };
  profile_activity: PsychologistsDashboardProfileActivityResults;
  profile_coverage: PsychologistsDashboardProfileCoverageResults;
  profile_conversion_activity: PsychologistsDashboardProfileConversionActivityMatrixResults;
  profile_conversion_behavior: PsychologistsDashboardProfileConversionBehaviorResults;
  profile_conversion_goal: PsychologistsDashboardProfileConversionGoalResults;
  profile_cross_matrix: PsychologistsDashboardProfileCrossMatrixResults;
  profile_conversion: PsychologistsDashboardProfileConversionResults;
  profile_engagement_favorites: PsychologistsDashboardProfileEngagementFavoritesResults;
  profile_conversion_engagement: PsychologistsDashboardProfileConversionEngagementResults;
  profile_conversion_engagement_favorites: PsychologistsDashboardProfileConversionEngagementFavoritesMatrixResults;
  profile_conversion_visibility: PsychologistsDashboardProfileConversionVisibilityMatrixResults;
  profile_exposure: PsychologistsDashboardProfileExposureResults;
  traffic_sources: PsychologistsDashboardTrafficSources;
  unavailable: PsychologistsDashboardUnavailableMetric[];
};
