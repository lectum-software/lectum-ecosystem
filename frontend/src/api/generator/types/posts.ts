import type { Community, CommunityAuthor } from "./community";

export type PostDetail = {
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
  current_user_vote: 1 | -1 | null;
  saved: boolean;
  community: Community;
  author: CommunityAuthor;
};

export type PostReply = {
  id: string;
  title: string | null;
  content: string;
  media_url: string | null;
  media_type: string | null;
  upvotes_count: number;
  created_at: string;
  parent_reply_id: string | null;
  current_user_vote: 1 | -1 | null;
  author: CommunityAuthor;
  replies: PostReply[];
};

export type PostDetailResponse = {
  post: PostDetail;
};

export type PostRepliesQuery = {
  page?: number;
  limit?: number;
};

export type PostRepliesResponse = {
  data: PostReply[];
  page: number;
  pages: number;
  count: number;
};

export type CreatePostReplyPayload = {
  content: string;
  parentReplyId?: string;
};

export type PostVotePayload = {
  value: 1 | -1;
  replyId?: string;
};

export type PostVoteResponse = {
  target_type: "post" | "reply";
  post_id: string;
  reply_id: string | null;
  value: 1 | -1 | null;
  upvotes_count: number;
  downvotes_count: number | null;
};

export type PostSaveResponse = {
  post_id: string;
  saved: boolean;
  saves_count: number;
};
