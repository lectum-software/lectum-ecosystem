import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { UserPostListItem } from "@/api/generator/types/posts";

export const OriginLink = ({ item }: { item: UserPostListItem }) => {
  const parentId = item.reply?.parent_reply_id;
  const postHref = `/comunidades/${item.post.community.slug}/publicacao/${item.post.id}`;
  const href = parentId
    ? `${postHref}?focusReplyId=${encodeURIComponent(parentId)}#reply-${parentId}`
    : postHref;

  return (
    <Link
      className="relative z-10 inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-transparent text-xs font-semibold text-muted no-underline hover:text-foreground hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
      href={href}
    >
      Ver publicação original
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
};
