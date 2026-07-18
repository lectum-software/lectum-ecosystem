import { adminApi } from "@/api/client";
import { resolveApiData } from "@/api/handle";
import type { ApiResponse } from "@/api/types";

export type CommunitiesDashboardMetric = {
  change_percent: number | null;
  description: string;
  id: string;
  label: string;
  previous_value: number;
  source: string;
  trend: "down" | "flat" | "unavailable" | "up";
  unit: "count";
  unavailable: boolean;
  unavailable_reason?: string;
  value: number;
};

export type CommunitiesDashboardQuery = {
  from?: string;
  period?: "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type CommunitiesDashboardPeriod = {
  days: number;
  from: string;
  label: string;
  max_days: number;
  previous_from: string;
  previous_to: string;
  timezone: "server-local";
  to: string;
};

export type CommunitiesDashboardDailyPoint = {
  date: string;
  value: number;
};

export type CommunitiesDashboardActivitySeries = {
  color: string;
  id: string;
  label: string;
  points: CommunitiesDashboardDailyPoint[];
  source: string;
};

export type CommunitiesDashboardSeverity = "alta" | "baixa" | "media";

export type CommunitiesDashboardPriorityAlert = {
  community_name: string | null;
  community_slug: string | null;
  created_at: string;
  description: string | null;
  id: string;
  reason: string;
  reporter_role: string | null;
  severity: CommunitiesDashboardSeverity;
  status: string;
  target_id: string;
  target_title: string;
  target_type: string;
};

export type CommunitiesDashboardModerationAlert = {
  categories: string[];
  community_name: string | null;
  community_slug: string | null;
  content_excerpt: string;
  created_at: string;
  decision: string;
  id: string;
  reason_code: string;
  severity: string;
  status: string;
  target_id: string | null;
  target_type: string;
};

export type CommunitiesDashboardPostAuthor = AdminCommunityContentAuthor;

export type CommunitiesDashboardRecentPost = {
  anonymous: boolean;
  author: CommunitiesDashboardPostAuthor;
  author_name: string;
  author_role: string;
  comments_count: number;
  community_id: string;
  community_name: string;
  community_slug: string;
  created_at: string;
  discussion_status: "iniciada" | "nao_iniciada";
  id: string;
  title: string;
  views_count: number;
};

export type CommunitiesDashboardPopularPost = CommunitiesDashboardRecentPost & {
  engagement_score: number;
  saves_count: number;
  upvotes_count: number;
};

export type CommunitiesDashboardTopCommunity = {
  activity_count: number;
  id: string;
  members_count: number;
  name: string;
  posts_count: number;
  slug: string;
  visual_primary_color: string | null;
};

export type CommunitiesDashboardUnavailableMetric = {
  description: string;
  id: string;
  label: string;
  source: string;
};

export type CommunitiesDashboardStatisticsSplit = {
  id: string;
  label: string;
  source: string;
  value: number;
};

export type CommunitiesDashboardStatisticsDailyPoint = {
  active_patients: number;
  active_psychologists: number;
  active_users: number;
  anonymous_posts: number;
  date: string;
  downvotes: number;
  followers_patients: number;
  followers_psychologists: number;
  profile_accesses: number;
  new_active_patients: number;
  new_active_psychologists: number;
  new_active_users: number;
  patient_comments: number;
  patient_posts: number;
  posts: number;
  psychologist_posts: number;
  replies: number;
  reports: number;
  saves: number;
  unverified_psychologist_replies: number;
  upvotes: number;
  verified_psychologist_replies: number;
  whatsapp_clicks: number;
};

