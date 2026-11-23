import type { ContentVideoSourceEntry } from "./content-video-context";

const validId = (value: string | null): value is string =>
  Boolean(value && value.length <= 250 && /^[a-zA-Z0-9:_-]+$/.test(value));

export function contentVideoHref(
  href: string,
  entry: ContentVideoSourceEntry & { videoId: string },
) {
  const url = new URL(href, "https://lectum.invalid");
  if (entry.communitySlug && /^\/comunidades\/[^/]+\/publicacao\//.test(url.pathname))
    url.pathname = `/comunidades/${encodeURIComponent(entry.communitySlug)}/publicacao/${encodeURIComponent(entry.postId)}`;
  url.searchParams.set("reel", entry.videoId);
  url.searchParams.set("reelPost", entry.postId);
  if (entry.replyId) url.searchParams.set("reelReply", entry.replyId);
  else url.searchParams.delete("reelReply");
  url.hash = "";
  return url.pathname + url.search;
}

export function contentVideoShareHref(
  entry: ContentVideoSourceEntry & { videoId: string; communitySlug: string },
) {
  return contentVideoHref(
    `/comunidades/${encodeURIComponent(entry.communitySlug)}/publicacao/${encodeURIComponent(entry.postId)}`,
    entry,
  );
}

export function readContentVideoLink(href: string): ContentVideoSourceEntry | null {
  const url = new URL(href, "https://lectum.invalid");
  const videoId = url.searchParams.get("reel");
  const postId = url.searchParams.get("reelPost");
  const replyId = url.searchParams.get("reelReply");
  if (!validId(videoId) || !validId(postId) || (replyId !== null && !validId(replyId))) return null;
  return { postId, videoId, replyId };
}

export function withoutContentVideoLink(href: string) {
  const url = new URL(href, "https://lectum.invalid");
  for (const key of ["reel", "reelPost", "reelReply"]) url.searchParams.delete(key);
  return url.pathname + url.search + url.hash;
}
