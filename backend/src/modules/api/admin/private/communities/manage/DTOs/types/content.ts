import type { AdminCommunityContentAuthorDTO, AdminCommunityIdentity } from "./detail";

import type { AdminCommunityReportItemDTO } from "./reports-activities";

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
