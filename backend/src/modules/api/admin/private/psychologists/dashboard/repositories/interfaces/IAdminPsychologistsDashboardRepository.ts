import type { Prisma } from "@/external/generated/prisma/client";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardDirectoryFilters,
} from "../../DTOs/IAdminPsychologistsDashboardDTO";

export type AdminPsychologistSubscriptionRecord = {
  createdAt: Date;
  current_period_end: Date | null;
  gateway: string | null;
  gateway_subscription_id?: string | null;
  grant_started_at: Date | null;
  id: string;
  plan: {
    name: string;
    price_cents: number;
    slug: string;
  };
  source: string;
  status: string;
  updatedAt: Date;
};

export type AdminPsychologistProfileRecord = {
  accepts_insurance: boolean;
  academic_formations: Prisma.JsonValue | null;
  academic_graduation_year: string | null;
  academic_institution: string | null;
  academic_title: string | null;
  available_days: Prisma.JsonValue | null;
  bio: string | null;
  cfp_verified_at: Date | null;
  cover_image_url: string | null;
  cpf: string | null;
  createdAt: Date;
  crp: string | null;
  crp_registration_date: Date | null;
  crp_status: string;
  discount_first_session: boolean;
  gender: string | null;
  headline: string | null;
  id: string;
  languages: Prisma.JsonValue | null;
  modality: string | null;
  professional_address_city: string | null;
  professional_address_state: string | null;
  published: boolean;
  race_color: string | null;
  rating_avg: number;
  rating_count: number;
  religion: string | null;
  show_experience_tag: boolean;
  social_value: boolean;
  subscriptions: AdminPsychologistSubscriptionRecord[];
  target_audience: Prisma.JsonValue | null;
  updatedAt: Date;
  user: {
    avatar: string | null;
    createdAt: Date;
    email: string;
    id: string;
    name: string;
    provider: string | null;
    psychologist_approaches: Array<{
      approach: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
    psychologist_services: Array<{
      service: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
    psychologist_specialties: Array<{
      specialty: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
  };
  user_id: string;
  video_url: string | null;
  whatsapp: string | null;
};

export type AdminPsychologistDeletedAccountRecord = {
  createdAt: Date;
  deletedAt: Date | null;
  id: string;
};

export type AdminPsychologistRankingCandidateRecord = Omit<
  AdminPsychologistProfileRecord,
  "subscriptions"
> & {
  subscriptions: Array<{
    id: string;
    source: string | null;
  }>;
};

export type AdminPsychologistEventRecord = {
  createdAt: Date;
  psychologist_id: string;
};

export type AdminPsychologistCountRecord = {
  count: number;
  psychologist_id: string;
};

export type AdminPsychologistAttentionRecord = {
  attention_seconds: number;
  psychologist_id: string;
};

export type AdminPsychologistContentAttentionRecord = AdminPsychologistAttentionRecord & {
  target_type: "post" | "reply";
};

export type AdminPsychologistReceivedEngagementEventRecord = AdminPsychologistEventRecord & {
  type:
    | "comment_received"
    | "content_save"
    | "content_share"
    | "positive_vote"
    | "profile_favorite"
    | "profile_follow";
};

export type AdminPsychologistPlatformPageViewRecord = {
  duration_seconds: number | null;
  normalized_path: string;
  occurred_at: Date;
  page_kind: string;
  path: string;
  session_id: string;
  user_id: string | null;
};

export type AdminPsychologistPlatformSessionRecord = {
  device_type: string;
  os: string | null;
  session_id: string;
  user_id: string | null;
};

export type AdminPsychologistPreSignupConversionPageViewRecord = {
  normalized_path: string;
  occurred_at: Date;
  page_kind: string;
  path: string;
  session_id: string;
  user: {
    createdAt: Date;
    id: string;
    role: string;
  } | null;
  user_id: string | null;
  visitor_id: string | null;
};

export type AdminPsychologistPreSignupConversionSessionRecord = {
  first_seen_at: Date;
  last_seen_at: Date;
  session_id: string;
  user: {
    createdAt: Date;
    id: string;
    role: string;
  } | null;
  user_id: string | null;
  visitor_id: string | null;
};

export type AdminPsychologistSignupAnalyticsIdentityRecord = {
  createdAt: Date;
  data: Prisma.JsonValue | null;
  user_id: string;
};

export type AdminPsychologistPlatformPwaInstallRecord = {
  occurred_at: Date;
  user_id: string | null;
};

export type AdminPsychologistPublicProfilePageViewRecord = {
  occurred_at: Date;
  session_id: string;
  target_id: string | null;
  traffic_source: string | null;
};

export type AdminPsychologistWhatsappTrafficActionRecord = {
  action_type: string;
  occurred_at: Date;
  page_kind: string;
  path: string | null;
  session_id: string;
  target_id: string | null;
  target_type: string | null;
  user_id: string | null;
};

export type AdminPsychologistTrafficCommunityPostRecord = {
  author_id: string;
  id: string;
  media_items: { media_type: string | null }[];
  media_type: string | null;
};

export type AdminPsychologistTrafficCommunityReplyRecord = {
  author_id: string;
  id: string;
  media_type: string | null;
};

export type AdminPsychologistCommunityTrafficPlatformPostRecord = {
  author_id: string;
  createdAt: Date;
  id: string;
  media_items: { media_type: string | null }[];
  media_type: string | null;
};

export type AdminPsychologistCommunityTrafficPlatformReplyRecord = {
  author_id: string;
  createdAt: Date;
  id: string;
  media_type: string | null;
  parent_reply_id: string | null;
  post: {
    author: {
      role: string;
    };
    author_id: string;
    createdAt: Date;
    id: string;
  };
  post_id: string;
};

export type AdminPsychologistCommunityTrafficPlatformPageViewRecord = {
  occurred_at: Date;
  session_id: string;
  target_id: string | null;
  target_type: string | null;
};

export type AdminPsychologistCommunityTrafficPlatformVideoWatchRecord = {
  duration_seconds: number;
  target_id: string;
  target_type: string;
  watched_seconds: number;
};

export type AdminPsychologistCommunityTrafficPlatformAttentionRecord = {
  attention_seconds: number;
  target_id: string;
  target_type: string;
};

export type AdminPsychologistCommunityTrafficPlatformVoteRecord = {
  post_id: string | null;
  reply_id: string | null;
  value: number;
};

export type AdminPsychologistCommunityTrafficPlatformPostSaveRecord = {
  post_id: string;
};

export type AdminPsychologistCommunityTrafficPlatformReplySaveRecord = {
  reply_id: string;
};

export type AdminPsychologistCommunityTrafficPlatformShareRecord = {
  post_id: string;
  reply_id: string | null;
};

export type AdminPsychologistCommunityTrafficPlatformCommentRecord = {
  parent_reply_id: string | null;
  post_id: string;
};

export type AdminPsychologistCommunityTrafficPlatformDataset = {
  attentionSessions: AdminPsychologistCommunityTrafficPlatformAttentionRecord[];
  comments: AdminPsychologistCommunityTrafficPlatformCommentRecord[];
  pageViews: AdminPsychologistCommunityTrafficPlatformPageViewRecord[];
  posts: AdminPsychologistCommunityTrafficPlatformPostRecord[];
  postSaves: AdminPsychologistCommunityTrafficPlatformPostSaveRecord[];
  replies: AdminPsychologistCommunityTrafficPlatformReplyRecord[];
  replySaves: AdminPsychologistCommunityTrafficPlatformReplySaveRecord[];
  shares: AdminPsychologistCommunityTrafficPlatformShareRecord[];
  videoWatchSessions: AdminPsychologistCommunityTrafficPlatformVideoWatchRecord[];
  votes: AdminPsychologistCommunityTrafficPlatformVoteRecord[];
};

export type AdminPsychologistProfileTrafficPlatformProfileViewRecord = {
  psychologist_id: string;
};

export type AdminPsychologistProfileTrafficPlatformPageViewRecord = {
  duration_seconds: number | null;
  target_id: string | null;
  user_id: string | null;
};

export type AdminPsychologistProfileTrafficPlatformFavoriteRecord = {
  psychologist_id: string;
};

export type AdminPsychologistProfileTrafficPlatformVideoWatchRecord = {
  completed: boolean;
  duration_seconds: number;
  max_position_seconds: number;
  milestone_100: boolean;
  psychologist_id: string;
  replay_count: number;
  viewer_id: string | null;
  watched_seconds: number;
};

export type AdminPsychologistProfileTrafficPlatformTabActionRecord = {
  action_type: string;
  target_id: string | null;
  user_id: string | null;
};

export type AdminPsychologistProfileTrafficPlatformVideoActionRecord = {
  action_type: string;
  path: string | null;
  target_id: string | null;
  user_id: string | null;
};

export type AdminPsychologistProfileTrafficPlatformDataset = {
  favorites: AdminPsychologistProfileTrafficPlatformFavoriteRecord[];
  pageViews: AdminPsychologistProfileTrafficPlatformPageViewRecord[];
  profileViews: AdminPsychologistProfileTrafficPlatformProfileViewRecord[];
  tabActions: AdminPsychologistProfileTrafficPlatformTabActionRecord[];
  videoActions: AdminPsychologistProfileTrafficPlatformVideoActionRecord[];
  videoWatchSessions: AdminPsychologistProfileTrafficPlatformVideoWatchRecord[];
};

export type AdminPsychologistDirectoryFilterSearchRecord = {
  target_id: string | null;
  target_type: string | null;
};

export interface IAdminPsychologistsDashboardRepository {
  listReceivedEngagementEvents(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistReceivedEngagementEventRecord[]>;
  listFavoriteEvents(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistEventRecord[]>;
  listProfileViews(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistEventRecord[]>;
  listProfileAttentionSeconds(
    range: AdminPsychologistsDashboardDateRange,
    psychologistIds: string[],
  ): Promise<AdminPsychologistAttentionRecord[]>;
  listProfileVideoAttentionSeconds(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistAttentionRecord[]>;
  listCommunityContentAttentionSeconds(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistContentAttentionRecord[]>;
  listSearchResultImpressionCounts(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistCountRecord[]>;
  listQualifiedVideoViewCounts(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistCountRecord[]>;
  listCommunityPostViewCounts(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistCountRecord[]>;
  listCommunityReplyViewCounts(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistCountRecord[]>;
  listDirectoryFilters(): Promise<AdminPsychologistsDashboardDirectoryFilters>;
  listDirectoryFilterSearchActions(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistDirectoryFilterSearchRecord[]>;
  listPlatformPageViews(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistPlatformPageViewRecord[]>;
  listPlatformSessions(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistPlatformSessionRecord[]>;
  listPreSignupConversionLinkedPageViews(
    psychologistIds: string[],
  ): Promise<AdminPsychologistPreSignupConversionPageViewRecord[]>;
  listPreSignupConversionLinkedSessions(
    psychologistIds: string[],
  ): Promise<AdminPsychologistPreSignupConversionSessionRecord[]>;
  listPreSignupConversionPageViewsByVisitorIds(
    visitorIds: string[],
    psychologistIds: string[],
    maxOccurredAt: Date | null,
  ): Promise<AdminPsychologistPreSignupConversionPageViewRecord[]>;
  listPreSignupConversionSessionsByVisitorIds(
    visitorIds: string[],
    psychologistIds: string[],
    maxFirstSeenAt: Date | null,
  ): Promise<AdminPsychologistPreSignupConversionSessionRecord[]>;
  listPreSignupConversionSignupIdentities(
    psychologistIds: string[],
  ): Promise<AdminPsychologistSignupAnalyticsIdentityRecord[]>;
  listPlatformPwaInstallActions(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistPlatformPwaInstallRecord[]>;
  listPublicProfilePageViews(
    range: AdminPsychologistsDashboardDateRange,
    psychologistIds: string[],
  ): Promise<AdminPsychologistPublicProfilePageViewRecord[]>;
  listTrafficCommunityPosts(
    postIds: string[],
  ): Promise<AdminPsychologistTrafficCommunityPostRecord[]>;
  listTrafficCommunityReplies(
    replyIds: string[],
  ): Promise<AdminPsychologistTrafficCommunityReplyRecord[]>;
  listWhatsappTrafficActions(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistWhatsappTrafficActionRecord[]>;
  listCommunityTrafficPlatformMetricDataset(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistCommunityTrafficPlatformDataset>;
  listProfileTrafficPlatformMetricDataset(
    range: AdminPsychologistsDashboardDateRange,
    psychologistIds: string[],
  ): Promise<AdminPsychologistProfileTrafficPlatformDataset>;
  listDeletedPsychologistAccounts(): Promise<AdminPsychologistDeletedAccountRecord[]>;
  listPsychologistProfiles(): Promise<AdminPsychologistProfileRecord[]>;
  listPublicRankingCandidates(): Promise<AdminPsychologistRankingCandidateRecord[]>;
  listPublishedReviews(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistEventRecord[]>;
  listWhatsappContactRequests(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistEventRecord[]>;
}
