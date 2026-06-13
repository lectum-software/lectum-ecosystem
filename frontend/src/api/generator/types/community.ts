export type CommunityListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  scope?: CommunityFeedScope;
};

export type CommunityPostsQuery = {
  page?: number;
  limit?: number;
  search?: string;
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

export type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  members_count: number;
  created_at: string;
  following?: boolean;
  membership_created_at?: string | null;
  posts_count?: number;
  new_posts_count?: number;
};

export type CommunityDetail = Community & {
  posts_count: number;
  following: boolean;
  membership_created_at: string | null;
};

export type CommunityAuthor = {
  id: string;
  name: string;
  avatar: string | null;
  role: string | null;
  type_label: string;
  verified: boolean;
  featured_badge: string | null;
  whatsapp_url: string | null;
};

export type CommunityProfessionalReply = {
  id: string;
  title: string | null;
  content: string;
  media_url: string | null;
  media_type: string | null;
  upvotes_count: number;
  created_at: string;
  author: CommunityAuthor;
};

export type CommunityPost = {
  id: string;
  title: string;
  content: string;
  anonymous: boolean;
  status: string;
  upvotes_count: number;
  downvotes_count: number;
  replies_count: number;
  saves_count: number;
  created_at: string;
  tags: string[];
  featured_badge: string | null;
  media_url: string | null;
  media_type: string | null;
  community: Community;
  author: CommunityAuthor;
  highlighted_professional_reply: CommunityProfessionalReply | null;
};

export type CommunityListResponse = {
  data: Community[];
  categories: string[];
  page: number;
  pages: number;
  count: number;
  scope?: CommunityFeedScope;
  following_count?: number;
  new_posts_today_count?: number;
};

export type CommunityPostsResponse = {
  community: Community;
  data: CommunityPost[];
  page: number;
  pages: number;
  count: number;
};

export type CommunityFeedResponse = {
  data: CommunityPost[];
  page: number;
  pages: number;
  count: number;
  scope: CommunityFeedScope;
  community_slug: string | null;
};

export type CommunityDetailResponse = {
  community: CommunityDetail;
  participation: {
    following: boolean;
    member_since: string | null;
    can_post: boolean;
  };
};

export type CommunityMembershipResponse = {
  community: CommunityDetail;
  following: boolean;
};

export type CommunityTopMentorsPeriod = {
  key: CommunityTopMentorsPeriodValue;
  label: string;
  start_at: string | null;
  end_at: string;
};

export type CommunityTopMentorMetrics = {
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

export type CommunityTopMentorBreakdown = {
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

export type CommunityTopMentor = {
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
  metrics: CommunityTopMentorMetrics;
  score_breakdown: CommunityTopMentorBreakdown;
};

export type CommunityTopMentorsResponse = {
  data: CommunityTopMentor[];
  period: CommunityTopMentorsPeriod;
  community: Community | null;
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

export type CreateCommunityPostPayload = {
  title: string;
  content: string;
  anonymous?: boolean;
};

export type SuggestCommunityPayload = {
  theme: string;
};

export type CommunitySuggestion = {
  id: string;
  theme: string;
  status: string;
  created_at: string;
};