export type CommunitiesDashboardGlobalStatistics = {
  charts: {
    active_users_split: CommunitiesDashboardStatisticsSplit[];
    daily: CommunitiesDashboardStatisticsDailyPoint[];
    followers_split: CommunitiesDashboardStatisticsSplit[];
    posts_by_author: CommunitiesDashboardStatisticsSplit[];
    replies_by_author: CommunitiesDashboardStatisticsSplit[];
  };
  counters: {
    active_users: {
      patients: number;
      psychologists: number;
      source: "community_member+community_post+post_reply+page_view_event";
      total: number;
    };
    anonymous_posts: {
      source: "community_post.anonymous";
      total: number;
    };
    content_engagement: {
      downvotes: number;
      profile_accesses: number;
      saves: number;
      source: "post_vote+post_save+post_reply_save+important_action_event+page_view_event";
      upvotes: number;
      whatsapp_clicks: number;
    };
    followers: {
      patients: number;
      psychologists: number;
      source: "community_member";
      total: number;
    };
    new_active_users: {
      patients: number;
      psychologists: number;
      source: "first_activity:community_member+community_post+post_reply+page_view_event";
      total: number;
    };
    posts: {
      patients: number;
      patient_posts_answered_by_verified_psychologists: number;
      psychologists: number;
      source: "community_post+post_reply";
      total: number;
      unverified_psychologists: number;
      verified_psychologists: number;
    };
    replies: {
      patient_comments: number;
      source: "post_reply";
      total: number;
      unverified_psychologists: number;
      verified_psychologists: number;
    };
    reports: {
      source: "post_report";
      total: number;
    };
  };
  period: {
    days: number;
    from: string;
    label: string;
    max_days: number;
    timezone: "server-local";
    to: string;
  };
  source: "community_member+community_post+post_reply+post_report+post_vote+post_save+post_reply_save+page_view_event+important_action_event";
};

export type AdminCommunitiesDashboard = {
  activity_series: CommunitiesDashboardActivitySeries[];
  cards: {
    active_members: CommunitiesDashboardMetric;
    patient_comments: CommunitiesDashboardMetric;
    patient_posts: CommunitiesDashboardMetric;
    psychologist_posts: CommunitiesDashboardMetric;
    psychologist_replies: CommunitiesDashboardMetric;
  };
  global_statistics: {
    current: CommunitiesDashboardGlobalStatistics;
    previous: CommunitiesDashboardGlobalStatistics;
  };
  patient_posts_breakdown: {
    anonymous: { count: number; percentage: number };
    identified: { count: number; percentage: number };
    source: "community_post.anonymous";
    total: number;
  };
  period: CommunitiesDashboardPeriod;
  priority_alerts: {
    items: CommunitiesDashboardPriorityAlert[];
    source: "post_report.status=pendente";
    total: number;
  };
  moderation_alerts: {
    items: CommunitiesDashboardModerationAlert[];
    source: "content_moderation_event.status=pending|reviewing";
    total: number;
    urgent_total: number;
  };
  recent_posts: {
    items: CommunitiesDashboardRecentPost[];
    source: "community_post+page_view_event";
    total: number;
  };
  popular_posts: {
    items: CommunitiesDashboardPopularPost[];
    source: "community_post+post_reply+post_vote+post_save+page_view_event";
    total: number;
  };
  top_communities: {
    items: CommunitiesDashboardTopCommunity[];
    source: "community+community_member+community_post+post_reply+post_vote+post_save";
    total: number;
  };
  unavailable: CommunitiesDashboardUnavailableMetric[];
};

export type AdminCommunityIdentity = {
  active: boolean;
  avatar_url: string | null;
  category: string | null;
  created_at: string;
  deactivated_at: string | null;
  description: string | null;
  id: string;
  members_count: number;
  name: string;
  slug: string;
  visual_gradient_color: string | null;
  visual_primary_color: string | null;
  visual_primary_dark_color: string | null;
  visual_soft_color: string | null;
  visual_text_color: string | null;
};

export type AdminCommunityRule = {
  active: boolean;
  created_at: string;
  description: string;
  id: string;
  position: number;
  title: string;
  updated_at: string;
};

export type AdminCommunitySummary = {
  comments_count: number;
  members_count: number;
  popular_posts_count: number;
  posts_count: number;
};

