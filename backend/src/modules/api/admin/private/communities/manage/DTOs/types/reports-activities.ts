import type { AdminCommunityRankingItemDTO } from "./content";
import type { AdminCommunityIdentity } from "./detail";

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
