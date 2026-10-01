import { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import {
  adminCommunityContentPostSelect,
  adminCommunityContentReplySelect,
  adminCommunitySelect,
} from "../../manage/repositories/support/manage-selects";
import type { AdminGlobalContentQuery } from "../DTOs/IAdminGlobalContentDTO";
import { type ContentWindow, globalContentSql } from "./content-query";

export class AdminGlobalContentRepository {
  async list(query: AdminGlobalContentQuery, range: ContentWindow, page: number, limit: number) {
    const sql = globalContentSql(query, range);
    const direction = query.sort === "oldest" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    // Paginate the union before loading media, author and analytics records.
    return prisma.$transaction(
      async (tx) => {
        const [total] = await tx.$queryRaw<{ count: bigint }[]>(
          Prisma.sql`SELECT count(*) AS count FROM (${sql}) content`,
        );
        const count = Number(total?.count ?? 0);
        const pages = Math.max(1, Math.ceil(count / limit));
        const currentPage = Math.min(page, pages);
        const ids = await tx.$queryRaw<{ id: string; type: "post" | "reply" }[]>(Prisma.sql`
        SELECT id, type FROM (${sql}) content ORDER BY created_at ${direction}, id ASC, type ASC
        LIMIT ${limit} OFFSET ${(currentPage - 1) * limit}
      `);
        const posts = await tx.community_post.findMany({
          where: { id: { in: ids.filter((item) => item.type === "post").map((item) => item.id) } },
          select: {
            ...adminCommunityContentPostSelect,
            community: { select: adminCommunitySelect },
          },
        });
        const replies = await tx.post_reply.findMany({
          where: { id: { in: ids.filter((item) => item.type === "reply").map((item) => item.id) } },
          select: {
            ...adminCommunityContentReplySelect,
            post: {
              select: {
                ...adminCommunityContentReplySelect.post.select,
                community: { select: adminCommunitySelect },
              },
            },
          },
        });
        return { count, pages, page: currentPage, ids, posts, replies };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  listCommunities() {
    return prisma.community.findMany({
      where: { deleted: false },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, slug: true },
    });
  }
}