export type AdminCommunityHighlightCounters = {
  patient_comments_count: number;
  patient_posts_count: number;
  psychologist_posts_count: number;
  psychologist_replies_count: number;
  reports_count: number;
  source: "community_post+post_reply+post_report";
};

export type AdminCommunityTodaySummary = {
  new_active_patients_count: number;
  new_active_psychologists_count: number;
  new_patient_followers_count: number;
  new_psychologist_followers_count: number;
  patient_comments_count: number;
  patient_posts_count: number;
  period: {
    date: string;
    from: string;
    label: string;
    timezone: "server-local";
    to: string;
  };
  psychologist_posts_count: number;
  source: "community_member+community_post+post_reply+page_view_event";
  unverified_psychologist_replies_count: number;
  verified_psychologist_replies_count: number;
};

export type AdminCommunityUrgentPendingReport = {
  content: {
    author: {
      name: string;
      role_label: string;
    } | null;
    available: boolean;
    content_kind_label: string;
    excerpt: string;
    id: string;
    title: string | null;
    type: "comment" | "post";
    unavailable_reason: string | null;
  };
  created_at: string;
  id: string;
  reason_label: string;
  reporter: {
    label: string;
    name: string;
    role: string;
  };
  status_label: string;
};

export type AdminCommunityUrgentSummary = {
  pending_reports_count: number;
  pending_reports_last_reported_at: string | null;
  pending_reports: AdminCommunityUrgentPendingReport[];
  source: "post_report";
};

export type AdminCommunityPerformanceMetric = {
  change_percent: number | null;
  label: string;
  trend: "down" | "flat" | "unavailable" | "up";
  value: number;
};

export type AdminCommunityPerformancePoint = {
  comments: number;
  date: string;
  members: number;
  posts: number;
  reports: number;
};

export type AdminCommunityTopMentor = {
  avatar: string | null;
  crp: string | null;
  id: string;
  name: string;
  position: number;
  rating_avg: number;
  replies_count: number;
  score: number;
  upvotes_count: number;
  verified: boolean;
};

export type AdminCommunityContentAuthor = {
  anonymous: boolean;
  avatar: string | null;
  gender: string | null;
  id: string;
  name: string;
  role: string;
  verified: boolean;
};

export type AdminCommunityPopularPost = {
  author: AdminCommunityContentAuthor;
  author_name: string;
  author_role: string;
  comments_count: number;
  created_at: string;
  id: string;
  saves_count: number;
  title: string;
  upvotes_count: number;
};

export type AdminCommunityDetail = {
  community: AdminCommunityIdentity;
  highlight_counters: AdminCommunityHighlightCounters;
  performance: {
    days: number;
    metrics: {
      comments: AdminCommunityPerformanceMetric;
      new_members: AdminCommunityPerformanceMetric;
      new_posts: AdminCommunityPerformanceMetric;
      reports: AdminCommunityPerformanceMetric;
    };
    points: AdminCommunityPerformancePoint[];
  };
  popular_posts: AdminCommunityPopularPost[];
  rules: AdminCommunityRule[];
  summary: AdminCommunitySummary;
  today_summary: AdminCommunityTodaySummary;
  top_mentors: AdminCommunityTopMentor[];
  urgent_summary: AdminCommunityUrgentSummary;
};

export type AdminCommunityPaginationQuery = {
  limit?: number;
  page?: number;
  q?: string;
};

export type AdminCommunitiesListSort = "activity" | "members" | "name" | "posts" | "recent";

export type AdminCommunitiesListQuery = AdminCommunityPaginationQuery & {
  category?: string;
  sort?: AdminCommunitiesListSort;
};

export type AdminCommunitiesListFilterOption = {
  count: number;
  id: string;
  label: string;
};

