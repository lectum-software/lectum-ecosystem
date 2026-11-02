export const REMOVED_ACCOUNT_CONTENT = "Conteúdo removido";

type Reply = { id: string; parent_reply_id: string | null; author_id: string; deleted: boolean };

// Keep only the author's ancestors needed to reach another person's replies.
export const retainedReplyAncestors = (replies: Reply[], ownerId: string) => {
  const byId = new Map(replies.map((reply) => [reply.id, reply]));
  const keep = new Set<string>();
  for (const reply of replies) {
    if (reply.deleted || reply.author_id === ownerId) continue;
    let parent = reply.parent_reply_id;
    const visited = new Set<string>();
    while (parent && !visited.has(parent)) {
      visited.add(parent);
      const ancestor = byId.get(parent);
      if (!ancestor || ancestor.deleted) break;
      if (ancestor.author_id === ownerId) keep.add(ancestor.id);
      parent = ancestor.parent_reply_id;
    }
  }
  return keep;
};
