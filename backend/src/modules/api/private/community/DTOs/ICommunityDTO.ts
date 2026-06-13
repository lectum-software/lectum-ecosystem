import type { community, user } from "@/interfaces/objects";

export type CommunityListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
};

export type CommunityPostListQuery = {
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
  created_at: Date;
};

export type CommunityAuthorDTO = {
  id: string;
  name: string;
  avatar: string | null;
  role: string | null;
  type_label: string;
  verified: boolean;
  featured_badge: string | null;
  whatsapp_url: string | null;
};

export type CommunityProfessionalReplyDTO = {
  id: string;
  content: string;
  upvotes_count: number;
  created_at: Date;
  author: CommunityAuthorDTO;
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
  community: CommunityDTO;
  author: CommunityAuthorDTO;
  highlighted_professional_reply: CommunityProfessionalReplyDTO | null;
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
};

export type ICommunityIndexDTO = {
  q: CommunityListQuery;
  auth?: user;
};

export type ICommunitySuggestionDTO = {
  b: CommunitySuggestionBody;
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

export const toCommunityDTO = (item: community & { id: string; name: string; slug: string }) => ({
  id: item.id,
  name: item.name,
  slug: item.slug,
  description: item.description ?? null,
  category: item.category ?? null,
  members_count: item.members_count ?? 0,
  created_at: item.createdAt ?? new Date(0),
});