export type AdminCommunitiesListItem = {
  active: boolean;
  activity_count: number;
  avatar_url: string | null;
  category: string | null;
  comments_count: number;
  created_at: string;
  deactivated_at: string | null;
  description: string | null;
  detail_url: string;
  id: string;
  last_activity_at: string | null;
  members_count: number;
  name: string;
  posts_count: number;
  reports_count: number;
  slug: string;
  updated_at: string;
  visual_primary_color: string | null;
};

export type AdminCommunitiesList = {
  active_filters_count: number;
  count: number;
  data: AdminCommunitiesListItem[];
  filters: {
    categories: AdminCommunitiesListFilterOption[];
  };
  page: number;
  pages: number;
  per_page: number;
  sort: AdminCommunitiesListSort;
  source: "community+community_member+community_post+post_reply+post_report";
};

export type AdminCommunityContentQuery = AdminCommunityPaginationQuery & {
  from?: string;
  period?: "all" | "custom" | "month" | "today" | "week" | "year";
  sort?: "engagement" | "oldest" | "recent";
  status?: "all" | "published" | "removed";
  to?: string;
  type?:
    | "all"
    | "anonymous_post"
    | "comments"
    | "patient_comment"
    | "posts"
    | "unverified_psychologist_post"
    | "unverified_psychologist_reply"
    | "verified_psychologist_post"
    | "verified_psychologist_reply";
};

export type AdminCommunityContentDetailQuery = {
  from?: string;
  period?: "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type AdminCommunityContentItem = {
  author: AdminCommunityContentAuthor;
  content_kind:
    | "anonymous_post"
    | "patient_comment"
    | "patient_post"
    | "unverified_psychologist_post"
    | "unverified_psychologist_reply"
    | "verified_psychologist_post"
    | "verified_psychologist_reply";
  content_kind_label: string;
  content_id: string;
  created_at: string;
  deleted_at: string | null;
  excerpt: string;
  media: {
    media_type: string;
    media_url: string;
  } | null;
  metrics: {
    comments_count: number;
    downvotes_count: number;
    reports_count: number;
    saves_count: number;
    shares_count: number;
    upvotes_count: number;
    views_count: number;
    whatsapp_clicks_count: number;
  };
  origin_preview: {
    excerpt: string;
    label: string;
    title: string | null;
    type: "comment" | "post";
  } | null;
  parent_post_title: string | null;
  post_id: string;
  public_url: string;
  status: "published" | "removed";
  title: string | null;
  type: "comment" | "post";
};

export type AdminCommunityContent = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityContentItem[];
  page: number;
  pages: number;
  per_page: number;
  source: "community_post+post_reply+post_share+page_view_event+important_action_event";
};

export type AdminCommunityContentAnalyticsDetail = {
  author: AdminCommunityContentAuthor & {
    role_label: string;
  };
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  content: {
    body: string;
    content_kind: AdminCommunityContentItem["content_kind"];
    content_kind_label: string;
    created_at: string;
    deleted_at: string | null;
    edited_at: string | null;
    excerpt: string;
    id: string;
    media: {
      cover_url: string | null;
      duration_seconds: number | null;
      media_type: string;
      media_url: string;
    } | null;
    origin_preview: AdminCommunityContentItem["origin_preview"];
    parent_post_title: string | null;
    post_id: string;
    public_url: string | null;
    status: "published" | "removed";
    title: string | null;
    type: "comment" | "post";
  };
  metrics: AdminCommunityContentItem["metrics"] & {
    moderation_events_count: number;
  };
  moderation: {
    events: {
      categories: unknown;
      content_excerpt: string;
      created_at: string;
      decision: string;
      id: string;
      reason_code: string;
      reviewed_at: string | null;
      severity: string;
      status: string;
    }[];
    reports: AdminCommunityReportItem[];
  };
  period: {
    days: number | null;
    from: string | null;
    label: string;
    max_days: number;
    timezone: "server-local";
    to: string | null;
  };
  series: {
    comments: number;
    date: string;
    downvotes: number;
    reports: number;
    saves: number;
    shares: number;
    upvotes: number;
    views: number;
    whatsapp_clicks: number;
  }[];
  source: "community_post+post_reply+post_vote+post_save+post_reply_save+post_share+page_view_event+important_action_event+post_report+content_moderation_event+content_video_watch_session";
  video: null | {
    available: boolean;
    metrics: {
      average_retention_percent: number | null;
      average_watched_seconds: number | null;
      completed_count: number;
      completion_rate: number;
      duration_seconds: number | null;
      plays_count: number;
      replay_count: number;
      replay_rate_percent: number;
      total_watched_seconds: number;
    };
    retention: {
      label: string;
      percentage: number;
      position_percent: number;
    }[];
    retention_dropoff: {
      from_label: string;
      rate_drop: number;
      to_label: string;
    } | null;
    source: "content_video_watch_session";
    unavailable_reason: string | null;
  };
};

