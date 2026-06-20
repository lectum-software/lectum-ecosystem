import prisma from "@/infra/database/prisma";

const uniqueStrings = (values: string[]) => [...new Set(values.filter(Boolean))];

export const getPostIdsWithPsychologistReplies = async (postIds: string[]) => {
  const ids = uniqueStrings(postIds);
  if (ids.length === 0) return new Set<string>();

  const replies = await prisma.post_reply.findMany({
    where: {
      deleted: false,
      post_id: {
        in: ids,
      },
      author: {
        role: "psicologo",
      },
    },
    distinct: ["post_id"],
    select: {
      post_id: true,
    },
  });

  return new Set(replies.map((reply) => reply.post_id));
};
