import type { AdminCommunityIdentity } from "./detail";

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
