import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CommunityPost } from "@/api/generator/types/community";
import { getCommunityInitials } from "@/utils/community-display";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

export const MoreProfessionalReplies = ({ href, post }: { href: string; post: CommunityPost }) => {
  if (post.author.role !== "paciente" || !post.highlighted_professional_reply) return null;
  const authors = (post.other_professional_reply_authors ?? [])
    .filter((author, index, all) => all.findIndex((item) => item.id === author.id) === index)
    .slice(0, 2);
  if (authors.length === 0) return null;

  return (
    <Link
      className="flex min-h-11 w-fit max-w-full items-center gap-3 rounded-sm font-[family-name:system-ui,sans-serif] text-sm font-semibold tracking-normal text-muted no-underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      href={href}
    >
      <span aria-hidden="true" className="flex shrink-0 -space-x-2">
        {authors.map((author) => {
          const src = resolvePublicMediaUrl(author.avatar);
          return (
            <span
              className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-muted text-[10px] font-semibold text-muted ring-2 ring-surface"
              key={author.id}
            >
              {src ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="28px"
                  src={src}
                  unoptimized={isPublicMediaUrl(author.avatar)}
                />
              ) : (
                getCommunityInitials(author.name)
              )}
            </span>
          );
        })}
        <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-surface">
          <Plus aria-hidden="true" className="h-4 w-4" />
        </span>
      </span>
      <span>Ver mais respostas</span>
    </Link>
  );
};
