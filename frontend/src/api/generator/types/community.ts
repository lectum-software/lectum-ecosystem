export type CommunityListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
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

export type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  members_count: number;
  created_at: string;
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
  content: string;
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
