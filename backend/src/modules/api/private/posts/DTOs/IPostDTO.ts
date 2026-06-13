import type { user } from "@/interfaces/objects";

export type PostParams = {
  id: string;
};

export type PostRepliesQuery = {
  page?: number;
  limit?: number;
};

export type PostCreateReplyBody = {
  content: string;
  parentReplyId?: string;
};

export type PostVoteBody = {
  value: 1 | -1;
  replyId?: string;
};

export type PostCommunityDTO = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  members_count: number;
  created_at: Date;
};

export type PostAuthorDTO = {
  id: string;
  name: string;
  avatar: string | null;
  role: string | null;
  type_label: string;
  verified: boolean;
  featured_badge: string | null;
  whatsapp_url: string | null;
};

export type PostDetailDTO = {
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
  community: PostCommunityDTO;
  author: PostAuthorDTO;
};

export type PostReplyDTO = {
  id: string;
  title: string | null;
  content: string;
  media_url: string | null;
  media_type: string | null;
  upvotes_count: number;
  created_at: Date;
  parent_reply_id: string | null;
  current_user_vote: 1 | -1 | null;
  author: PostAuthorDTO;
  replies: PostReplyDTO[];
};

export type PostDetailResponse = {
  post: PostDetailDTO;
};

export type PostRepliesResponse = {
  data: PostReplyDTO[];
  page: number;
  pages: number;
  count: number;
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

export type PostMutationResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "not_found" }
  | { kind: "invalid_parent" }
  | { kind: "invalid_target" };

export type IPostShowDTO = {
  p: PostParams;
  auth: user;
};

export type IPostRepliesDTO = {
  p: PostParams;
  q: PostRepliesQuery;
  auth: user;
};

export type IPostCreateReplyDTO = {
  p: PostParams;
  b: PostCreateReplyBody;
  auth: user;
};

export type IPostVoteDTO = {
  p: PostParams;
  b: PostVoteBody;
  auth: user;
};

export type IPostSaveDTO = {
  p: PostParams;
  auth: user;
};
