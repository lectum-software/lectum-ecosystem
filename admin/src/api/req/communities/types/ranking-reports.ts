import type { AdminPublicSource } from "@/api/public-response";
import type { AdminCommunityIdentity, AdminCommunityPaginationQuery } from "./detail-list";

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
  source: AdminPublicSource<"community_member+community_post+post_reply+post_vote+post_save+post_share">;
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
    source: AdminPublicSource<"post_report">;
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
  source: AdminPublicSource<"post_report+community_post+post_reply">;
};

export type AdminCommunityResolveReportsResult = {
  affected_reports_count: number;
  content_id: string;
  post_id: string;
  report: AdminCommunityReportItem;
  resolution: "dismissed" | "pending" | "upheld";
  type: "comment" | "post";
};
