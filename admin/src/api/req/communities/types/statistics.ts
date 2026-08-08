import type { CommunitiesPostContentFormatDistribution } from "./dashboard";
import type {
  AdminCommunityIdentity,
  AdminCommunityPaginationQuery,
  AdminCommunityRule,
} from "./detail-list";

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

export type AdminCommunityStatisticsHourlyActivity = {
  accesses: number;
  engagement: number;
  hour: number;
  label: string;
  posts: number;
  replies: number;
  reports: number;
  total: number;
};

export type AdminCommunityStatisticsWeekdayHourlyActivity = {
  day: number;
  hours: AdminCommunityStatisticsHourlyActivity[];
  label: string;
};

export type AdminCommunityStatistics = {
  charts: {
    active_users_split: AdminCommunityStatisticsSplit[];
    daily: AdminCommunityStatisticsDailyPoint[];
    followers_split: AdminCommunityStatisticsSplit[];
    hourly_activity: AdminCommunityStatisticsHourlyActivity[];
    hourly_activity_by_weekday: AdminCommunityStatisticsWeekdayHourlyActivity[];
    posts_by_content_format: CommunitiesPostContentFormatDistribution;
    replies_by_content_format: CommunitiesPostContentFormatDistribution;
    posts_by_author: AdminCommunityStatisticsSplit[];
    replies_by_author: AdminCommunityStatisticsSplit[];
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
