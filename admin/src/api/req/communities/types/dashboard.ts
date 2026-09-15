import type { AdminPublicSource } from "@/api/public-response";
import type { AdminCommunityContentAuthor } from "./detail-list";

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
  period?: "7d" | "30d" | "90d" | "all" | "custom" | "month" | "today" | "week" | "year";
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
  accesses_count: number;
  activity_count: number;
  avatar_url: string | null;
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

export type CommunitiesContentFormatId = "image" | "image_carousel" | "text" | "video";

export type CommunitiesPostContentFormatDistribution = {
  items: Array<{
    count: number;
    id: CommunitiesContentFormatId;
    label: "Apenas texto" | "Carrossel de imagens" | "Imagem" | "Vídeo";
    percentage: number;
  }>;
  source: AdminPublicSource<
    "community_post.media_type+community_post_media" | "post_reply.media_type"
  >;
  total: number;
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

export type CommunitiesDashboardHourlyActivityPoint = {
  accesses: number;
  engagement: number;
  hour: number;
  label: string;
  posts: number;
  replies: number;
  reports: number;
  total: number;
};

export type CommunitiesDashboardGlobalStatistics = {
  charts: {
    active_users_split: CommunitiesDashboardStatisticsSplit[];
    daily: CommunitiesDashboardStatisticsDailyPoint[];
    followers_split: CommunitiesDashboardStatisticsSplit[];
    hourly_activity: CommunitiesDashboardHourlyActivityPoint[];
    posts_by_content_format: CommunitiesPostContentFormatDistribution;
    replies_by_content_format: CommunitiesPostContentFormatDistribution;
    posts_by_author: CommunitiesDashboardStatisticsSplit[];
    replies_by_author: CommunitiesDashboardStatisticsSplit[];
  };
  counters: {
    active_users: {
      patients: number;
      psychologists: number;
      source: AdminPublicSource<"community_member+community_post+post_reply+page_view_event">;
      total: number;
    };
    anonymous_posts: {
      source: AdminPublicSource<"community_post.anonymous">;
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
      source: AdminPublicSource<"community_post+post_reply">;
    };
    content_engagement: {
      downvotes: number;
      profile_accesses: number;
      saves: number;
      source: AdminPublicSource<"post_vote+post_save+post_reply_save+important_action_event+page_view_event">;
      upvotes: number;
      whatsapp_clicks: number;
    };
    followers: {
      patients: number;
      psychologists: number;
      source: AdminPublicSource<"community_member">;
      total: number;
    };
    new_active_users: {
      patients: number;
      psychologists: number;
      source: AdminPublicSource<"first_activity:community_member+community_post+post_reply+page_view_event">;
      total: number;
    };
    posts: {
      patients: number;
      patient_posts_answered_by_verified_psychologists: number;
      psychologists: number;
      source: AdminPublicSource<"community_post+post_reply">;
      total: number;
      unverified_psychologists: number;
      verified_psychologists: number;
    };
    replies: {
      patient_comments: number;
      source: AdminPublicSource<"post_reply">;
      total: number;
      unverified_psychologists: number;
      verified_psychologists: number;
    };
    reports: {
      source: AdminPublicSource<"post_report">;
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
  source: AdminPublicSource<"community_member+community_post+post_reply+post_report+post_vote+post_save+post_reply_save+page_view_event+important_action_event">;
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
    source: AdminPublicSource<"community_post.anonymous">;
    total: number;
  };
  period: CommunitiesDashboardPeriod;
  priority_alerts: {
    items: CommunitiesDashboardPriorityAlert[];
    source: AdminPublicSource<"post_report.status=pendente">;
    total: number;
  };
  moderation_alerts: {
    items: CommunitiesDashboardModerationAlert[];
    source: AdminPublicSource<"content_moderation_event.status=pending|reviewing">;
    total: number;
    urgent_total: number;
  };
  recent_posts: {
    items: CommunitiesDashboardRecentPost[];
    source: AdminPublicSource<"community_post+page_view_event">;
    total: number;
  };
  popular_posts: {
    items: CommunitiesDashboardPopularPost[];
    source: AdminPublicSource<"community_post+post_reply+post_vote+post_save+page_view_event">;
    total: number;
  };
  top_communities: {
    items: CommunitiesDashboardTopCommunity[];
    source: AdminPublicSource<"community+community_member+community_post+post_reply+post_report+post_vote+post_save+post_reply_save+page_view_event+important_action_event">;
    total: number;
  };
  unavailable: CommunitiesDashboardUnavailableMetric[];
};