export type AdminCommunityRemoveContentInput = {
  confirmation: string;
  reason: string;
};

export type AdminCommunityRemoveContentResult = {
  affected_reports_count: number;
  affected_replies_count: number;
  content_id: string;
  post_id: string;
  type: "comment" | "post";
};

export type AdminCommunityResolveReportsInput = {
  confirmation: string;
  reason: string;
  resolution: "dismissed" | "pending" | "upheld";
};

export type AdminCommunityRankingQuery = AdminCommunityPaginationQuery & {
  period?: "30d";
};

export type AdminCommunityRankingItem = {
  membership_created_at: string;
  mentor: {
    avatar: string | null;
    crp: string | null;
    headline: string | null;
    id: string;
    name: string;
    profile_url: string;
    rating_avg: number;
    rating_count: number;
    verified: boolean;
  };
  metrics: {
    active_days: number;
    comments_received: number;
    community_whatsapp_clicks: number;
    downvotes_received: number;
    participation_events: number;
    posts_published: number;
    removed_posts: number;
    removed_posts_penalty: number;
    replies_published: number;
    saves_received: number;
    shares_received: number;
    upvotes_received: number;
  };
  position: number;
  position_delta: number | null;
  previous_position: number | null;
  score: number;
  score_breakdown: {
    active_days_points: number;
    comments_points: number;
    community_whatsapp_points: number;
    downvotes_penalty: number;
    posts_points: number;
    removed_posts_penalty: number;
    replies_points: number;
    saves_points: number;
    shares_points: number;
    upvotes_points: number;
  };
  trend: "down" | "flat" | "new" | "up";
};

export type AdminCommunityRanking = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityRankingItem[];
  formula: Record<string, unknown>;
  page: number;
  pages: number;
  per_page: number;
  period: {
    current_from: string;
    current_to: string;
    days: 30;
    label: "Últimos 30 dias";
    previous_from: string;
    previous_to: string;
  };
  source: "community_member+community_post+post_reply+post_vote+post_save+post_share";
};

export type AdminCommunityReportsQuery = AdminCommunityPaginationQuery & {
  from?: string;
  status?: "all" | "dismissed" | "pending" | "upheld";
  to?: string;
  type?:
    | "all"
    | "patient_comment"
    | "patient_post"
    | "unverified_psychologist_post"
    | "unverified_psychologist_reply"
    | "verified_psychologist_post"
    | "verified_psychologist_reply";
};

