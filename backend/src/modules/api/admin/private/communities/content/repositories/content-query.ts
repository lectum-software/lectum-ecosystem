import { Prisma } from "@/external/generated/prisma/client";
import type { AdminGlobalContentQuery } from "../DTOs/IAdminGlobalContentDTO";

export type ContentWindow = { start: Date | null; end: Date | null };

const containsPattern = (value: string) => `%${value.trim().replace(/[\\%_]/g, "\\$&")}%`;

export const globalContentSql = (query: AdminGlobalContentQuery, range: ContentWindow) => {
  const common = Prisma.sql`
    u.role = 'psicologo' AND c.deleted = false
    ${query.community ? Prisma.sql`AND c.id = ${query.community}` : Prisma.empty}
    ${query.psychologist?.trim() ? Prisma.sql`AND (u.name ILIKE ${containsPattern(query.psychologist)} OR concat_ws(' ', pp.professional_first_name, pp.professional_last_name) ILIKE ${containsPattern(query.psychologist)})` : Prisma.empty}
  `;
  const dateFilter = Prisma.sql`
    ${range.start ? Prisma.sql`AND x.created_at >= ${range.start}` : Prisma.empty}
    ${range.end ? Prisma.sql`AND x.created_at <= ${range.end}` : Prisma.empty}
  `;
  const search = query.q?.trim()
    ? Prisma.sql`AND (x.title ILIKE ${containsPattern(query.q)} OR x.content ILIKE ${containsPattern(query.q)})`
    : Prisma.empty;
  const posts = Prisma.sql`
    SELECT x.id, 'post' AS type, x.created_at
    FROM community_posts x
    JOIN users u ON u.id = x.author_id
    LEFT JOIN psychologist_profiles pp ON pp.user_id = u.id
    JOIN communities c ON c.id = x.community_id
    WHERE ${common} ${dateFilter} ${search}
  `;
  const replies = Prisma.sql`
    SELECT x.id, 'reply' AS type, x.created_at
    FROM post_replies x
    JOIN community_posts p ON p.id = x.post_id
    JOIN users u ON u.id = x.author_id
    LEFT JOIN psychologist_profiles pp ON pp.user_id = u.id
    JOIN communities c ON c.id = p.community_id
    WHERE ${common} ${dateFilter}
    ${query.q?.trim() ? Prisma.sql`AND (x.title ILIKE ${containsPattern(query.q)} OR x.content ILIKE ${containsPattern(query.q)} OR p.title ILIKE ${containsPattern(query.q)})` : Prisma.empty}
  `;
  return query.type === "posts"
    ? posts
    : query.type === "replies"
      ? replies
      : Prisma.sql`${posts} UNION ALL ${replies}`;
};
