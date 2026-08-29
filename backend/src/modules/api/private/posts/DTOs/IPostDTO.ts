import type { user } from "@/interfaces/objects";

export type PostParams = {
  id: string;
};

export type PostReplyParams = PostParams & {
  replyId: string;
};

export type PostRepliesQuery = {
  focusReplyId?: string;
  page?: number;
  limit?: number;
};

export type PostListQuery = {
  page?: number;
  limit?: number;
  type?: "all" | "posts" | "replies";
};

export type PostCreateReplyBody = {
  content?: string | null;
  mediaType?: "image" | "video";
  mediaUrl?: string;
  parentReplyId?: string;
  thumbnailUrl?: string;
};

export type PostUpdateReplyBody = {
  content?: string | null;
  mediaType?: "image" | "video" | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
};

export type PostUpdateBody = {
  title: string;
  content: string;
  mediaType?: "image" | "video" | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaItems?: PostMediaItemInput[] | null;
};

export type PostReportBody = {
  description?: string;
  reason: string;
};

export type PostShareBody = {
  channel?: "clipboard" | "web_share";
  replyId?: string;
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
  anonymous: boolean;
  crp: string | null;
  verified: boolean;
  featured_badge: string | null;
  whatsapp_name: string | null;
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
  edited_at: Date | null;
  tags: string[];
  featured_badge: string | null;
  media_url: string | null;
  media_type: string | null;
  thumbnail_url: string | null;
  media_items: PostMediaItemDTO[];
  current_user_vote: 1 | -1 | null;
  saved: boolean;
  muted_by_current_user: boolean;
  has_psychologist_reply: boolean;
  community: PostCommunityDTO;
  author: PostAuthorDTO;
};

export type PostMediaItemInput = {
  mediaType: "image";
  mediaUrl: string;
  position?: number;
};

export type PostMediaItemDTO = {
  id: string | null;
  media_url: string;
  media_type: "image" | "video";
  thumbnail_url: string | null;
  position: number;
};

export type PostReplyDTO = {
  id: string;
  title: string | null;
  content: string;
  media_url: string | null;
  media_type: string | null;
  thumbnail_url: string | null;
  upvotes_count: number;
  downvotes_count: number;
  replies_count: number;
  created_at: Date;
  edited_at: Date | null;
  parent_reply_id: string | null;
  is_post_author: boolean;
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
  thumbnail_url: string | null;
  upvotes_count: number;
  created_at: Date;
  edited_at: Date | null;
  parent_reply_id: string | null;
  parent_content: string | null;
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
  media_url: string | null;
  media_type: string | null;
  thumbnail_url: string | null;
  upvotes_count: number;
  downvotes_count: number;
  saves_count: number;
  replies_received_count: number;
  has_verified_professional_reply: boolean;
  created_at: Date;
  edited_at: Date | null;
  parent_reply_id: string | null;
  parent_content: string | null;
  current_user_vote: 1 | -1 | null;
  saved: boolean;
  author: PostAuthorDTO;
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

export type PostReplyMediaType = PostReplyMediaUploadResponse["media_type"];

export type PostReplyMediaMultipartInitiateBody = {
  fileName?: string;
  mimeType: string;
  size: number;
};

export type PostReplyMediaMultipartPartBody = {
  partNumber: number | string;
  uploadSessionId: string;
};

export type PostReplyMediaMultipartCompleteBody = {
  parts: Array<{
    partNumber: number;
    partId?: string;
    partToken?: string;
  }>;
  uploadSessionId: string;
};

export type PostReplyMediaMultipartAbortBody = {
  uploadSessionId: string;
};

export type PostReplyMediaMultipartInitiateResponse = {
  chunk_size: number;
  max_file_size: number;
  upload_session_id: string;
};

export type PostReplyMediaMultipartPartResponse = {
  part_id: string;
  part_number: number;
  part_token?: string;
};

export type PostReportResponse = {
  id: string;
  post_id: string;
  reply_id: string | null;
  target_id: string;
  target_type: "post" | "reply";
  reason: string;
  description: string | null;
  status: string;
  created_at: Date;
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
  expires_at: Date | null;
  file_name: string | null;
  size_bytes: number | null;
};

export type PostShareRenderProfessionalDTO = {
  name: string;
  roleLabel: "Psicóloga" | "Psicólogo";
  verified: boolean;
};

export type PostShareRenderTargetDTO = {
  cardLabel: "Postado na Lectum" | "Respondido na Lectum";
  mediaUrl: string;
  postId: string;
  professional: PostShareRenderProfessionalDTO;
  replyId: string | null;
  responseText: string | null;
  shareTitle: string;
  sourceText: string;
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

export type PostMutationResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "not_found" }
  | { kind: "invalid_parent" }
  | { kind: "invalid_media" }
  | { kind: "invalid_content" }
  | { kind: "media_not_allowed" }
  | { kind: "invalid_target" }
  | { kind: "forbidden" }
  | { kind: "professional_replies_block" };

export type IPostShowDTO = {
  p: PostParams;
  auth?: user;
};

export type IPostRepliesDTO = {
  p: PostParams;
  q: PostRepliesQuery;
  auth?: user;
};

export type IPostReplyThreadDTO = {
  p: PostReplyParams;
  auth?: user;
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

export type IPostUpdateDTO = {
  p: PostParams;
  b: PostUpdateBody;
  auth: user;
};

export type IPostUpdateReplyDTO = {
  p: PostReplyParams;
  b: PostUpdateReplyBody;
  auth: user;
};

export type IPostUploadReplyMediaDTO = {
  p: PostParams;
  auth: user;
  file?: Express.Multer.File & { key?: string; path?: string };
};

export type IPostShareArtifactDTO = {
  p: PostParams & { replyId?: string };
  auth?: user;
};

export type IPostRenderShareArtifactDTO = {
  p: PostParams & { replyId?: string };
  auth: user;
};

export type IPostUploadShareArtifactDTO = {
  p: PostParams & { replyId?: string };
  auth: user;
  file?: Express.Multer.File & { key?: string; path?: string };
};

export type IPostInitiateReplyMediaMultipartDTO = {
  p: PostParams;
  b: PostReplyMediaMultipartInitiateBody;
  auth: user;
};

export type IPostUploadReplyMediaMultipartPartDTO = {
  p: PostParams;
  b: PostReplyMediaMultipartPartBody;
  auth: user;
  file?: Express.Multer.File;
};

export type IPostCompleteReplyMediaMultipartDTO = {
  p: PostParams;
  b: PostReplyMediaMultipartCompleteBody;
  auth: user;
};

export type IPostAbortReplyMediaMultipartDTO = {
  p: PostParams;
  b: PostReplyMediaMultipartAbortBody;
  auth: user;
};

export type IPostReportDTO = {
  p: PostParams & { replyId?: string };
  b: PostReportBody;
  auth: user;
};

export type IPostVoteDTO = {
  p: PostParams;
  b: PostVoteBody;
  auth: user;
};

export type IPostShareDTO = {
  p: PostParams & { replyId?: string };
  b: PostShareBody;
  auth?: user;
  headers?: Record<string, string | string[] | undefined>;
};

export type IPostSaveDTO = {
  p: PostParams;
  auth: user;
};

export type IPostDeleteDTO = {
  p: PostParams;
  auth: user;
};

export type IPostMuteDTO = {
  p: PostParams;
  auth: user;
};

export type IPostReplySaveDTO = {
  p: PostReplyParams;
  auth: user;
};

export type IPostReplyDeleteDTO = {
  p: PostReplyParams;
  auth: user;
};
