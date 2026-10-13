type ReplyToolbar = {
  author: { role: string | null; whatsapp_url?: string | null };
  media_url?: string | null;
  upvotes_count: number;
};
type ReplyToolbarNode = ReplyToolbar & { replies: ReplyToolbarNode[] };

export const hasInlineReplySecondaryActions = (reply: Pick<ReplyToolbar, "author" | "media_url">) =>
  reply.author.role === "psicologo" && Boolean(reply.media_url);

// Unchanged 28px targets, compact gaps and room for a four-character vote count.
export const FULL_REPLY_TOOLBAR_WIDTH = 192;

export const getReplyLayerToolbarWidths = (replies: ReplyToolbarNode[]) => {
  const widths: number[] = [];
  const visit = (nodes: ReplyToolbarNode[], depth: number) => {
    for (const reply of nodes) {
      const base = hasInlineReplySecondaryActions(reply)
        ? FULL_REPLY_TOOLBAR_WIDTH
        : reply.author.role === "psicologo" && reply.author.whatsapp_url && !reply.media_url
          ? 160
          : 128;
      const counterExtra = Math.max(0, reply.upvotes_count.toLocaleString("pt-BR").length - 4) * 6;
      widths[depth] = Math.max(widths[depth] ?? 0, base + counterExtra);
      visit(reply.replies, depth + 1);
    }
  };
  visit(replies, 0);
  return widths;
};

export const getReplyTreeInlineDepth = (
  listWidth: number,
  maxDepth: number,
  rem = 16,
  wide = false,
  toolbarWidths: readonly number[] = [],
) => {
  const limit = maxDepth < 0 ? 3 : Math.min(maxDepth, 3);
  if (limit === 0) return 0;
  const rootWidth = listWidth - 1.5 * rem - 2;
  const firstIndent = (wide ? 2.5 : 2.125) * rem;
  const childContentInset = 2.25 * rem;
  let depth = 1;
  while (depth < limit) {
    const nextContentWidth = rootWidth - firstIndent - depth * 1.875 * rem - childContentInset;
    const toolbarWidth = toolbarWidths[depth + 1] ?? FULL_REPLY_TOOLBAR_WIDTH;
    if (nextContentWidth < (toolbarWidth * rem) / 16) break;
    depth++;
  }
  // Keep one level so following a continuation always advances the conversation.
  return Math.min(depth, limit);
};
