"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Community } from "@/api/generator/types/community";
import { buildCommunityExploreCard } from "@/app/app/community/explore-content";
import { COMMUNITY_EXPLORE_HREF } from "@/utils/community";
import { CommunityFollowToggle } from "./community-follow-toggle";

export const CommunityRecommendationsCarousel = ({
  communities,
  title = "Comunidades para você",
}: {
  communities: Community[];
  title?: string;
}) => {
  const id = useId();
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ previous: false, next: false });

  useEffect(() => {
    const node = track.current;
    if (!node || communities.length === 0) return;
    const update = () =>
      setEdges({
        previous: node.scrollLeft > 2,
        next: node.scrollLeft + node.clientWidth < node.scrollWidth - 2,
      });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    node.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      node.removeEventListener("scroll", update);
    };
  }, [communities.length]);

  const scroll = (direction: number) => {
    const node = track.current;
    if (!node) return;
    node.scrollBy({
      left: direction * node.clientWidth * 0.8,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

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
      <ul
        ref={track}
        aria-label={title}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2"
      >
        {communities.map((community, index) => {
          const card = buildCommunityExploreCard(community, index);
          return (
            <li
              key={community.slug}
              className="relative isolate flex h-[266px] w-[216px] max-w-[85%] shrink-0 snap-start flex-col overflow-hidden rounded-[22px] border border-border bg-foreground text-media-foreground sm:h-[282px] sm:w-[232px]"
            >
              <Image alt="" src={card.imageUrl} fill sizes="232px" className="-z-20 object-cover" />
              <div aria-hidden="true" className="community-card-overlay absolute inset-0 -z-10" />
              <Link
                href={`/comunidades/${community.slug}`}
                className="flex min-h-0 flex-1 flex-col justify-between gap-3 p-4 pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                aria-label={`Explorar ${community.name}`}
              >
                <span className="w-fit max-w-full truncate rounded-full border border-media-foreground/25 bg-media-background/20 px-2.5 py-1 text-[10px] font-semibold uppercase">
                  {card.category ?? "Comunidade"}
                </span>
                <div className="grid gap-2">
                  <h3 className="line-clamp-3 text-lg font-bold leading-tight [overflow-wrap:anywhere]">
                    {card.name}
                  </h3>
                  <p className="text-xs font-medium text-media-foreground/85">
                    {card.postsCount.toLocaleString("pt-BR")}{" "}
                    {card.postsCount === 1 ? "post" : "posts"}
                  </p>
                </div>
              </Link>
              <div className="px-4 pb-4">
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
      {edges.previous || edges.next ? (
        <div className="mt-1 flex justify-end gap-1">
          <button
            type="button"
            aria-label="Comunidades anteriores"
            title="Comunidades anteriores"
            disabled={!edges.previous}
            onClick={() => scroll(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Próximas comunidades"
            title="Próximas comunidades"
            disabled={!edges.next}
            onClick={() => scroll(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </section>
  );
};
