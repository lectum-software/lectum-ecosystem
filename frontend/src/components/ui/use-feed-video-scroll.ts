"use client";

import { type UIEvent, useCallback, useLayoutEffect, useRef, useState } from "react";

type FeedVideoScrollOptions = {
  index: number;
  /** Rendered pages, including a trailing loading page when more items are available. */
  count: number;
  locked: boolean;
  onSelect: (index: number) => void;
  slideAttribute?: "data-content-video-slide-index" | "data-psychologists-slide-index";
};

const clampIndex = (index: number, count: number) =>
  Math.max(0, Math.min(Math.trunc(index), count - 1));

const slideTop = (feed: HTMLElement, slide: HTMLElement) =>
  slide.getBoundingClientRect().top -
  feed.getBoundingClientRect().top -
  feed.clientTop +
  feed.scrollTop;

/** Native scroll/snap owns motion; only the closest rendered page owns playback/queue selection. */
export const useFeedVideoScroll = (options: FeedVideoScrollOptions) => {
  const [feed, setFeed] = useState<HTMLDivElement | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const latest = useRef(options);
  const reportedIndex = useRef(options.index);
  const initialized = useRef(false);

  useLayoutEffect(() => {
    latest.current = options;
  });

  const feedRef = useCallback((node: HTMLDivElement | null) => {
    nodeRef.current = node;
    setFeed(node);
  }, []);

  const align = useCallback(
    (index: number, behavior: ScrollBehavior) => {
      if (!feed || !Number.isFinite(index) || latest.current.count <= 0) return;
      const target = clampIndex(index, latest.current.count);
      const attribute = latest.current.slideAttribute ?? "data-content-video-slide-index";
      const slide = feed.querySelector<HTMLElement>(`[${attribute}="${target}"]`);
      if (!slide) return;
      feed.scrollTo({ top: slideTop(feed, slide), behavior });
    },
    [feed],
  );

  const onScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (!feed || event.target !== feed || latest.current.count <= 0) return;
      const { index, count, locked, onSelect } = latest.current;
      if (locked) {
        align(index, "instant");
        return;
      }
      let nearest = index;
      let distance = Infinity;
      const attribute = latest.current.slideAttribute ?? "data-content-video-slide-index";
      const slides = feed.querySelectorAll<HTMLElement>(`[${attribute}]`);
      const top = feed.getBoundingClientRect().top + feed.clientTop;
      // Slides are in vertical DOM order. Avoid measuring the entire growing
      // feed on every scroll event while native momentum/snap is running.
      let low = 0;
      let high = slides.length - 1;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const slide = slides[middle];
        const candidate = Number(slide.getAttribute(attribute));
        const offset = slide.getBoundingClientRect().top - top;
        const delta = Math.abs(offset);
        if (
          Number.isInteger(candidate) &&
          candidate >= 0 &&
          candidate < count &&
          (delta < distance || (delta === distance && candidate < nearest))
        ) {
          nearest = candidate;
          distance = delta;
        }
        if (offset < 0) low = middle + 1;
        else high = middle - 1;
      }
      if (nearest !== reportedIndex.current) {
        reportedIndex.current = nearest;
        onSelect(nearest);
      }
    },
    [align, feed],
  );

  const scrollTo = useCallback(
    (index: number) => {
      if (latest.current.locked) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      align(index, reducedMotion ? "instant" : "smooth");
    },
    [align],
  );

  useLayoutEffect(() => {
    initialized.current = false;
    if (!feed) return;
    let height = feed.clientHeight;
    let width = feed.clientWidth;
    const observer = new ResizeObserver(() => {
      if (height === feed.clientHeight && width === feed.clientWidth) return;
      height = feed.clientHeight;
      width = feed.clientWidth;
      // Preserve the selected page when browser chrome, keyboard or orientation resizes it.
      align(latest.current.index, "instant");
    });
    observer.observe(feed);
    return () => observer.disconnect();
  }, [align, feed]);

  useLayoutEffect(() => {
    if (!feed || options.count <= 0) {
      initialized.current = false;
      return;
    }
    const target = clampIndex(options.index, options.count);
    if (target !== options.index) {
      // Removing a loading tail may not emit scroll (for example while the feed is locked).
      reportedIndex.current = target;
      initialized.current = true;
      align(target, "instant");
      latest.current.onSelect(target);
      return;
    }
    // Acknowledging our own onScroll must never interrupt an in-flight gesture or smooth scroll.
    if (!initialized.current || options.index !== reportedIndex.current) {
      reportedIndex.current = options.index;
      initialized.current = true;
      align(options.index, "instant");
    }
  }, [align, feed, options.count, options.index]);

  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!node || !options.locked) return;
    const overflow = node.style.overflowY;
    node.style.overflowY = "hidden";
    align(latest.current.index, "instant");
    return () => {
      node.style.overflowY = overflow;
    };
  }, [align, options.locked]);

  return { feedRef, onScroll, scrollTo };
};
