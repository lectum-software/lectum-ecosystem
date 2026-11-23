import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import prisma from "@/infra/database/prisma";
import { videoAssetIdFromReference } from "@/infra/video-stream/reference";
import { PostContentVideoRepository } from "@/modules/api/private/posts/repositories/queries/PostContentVideoRepository";
import { readPublicCaptions } from "@/modules/video-assets/captions/service";
import { authorizePublicVideoAssetPlayback } from "@/modules/video-assets/service";

export async function readPublicReel(slug: string, postId: string, videoId: string) {
  const post = await prisma.community_post.findFirst({
    where: {
      id: postId,
      deleted: false,
      status: "publicado",
      community: { slug, active: true, deleted: false },
    },
    select: { title: true, content: true, createdAt: true },
  });
  if (!post) return null;
  // Focusing a reply puts it on page one; post media are always on page one.
  const videos = await new PostContentVideoRepository().list({
    p: { id: postId },
    q: { limit: 30, focusReplyId: videoId },
  });
  const video = videos?.data.find((item) => item.id === videoId);
  if (!video) return null;
  const reply = video.reply_id
    ? await prisma.post_reply.findFirst({
        where: { id: video.reply_id, post_id: postId, deleted: false },
        select: { createdAt: true },
      })
    : null;
  if (video.reply_id && !reply) return null;
  const assetId = videoAssetIdFromReference(video.media_url);
  let playbackUrl = video.media_url;
  let thumbnailUrl = video.thumbnail_url;
  if (assetId) {
    const playback = await authorizePublicVideoAssetPlayback(assetId);
    if (playback.status >= 500) throw new Error("Public playback temporarily unavailable");
    if (
      !("data" in playback) ||
      !playback.data ||
      typeof playback.data.hls_url !== "string" ||
      typeof playback.data.thumbnail_url !== "string"
    )
      return null;
    playbackUrl = playback.data.hls_url;
    thumbnailUrl = playback.data.thumbnail_url;
  }
  const path = `/comunidades/${encodeURIComponent(slug)}/publicacao/${encodeURIComponent(postId)}`;
  const query = new URLSearchParams({ reel: video.id, reelPost: postId });
  if (video.reply_id) query.set("reelReply", video.reply_id);
  return {
    canonical_path: `${path}?${query}`,
    post_path: path,
    video_id: video.id,
    reply_id: video.reply_id,
    post_title: post.title,
    post_content: post.content,
    video_title: video.title,
    video_content: video.content,
    professional_name: video.author.name,
    published_at: (reply?.createdAt ?? post.createdAt).toISOString(),
    hls_url: playbackUrl,
    content_url: assetId ? null : video.media_url,
    thumbnail_url: thumbnailUrl,
    thumbnail_path: thumbnailUrl
      ? `/api/public/seo/community-post/${encodeURIComponent(slug)}/${encodeURIComponent(postId)}/videos/${encodeURIComponent(videoId)}/thumbnail`
      : null,
    captions: await readPublicCaptions(video.media_url).catch(() => null),
  };
}

export async function showReel(req: Request, res: Response) {
  try {
    res.set("Cache-Control", "no-store");
    const data = await readPublicReel(
      String(req.params.slug),
      String(req.params.id),
      String(req.params.videoId),
    );
    if (!data) return send(res, { status: 404, ...error("not_found", { gender: "a" }) });
    if (req.path.endsWith("/thumbnail")) {
      if (!data.thumbnail_url)
        return send(res, { status: 404, ...error("not_found", { gender: "a" }) });
      return res.redirect(302, data.thumbnail_url);
    }
    return send(res, { status: 200, ...msg("index", {}), data, allowSignedMediaUrls: true });
  } catch (cause) {
    return error500(res, "public_reel_seo", cause);
  }
}

export async function listReels(req: Request, res: Response) {
  try {
    res.set("Cache-Control", "no-store");
    const slug = String(req.params.slug);
    const id = String(req.params.id);
    const post = await prisma.community_post.findFirst({
      where: {
        id,
        deleted: false,
        status: "publicado",
        community: { slug, active: true, deleted: false },
      },
      select: { id: true },
    });
    if (!post) return send(res, { status: 404, ...error("not_found", { gender: "a" }) });
    const videos = await new PostContentVideoRepository().list({ p: { id }, q: { limit: 30 } });
    const data = (videos?.data ?? []).map((video) => {
      const query = new URLSearchParams({ reel: video.id, reelPost: id });
      if (video.reply_id) query.set("reelReply", video.reply_id);
      return {
        href: `/comunidades/${encodeURIComponent(slug)}/publicacao/${encodeURIComponent(id)}?${query}`,
        title: video.title || video.author.name,
      };
    });
    return send(res, { status: 200, ...msg("index", {}), data });
  } catch (cause) {
    return error500(res, "public_reel_links", cause);
  }
}
