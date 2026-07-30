import type { Request } from "express";
import type { admin } from "@/interfaces/objects";

export type AdminCommunityManageParams = {
  id: string;
  ruleId?: string;
  targetId?: string;
  targetType?: "comment" | "post" | "reply";
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

export type AdminCommunityContentQuery = AdminCommunityPaginationQuery & {
  from?: string;
  period?: "7d" | "30d" | "90d" | "all" | "custom" | "month" | "today" | "week" | "year";
  sort?: "engagement" | "oldest" | "recent";
  status?: "all" | "blocked" | "published" | "removed";
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
  period?: "7d" | "30d" | "90d" | "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type AdminCommunityRankingQuery = AdminCommunityPaginationQuery & {
  period?: "30d";
};

export type AdminCommunityReportsQuery = AdminCommunityPaginationQuery & {
  from?: string;
  status?:
    | "all"
    | "dismissed"
    | "em_analise"
    | "pending"
    | "pendente"
    | "rejeitada"
    | "resolvida"
    | "upheld"
    | string;
  to?: string;
  type?:
    | "all"
    | "comment"
    | "patient_comment"
    | "patient_post"
    | "post"
    | "reply"
    | "unverified_psychologist_post"
    | "unverified_psychologist_reply"
    | "verified_psychologist_post"
    | "verified_psychologist_reply"
    | string;
};

export type AdminCommunityActivitiesQuery = AdminCommunityPaginationQuery & {
  area?: string;
  from?: string;
  to?: string;
  type?: string;
};

export type AdminCommunityStatisticsQuery = {
  from?: string;
  period?: "7d" | "30d" | "90d" | "all" | "custom" | "month" | "today" | "week" | "year";
  to?: string;
};

export type AdminCommunityUpdateBody = {
  name?: string;
  description?: string | null;
  avatar_url?: string | null;
  visual_primary_color?: string | null;
  visual_primary_dark_color?: string | null;
  visual_soft_color?: string | null;
  visual_text_color?: string | null;
  visual_gradient_color?: string | null;
};

export type AdminCommunityCreateBody = AdminCommunityUpdateBody & {
  category?: string | null;
  name: string;
  slug?: string | null;
};

export type AdminCommunityRuleBody = {
  title: string;
  description: string;
  position?: number;
  active?: boolean;
};

export type AdminCommunityRemoveContentBody = {
  confirmation: string;
  reason: string;
};

export type AdminCommunityResolveReportsBody = {
  confirmation: string;
  reason: string;
  resolution: "dismissed" | "pending" | "upheld";
};

export type AdminCommunityStatusBody = {
  active: boolean;
  confirmation: string;
  reason: string;
};

export type AdminCommunityIdentity = {
  active: boolean;
  avatar_url: string | null;
  category: string | null;
  created_at: Date;
  deactivated_at: Date | null;
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

export type AdminCommunityRuleDTO = {
  active: boolean;
  created_at: Date;
  description: string;
  id: string;
  position: number;
  title: string;
  updated_at: Date;
};

export type AdminCommunitySummaryDTO = {
  comments_count: number;
  members_count: number;
  posts_count: number;
  popular_posts_count: number;
};

export type AdminCommunityHighlightCountersDTO = {
  accesses_count: number;
  patient_comments_count: number;
  patient_posts_count: number;
  psychologist_posts_count: number;
  psychologist_replies_count: number;
  reports_count: number;
  source: "community_post+post_reply+post_report+page_view_event";
};

export type AdminCommunityTodaySummaryDTO = {
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

export type AdminCommunityUrgentPendingReportDTO = {
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
  created_at: Date;
  id: string;
  reason_label: string;
  reporter: {
    label: string;
    name: string;
    role: string;
  };
  status_label: string;
};

export type AdminCommunityUrgentSummaryDTO = {
  pending_reports_count: number;
  pending_reports_last_reported_at: Date | null;
  pending_reports: AdminCommunityUrgentPendingReportDTO[];
  source: "post_report";
};

export type AdminCommunityPerformancePointDTO = {
  date: string;
  comments: number;
  members: number;
  posts: number;
  reports: number;
};

export type AdminCommunityPerformanceMetricDTO = {
  label: string;
  value: number;
  change_percent: number | null;
  trend: "down" | "flat" | "unavailable" | "up";
};

export type AdminCommunityTopMentorDTO = {
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

export type AdminCommunityContentAuthorDTO = {
  anonymous: boolean;
  avatar: string | null;
  gender: string | null;
  id: string;
  name: string;
  role: string;
  verified: boolean;
};

export type AdminCommunityPopularPostDTO = {
  author: AdminCommunityContentAuthorDTO;
  author_name: string;
  author_role: string;
  comments_count: number;
  created_at: Date;
  id: string;
  saves_count: number;
  title: string;
  upvotes_count: number;
};

export type AdminCommunityDetailDTO = {
  community: AdminCommunityIdentity;
  highlight_counters: AdminCommunityHighlightCountersDTO;
  performance: {
    days: number;
    metrics: {
      comments: AdminCommunityPerformanceMetricDTO;
      new_members: AdminCommunityPerformanceMetricDTO;
      new_posts: AdminCommunityPerformanceMetricDTO;
      reports: AdminCommunityPerformanceMetricDTO;
    };
    points: AdminCommunityPerformancePointDTO[];
  };
  popular_posts: AdminCommunityPopularPostDTO[];
  rules: AdminCommunityRuleDTO[];
  summary: AdminCommunitySummaryDTO;
  today_summary: AdminCommunityTodaySummaryDTO;
  top_mentors: AdminCommunityTopMentorDTO[];
  urgent_summary: AdminCommunityUrgentSummaryDTO;
};

export type AdminCommunityContentItemDTO = {
  author: AdminCommunityContentAuthorDTO;
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
  created_at: Date;
  deleted_at: Date | null;
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
  status: "blocked" | "published" | "removed";
  title: string | null;
  type: "comment" | "post";
};

export type AdminCommunityContentDTO = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityContentItemDTO[];
  page: number;
  pages: number;
  per_page: number;
  source: "community_post+post_reply+post_share+page_view_event+important_action_event";
};

export type AdminCommunityContentAnalyticsDetailDTO = {
  author: AdminCommunityContentAuthorDTO & {
    role_label: string;
  };
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  content: {
    body: string;
    content_kind: AdminCommunityContentItemDTO["content_kind"];
    content_kind_label: string;
    created_at: Date;
    deleted_at: Date | null;
    edited_at: Date | null;
    excerpt: string;
    id: string;
    media: {
      cover_url: string | null;
      duration_seconds: number | null;
      media_type: string;
      media_url: string;
    } | null;
    origin_preview: AdminCommunityContentItemDTO["origin_preview"];
    parent_post_title: string | null;
    post_id: string;
    public_url: string | null;
    status: "blocked" | "published" | "removed";
    title: string | null;
    type: "comment" | "post";
  };
  metrics: AdminCommunityContentItemDTO["metrics"] & {
    comment_breakdown: {
      patient_comments_count: number;
      source: "post_reply";
      total_count: number;
      unverified_psychologist_replies_count: number;
      verified_psychologist_replies_count: number;
    };
    moderation_events_count: number;
  };
  moderation: {
    events: {
      categories: unknown;
      content_excerpt: string;
      created_at: Date;
      decision: string;
      id: string;
      reason_code: string;
      reviewed_at: Date | null;
      severity: string;
      status: string;
    }[];
    reports: AdminCommunityReportItemDTO[];
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

export type AdminCommunityRankingItemDTO = {
  membership_created_at: Date;
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
    reply_coverage_count: number;
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
    reply_coverage_points: number;
    removed_posts_penalty: number;
    replies_points: number;
    saves_points: number;
    shares_points: number;
    upvotes_points: number;
  };
  trend: "down" | "flat" | "new" | "up";
};

export type AdminCommunityRankingDTO = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityRankingItemDTO[];
  formula: Record<string, unknown>;
  page: number;
  pages: number;
  per_page: number;
  period: {
    current_from: Date;
    current_to: Date;
    days: 30;
    label: "Últimos 30 dias";
    previous_from: Date;
    previous_to: Date;
  };
  source: "community_member+community_post+post_reply+post_vote+post_save+post_share";
};

export type AdminCommunityReportItemDTO = {
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
  created_at: Date;
  description: string | null;
  first_reported_at: Date;
  id: string;
  last_reported_at: Date;
  report_count: number;
  reporters: {
    created_at: Date;
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

export type AdminCommunityReportsDTO = {
  active_filters_count: number;
  cards: {
    id: "dismissed" | "pending" | "total" | "upheld";
    label: string;
    source: "post_report";
    value: number;
  }[];
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityReportItemDTO[];
  filters: {
    statuses: {
      count: number;
      id: "all" | "dismissed" | "pending" | "upheld";
      label: string;
    }[];
    types: {
      count: number;
      id:
        | "all"
        | "patient_comment"
        | "patient_post"
        | "unverified_psychologist_post"
        | "unverified_psychologist_reply"
        | "verified_psychologist_post"
        | "verified_psychologist_reply";
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

export type AdminCommunityActivityItemDTO = {
  action: string;
  actor: string;
  area: string;
  created_at: Date;
  id: string;
  reason: string | null;
  source: string;
  summary: string;
};

export type AdminCommunityActivitiesFilterOptionDTO = {
  count: number;
  id: string;
  label: string;
};

export type AdminCommunityActivitiesDTO = {
  active_filters_count: number;
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  count: number;
  data: AdminCommunityActivityItemDTO[];
  filters: {
    areas: AdminCommunityActivitiesFilterOptionDTO[];
    types: AdminCommunityActivitiesFilterOptionDTO[];
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

export type AdminCommunityStatisticsSplitDTO = {
  id: string;
  label: string;
  source: string;
  value: number;
};

export type AdminCommunityContentFormatId = "image" | "image_carousel" | "text" | "video";

export type AdminCommunityContentFormatDistributionDTO = {
  items: Array<{
    count: number;
    id: AdminCommunityContentFormatId;
    label: "Apenas texto" | "Carrossel de imagens" | "Imagem" | "Vídeo";
    percentage: number;
  }>;
  source: "community_post.media_type+community_post_media" | "post_reply.media_type";
  total: number;
};

export type AdminCommunityStatisticsDailyPointDTO = {
  accesses: number;
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

export type AdminCommunityStatisticsHourlyActivityDTO = {
  accesses: number;
  engagement: number;
  hour: number;
  label: string;
  posts: number;
  replies: number;
  reports: number;
  total: number;
};

export type AdminCommunityStatisticsWeekdayHourlyActivityDTO = {
  day: number;
  hours: AdminCommunityStatisticsHourlyActivityDTO[];
  label: string;
};

export type AdminCommunityStatisticsDTO = {
  charts: {
    active_users_split: AdminCommunityStatisticsSplitDTO[];
    daily: AdminCommunityStatisticsDailyPointDTO[];
    followers_split: AdminCommunityStatisticsSplitDTO[];
    hourly_activity: AdminCommunityStatisticsHourlyActivityDTO[];
    hourly_activity_by_weekday: AdminCommunityStatisticsWeekdayHourlyActivityDTO[];
    posts_by_content_format: AdminCommunityContentFormatDistributionDTO;
    replies_by_content_format: AdminCommunityContentFormatDistributionDTO;
    posts_by_author: AdminCommunityStatisticsSplitDTO[];
    replies_by_author: AdminCommunityStatisticsSplitDTO[];
  };
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  counters: {
    accesses: {
      source: "page_view_event";
      total: number;
    };
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
    care_coverage: {
      average_first_verified_response_minutes: number | null;
      patient_posts_awaiting_verified_psychologist_response: number;
      patient_posts_responded_by_verified_psychologists: number;
      patient_posts_verified_response_breakdown: {
        anonymous: {
          responded_by_verified_psychologists: number;
          total: number;
        };
        identified: {
          responded_by_verified_psychologists: number;
          total: number;
        };
        total: {
          responded_by_verified_psychologists: number;
          total: number;
        };
      };
      patient_posts_with_any_response: number;
      source: "community_post+post_reply";
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

export type AdminCommunityRemoveContentDTO = {
  affected_reports_count: number;
  affected_replies_count: number;
  content_id: string;
  post_id: string;
  type: "comment" | "post";
};

export type AdminCommunityResolveReportsDTO = {
  affected_reports_count: number;
  content_id: string;
  post_id: string;
  report: AdminCommunityReportItemDTO;
  resolution: "dismissed" | "pending" | "upheld";
  type: "comment" | "post";
};

export type AdminCommunityRulesResponseDTO = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  rules: AdminCommunityRuleDTO[];
};

export type AdminCommunityAvatarResponseDTO = {
  avatar_url: string;
  community: AdminCommunityIdentity;
};

export type AdminCommunitiesListFilterOptionDTO = {
  count: number;
  id: string;
  label: string;
};

export type AdminCommunitiesListItemDTO = {
  active: boolean;
  activity_count: number;
  avatar_url: string | null;
  category: string | null;
  comments_count: number;
  created_at: Date;
  deactivated_at: Date | null;
  description: string | null;
  detail_url: string;
  id: string;
  last_activity_at: Date | null;
  members_count: number;
  name: string;
  posts_count: number;
  reports_count: number;
  slug: string;
  updated_at: Date;
  visual_primary_color: string | null;
};

export type AdminCommunitiesListDTO = {
  active_filters_count: number;
  count: number;
  data: AdminCommunitiesListItemDTO[];
  filters: {
    categories: AdminCommunitiesListFilterOptionDTO[];
  };
  page: number;
  pages: number;
  per_page: number;
  sort: AdminCommunitiesListSort;
  source: "community+community_member+community_post+post_reply+post_report";
};

export type IAdminCommunitiesListDTO = Request & {
  q: AdminCommunitiesListQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityShowDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityPaginationQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityContentDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityContentQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityContentDetailDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityContentDetailQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityRankingDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityRankingQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityReportsDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityReportsQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityActivitiesDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityActivitiesQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityStatisticsDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityStatisticsQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityRemoveContentDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityRemoveContentBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityResolveReportsDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityResolveReportsBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityStatusDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityStatusBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityUpdateDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityUpdateBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityCreateDTO = Request & {
  b: AdminCommunityCreateBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityAvatarDTO = Request & {
  p: AdminCommunityManageParams;
  admin?: admin;
  auth?: admin;
  file?: Express.Multer.File & { key?: string; path?: string };
};

export type IAdminCommunityRuleDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityRuleBody;
  admin?: admin;
  auth?: admin;
};
