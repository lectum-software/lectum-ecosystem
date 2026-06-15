import type { user } from "@/interfaces/objects";

export type PostParams = {
  id: string;
};

export type PostReplyParams = PostParams & {
  replyId: string;
};

export type PostRepliesQuery = {
  page?: number;
  limit?: number;
};

export type PostListQuery = {
  page?: number;
  limit?: number;
  type?: "all" | "posts" | "replies";
};

export type PostCreateReplyBody = {
  content: string;
  mediaType?: "image" | "video";
  mediaUrl?: string;
  parentReplyId?: string;
};

export type PostReportBody = {
  description?: string;
  reason: string;
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
  following?: boolean;
};

export type PostAuthorDTO = {
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
  saved: boolean;
  author: PostAuthorDTO;
  replies: PostReplyDTO[];
};

export type PostProfessionalReplyDTO = {
  id: string;
  title: string | null;
  content: string;
  media_url: string | null;
  media_type: string | null;
  upvotes_count: number;
  created_at: Date;
  saved: boolean;
  author: PostAuthorDTO;
};

export type PostListPostDTO = PostDetailDTO & {
  highlighted_professional_reply: PostProfessionalReplyDTO | null;
};

export type PostListReplyDTO = {
  id: string;
  title: string | null;
  content: string;
  upvotes_count: number;
  created_at: Date;
  parent_reply_id: string | null;
  parent_content: string | null;
};

export type PostListItemDTO = {
  id: string;
  type: "post" | "reply";
  created_at: Date;
  saved_at: Date | null;
  status: string;
  saved: boolean;
  post: PostListPostDTO;
  reply: PostListReplyDTO | null;
};

export type PostDetailResponse = {
  post: PostDetailDTO;
};

export type PostListResponse = {
  data: PostListItemDTO[];
  items: PostListItemDTO[];
  page: number;
  pages: number;
  count: number;
  total: number;
  limit: number;
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
  target_type: "post" | "reply";
  post_id: string;
  reply_id: string | null;
  saved: boolean;
  saves_count: number | null;
  notification_event_id?: string | null;
};

export type PostReplyMediaUploadResponse = {
  media_url: string;
  media_type: "image" | "video";
};

export type PostReportResponse = {
  id: string;
  post_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: Date;
};

export type PostMutationResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "not_found" }
  | { kind: "invalid_parent" }
  | { kind: "invalid_media" }
  | { kind: "media_not_allowed" }
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

export type IPostMineDTO = {
  q: PostListQuery;
  auth: user;
};

export type IPostSavedDTO = {
  q: PostListQuery;
  auth: user;
};

export type IPostCreateReplyDTO = {
  p: PostParams;
  b: PostCreateReplyBody;
  auth: user;
};

export type IPostUploadReplyMediaDTO = {
  p: PostParams;
  auth: user;
  file?: Express.Multer.File & { key?: string; path?: string };
};

export type IPostReportDTO = {
  p: PostParams;
  b: PostReportBody;
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

export type IPostReplySaveDTO = {
  p: PostReplyParams;
  auth: user;
};
