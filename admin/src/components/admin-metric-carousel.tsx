"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

export type AdminMetricCarouselItem = {
  content: ReactNode;
  id: string;
};

export const adminSixColumnMetricItemClassName =
  "flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.5rem)/2)] lg:w-[calc((100%_-_1rem)/3)] 2xl:w-[calc((100%_-_2.5rem)/6)]";

export const AdminMetricCarousel = ({
  constrainWidth = false,
  itemClassName,
  items,
  showNavigation = true,
  title,
}: {
  constrainWidth?: boolean;
  itemClassName: string;
  items: readonly AdminMetricCarouselItem[];
  showNavigation?: boolean;
  title: string;
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollMetrics = useCallback((direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      behavior: "smooth",
      left: direction * Math.max(260, scroller.clientWidth * 0.82),
    });
  }, []);

  return (
    <fieldset className={cn("mt-5 min-w-0", constrainWidth && "max-w-full overflow-x-clip")}>
      <legend className="sr-only">Contadores exibidos no gráfico de {title}</legend>
      <div
        className={cn(
          "relative min-w-0",
          constrainWidth && "max-w-full",
          showNavigation ? "px-11 sm:px-12" : "px-0",
        )}
      >
        {showNavigation ? (
          <button
            aria-label={`Rolar contadores de ${title} para a esquerda`}
            className="absolute left-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface text-muted shadow-sm transition hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            onClick={() => scrollMetrics(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </button>
        ) : null}
        <div
          className="flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          ref={scrollerRef}
        >
          {items.map((item) => (
            <div className={itemClassName} key={item.id}>
              {item.content}
            </div>
          ))}
        </div>
        {showNavigation ? (
          <button
            aria-label={`Rolar contadores de ${title} para a direita`}
            className="absolute right-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-primary/25 bg-primary-soft text-primary shadow-sm transition hover:border-primary/45 hover:bg-primary-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            onClick={() => scrollMetrics(1)}
            type="button"
          >
            <ChevronRight aria-hidden className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </fieldset>
  );
};
