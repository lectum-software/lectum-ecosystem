import type { InfiniteData } from "@tanstack/react-query";
import type { UserPostsResponse } from "@/api/generator/types/posts";
import type { ReplyProfileVisibility } from "@/api/req/posts/reply-profile-visibility";

export type MineVisibilityCache = UserPostsResponse | InfiniteData<UserPostsResponse>;

export const updateReplyProfileVisibilityCache = (
  old: MineVisibilityCache | undefined,
  updated: ReplyProfileVisibility,
): MineVisibilityCache | undefined => {
  if (!old) return old;
  const updatePage = (page: UserPostsResponse): UserPostsResponse => {
    const updateItems = (items: UserPostsResponse["items"]) =>
      items.map((item) =>
        item.post.id === updated.post_id && item.reply?.id === updated.reply_id
          ? { ...item, reply: { ...item.reply, hidden_from_profile: updated.hidden_from_profile } }
          : item,
      );
    return { ...page, data: updateItems(page.data), items: updateItems(page.items) };
  };
  return "pageParams" in old ? { ...old, pages: old.pages.map(updatePage) } : updatePage(old);
};
