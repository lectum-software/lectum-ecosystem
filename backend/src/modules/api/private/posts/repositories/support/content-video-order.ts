import type { PostContentVideosQuery } from "../../DTOs/IPostContentVideoDTO";

export type ContentVideoReplyNode = {
  id: string;
  parent_reply_id: string | null;
  author_id: string;
  upvotes_count: number;
  createdAt: Date;
};

type RankingSignals = ReadonlyMap<string, { position: number }>;

export const normalizeContentVideosPagination = (query: PostContentVideosQuery) => {
  const page = Number.isSafeInteger(query.page) && Number(query.page) > 0 ? Number(query.page) : 1;
  const limit =
    Number.isSafeInteger(query.limit) && Number(query.limit) > 0
      ? Math.min(30, Number(query.limit))
      : 20;
  return { page, limit, skip: (page - 1) * limit };
};

/** Iterative preorder keeps deep branches together and never reconnects deleted parents. */
export const orderContentVideoReplies = (
  nodes: ContentVideoReplyNode[],
  verifiedAuthorIds: ReadonlySet<string>,
  rankings: RankingSignals,
) => {
  const compare = (a: ContentVideoReplyNode, b: ContentVideoReplyNode) => {
    const votes = b.upvotes_count - a.upvotes_count;
    if (votes) return votes;
    const aRank = rankings.get(a.author_id)?.position ?? Number.POSITIVE_INFINITY;
    const bRank = rankings.get(b.author_id)?.position ?? Number.POSITIVE_INFINITY;
    if (aRank !== bRank) return aRank - bRank;
    return b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);
  };
  const byParent = new Map<string | null, ContentVideoReplyNode[]>();
  for (const node of nodes) {
    const siblings = byParent.get(node.parent_reply_id) ?? [];
    siblings.push(node);
    byParent.set(node.parent_reply_id, siblings);
  }
  for (const siblings of byParent.values()) siblings.sort(compare);
  const roots = byParent.get(null) ?? [];
  // The post tree promotes its highest-ranked verified professional root once.
  const professionalIndex = roots.findIndex((node) => verifiedAuthorIds.has(node.author_id));
  if (professionalIndex > 0) roots.unshift(...roots.splice(professionalIndex, 1));
  const stack = [...roots].reverse();
  const visited = new Set<string>();
  const result: string[] = [];
  while (stack.length) {
    const node = stack.pop();
    if (!node || visited.has(node.id)) continue;
    visited.add(node.id);
    result.push(node.id);
    const children = byParent.get(node.id) ?? [];
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]!);
  }
  return result;
};

export const focusContentVideo = <T extends { reply_id: string | null }>(
  items: T[],
  focusReplyId?: string,
): T[] => {
  const index = focusReplyId ? items.findIndex((item) => item.reply_id === focusReplyId) : -1;
  if (index <= 0) return items;
  return [items[index]!, ...items.slice(0, index), ...items.slice(index + 1)];
};
