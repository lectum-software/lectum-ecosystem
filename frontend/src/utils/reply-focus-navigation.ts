type ReplyNode = { id: string; replies: ReplyNode[] };

export const findFocusedReplyContinuation = (
  replies: ReplyNode[],
  focusReplyId: string,
  maxInlineDepth: number,
): string | null => {
  if (maxInlineDepth < 1) return null;
  const findPath = (nodes: ReplyNode[], ancestors: string[]): string[] | null => {
    for (const node of nodes) {
      const path = [...ancestors, node.id];
      if (node.id === focusReplyId) return path;
      const found = findPath(node.replies, path);
      if (found) return found;
    }
    return null;
  };
  const path = findPath(replies, []);
  if (!path || path.length - 1 <= maxInlineDepth) return null;

  // Each continuation repeats its boundary reply as the root of the next page.
  const rootDepth = Math.floor((path.length - 2) / maxInlineDepth) * maxInlineDepth;
  return path[rootDepth] ?? null;
};
