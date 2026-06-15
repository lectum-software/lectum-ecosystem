import type { community, user } from "@/interfaces/objects";

export type CommunityListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  scope?: CommunityFeedScope;
};

export type CommunityPostListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sort?: "featured" | "new" | "commented" | "voted";
  period?: "week" | "month" | "year" | "all";
};

export type CommunityFeedScope = "all" | "following";

export type CommunityFeedQuery = {
  page?: number;
  limit?: number;
  search?: string;
  community?: string;
  scope?: CommunityFeedScope;
};

export type CommunityTopMentorsPeriodValue = "30d" | "90d" | "all";

export type CommunityTopMentorsQuery = {
  period?: CommunityTopMentorsPeriodValue;
  community?: string;
  limit?: number;
};

export type CommunityParams = {
  slug: string;
};

export type CommunitySuggestionBody = {
  theme: string;
};

export type CommunityCreatePostBody = {
  title: string;
  content: string;
  anonymous?: boolean;
};

export type CommunityDTO = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  members_count: number;
  avatar_url: string | null;
  visual_primary_color: string | null;
  visual_primary_dark_color: string | null;
  visual_soft_color: string | null;
  visual_text_color: string | null;
  visual_gradient_color: string | null;
  created_at: Date;
  following?: boolean;
  membership_created_at?: Date | null;
  posts_count?: number;
  new_posts_count?: number;
};

export type CommunityDetailDTO = CommunityDTO & {
  posts_count: number;
  following: boolean;
  membership_created_at: Date | null;
};

export type CommunityAuthorDTO = {
  id: string;
  name: string;
  avatar: string | null;
  role: string | null;
  type_label: string;
  crp: string | null;
  verified: boolean;
  featured_badge: string | null;
  whatsapp_url: string | null;
};

export type CommunityProfessionalReplyDTO = {
  id: string;
  title: string | null;
  content: string;
  media_url: string | null;
  media_type: string | null;
  upvotes_count: number;
  created_at: Date;
  saved: boolean;
  author: CommunityAuthorDTO;
};

export type CommunitySortPeriodMetricsDTO = {
  week: number;
  month: number;
  year: number;
  all: number;
};

export type CommunityPostSortMetricsDTO = {
  comments: CommunitySortPeriodMetricsDTO;
  upvotes: CommunitySortPeriodMetricsDTO;
  psychologist_replies_count: number;
  top_mentor_replies_count: number;
  shares_count: number;
  penalty: number;
};

export type CommunityPostDTO = {
  id: string;
  title: string;
  content: string;
  anonymous: boolean;
  status: string;
  upvotes_count: number;
  downvotes_count: number;
  replies_count: number;
  saves_count: number;
  created_at: Date;
  tags: string[];
  featured_badge: string | null;
  media_url: string | null;
  media_type: string | null;
  current_user_vote: 1 | -1 | null;
  saved: boolean;
  community: CommunityDTO;
  author: CommunityAuthorDTO;
  highlighted_professional_reply: CommunityProfessionalReplyDTO | null;
  sort_metrics?: CommunityPostSortMetricsDTO;
};

export type CommunitySuggestionDTO = {
  id: string;
  theme: string;
  status: string;
  created_at: Date;
};

export type CommunityIndexResponse = {
  data: CommunityDTO[];
  categories: string[];
  page: number;
  pages: number;
  count: number;
  scope?: CommunityFeedScope;
  following_count?: number;
  new_posts_today_count?: number;
};

export type CommunityPostsResponse = {
  community: CommunityDTO;
  data: CommunityPostDTO[];
  page: number;
  pages: number;
  count: number;
};

export type CommunityFeedResponse = {
  data: CommunityPostDTO[];
  page: number;
  pages: number;
  count: number;
  scope: CommunityFeedScope;
  community_slug: string | null;
  following_count?: number;
};

export type CommunityDetailResponse = {
  community: CommunityDetailDTO;
  participation: {
    following: boolean;
    member_since: Date | null;
    can_post: boolean;
  };
};

export type CommunityMembershipResponse = {
  community: CommunityDetailDTO;
  following: boolean;
};

export type CommunityTopMentorsPeriod = {
  key: CommunityTopMentorsPeriodValue;
  label: string;
  start_at: Date | null;
  end_at: Date;
};

export type CommunityTopMentorMetricsDTO = {
  upvotes_received: number;
  downvotes_received: number;
  comments_received: number;
  shares_received: number;
  saves_received: number;
  community_whatsapp_clicks: number;
  posts_published: number;
  replies_published: number;
  active_days: number;
  removed_posts: number;
  removed_posts_penalty: number;
  participation_events: number;
};

export type CommunityTopMentorBreakdownDTO = {
  upvotes_points: number;
  downvotes_penalty: number;
  comments_points: number;
  shares_points: number;
  saves_points: number;
  community_whatsapp_points: number;
  posts_points: number;
  replies_points: number;
  active_days_points: number;
  removed_posts_penalty: number;
};

export type CommunityTopMentorDTO = {
  position: number;
  score: number;
  badge: string | null;
  professional: {
    id: string;
    name: string;
    avatar: string | null;
    headline: string | null;
    crp: string | null;
    rating_avg: number;
    rating_count: number;
    profile_url: string;
  };
  metrics: CommunityTopMentorMetricsDTO;
  score_breakdown: CommunityTopMentorBreakdownDTO;
};

export type CommunityTopMentorsResponse = {
  data: CommunityTopMentorDTO[];
  period: CommunityTopMentorsPeriod;
  community: CommunityDTO | null;
  formula: {
    upvote_weight: number;
    downvote_weight: number;
    comment_weight: number;
    share_weight: number;
    save_weight: number;
    community_whatsapp_weight: number;
    reply_weight: number;
    post_weight: number;
    active_day_weight: number;
    removed_post_penalty_step: number;
    description: string;
    notes: string[];
  };
  count: number;
};

export type ICommunityIndexDTO = {
  q: CommunityListQuery;
  auth?: user;
};

export type ICommunityShowDTO = {
  p: CommunityParams;
  auth: user;
};

export type ICommunitySuggestionDTO = {
  b: CommunitySuggestionBody;
  auth: user;
};

export type ICommunityMembershipDTO = {
  p: CommunityParams;
  auth: user;
};

export type ICommunityCreatePostDTO = {
  p: CommunityParams;
  b: CommunityCreatePostBody;
  auth: user;
};

export type ICommunityPostsDTO = {
  p: CommunityParams;
  q: CommunityPostListQuery;
  auth?: user;
};

export type ICommunityFeedDTO = {
  q: CommunityFeedQuery;
  auth?: user;
};

export type ICommunityTopMentorsDTO = {
  q: CommunityTopMentorsQuery;
  auth?: user;
};

export const toCommunityDTO = (item: community & { id: string; name: string; slug: string }) => ({
  id: item.id,
  name: item.name,
  slug: item.slug,
  description: item.description ?? null,
  category: item.category ?? null,
  members_count: item.members_count ?? 0,
  avatar_url: item.avatar_url ?? null,
  visual_primary_color: item.visual_primary_color ?? null,
  visual_primary_dark_color: item.visual_primary_dark_color ?? null,
  visual_soft_color: item.visual_soft_color ?? null,
  visual_text_color: item.visual_text_color ?? null,
  visual_gradient_color: item.visual_gradient_color ?? null,
  created_at: item.createdAt ?? new Date(0),
});
