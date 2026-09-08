export type SharePostVideoMediaCandidate = {
  media_items?: readonly { media_type: string | null; media_url: string | null }[];
  media_type: string | null;
  media_url: string | null;
};

export const selectSharePostVideoMediaUrl = (post: SharePostVideoMediaCandidate) => {
  const firstMedia = post.media_items?.[0];
  if (firstMedia) {
    return firstMedia.media_type === "video" && firstMedia.media_url ? firstMedia.media_url : null;
  }

  return post.media_type === "video" && post.media_url ? post.media_url : null;
};