export type AdminCommunityReportItem = {
  capabilities: {
    can_review_resolution: boolean;
    can_resolve_dismissed: boolean;
    can_resolve_upheld: boolean;
  };
  content: {
    author: {
      avatar: string | null;
      id: string;
      name: string;
      role: string;
      role_label: string;
    } | null;
    available: boolean;
    body: string;
    content_kind:
      | "patient_comment"
      | "patient_post"
      | "unverified_psychologist_post"
      | "unverified_psychologist_reply"
      | "verified_psychologist_post"
      | "verified_psychologist_reply";
    content_kind_label: string;
    excerpt: string;
    id: string;
    media: {
      media_type: string;
      media_url: string;
    } | null;
    post_id: string;
    public_url: string | null;
    title: string | null;
    type: "comment" | "post";
    unavailable_reason: string | null;
  };
  created_at: string;
  description: string | null;
  first_reported_at: string;
  id: string;
  last_reported_at: string;
  report_count: number;
  reporters: {
    created_at: string;
    description: string | null;
    id: string;
    reason: string;
    reason_label: string;
    reporter: {
      id: string;
      label: string;
      name: string;
      role: string;
    };
    status: string;
    status_group: "dismissed" | "pending" | "upheld";
    status_label: string;
  }[];
  reason: string;
  reason_label: string;
  reported_by: {
    label: string;
    role: string;
  };
  status: string;
  status_counts: {
    dismissed: number;
    pending: number;
    upheld: number;
  };
  status_group: "dismissed" | "pending" | "upheld";
  status_label: string;
};

export type AdminCommunityReports = {
  active_filters_count: number;
  cards: {
    id: "dismissed" | "pending" | "total" | "upheld";
    label: string;
    source: "post_report";
    value: number;
  }[];
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityReportItem[];
  filters: {
    statuses: {
      count: number;
      id: "all" | "dismissed" | "pending" | "upheld";
      label: string;
    }[];
    types: {
      count: number;
      id: NonNullable<AdminCommunityReportsQuery["type"]>;
      label: string;
    }[];
  };
  page: number;
  pages: number;
  per_page: number;
  period: {
    days: number;
    from: string;
    label: string;
    max_days: number;
    timezone: "server-local";
    to: string;
  };
  source: "post_report+community_post+post_reply";
};

export type AdminCommunityResolveReportsResult = {
  affected_reports_count: number;
  content_id: string;
  post_id: string;
  report: AdminCommunityReportItem;
  resolution: "dismissed" | "pending" | "upheld";
  type: "comment" | "post";
};

export type AdminCommunityActivitiesQuery = AdminCommunityPaginationQuery & {
  area?: string;
  from?: string;
  to?: string;
  type?: string;
};

export type AdminCommunityStatisticsQuery = {
  from?: string;
  period?: "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type AdminCommunityActivityItem = {
  action: string;
  actor: string;
  area: string;
  created_at: string;
  id: string;
  reason: string | null;
  source: string;
  summary: string;
};

