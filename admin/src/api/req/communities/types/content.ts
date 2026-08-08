import type {
  AdminCommunityContentAuthor,
  AdminCommunityIdentity,
  AdminCommunityPaginationQuery,
} from "./detail-list";

import type { AdminCommunityReportItem } from "./ranking-reports";

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
  status: "blocked" | "published" | "removed";
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
    status: "blocked" | "published" | "removed";
    title: string | null;
    type: "comment" | "post";
  };
  metrics: AdminCommunityContentItem["metrics"] & {
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
