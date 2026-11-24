import prisma from "@/infra/database/prisma";
import { videoAssetIdFromReference } from "@/infra/video-stream/reference";
import { readPublicCaptions } from "@/modules/video-assets/captions/service";
import { authorizePublicVideoAssetPlayback } from "@/modules/video-assets/service";

type Media = {
  id: string;
  media_type: string | null;
  media_url: string | null;
  thumbnail_url?: string | null;
};
type Post = {
  title: string;
  createdAt: Date;
  content: string;
  thumbnail_url: string | null;
  media_type: string | null;
  media_url: string | null;
  media_items: Media[];
};
export type PublicPostTranscript = {
  video_id: string;
  url: string;
  title: string;
  text: string;
  language: string;
  reviewed: boolean;
  published_at: string;
  description: string;
  thumbnail_path: string | null;
  content_path: string;
};

// Called only after the owning public post and community have been validated.
export async function readPostTranscripts(id: string, slug: string, post: Post) {
  const base = `/comunidades/${encodeURIComponent(slug)}/publicacao/${encodeURIComponent(id)}`;
  const result: PublicPostTranscript[] = [];
  const seen = new Set<string>();
  const append = async (
    items: (Media & { title: string; url: string; createdAt: Date; content: string })[],
  ) => {
    const candidates = items.filter((item) => {
      if (item.media_type !== "video" || !item.media_url || seen.has(item.media_url)) return false;
      seen.add(item.media_url);
      return true;
    });
    // Bound database concurrency while retaining every page, including nested replies.
    for (let offset = 0; offset < candidates.length; offset += 4) {
      const batch = await Promise.all(
        candidates.slice(offset, offset + 4).map(async (item) => {
          const caption = await readPublicCaptions(item.media_url);
          const text = caption?.cues
            .map((cue) => cue.text)
            .join(" ")
            .trim();
          if (!caption || !text) return null;
          const asset = videoAssetIdFromReference(item.media_url);
          const playback = asset ? await authorizePublicVideoAssetPlayback(asset) : null;
          const thumbnail =
            playback && "data" in playback ? playback.data?.thumbnail_url : item.thumbnail_url;
          const videoPath = `/api/public/seo/community-post/${encodeURIComponent(slug)}/${encodeURIComponent(id)}/videos/${encodeURIComponent(item.id)}`;
          return caption && text
            ? {
                video_id: item.id,
                url: item.url,
                title: item.title || post.title,
                text,
                language: caption.language,
                reviewed: caption.reviewed,
                published_at: item.createdAt.toISOString(),
                description: item.content.trim() || post.title,
                thumbnail_path: thumbnail ? `${videoPath}/thumbnail` : null,
                content_path: `${videoPath}/content`,
              }
            : null;
        }),
      );
      for (const transcript of batch) if (transcript) result.push(transcript);
    }
  };
  const media = post.media_items.length
    ? post.media_items
    : [
        {
          id,
          media_type: post.media_type,
          media_url: post.media_url,
          thumbnail_url: post.thumbnail_url,
        },
      ];
  await append(
    media.map((item) => ({
      ...item,
      title: post.title,
      url: base,
      createdAt: post.createdAt,
      content: post.content,
    })),
  );
  let cursor: string | undefined;
  for (;;) {
    const replies = await prisma.post_reply.findMany({
      where: {
        post_id: id,
        deleted: false,
        media_type: "video",
        media_url: { not: null },
        author: { active: true, deleted: false },
        post: {
          deleted: false,
          status: "publicado",
          community: { slug, active: true, deleted: false },
        },
      },
      select: {
        id: true,
        title: true,
        media_type: true,
        media_url: true,
        thumbnail_url: true,
        createdAt: true,
        content: true,
      },
      orderBy: { id: "asc" },
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    await append(
      replies.map((reply) => ({
        ...reply,
        title: reply.title ?? post.title,
        url: `${base}/resposta/${encodeURIComponent(reply.id)}`,
      })),
    );
    if (replies.length < 100) break;
    cursor = replies.at(-1)!.id;
  }
  return result;
}
