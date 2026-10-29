"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PostReply } from "@/api/generator/types/posts";
import { findFocusedReplyContinuation } from "@/utils/reply-focus-navigation";
import { getReplyLayerToolbarWidths, getReplyTreeInlineDepth } from "@/utils/reply-tree-layout";

export const useReplyTreeLayout = (
  replies: PostReply[],
  maxDepth: number,
  focusReplyId?: string | null,
  threadHrefBase?: string,
  onOpenThread?: (replyId: string) => void,
) => {
  const ref = useRef<HTMLElement>(null);
  const router = useRouter();
  const [depth, setDepth] = useState(Math.min(1, maxDepth < 0 ? 3 : maxDepth));
  const [measured, setMeasured] = useState(false);
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    const toolbarWidths = getReplyLayerToolbarWidths(replies);
    const update = () => {
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setDepth(
        getReplyTreeInlineDepth(
          list.getBoundingClientRect().width,
          maxDepth,
          rem,
          window.matchMedia("(min-width: 640px)").matches,
          toolbarWidths,
        ),
      );
      setMeasured(true);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [maxDepth, replies]);
  useEffect(() => {
    if (!measured || !focusReplyId || !threadHrefBase) return;
    const root = findFocusedReplyContinuation(replies, focusReplyId, depth);
    if (!root) return;
    if (onOpenThread) {
      onOpenThread(root);
      return;
    }
    router.replace(
      `${threadHrefBase}/${encodeURIComponent(root)}?focusReplyId=${encodeURIComponent(focusReplyId)}#reply-${encodeURIComponent(focusReplyId)}`,
      { scroll: false },
    );
  }, [depth, focusReplyId, measured, onOpenThread, replies, router, threadHrefBase]);
  return { ref, depth };
};