export type AdminCommunityActivities = {
  active_filters_count: number;
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityActivityItem[];
  filters: {
    areas: {
      count: number;
      id: string;
      label: string;
    }[];
    types: {
      count: number;
      id: string;
      label: string;
    }[];
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
  source: "admin_activity_log";
};

export type AdminCommunityStatisticsSplit = {
  id: string;
  label: string;
  source: string;
  value: number;
};

export type AdminCommunityStatisticsDailyPoint = {
  active_patients: number;
  active_psychologists: number;
  active_users: number;
  anonymous_posts: number;
  date: string;
  downvotes: number;
  followers_patients: number;
  followers_psychologists: number;
  profile_accesses: number;
  new_active_patients: number;
  new_active_psychologists: number;
  new_active_users: number;
  patient_comments: number;
  patient_posts: number;
  posts: number;
  psychologist_posts: number;
  replies: number;
  reports: number;
  saves: number;
  unverified_psychologist_replies: number;
  upvotes: number;
  verified_psychologist_replies: number;
  whatsapp_clicks: number;
};

export type AdminCommunityStatistics = {
  charts: {
    active_users_split: AdminCommunityStatisticsSplit[];
    daily: AdminCommunityStatisticsDailyPoint[];
    followers_split: AdminCommunityStatisticsSplit[];
    posts_by_author: AdminCommunityStatisticsSplit[];
    replies_by_author: AdminCommunityStatisticsSplit[];
  };
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  counters: {
    active_users: {
      patients: number;
      psychologists: number;
      source: "community_member+community_post+post_reply+page_view_event";
      total: number;
    };
    anonymous_posts: {
      source: "community_post.anonymous";
      total: number;
    };
    content_engagement: {
      downvotes: number;
      profile_accesses: number;
      saves: number;
      source: "post_vote+post_save+post_reply_save+important_action_event+page_view_event";
      upvotes: number;
      whatsapp_clicks: number;
    };
    followers: {
      patients: number;
      psychologists: number;
      source: "community_member";
      total: number;
    };
    new_active_users: {
      patients: number;
      psychologists: number;
      source: "first_activity:community_member+community_post+post_reply+page_view_event";
      total: number;
    };
    posts: {
      patients: number;
      patient_posts_answered_by_verified_psychologists: number;
      psychologists: number;
      source: "community_post+post_reply";
      total: number;
      unverified_psychologists: number;
      verified_psychologists: number;
    };
    replies: {
      patient_comments: number;
      source: "post_reply";
      total: number;
      unverified_psychologists: number;
      verified_psychologists: number;
    };
    reports: {
      source: "post_report";
      total: number;
    };
  };
  period: {
    days: number;
    from: string;
    label: string;
    max_days: number;
    timezone: "server-local";
    to: string;
  };
  source: "community_member+community_post+post_reply+post_report+post_vote+post_save+post_reply_save+page_view_event+important_action_event";
};

export type AdminCommunityUpdateInput = {
  description?: string | null;
  name: string;
  visual_primary_color?: string | null;
};

export type AdminCommunityStatusInput = {
  active: boolean;
  confirmation: string;
  reason: string;
};

export type AdminCommunityCreateInput = AdminCommunityUpdateInput & {
  category?: string | null;
  slug?: string | null;
};

export type AdminCommunityRuleInput = {
  active?: boolean;
  description: string;
  position?: number;
  title: string;
};

export type AdminCommunityRulesResponse = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  rules: AdminCommunityRule[];
};

export type AdminCommunityAvatarResponse = {
  avatar_url: string;
  community: AdminCommunityIdentity;
};

const cleanParams = (input: CommunitiesDashboardQuery) => ({
  ...(input.from ? { from: input.from } : {}),
  ...(input.period ? { period: input.period } : {}),
  ...(input.to ? { to: input.to } : {}),
});

const cleanPaginationParams = <T extends object>(input: T = {} as T) => {
  const params = input as Record<string, unknown>;

  return {
    ...(params.limit ? { limit: params.limit } : {}),
    ...(params.page ? { page: params.page } : {}),
    ...(params.q ? { q: params.q } : {}),
    ...Object.fromEntries(
      Object.entries(params).filter(
        ([key, value]) => !["limit", "page", "q"].includes(key) && value !== undefined,
      ),
    ),
  };
};

const cleanStatisticsParams = (input: AdminCommunityStatisticsQuery) => ({
  ...(input.period ? { period: input.period } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.to ? { to: input.to } : {}),
});

const cleanContentDetailParams = (input: AdminCommunityContentDetailQuery) => ({
  ...(input.period ? { period: input.period } : {}),
  ...(input.from ? { from: input.from } : {}),
  ...(input.to ? { to: input.to } : {}),
});

