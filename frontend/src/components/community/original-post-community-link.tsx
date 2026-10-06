import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Community } from "@/api/generator/types/community";
import { cn } from "@/lib/utils";
import { getCommunityTopicName } from "@/utils/community-display";

export const OriginalPostCommunityLink = ({
  community,
  withAction = false,
}: {
  community: Pick<Community, "name" | "slug" | "category">;
  withAction?: boolean;
}) => (
  <Link
    aria-label={`Abrir comunidade ${community.name}`}
    className={cn(
      "pointer-events-auto flex min-w-0 shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-semibold leading-tight text-muted no-underline hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
      withAction ? "max-w-[min(48%,calc(100%-124px))]" : "max-w-[48%]",
    )}
    data-original-post-community
    href={`/comunidades/${community.slug}`}
    title={community.name}
  >
    <ChevronRight className="h-3 w-3 shrink-0 text-subtle" aria-hidden="true" />
    <span className="min-w-0 truncate">{getCommunityTopicName(community)}</span>
  </Link>
);
