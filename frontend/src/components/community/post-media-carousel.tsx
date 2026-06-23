"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { CommunityPostMediaItem } from "@/api/generator/types/community";
import { cn } from "@/lib/utils";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

type PostMediaCarouselItem = Pick<
  CommunityPostMediaItem,
  "id" | "media_type" | "media_url" | "position"
>;

type PostMediaCarouselProps = {
  alt: string;
  className?: string;
  imageClassName?: string;
  items: PostMediaCarouselItem[];
  roundedClassName?: string;
  sizes?: string;
  viewportClassName?: string;
};

export const PostMediaCarousel = ({
  alt,
  className,
  imageClassName,
  items,
  roundedClassName = "rounded-[22px]",
  sizes = "(max-width: 430px) calc(100vw - 40px), (max-width: 1024px) calc(100vw - 160px), 860px",
  viewportClassName,
}: PostMediaCarouselProps) => {
  const carouselItems = useMemo(
    () =>
      items
        .filter((item) => item.media_type === "image" && Boolean(item.media_url))
        .map((item) => ({
          ...item,
          resolvedUrl: resolvePublicMediaUrl(item.media_url),
        }))
        .filter((item): item is PostMediaCarouselItem & { resolvedUrl: string } =>
          Boolean(item.resolvedUrl),
        )
        .sort((a, b) => a.position - b.position),
    [items],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const hasMultiple = carouselItems.length > 1;
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, carouselItems.length - 1));
  const activeItem = carouselItems[safeActiveIndex] ?? null;

  if (!activeItem) return null;

  const goToPrevious = () => {
    setActiveIndex((current) => {
      const safeCurrent = Math.min(current, Math.max(0, carouselItems.length - 1));
      return safeCurrent <= 0 ? carouselItems.length - 1 : safeCurrent - 1;
    });
  };
  const goToNext = () => {
    setActiveIndex((current) => {
      const safeCurrent = Math.min(current, Math.max(0, carouselItems.length - 1));
      return safeCurrent >= carouselItems.length - 1 ? 0 : safeCurrent + 1;
    });
  };

  return (
    <figure className={cn("relative w-full", className)} data-post-card-ignore-click="true">
      <div
        className={cn(
          "relative aspect-video w-full overflow-hidden border border-border bg-surface-muted",
          roundedClassName,
          viewportClassName,
        )}
      >
        <Image
          alt={
            hasMultiple ? `${alt} — imagem ${safeActiveIndex + 1} de ${carouselItems.length}` : alt
          }
          className={cn("object-cover", imageClassName)}
          fill
          priority={false}
          sizes={sizes}
          src={activeItem.resolvedUrl}
          unoptimized={isPublicMediaUrl(activeItem.media_url)}
        />

        {hasMultiple ? (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-slate-950/25 to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-slate-950/25 to-transparent"
            />
            <button
              aria-label="Imagem anterior"
              className="absolute top-1/2 left-2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/45 bg-slate-950/65 p-0 text-white shadow-none backdrop-blur-md transition hover:bg-slate-950/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 active:scale-95 sm:left-3 sm:h-10 sm:w-10"
              data-post-card-ignore-click="true"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goToPrevious();
              }}
              type="button"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" strokeWidth={2.4} />
            </button>
            <button
              aria-label="Próxima imagem"
              className="absolute top-1/2 right-2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/45 bg-slate-950/65 p-0 text-white shadow-none backdrop-blur-md transition hover:bg-slate-950/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 active:scale-95 sm:right-3 sm:h-10 sm:w-10"
              data-post-card-ignore-click="true"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goToNext();
              }}
              type="button"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" strokeWidth={2.4} />
            </button>

            <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5">
              {carouselItems.map((item, index) => (
                <button
                  aria-label={`Mostrar imagem ${index + 1}`}
                  className={cn(
                    "h-2 rounded-full bg-white/65 transition-all hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/70",
                    index === safeActiveIndex ? "w-5 bg-white" : "w-2",
                  )}
                  data-post-card-ignore-click="true"
                  key={item.id ?? `${item.media_url}-${item.position}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setActiveIndex(index);
                  }}
                  type="button"
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </figure>
  );
};
