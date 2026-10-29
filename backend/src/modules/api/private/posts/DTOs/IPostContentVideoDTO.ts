import type { user } from "@/interfaces/objects";
import type { PostAuthorDTO, PostCommunityDTO, PostParams } from "./IPostDTO";

export type PostContentVideosQuery = {
  page?: number;
  limit?: number;
  /** Keep this value on every page of the same queue. */
  focusReplyId?: string;
  /** Required after page one. Continue using the previous response's next_cursor. */
  cursor?: string;
};

export type IPostContentVideosDTO = {
  p: PostParams;
  q: PostContentVideosQuery;
  auth?: user;
};

export type PostContentVideo = {
  id: string;
  post_id: string;
  reply_id: string | null;
  media_item_id: string | null;
  media_url: string;
  thumbnail_url: string | null;
  content: string;
  title: string | null;
  author: PostAuthorDTO;
  upvotes_count: number;
  current_user_vote: 1 | -1 | null;
  saved: boolean;
  replies_count: number;
  responding_to: { id: string; title: string | null; content: string } | null;
  community: PostCommunityDTO;
};

export type PostContentVideosResponse = {
  data: PostContentVideo[];
  page: number;
  pages: number;
  count: number;
  /** Null ends this immutable-order queue. Snapshot count/pages can include subsequently removed slots. */
  next_cursor: string | null;
};
