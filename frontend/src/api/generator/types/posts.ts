import type { Community, CommunityAuthor, CommunityPostMediaItem } from "./community";

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
  edited_at: string | null;
  tags: string[];
  featured_badge: string | null;
  media_url: string | null;
  media_type: string | null;
  thumbnail_url: string | null;
  media_items: CommunityPostMediaItem[];
  current_user_vote: 1 | -1 | null;
  saved: boolean;
  muted_by_current_user: boolean;
  has_psychologist_reply: boolean;
  community: Community;
  author: CommunityAuthor;
};

export type PostReply = {
  id: string;
  title: string | null;
  content: string;
  media_url: string | null;
  media_type: string | null;
  thumbnail_url: string | null;
  upvotes_count: number;
  downvotes_count: number;
  replies_count: number;
  created_at: string;
  edited_at: string | null;
  parent_reply_id: string | null;
  is_post_author: boolean;
  current_user_vote: 1 | -1 | null;
  saved: boolean;
  author: CommunityAuthor;
  replies: PostReply[];
};

export type UserPostsType = "all" | "posts" | "replies";

export type UserPostsQuery = {
  page?: number;
  limit?: number;
  type?: UserPostsType;
};

export type PostProfessionalReply = {
  id: string;
  title: string | null;
  content: string;
  media_url: string | null;
  media_type: string | null;
  thumbnail_url: string | null;
  upvotes_count: number;
  created_at: string;
  edited_at: string | null;
  parent_reply_id: string | null;
  parent_content: string | null;
  saved: boolean;
  author: CommunityAuthor;
};

export type PostListPost = PostDetail & {
  highlighted_professional_reply: PostProfessionalReply | null;
};

export type UserPostReply = {
  id: string;
  title: string | null;
  content: string;
  media_url: string | null;
  media_type: string | null;
  thumbnail_url: string | null;
  upvotes_count: number;
  downvotes_count: number;
  saves_count: number;
  replies_received_count: number;
  has_verified_professional_reply: boolean;
  created_at: string;
  edited_at: string | null;
  parent_reply_id: string | null;
  parent_content: string | null;
  current_user_vote: 1 | -1 | null;
  saved: boolean;
  author: CommunityAuthor;
};

export type UserPostListItem = {
  id: string;
  type: "post" | "reply";
  created_at: string;
  saved_at: string | null;
  status: string;
  saved: boolean;
  post: PostListPost;
  reply: UserPostReply | null;
};

export type PostDetailResponse = {
  post: PostDetail;
};

export type PostRepliesQuery = {
  focusReplyId?: string;
  page?: number;
  limit?: number;
};

export type PostRepliesResponse = {
  data: PostReply[];
  page: number;
  pages: number;
  count: number;
};

export type PostReplyThreadResponse = {
  reply: PostReply;
};

export type UserPostsResponse = {
  data: UserPostListItem[];
  items: UserPostListItem[];
  page: number;
  pages: number;
  count: number;
  total: number;
  limit: number;
};

export type CreatePostReplyPayload = {
  content: string;
  mediaType?: "image" | "video";
  mediaUrl?: string;
  thumbnailUrl?: string;
  parentReplyId?: string;
};

export type UpdatePostPayload = {
  title: string;
  content: string;
  mediaType?: "image" | "video" | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaItems?: Array<{
    mediaType: "image";
    mediaUrl: string;
    position?: number;
  }> | null;
};

export type PostUpdateResponse = PostDetail;

export type UpdatePostReplyPayload = {
  content: string;
  mediaType?: "image" | "video" | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
};

export type PostReplyUpdateResponse = PostReply;

export type PostReplyMediaUploadResponse = {
  media_url: string;
  media_type: "image" | "video";
};

export type PostReplyMediaMultipartInitiatePayload = {
  fileName: string;
  mimeType: string;
  size: number;
};

export type PostReplyMediaMultipartInitiateResponse = {
  chunk_size: number;
  max_file_size: number;
  upload_session_id: string;
};

export type PostReplyMediaMultipartPartResponse = {
  part_id?: string;
  part_number: number;
  part_token?: string;
};

export type PostReplyMediaMultipartCompletePayload = {
  parts: Array<{
    partNumber: number;
    partId: string;
  }>;
  uploadSessionId: string;
};

export type PostReportReason = "spam" | "abuse" | "self_harm" | "privacy" | "other";

export type PostReportPayload = {
  description?: string;
  reason: PostReportReason;
};

export type PostReportResponse = {
  id: string;
  post_id: string;
  reply_id: string | null;
  target_id: string;
  target_type: "post" | "reply";
  reason: PostReportReason | string;
  description: string | null;
  status: string;
  created_at: string;
};

export type PostReplyDeleteResponse = {
  post_id: string;
  reply_ids: string[];
  deleted_count: number;
  replies_count: number;
};

export type PostDeleteResponse = {
  post_id: string;
  deleted: boolean;
  replies_deleted_count: number;
};

export type PostMuteResponse = {
  post_id: string;
  muted: boolean;
};

export type PostVotePayload = {
  value: 1 | -1;
  replyId?: string;
};

export type PostSharePayload = {
  channel?: "clipboard" | "web_share";
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

export type PostShareResponse = {
  id: string;
  post_id: string;
  reply_id: string | null;
  target_type: "post" | "reply";
  notification_event_id: string | null;
  shared: boolean;
};

export type PostShareArtifactResponse = {
  available: boolean;
  artifact_url: string | null;
  content_type: string | null;
  expires_at: string | null;
  file_name: string | null;
  size_bytes: number | null;
};

export type PostSaveResponse = {
  target_type: "post" | "reply";
  post_id: string;
  reply_id: string | null;
  saved: boolean;
  saves_count: number | null;
};
