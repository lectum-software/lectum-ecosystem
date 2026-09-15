import prisma from "@/infra/database/prisma";
import { legacyR2ObjectKeyFromReference } from "./policy";
import type { LegacyVideoCandidate, R2MigrationPurpose } from "./types";

const PAGE_SIZE = 100;

const profileCandidates = async (limit: number) => {
  const candidates: LegacyVideoCandidate[] = [];
  let cursor: string | undefined;

  while (candidates.length < limit) {
    const rows = await prisma.psychologist_profile.findMany({
      where: {
        deleted: false,
        video_url: { contains: "/public/files/psychologist/video/" },
        user: { deleted: false },
      },
      orderBy: { id: "asc" },
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        user_id: true,
        video_cover_url: true,
        video_url: true,
      },
    });

    for (const row of rows) {
      const sourceObjectKey = legacyR2ObjectKeyFromReference(row.video_url, "profile_presentation");
      if (!sourceObjectKey || !row.video_url) continue;

      candidates.push({
        contextId: row.id,
        ownerId: row.user_id,
        purpose: "profile_presentation",
        sourceObjectKey,
        sourceReference: row.video_url,
        sourceThumbnailReference: row.video_cover_url,
        targetId: row.id,
      });
      if (candidates.length >= limit) break;
    }

    if (rows.length < PAGE_SIZE) break;
    cursor = rows.at(-1)?.id;
  }

  return candidates;
};

const postCandidates = async (limit: number) => {
  const candidates: LegacyVideoCandidate[] = [];
  let cursor: string | undefined;

  while (candidates.length < limit) {
    const rows = await prisma.community_post.findMany({
      where: {
        author: { deleted: false },
        community: { deleted: false },
        deleted: false,
        media_type: "video",
        media_url: { contains: "/public/files/posts/media/" },
      },
      orderBy: { id: "asc" },
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        author_id: true,
        community: { select: { slug: true } },
        id: true,
        media_url: true,
        thumbnail_url: true,
      },
    });

    for (const row of rows) {
      const sourceObjectKey = legacyR2ObjectKeyFromReference(row.media_url, "community_post");
      if (!sourceObjectKey || !row.media_url) continue;

      candidates.push({
        contextId: row.community.slug,
        ownerId: row.author_id,
        purpose: "community_post",
        sourceObjectKey,
        sourceReference: row.media_url,
        sourceThumbnailReference: row.thumbnail_url,
        targetId: row.id,
      });
      if (candidates.length >= limit) break;
    }

    if (rows.length < PAGE_SIZE) break;
    cursor = rows.at(-1)?.id;
  }

  return candidates;
};

const replyCandidates = async (limit: number) => {
  const candidates: LegacyVideoCandidate[] = [];
  let cursor: string | undefined;

  while (candidates.length < limit) {
    const rows = await prisma.post_reply.findMany({
      where: {
        author: { deleted: false },
        deleted: false,
        media_type: "video",
        media_url: { contains: "/public/files/posts/media/" },
        post: { deleted: false },
      },
      orderBy: { id: "asc" },
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        author_id: true,
        id: true,
        media_url: true,
        post_id: true,
        thumbnail_url: true,
      },
    });

    for (const row of rows) {
      const sourceObjectKey = legacyR2ObjectKeyFromReference(row.media_url, "community_reply");
      if (!sourceObjectKey || !row.media_url) continue;

      candidates.push({
        contextId: row.post_id,
        ownerId: row.author_id,
        purpose: "community_reply",
        sourceObjectKey,
        sourceReference: row.media_url,
        sourceThumbnailReference: row.thumbnail_url,
        targetId: row.id,
      });
      if (candidates.length >= limit) break;
    }

    if (rows.length < PAGE_SIZE) break;
    cursor = rows.at(-1)?.id;
  }

  return candidates;
};

export const listLegacyVideoCandidates = async ({
  limit,
  purpose,
}: {
  limit: number;
  purpose: R2MigrationPurpose | "all";
}) => {
  const candidates: LegacyVideoCandidate[] = [];
  const append = async (loader: (remaining: number) => Promise<LegacyVideoCandidate[]>) => {
    if (candidates.length >= limit) return;
    candidates.push(...(await loader(limit - candidates.length)));
  };

  if (purpose === "all" || purpose === "profile_presentation") {
    await append(profileCandidates);
  }
  if (purpose === "all" || purpose === "community_post") {
    await append(postCandidates);
  }
  if (purpose === "all" || purpose === "community_reply") {
    await append(replyCandidates);
  }

  return candidates;
};