export const getAdminCommunitiesDashboard = async (input: CommunitiesDashboardQuery) => {
  const response = await adminApi.get<ApiResponse<AdminCommunitiesDashboard>>(
    "/api/admin/private/communities/dashboard",
    {
      params: cleanParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunitiesList = async (input: AdminCommunitiesListQuery = {}) => {
  const response = await adminApi.get<ApiResponse<AdminCommunitiesList>>(
    "/api/admin/private/communities",
    {
      params: cleanPaginationParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityDetail = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityDetail>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}`,
  );

  return resolveApiData(response.data);
};

export const createAdminCommunity = async (input: AdminCommunityCreateInput) => {
  const response = await adminApi.post<ApiResponse<AdminCommunityIdentity>>(
    "/api/admin/private/communities",
    input,
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityContent = async (id: string, input: AdminCommunityContentQuery) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityContent>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/content`,
    {
      params: cleanPaginationParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityContentDetail = async (
  id: string,
  targetType: "comment" | "post" | "reply",
  targetId: string,
  input: AdminCommunityContentDetailQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityContentAnalyticsDetail>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/content/${encodeURIComponent(
      targetType,
    )}/${encodeURIComponent(targetId)}/detail`,
    {
      params: cleanContentDetailParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const removeAdminCommunityContent = async (
  id: string,
  targetType: "comment" | "post",
  targetId: string,
  input: AdminCommunityRemoveContentInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminCommunityRemoveContentResult>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/content/${encodeURIComponent(
      targetType,
    )}/${encodeURIComponent(targetId)}/remove`,
    input,
  );

  return resolveApiData(response.data);
};

export const resolveAdminCommunityReports = async (
  id: string,
  targetType: "comment" | "post",
  targetId: string,
  input: AdminCommunityResolveReportsInput,
) => {
  const response = await adminApi.post<ApiResponse<AdminCommunityResolveReportsResult>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/reports/${encodeURIComponent(
      targetType,
    )}/${encodeURIComponent(targetId)}/resolve`,
    input,
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityRanking = async (id: string, input: AdminCommunityRankingQuery) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityRanking>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/ranking`,
    {
      params: cleanPaginationParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityReports = async (id: string, input: AdminCommunityReportsQuery) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityReports>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/reports`,
    {
      params: cleanPaginationParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityActivities = async (
  id: string,
  input: AdminCommunityActivitiesQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityActivities>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/activities`,
    {
      params: cleanPaginationParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityStatistics = async (
  id: string,
  input: AdminCommunityStatisticsQuery,
) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityStatistics>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/statistics`,
    {
      params: cleanStatisticsParams(input),
    },
  );

  return resolveApiData(response.data);
};

export const updateAdminCommunity = async (id: string, input: AdminCommunityUpdateInput) => {
  const response = await adminApi.put<ApiResponse<AdminCommunityIdentity>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}`,
    input,
  );

  return resolveApiData(response.data);
};

export const updateAdminCommunityStatus = async (id: string, input: AdminCommunityStatusInput) => {
  const response = await adminApi.patch<ApiResponse<AdminCommunityIdentity>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/status`,
    input,
  );

  return resolveApiData(response.data);
};

export const uploadAdminCommunityAvatar = async (id: string, file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await adminApi.post<ApiResponse<AdminCommunityAvatarResponse>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/avatar`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return resolveApiData(response.data);
};

export const getAdminCommunityRules = async (id: string) => {
  const response = await adminApi.get<ApiResponse<AdminCommunityRulesResponse>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/rules`,
  );

  return resolveApiData(response.data);
};

export const createAdminCommunityRule = async (id: string, input: AdminCommunityRuleInput) => {
  const response = await adminApi.post<ApiResponse<AdminCommunityRule>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/rules`,
    input,
  );

  return resolveApiData(response.data);
};

export const updateAdminCommunityRule = async (
  id: string,
  ruleId: string,
  input: AdminCommunityRuleInput,
) => {
  const response = await adminApi.put<ApiResponse<AdminCommunityRule>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/rules/${encodeURIComponent(ruleId)}`,
    input,
  );

  return resolveApiData(response.data);
};

export const deleteAdminCommunityRule = async (id: string, ruleId: string) => {
  const response = await adminApi.delete<ApiResponse<AdminCommunityRule>>(
    `/api/admin/private/communities/${encodeURIComponent(id)}/rules/${encodeURIComponent(ruleId)}`,
  );

  return resolveApiData(response.data);
};
