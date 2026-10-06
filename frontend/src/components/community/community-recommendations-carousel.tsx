"use client";

import Image from "next/image";
import Link from "next/link";
import { useId } from "react";
import type { Community } from "@/api/generator/types/community";
import { COMMUNITY_EXPLORE_HREF } from "@/utils/community";
import { getCommunityInitials } from "@/utils/community-display";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { CommunityFollowToggle } from "./community-follow-toggle";

export const CommunityRecommendationsCarousel = ({
  communities,
  title = "Comunidades para você",
}: {
  communities: Community[];
  title?: string;
}) => {
  const id = useId();

  if (communities.length === 0) return null;

  return (
    <section aria-labelledby={id} className="min-w-0 py-3" data-community-recommendations>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={id} className="min-w-0 text-base font-semibold text-foreground">
          {title}
        </h2>
        <Link
          href={COMMUNITY_EXPLORE_HREF}
          className="shrink-0 py-2 text-xs font-semibold text-primary hover:underline"
        >
          Ver todas
        </Link>
      </div>
      <section
        aria-label={`${title}: carrossel`}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need focus to scroll this region without visible arrows.
        tabIndex={0}
        className="-mx-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[22px] px-1 pb-5 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ul className="flex gap-3">
          {communities.map((community) => {
            const avatar = resolvePublicMediaUrl(community.avatar_url);
            const postsCount = community.posts_count ?? 0;
            return (
              <li
                key={community.slug}
                className="flex h-[232px] w-[160px] max-w-[85%] shrink-0 snap-start scroll-mx-1 flex-col gap-2 rounded-[22px] border border-border bg-surface p-3 shadow-lectum-soft"
              >
                <Link
                  href={`/comunidades/${community.slug}`}
                  className="flex min-h-0 flex-1 flex-col items-center gap-2 rounded-[18px] text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`Explorar ${community.name}`}
                >
                  <span className="relative grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-[18px] border-[4px] border-media-foreground bg-primary-soft text-lg font-semibold text-primary shadow-lectum-soft dark:border-background">
                    {avatar ? (
                      <Image
                        alt={`Avatar da comunidade ${community.name}`}
                        src={avatar}
                        fill
                        sizes="76px"
                        unoptimized={isPublicMediaUrl(community.avatar_url)}
                        className="object-cover"
                        draggable={false}
                      />
                    ) : (
                      getCommunityInitials(community.name)
                    )}
                  </span>
                  <div className="grid h-[54px] w-full shrink-0 place-items-center">
                    <h3 className="line-clamp-3 text-[14px] font-semibold leading-[18px] text-foreground [overflow-wrap:anywhere]">
                      {community.name}
                    </h3>
                  </div>
                  <p className="text-[11px] leading-4 text-muted">
                    {postsCount.toLocaleString("pt-BR")} {postsCount === 1 ? "post" : "posts"}
                  </p>
                </Link>
                <div className="shrink-0">
                  <CommunityFollowToggle
                    communityName={community.name}
                    slug={community.slug}
                    initialFollowing={community.following}
                    size="recommendation"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
};
