"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  type MouseEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  captureReplyTreeReturn,
  findReplyTreeReturnSnapshot,
  type ReplyTreeReturnSnapshot,
  readReplyTreeReturnRaw,
  replyTreeReturnScope,
  resolveReplyTreeReturnScroll,
} from "@/utils/reply-tree-return-memory";

const subscribe = () => () => {};
const serverSnapshot = () => null;

export const useReplyTreeReturnSnapshot = (userId?: string | null) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const scope = replyTreeReturnScope(userId, `${pathname}${query ? `?${query}` : ""}`);
  const raw = useSyncExternalStore(subscribe, readReplyTreeReturnRaw, serverSnapshot);
  const snapshot = useMemo(() => findReplyTreeReturnSnapshot(raw, scope), [raw, scope]);
  return { scope, snapshot };
};

export const useReplyTreeReturn = ({
  listRef,
  pageCount,
  ready,
  snapshot,
  scope,
  threadHrefBase,
}: {
  listRef: RefObject<HTMLElement | null>;
  pageCount: number;
  ready: boolean;
  snapshot: ReplyTreeReturnSnapshot | null;
  scope: string;
  threadHrefBase?: string;
}) => {
  const restored = useRef<string | null>(null);
  useEffect(() => {
    const section = listRef.current;
    const key = snapshot ? `${scope}:${snapshot.createdAt}` : null;
    if (!section || !snapshot || !ready || restored.current === key) return;
    let frame = 0;
    let cancelled = false;
    const restore = () => {
      if (cancelled) return;
      const anchor = document.getElementById(snapshot.anchorId);
      window.scrollTo({ top: resolveReplyTreeReturnScroll(snapshot, anchor), behavior: "instant" });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(restore);
    };
    const stop = () => {
      cancelled = true;
      restored.current = key;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
    // Wait for restored branches, responsive depth and media dimensions to settle.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    schedule();
    const settle = window.setTimeout(stop, 1500);
    for (const event of ["pointerdown", "touchstart", "wheel", "keydown"]) {
      window.addEventListener(event, stop, { passive: true, once: true });
    }
    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      for (const event of ["pointerdown", "touchstart", "wheel", "keydown"])
        window.removeEventListener(event, stop);
    };
  }, [listRef, ready, scope, snapshot]);

  return (event: MouseEvent<HTMLElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const target = event.target instanceof Element ? event.target : null;
    const link = target?.closest<HTMLAnchorElement>("a[data-reply-continuation]");
    const section = listRef.current;
    if (
      !link ||
      !section ||
      !threadHrefBase ||
      link.target === "_blank" ||
      !link.pathname.startsWith(`${threadHrefBase}/`)
    )
      return;
    const anchor = link.closest<HTMLElement>("[data-reply-branch-footer]");
    if (anchor) captureReplyTreeReturn(section, anchor, scope, pageCount);
  };
};
