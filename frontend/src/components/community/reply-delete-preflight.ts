import type { PostReply } from "@/api/generator/types/posts";

// The thread endpoint returns the complete subtree, unlike paginated feed replies.
export const hasProfessionalVideoDescendant = (reply: PostReply) => {
  const pending = [...reply.replies];
  const visited = new Set<string>([reply.id]);
  while (pending.length) {
    const child = pending.pop();
    if (!child || visited.has(child.id)) continue;
    visited.add(child.id);
    if (child.author.role === "psicologo" && child.media_type === "video") return true;
    pending.push(...child.replies);
  }
  return false;
};
