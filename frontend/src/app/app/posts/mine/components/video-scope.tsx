"use client";

import { type ReactNode, useCallback } from "react";
import { useInfiniteMyPosts } from "@/api/callers/posts";
import type { UserPostListItem } from "@/api/generator/types/posts";
import { ContentVideoScope } from "@/components/community/content-video-host";
import { flattenUserPostPages, PAGE_LIMIT } from "../modules/support";

export function MyPublicationsVideoScope({
  children,
  enabled,
  ownerId,
  visibleItems,
}: {
  children: ReactNode;
  enabled: boolean;
  ownerId?: string;
  visibleItems: UserPostListItem[];
}) {
  const query = useInfiniteMyPosts({ limit: PAGE_LIMIT, type: "all" }, enabled);
  const { fetchNextPage, refetch, isPending, isError } = query;
  const loadMore = useCallback(
    () => (isPending || isError ? refetch() : fetchNextPage()),
    [fetchNextPage, refetch, isPending, isError],
  );
  if (!enabled) return children;
  const loaded = flattenUserPostPages(query.data?.pages);
  const items = loaded.length ? loaded : visibleItems;
  return (
    <ContentVideoScope
      mode="profile"
      entries={items
        .filter(
          (item) =>
            (item.type === "reply" ? item.reply?.author.id : item.post.author.id) === ownerId,
        )
        .map((item) => ({
          postId: item.post.id,
          replyId: item.type === "reply" ? item.reply?.id : null,
        }))}
      hasNextPage={isPending || isError || Boolean(query.hasNextPage)}
      onLoadMore={loadMore}
    >
      {children}
    </ContentVideoScope>
  );
}
