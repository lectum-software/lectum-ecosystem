import type { Prisma } from "@/external/generated/prisma/client";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import type { CommunityPostDTO } from "../../DTOs/ICommunityDTO";

export const otherProfessionalRepliesQuery = (highlights: Map<string, { id: string }>) =>
  ({
    where: {
      post_id: { in: [...highlights.keys()] },
      id: { notIn: [...highlights.values()].map((reply) => reply.id) },
      deleted: false,
      parent_reply_id: null,
      author: { role: "psicologo", deleted: false },
    },
    distinct: ["post_id", "author_id"],
    orderBy: [{ upvotes_count: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    select: {
      post_id: true,
      author: {
        select: {
          id: true,
          name: true,
          avatar: true,
          psychologist_profile: {
            select: { professional_first_name: true, professional_last_name: true },
          },
        },
      },
    },
  }) satisfies Prisma.post_replyFindManyArgs;

type Reply = Prisma.post_replyGetPayload<ReturnType<typeof otherProfessionalRepliesQuery>>;
type ReplyAuthors = NonNullable<CommunityPostDTO["other_professional_reply_authors"]>;

export const groupOtherProfessionalReplyAuthors = (replies: Reply[]) => {
  const byPostId = new Map<string, ReplyAuthors>();
  for (const { post_id, author } of replies) {
    const authors = byPostId.get(post_id) ?? [];
    if (authors.length >= 3 || authors.some((item) => item.id === author.id)) continue;
    authors.push({
      id: author.id,
      name: buildProfessionalFullDisplayName({
        fallbackName: author.name,
        firstName: author.psychologist_profile?.professional_first_name,
        lastName: author.psychologist_profile?.professional_last_name,
      }),
      avatar: author.avatar,
    });
    byPostId.set(post_id, authors);
  }
  return byPostId;
};

export const getOtherProfessionalReplyAuthors = async (
  client: Pick<Prisma.TransactionClient, "post_reply">,
  highlights: Map<string, { id: string }>,
) => {
  if (highlights.size === 0) return new Map<string, ReplyAuthors>();
  const replies = await client.post_reply.findMany(otherProfessionalRepliesQuery(highlights));
  return groupOtherProfessionalReplyAuthors(replies);
};
