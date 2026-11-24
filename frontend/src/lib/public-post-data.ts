import { cache } from "react";
import keys from "@/api/cache/keys";
import type {
  PostDetailResponse,
  PostRepliesResponse,
  PostReply,
} from "@/api/generator/types/posts";
import type { VideoAssetPlaybackResponse } from "@/api/generator/types/video-assets";
import { getPublicApiSource } from "@/utils/public-asset-sources";
import { videoAssetIdFromReference, videoAssetPlaybackApiPaths } from "@/utils/video-stream";

export const PUBLIC_REPLY_PAGE_SIZE = 8;

async function readPublic<T>(path: string): Promise<T | null> {
  const api = getPublicApiSource()?.origin;
  if (!api) return null;
  try {
    // Only anonymous reads: never forward the visitor's cookies or authorization.
    const response = await fetch(`${api}${path}`, {
      cache: "no-store",
      credentials: "omit",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { success: boolean; data?: T };
    return body.success ? (body.data ?? null) : null;
  } catch {
    return null;
  }
}

export const getPublicPostData = cache(async (id: string, slug: string, replyId?: string) => {
  const path = `/api/private/posts/${encodeURIComponent(id)}`;
  const detail = await readPublic<PostDetailResponse>(path);
  if (!detail?.post || detail.post.community.slug !== slug) return null;
  const queries: { queryKey: unknown[]; data: unknown }[] = [
    { queryKey: keys.posts.detail(id), data: detail },
  ];
  const replies = replyId
    ? await readPublic<PostReply>(`${path}/replies/${encodeURIComponent(replyId)}/thread`)
    : await readPublic<PostRepliesResponse>(
        `${path}/replies?page=1&limit=${PUBLIC_REPLY_PAGE_SIZE}`,
      );
  let tree: PostReply[] = [];
  if (replies) {
    if (replyId && "id" in replies) {
      tree = [replies];
      queries.push({ queryKey: ["posts", id, "reply-thread", replyId], data: { reply: replies } });
    } else if ("data" in replies) {
      tree = replies.data;
      queries.push({
        queryKey: keys.posts.replies(id, { page: 1, limit: PUBLIC_REPLY_PAGE_SIZE }),
        data: replies,
      });
    }
  }
  const references = new Set<string>();
  const collect = (reference: string | null) => {
    const asset = videoAssetIdFromReference(reference);
    if (asset) references.add(asset);
  };
  collect(detail.post.media_url);
  for (const media of detail.post.media_items) collect(media.media_url);
  const visit = (items: PostReply[]) => {
    for (const item of items) {
      collect(item.media_url);
      visit(item.replies ?? []);
    }
  };
  visit(tree);
  const assets = [...references];
  for (let offset = 0; offset < assets.length; offset += 4) {
    const batch = await Promise.all(
      assets.slice(offset, offset + 4).map(async (asset) => {
        const playback = await readPublic<VideoAssetPlaybackResponse>(
          videoAssetPlaybackApiPaths(asset).public,
        );
        return playback ? { queryKey: keys.videoAssets.playback(asset), data: playback } : null;
      }),
    );
    for (const query of batch) if (query) queries.push(query);
  }
  return { queries };
});
