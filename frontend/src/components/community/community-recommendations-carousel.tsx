"use client";

import Link from "next/link";
import { useId } from "react";
import type { Community } from "@/api/generator/types/community";
import { HorizontalScrollControls } from "@/components/ui/horizontal-scroll-controls";
import { COMMUNITY_EXPLORE_HREF } from "@/utils/community";
import { CommunityAvatar } from "./community-avatar";
import { CommunityFollowToggle } from "./community-follow-toggle";

export const CommunityRecommendationsCarousel = ({
  communities,
  title = "Comunidades sugeridas",
}: {
  communities: Community[];
  title?: string;
}) => {
  const id = useId();

  if (communities.length === 0) return null;

  return (
    <section
      aria-labelledby={id}
      className="@container/recommendations min-w-0 py-3"
      data-community-recommendations
    >
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
      <HorizontalScrollControls label={title}>
        <section
          aria-label={`${title}: carrossel`}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Keep native keyboard scrolling on the region.
          tabIndex={0}
          className="-mx-[4px] snap-x snap-mandatory scroll-px-[4px] overflow-x-auto overscroll-x-contain rounded-[22px] px-[4px] pb-5 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {/* Reserve 28px plus the 4px edge padding for the next card at every snap point. */}
          <ul className="flex gap-[12px] [--visible-cards:1] @min-[320px]/recommendations:[--visible-cards:2] @min-[480px]/recommendations:[--visible-cards:3] @min-[640px]/recommendations:[--visible-cards:4] @min-[800px]/recommendations:[--visible-cards:5] @min-[960px]/recommendations:[--visible-cards:6]">
            {communities.map((community) => {
              return (
                <li
                  key={community.slug}
                  className="flex h-[208px] w-[calc((100%_-_28px)/var(--visible-cards)_-_12px)] shrink-0 snap-start flex-col gap-2 rounded-[22px] border border-border bg-surface p-3 shadow-lectum-soft"
                >
                  <Link
                    href={`/comunidades/${community.slug}`}
                    className="flex min-h-0 flex-1 flex-col items-center gap-2 rounded-[18px] text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`Explorar ${community.name}`}
                  >
                    <CommunityAvatar
                      avatarUrl={community.avatar_url}
                      className="h-[76px] w-[76px] rounded-[18px] border-[4px] border-media-foreground bg-primary-soft text-lg font-semibold text-primary shadow-lectum-soft dark:border-background"
                      name={community.name}
                      sizes="76px"
                    />
                    <div className="grid h-[54px] w-full shrink-0 place-items-center">
                      <h3 className="line-clamp-3 text-[14px] font-semibold leading-[18px] text-foreground [overflow-wrap:anywhere]">
                        {community.name}
                      </h3>
                    </div>
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
      </HorizontalScrollControls>
    </section>
  );
};
