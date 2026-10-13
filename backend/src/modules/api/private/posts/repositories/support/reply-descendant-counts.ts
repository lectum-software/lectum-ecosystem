type ReplyParent = { id: string; parent_reply_id: string | null };

export const countReplyDescendants = (replies: readonly ReplyParent[]): Map<string, number> => {
  const parents = new Map(replies.map((reply) => [reply.id, reply.parent_reply_id]));
  const pendingChildren = new Map(replies.map((reply) => [reply.id, 0]));
  const counts = new Map(replies.map((reply) => [reply.id, 0]));
  for (const parentId of parents.values()) {
    if (parentId && pendingChildren.has(parentId)) {
      pendingChildren.set(parentId, pendingChildren.get(parentId)! + 1);
    }
  }

  // Fold leaves upward in linear time, without recursion on long conversations.
  const ready = [...pendingChildren].filter(([, count]) => count === 0).map(([id]) => id);
  for (let index = 0; index < ready.length; index += 1) {
    const id = ready[index]!;
    const parentId = parents.get(id);
    if (!parentId || !counts.has(parentId)) continue;
    counts.set(parentId, counts.get(parentId)! + counts.get(id)! + 1);
    const remaining = pendingChildren.get(parentId)! - 1;
    pendingChildren.set(parentId, remaining);
    if (remaining === 0) ready.push(parentId);
  }
  return counts;
};
