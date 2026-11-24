import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { readPublicReel } from "../../community-post/use-cases/reel";
import { publishedPsychologistWhere } from "../../psychologist/use-cases/services";

export const sitemapSizes = {
  communities: 500,
  psychologists: 500,
  posts: 500,
  videos: 20,
  "post-videos": 10,
};
export type SitemapKind = keyof typeof sitemapSizes;
const communityWhere = { active: true, deleted: false };
const postWhere: Prisma.community_postWhereInput = {
  deleted: false,
  status: "publicado",
  community: communityWhere,
  author: { active: true, deleted: false },
};
const replyWhere: Prisma.post_replyWhereInput = {
  deleted: false,
  media_type: "video",
  media_url: { not: null },
  post: postWhere,
  author: { active: true, deleted: false, role: "psicologo" },
};
const videoPostWhere: Prisma.community_postWhereInput = {
  ...postWhere,
  OR: [{ media_type: "video" }, { media_items: { some: { media_type: "video" } } }],
};
export type SitemapEntry = {
  path: string;
  modified?: string;
  video?: {
    title: string;
    description: string;
    thumbnail: string;
    content: string;
    published: string;
  };
};

export async function sitemapManifest() {
  const counts = [
    await prisma.community.count({ where: communityWhere }),
    await prisma.user.count({ where: publishedPsychologistWhere() }),
    await prisma.community_post.count({ where: postWhere }),
    await prisma.post_reply.count({ where: replyWhere }),
    await prisma.community_post.count({ where: videoPostWhere }),
  ];
  return Object.entries(sitemapSizes).map(([kind, size], i) => ({
    kind,
    pages: Math.ceil(counts[i] / size),
  }));
}

export async function sitemapEntries(kind: SitemapKind, page: number): Promise<SitemapEntry[]> {
  const pagination = {
    skip: page * sitemapSizes[kind],
    take: sitemapSizes[kind],
    orderBy: { id: "asc" as const },
  };
  if (kind === "communities") {
    const rows = await prisma.community.findMany({
      where: communityWhere,
      ...pagination,
      select: { slug: true, updatedAt: true },
    });
    return rows.map((row) => ({
      path: `/comunidades/${encodeURIComponent(row.slug)}`,
      modified: row.updatedAt.toISOString(),
    }));
  }
  if (kind === "psychologists") {
    const rows = await prisma.user.findMany({
      where: publishedPsychologistWhere(),
      ...pagination,
      select: { id: true, updatedAt: true, psychologist_profile: { select: { updatedAt: true } } },
    });
    return rows.map((row) => ({
      path: `/psicologos/${row.id}`,
      modified: new Date(
        Math.max(row.updatedAt.getTime(), row.psychologist_profile?.updatedAt.getTime() ?? 0),
      ).toISOString(),
    }));
  }
  if (kind === "posts") {
    const rows = await prisma.community_post.findMany({
      where: postWhere,
      ...pagination,
      select: {
        id: true,
        updatedAt: true,
        community: { select: { slug: true } },
        replies: {
          where: { deleted: false },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { updatedAt: true },
        },
      },
    });
    return rows.map((row) => ({
      path: `/comunidades/${encodeURIComponent(row.community.slug)}/publicacao/${row.id}`,
      modified: new Date(
        Math.max(row.updatedAt.getTime(), row.replies[0]?.updatedAt.getTime() ?? 0),
      ).toISOString(),
    }));
  }
  const candidates: { slug: string; post: string; video: string }[] = [];
  if (kind === "videos") {
    const rows = await prisma.post_reply.findMany({
      where: replyWhere,
      ...pagination,
      select: {
        id: true,
        post_id: true,
        post: { select: { community: { select: { slug: true } } } },
      },
    });
    for (const row of rows)
      candidates.push({ slug: row.post.community.slug, post: row.post_id, video: row.id });
  } else {
    const rows = await prisma.community_post.findMany({
      where: videoPostWhere,
      ...pagination,
      select: {
        id: true,
        media_type: true,
        community: { select: { slug: true } },
        media_items: { select: { id: true, media_type: true } },
      },
    });
    for (const row of rows) {
      const media = row.media_items.length
        ? row.media_items
        : [{ id: row.id, media_type: row.media_type }];
      for (const item of media)
        if (item.media_type === "video")
          candidates.push({ slug: row.community.slug, post: row.id, video: item.id });
    }
  }
  const entries: SitemapEntry[] = [];
  // Reuse watch-page authorization, including entitlement, ownership and asset readiness.
  for (const item of candidates) {
    const reel = await readPublicReel(item.slug, item.post, item.video);
    if (!reel?.thumbnail_path) continue;
    const description = [reel.video_content, reel.post_content, reel.post_title]
      .find((text) => text?.trim())
      ?.trim();
    if (!description) continue;
    entries.push({
      path: reel.canonical_path,
      video: {
        title: `${reel.video_title || reel.post_title} | ${reel.professional_name}`,
        description: description.slice(0, 2048),
        thumbnail: reel.thumbnail_path,
        content: reel.content_path,
        published: reel.published_at,
      },
    });
  }
  return entries;
}
